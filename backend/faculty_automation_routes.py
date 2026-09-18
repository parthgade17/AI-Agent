"""
faculty_automation_routes.py
-----------------------------
Three automation features for the teacher dashboard, backed by real tables
(schema_automation.sql) instead of frontend-only mock state:

    POST /api/faculty/attendance                 record + auto-alert
    GET  /api/faculty/attendance                  history
    POST /api/faculty/assignment-reminders         create + notify students
    GET  /api/faculty/assignment-reminders         list
    DELETE /api/faculty/assignment-reminders/{id}
    POST /api/faculty/evaluate-assignment          real Groq-graded scoring
    GET  /api/faculty/evaluations                  history

Self-contained on purpose: uses its own tiny DB helpers (below) rather than
importing db.py, since db.py's exact function signatures weren't available
when this was written. If you'd rather it use db.py, swap query_one/
query_all/execute here for db.query_one/db.execute and delete the helpers.

Register in app.py:
    from faculty_automation_routes import router as faculty_automation_router
    app.include_router(faculty_automation_router)
"""
import json
import os
import re
from typing import Any

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import env_loader  # noqa: F401  -- same .env loader rag_engine.py uses
from auth import current_user
from rag_engine import groq_keys, groq_model, GROQ_URL
import requests

router = APIRouter(prefix="/api/faculty", tags=["faculty-automation"])

DATABASE_URL = os.environ.get("DATABASE_URL")


# ------------------------------------------------------------------- DB helpers

def _connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Check your .env file.")
    return psycopg2.connect(DATABASE_URL)


def query_one(sql: str, params: tuple = ()) -> dict | None:
    conn = _connect()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def query_all(sql: str, params: tuple = ()) -> list[dict]:
    conn = _connect()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def execute(sql: str, params: tuple = ()) -> dict | None:
    """Runs one statement. Returns the RETURNING row as a dict if present."""
    conn = _connect()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            row = None
            if cur.description:  # only true when the statement has RETURNING
                row = cur.fetchone()
                row = dict(row) if row else None
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_many_return_count(sql: str, params: tuple = ()) -> int:
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            n = cur.rowcount
        conn.commit()
        return n
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ------------------------------------------------------------------- auth helper

def get_faculty(user: dict = Depends(current_user)) -> dict:
    """Resolves the logged-in user to their faculty row. 403s for students."""
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(status_code=403, detail="This feature is for department staff")
    row = query_one("SELECT id, user_id FROM faculty WHERE user_id = %s AND is_active", (user["id"],))
    if not row:
        raise HTTPException(status_code=403, detail="No faculty profile found for this account")
    return row


# =====================================================================
#  ATTENDANCE
# =====================================================================

class AttendanceIn(BaseModel):
    student_name: str
    percentage: float
    threshold: float = 75


@router.post("/attendance")
def record_attendance(body: AttendanceIn, faculty: dict = Depends(get_faculty)):
    if not (0 <= body.percentage <= 100):
        raise HTTPException(status_code=400, detail="Percentage must be between 0 and 100")

    # Best-effort match to an enrolled student by name. Doesn't fail if no
    # match is found -- the record is still saved with student_id NULL and
    # the typed name preserved, so nothing the teacher entered is lost.
    match = query_one(
        """SELECT s.id FROM students s JOIN users u ON u.id = s.user_id
            WHERE u.is_active AND lower(u.name) = lower(%s) LIMIT 1""",
        (body.student_name.strip(),),
    )
    student_id = match["id"] if match else None

    row = execute(
        """INSERT INTO attendance_records
               (student_id, student_name_typed, percentage, threshold, recorded_by)
           VALUES (%s, %s, %s, %s, %s)
           RETURNING id, is_below_threshold""",
        (student_id, body.student_name.strip(), body.percentage, body.threshold, faculty["id"]),
    )

    # Below threshold -> notify the student, if we could resolve their account.
    if row["is_below_threshold"] and student_id:
        student_user = query_one(
            "SELECT u.id FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = %s",
            (student_id,),
        )
        if student_user:
            execute(
                """INSERT INTO notifications (user_id, channel, title, body, status)
                   VALUES (%s, 'in_app', %s, %s, 'pending')""",
                (
                    student_user["id"],
                    "Attendance Alert",
                    f"Your attendance is {body.percentage}%, below the required "
                    f"{body.threshold}%. Please contact your department.",
                ),
            )

    return {
        "id": row["id"],
        "status": "warning" if row["is_below_threshold"] else "safe",
        "message": (
            f"{body.student_name} is below the minimum attendance requirement "
            f"and has been sent an alert."
            if row["is_below_threshold"] else
            f"{body.student_name} is meeting the minimum attendance requirement."
        ),
        "percentage": body.percentage,
        "threshold": body.threshold,
        "student_matched": student_id is not None,
    }


@router.get("/attendance")
def attendance_history(faculty: dict = Depends(get_faculty), limit: int = 50):
    return query_all(
        """SELECT id, student_name_typed AS student_name, percentage, threshold,
                  is_below_threshold, recorded_at
             FROM attendance_records
            WHERE recorded_by = %s
            ORDER BY recorded_at DESC
            LIMIT %s""",
        (faculty["id"], limit),
    )


# =====================================================================
#  ASSIGNMENT REMINDERS
# =====================================================================

class ReminderIn(BaseModel):
    title: str
    subject: str = ""
    dueDate: str
    message: str = ""


@router.post("/assignment-reminders")
def create_reminder(body: ReminderIn, faculty: dict = Depends(get_faculty)):
    if not body.title.strip() or not body.dueDate:
        raise HTTPException(status_code=400, detail="Title and due date are required")

    row = execute(
        """INSERT INTO assignment_reminders (faculty_id, title, subject_text, due_date, message)
           VALUES (%s, %s, %s, %s, %s)
           RETURNING id""",
        (faculty["id"], body.title.strip(), body.subject.strip(), body.dueDate, body.message.strip()),
    )
    reminder_id = row["id"]

    default_msg = f"Reminder: {body.title} is due on {body.dueDate}."
    notif_body = body.message.strip() or default_msg

    # Notify every active student in the department. Fine at this
    # department's scale; if it ever needs to target one class/section,
    # add a WHERE on students.current_year/division here.
    notified = execute_many_return_count(
        """INSERT INTO notifications (user_id, channel, title, body, status)
           SELECT u.id, 'in_app', %s, %s, 'pending'
           FROM students s JOIN users u ON u.id = s.user_id
           WHERE u.is_active""",
        (f"Assignment Reminder: {body.title}", notif_body),
    )

    execute(
        "UPDATE assignment_reminders SET notified_count = %s WHERE id = %s",
        (notified, reminder_id),
    )

    return {"id": reminder_id, "notified_count": notified}


@router.get("/assignment-reminders")
def list_reminders(faculty: dict = Depends(get_faculty)):
    return query_all(
        """SELECT id, title, subject_text AS subject, due_date AS "dueDate",
                  message, notified_count, created_at
             FROM assignment_reminders
            WHERE faculty_id = %s
            ORDER BY due_date""",
        (faculty["id"],),
    )


@router.delete("/assignment-reminders/{reminder_id}")
def delete_reminder(reminder_id: int, faculty: dict = Depends(get_faculty)):
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM assignment_reminders WHERE id = %s AND faculty_id = %s",
                (reminder_id, faculty["id"]),
            )
            deleted = cur.rowcount
        conn.commit()
    finally:
        conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"ok": True}


# =====================================================================
#  AI ASSIGNMENT EVALUATOR
# =====================================================================

EVAL_SYSTEM_PROMPT = """You are grading a single student answer for a CSE \
department faculty member. Be fair, specific and consistent.

Respond with ONLY a JSON object, no markdown fences, no commentary, in \
exactly this shape:
{
  "score": <number 0-10, one decimal place>,
  "feedback": "<2-3 sentences of overall feedback>",
  "strengths": ["<short strength>", "<short strength>", "<short strength>"],
  "improvements": ["<short improvement>", "<short improvement>"]
}
Base the score only on the answer given. Do not be generous by default --
a vague or incomplete answer should score accordingly."""


def _call_groq_json(system_prompt: str, user_msg: str) -> dict:
    """Same key-rotation logic as rag_engine.call_llm, but returns parsed JSON."""
    keys = groq_keys()
    if not keys:
        raise HTTPException(status_code=500, detail="No GROQ_API_KEY is set in .env")

    model_id = groq_model()
    errors = []
    for key in keys:
        r = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.2,
                "max_tokens": 500,
            },
            timeout=45,
        )
        if r.ok:
            text = r.json()["choices"][0]["message"]["content"].strip()
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
            try:
                return json.loads(text), model_id
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=502,
                    detail=f"The model didn't return valid JSON. Raw reply: {text[:300]}",
                )
        if r.status_code in (401, 429):
            errors.append(f"key ...{key[-6:]}: {r.status_code}")
            continue
        r.raise_for_status()

    raise HTTPException(status_code=502, detail="Every Groq key failed: " + "; ".join(errors))


class EvaluateIn(BaseModel):
    assignmentTitle: str
    studentAnswer: str


@router.post("/evaluate-assignment")
def evaluate_assignment(body: EvaluateIn, faculty: dict = Depends(get_faculty)):
    if not body.assignmentTitle.strip() or not body.studentAnswer.strip():
        raise HTTPException(status_code=400, detail="Assignment title and student answer are required")

    import time
    started = time.perf_counter()
    user_msg = f"ASSIGNMENT: {body.assignmentTitle}\n\nSTUDENT ANSWER:\n{body.studentAnswer}"
    result, model_id = _call_groq_json(EVAL_SYSTEM_PROMPT, user_msg)
    latency_ms = int((time.perf_counter() - started) * 1000)

    score = float(result.get("score", 0))
    feedback = str(result.get("feedback", ""))
    strengths = result.get("strengths", [])
    improvements = result.get("improvements", [])

    row = execute(
        """INSERT INTO assignment_evaluations
               (faculty_id, assignment_title, student_answer, score, feedback,
                strengths, improvements, model, latency_ms)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING id""",
        (faculty["id"], body.assignmentTitle.strip(), body.studentAnswer.strip(),
         score, feedback, json.dumps(strengths), json.dumps(improvements),
         model_id, latency_ms),
    )

    return {
        "id": row["id"],
        "score": score,
        "feedback": feedback,
        "strengths": strengths,
        "improvements": improvements,
    }


@router.get("/evaluations")
def list_evaluations(faculty: dict = Depends(get_faculty), limit: int = 50):
    rows = query_all(
        """SELECT id, assignment_title, score, feedback, strengths, improvements,
                  model, created_at
             FROM assignment_evaluations
            WHERE faculty_id = %s
            ORDER BY created_at DESC
            LIMIT %s""",
        (faculty["id"], limit),
    )
    return rows
