"""
HOD dashboard endpoints.

Every route here requires the admin role, enforced by auth.require_admin.

Wire into app.py:
    from hod_routes import router as hod_router
    app.include_router(hod_router)

Needs python-multipart for the LMS upload route:
    pip install python-multipart
"""
import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

import ai_compose
import auth
import db

router = APIRouter(prefix="/api/hod", tags=["hod"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXT = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".zip"}
MAX_UPLOAD_MB = 25


def hod(user: dict = Depends(auth.current_user)) -> dict:
    """Dependency: every route in this file is HOD-only."""
    return auth.require_admin(user)


def my_faculty_id(user: dict) -> int:
    row = db.query_one("SELECT id FROM faculty WHERE user_id = %s", (user["id"],))
    if not row:
        raise HTTPException(status_code=404, detail="No faculty profile linked to this account")
    return row["id"]


# ===========================================================================
#  1. PROFILE
# ===========================================================================

class ProfileIn(BaseModel):
    name: str | None = None
    mobile: str | None = None
    designation: str | None = None
    qualification: str | None = None
    specialization: str | None = None
    research_areas: str | None = None
    experience_years: float | None = None
    office_location: str | None = None
    available_hours: str | None = None
    linkedin_url: str | None = None
    scholar_url: str | None = None


@router.get("/profile")
def get_profile(user: dict = Depends(hod)):
    profile = db.query_one(
        """SELECT f.id, u.name, u.email, u.mobile,
                  f.designation, f.qualification, f.specialization, f.research_areas,
                  f.experience_years, f.office_location, f.available_hours,
                  f.linkedin_url, f.scholar_url, f.date_of_joining,
                  d.name AS department_name
           FROM faculty f
           JOIN users u ON u.id = f.user_id
           LEFT JOIN department d ON d.id = f.department_id
           WHERE f.user_id = %s""",
        (user["id"],),
    )
    if not profile:
        raise HTTPException(status_code=404, detail="No faculty profile linked to this account")

    profile["achievements"] = db.query_all(
        """SELECT id, title, category, venue, impact_factor, achieved_on
           FROM faculty_achievements WHERE faculty_id = %s
           ORDER BY achieved_on DESC NULLS LAST, id DESC""",
        (profile["id"],),
    )
    profile["scholars"] = db.query_all(
        "SELECT id, name, topic, status FROM research_scholars "
        "WHERE supervisor_id = %s ORDER BY name",
        (profile["id"],),
    )
    return profile


@router.put("/profile")
def update_profile(body: ProfileIn, user: dict = Depends(hod)):
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    # Name and mobile live on users; everything else on faculty.
    for col in ("name", "mobile"):
        if col in data:
            db.execute(f"UPDATE users SET {col} = %s WHERE id = %s", (data.pop(col), user["id"]))

    if data:
        sets = ", ".join(f"{k} = %s" for k in data)
        db.execute(
            f"UPDATE faculty SET {sets} WHERE user_id = %s",
            (*data.values(), user["id"]),
        )
    return get_profile(user)


# ===========================================================================
#  2. MESSAGE APPROVALS  (WhatsApp / announcements)
# ===========================================================================

class ApprovalEdit(BaseModel):
    title: str | None = None
    body: str | None = None


def draft_achievement_message(row: dict) -> str:
    """Compose the announcement the HOD will review before it goes out.

    Written by openai/gpt-oss-120b from the record's own fields, falling back
    to a fixed template if the LLM is unavailable, so a submission is never
    lost to an API outage.
    """
    message, _ = ai_compose.compose_achievement(row)
    return message


def _template_achievement_message(row: dict) -> str:
    prize = f"\nPrize: Rs. {int(row['prize_amount']):,}" if row.get("prize_amount") else ""
    event = f" at {row['event_name']}" if row.get("event_name") else ""
    return (
        f"CSE Student Achievement\n\n"
        f"Congratulations to {row['student_name']} for securing "
        f"{row['position'] or 'recognition'}{event}.{prize}\n\n"
        f"We are proud of this achievement and wish continued success.\n\n"
        f"— Department of Computer Science and Engineering, Sanjivani University"
    )


def draft_event_message(row: dict) -> str:
    """AI-written event announcement, template fallback."""
    message, _ = ai_compose.compose_event(row)
    return message


def _template_event_message(row: dict) -> str:
    when = row["starts_at"].strftime("%d %B %Y, %I:%M %p") if row.get("starts_at") else "TBA"
    venue = f"\nVenue: {row['venue']}" if row.get("venue") else ""
    link = f"\nRegister: {row['registration_link']}" if row.get("registration_link") else ""
    scope = "Institute" if row["scope"] == "institute" else "CSE Department"
    return (
        f"Upcoming {scope} Event\n\n"
        f"{row['title']}\n"
        f"Date: {when}{venue}{link}\n\n"
        f"— Department of Computer Science and Engineering, Sanjivani University"
    )


def whatsapp_groups() -> list[str]:
    """Group names shown to the HOD as a checklist while sharing.

    Set WHATSAPP_GROUPS in .env as a comma-separated list, for example:
        WHATSAPP_GROUPS=CSE 2nd Year,CSE 3rd Year,CSE Faculty
    """
    raw = os.environ.get("WHATSAPP_GROUPS", "")
    names = [g.strip() for g in raw.split(",") if g.strip()]
    return names or ["CSE Department", "CSE Students", "CSE Faculty"]


def queue_message(title: str, body: str, ref_type: str, ref_id: int):
    """Queue a draft for HOD approval. user_id NULL means a community broadcast."""
    db.execute(
        """INSERT INTO notifications (user_id, channel, title, body, ref_type, ref_id, status)
           VALUES (NULL, 'whatsapp', %s, %s, %s, %s, 'pending')""",
        (title, body, ref_type, ref_id),
    )


@router.get("/approvals")
def list_approvals(status: str = "pending", user: dict = Depends(hod)):
    if status not in ("pending", "sent", "failed"):
        raise HTTPException(status_code=400, detail="Invalid status filter")
    return db.query_all(
        """SELECT id, title, body, channel, ref_type, ref_id, status,
                  created_at, sent_at
           FROM notifications
           WHERE status = %s AND channel = 'whatsapp'
           ORDER BY created_at DESC""",
        (status,),
    )


@router.patch("/approvals/{msg_id}")
def edit_approval(msg_id: int, body: ApprovalEdit, user: dict = Depends(hod)):
    """The HOD can rewrite the draft before approving it."""
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    sets = ", ".join(f"{k} = %s" for k in data)
    row = db.execute(
        f"UPDATE notifications SET {sets} WHERE id = %s AND status = 'pending' RETURNING id",
        (*data.values(), msg_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Draft not found, or already processed")
    return {"ok": True}


@router.post("/approvals/{msg_id}/approve")
def approve(msg_id: int, user: dict = Depends(hod)):
    """Approve and publish the linked record.

    Delivery is marked 'sent'; the actual WhatsApp Business API call is the
    documented next step, so for now the approved text is what gets shared.
    """
    msg = db.query_one(
        "SELECT * FROM notifications WHERE id = %s AND status = 'pending'", (msg_id,)
    )
    if not msg:
        raise HTTPException(status_code=404, detail="Draft not found, or already processed")

    if msg["ref_type"] == "achievement":
        db.execute(
            "UPDATE student_achievements SET verified_by = %s, is_published = TRUE WHERE id = %s",
            (my_faculty_id(user), msg["ref_id"]),
        )
    elif msg["ref_type"] == "event":
        db.execute("UPDATE events SET is_published = TRUE WHERE id = %s", (msg["ref_id"],))

    db.execute(
        "UPDATE notifications SET status = 'sent', sent_at = now() WHERE id = %s", (msg_id,)
    )
    db.execute(
        """INSERT INTO audit_log (user_id, action, table_name, record_id)
           VALUES (%s, 'approve_and_publish', %s, %s)""",
        (user["id"], msg["ref_type"], msg["ref_id"]),
    )
    # The approved text plus a link that opens WhatsApp with it ready to send.
    # WhatsApp's official API cannot post to groups, so the HOD taps this and
    # picks the CSE groups. One tap, and it stays within WhatsApp's terms.
    return {
        "ok": True,
        "published": msg["ref_type"],
        "record_id": msg["ref_id"],
        "message": msg["body"],
        "whatsapp_url": ai_compose.share_link(msg["body"]),
        "groups": whatsapp_groups(),
    }


@router.post("/approvals/{msg_id}/regenerate")
def regenerate(msg_id: int, user: dict = Depends(hod)):
    """Ask the AI to rewrite this draft from the original record.

    Useful when the first attempt reads badly. The record is the source of
    truth, so a rewrite cannot introduce facts that are not in the database.
    """
    msg = db.query_one(
        "SELECT * FROM notifications WHERE id = %s AND status = 'pending'", (msg_id,)
    )
    if not msg:
        raise HTTPException(status_code=404, detail="Draft not found, or already processed")

    if msg["ref_type"] == "achievement":
        rec = db.query_one(
            """SELECT sa.*, u.name AS student_name, s.current_year AS student_year
               FROM student_achievements sa
               JOIN students s ON s.id = sa.student_id
               JOIN users u    ON u.id = s.user_id
               WHERE sa.id = %s""",
            (msg["ref_id"],),
        )
        if not rec:
            raise HTTPException(status_code=404, detail="Achievement record not found")
        body, written_by = ai_compose.compose_achievement(rec)
    elif msg["ref_type"] == "event":
        rec = db.query_one("SELECT * FROM events WHERE id = %s", (msg["ref_id"],))
        if not rec:
            raise HTTPException(status_code=404, detail="Event record not found")
        body, written_by = ai_compose.compose_event(rec)
    else:
        raise HTTPException(status_code=400, detail="This draft has no linked record")

    db.execute("UPDATE notifications SET body = %s WHERE id = %s", (body, msg_id))
    return {"ok": True, "body": body, "written_by": written_by}


@router.get("/whatsapp-groups")
def groups(user: dict = Depends(hod)):
    """The CSE WhatsApp groups an announcement should reach."""
    return {"groups": whatsapp_groups()}


@router.post("/approvals/{msg_id}/reject")
def reject(msg_id: int, user: dict = Depends(hod)):
    row = db.execute(
        "UPDATE notifications SET status = 'failed', error = 'Rejected by HOD' "
        "WHERE id = %s AND status = 'pending' RETURNING ref_type, ref_id",
        (msg_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Draft not found, or already processed")
    db.execute(
        "INSERT INTO audit_log (user_id, action, table_name, record_id) "
        "VALUES (%s, 'reject', %s, %s)",
        (user["id"], row["ref_type"], row["ref_id"]),
    )
    return {"ok": True}


# ===========================================================================
#  3. STUDENT ACHIEVEMENTS
# ===========================================================================

class AchievementIn(BaseModel):
    student_id: int
    title: str = Field(min_length=3)
    category: str = "other"
    description: str | None = None
    event_name: str | None = None
    organiser: str | None = None
    location: str | None = None
    position: str | None = None
    prize_amount: float | None = None
    team_members: str | None = None
    proof_url: str | None = None
    achieved_on: str | None = None
    publish_now: bool = False


CATEGORIES = {"hackathon", "competition", "coding", "sports", "research", "certification",
              "internship", "placement", "entrepreneurship", "academic", "other"}


@router.get("/students")
def list_students(user: dict = Depends(hod)):
    """Feeds the student picker on the achievement form."""
    return db.query_all(
        """SELECT s.id, u.name, s.roll_no, s.current_year, s.division
           FROM students s JOIN users u ON u.id = s.user_id
           WHERE s.is_active ORDER BY u.name"""
    )


@router.get("/achievements")
def list_achievements(pending_only: bool = False, user: dict = Depends(hod)):
    where = "WHERE sa.verified_at IS NULL" if pending_only else ""
    return db.query_all(
        f"""SELECT sa.id, sa.title, sa.category, sa.event_name, sa.position,
                   sa.prize_amount, sa.achieved_on, sa.is_published, sa.verified_at,
                   u.name AS student_name, s.roll_no
            FROM student_achievements sa
            JOIN students s ON s.id = sa.student_id
            JOIN users u    ON u.id = s.user_id
            {where}
            ORDER BY sa.created_at DESC"""
    )


@router.post("/achievements", status_code=201)
def add_achievement(body: AchievementIn, user: dict = Depends(hod)):
    if body.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {sorted(CATEGORIES)}")

    student = db.query_one(
        "SELECT s.id, u.name FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = %s",
        (body.student_id,),
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    faculty_id = my_faculty_id(user)
    row = db.execute(
        """INSERT INTO student_achievements
               (student_id, title, category, description, event_name, organiser,
                location, position, prize_amount, team_members, proof_url,
                achieved_on, created_by, verified_by, is_published)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING id""",
        (body.student_id, body.title, body.category, body.description, body.event_name,
         body.organiser, body.location, body.position, body.prize_amount,
         body.team_members, body.proof_url, body.achieved_on, user["id"],
         # Added by the HOD, so it is verified on creation.
         faculty_id, body.publish_now),
    )

    queue_message(
        f"Achievement: {body.title}",
        draft_achievement_message({**body.model_dump(), "student_name": student["name"]}),
        "achievement", row["id"],
    )
    return {"id": row["id"], "draft_queued": True}


# ===========================================================================
#  4. EVENTS
# ===========================================================================

class EventIn(BaseModel):
    title: str = Field(min_length=3)
    scope: str = "department"          # 'institute' or 'department'
    event_type: str = "other"
    description: str | None = None
    venue: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    organiser: str | None = None
    speaker: str | None = None
    contact_person: str | None = None
    contact_number: str | None = None
    registration_link: str | None = None
    poster_url: str | None = None
    max_participants: int | None = None
    publish_now: bool = False


EVENT_TYPES = {"workshop", "seminar", "guest_lecture", "competition", "hackathon",
               "industrial_visit", "cultural", "sports", "exhibition", "other"}


@router.get("/events")
def list_events(user: dict = Depends(hod)):
    return db.query_all(
        """SELECT e.id, e.title, e.scope, e.event_type, e.venue, e.starts_at,
                  e.ends_at, e.speaker, e.is_published,
                  (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id)
                      AS registrations
           FROM events e ORDER BY e.starts_at DESC"""
    )


@router.post("/events", status_code=201)
def add_event(body: EventIn, user: dict = Depends(hod)):
    if body.scope not in ("institute", "department"):
        raise HTTPException(status_code=400, detail="Scope must be 'institute' or 'department'")
    if body.event_type not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Type must be one of: {sorted(EVENT_TYPES)}")
    if body.ends_at and body.ends_at < body.starts_at:
        raise HTTPException(status_code=400, detail="The event cannot end before it starts")

    dept = db.query_one("SELECT id FROM department WHERE code = 'CSE'")
    row = db.execute(
        """INSERT INTO events
               (department_id, scope, event_type, title, description, venue,
                starts_at, ends_at, organiser, speaker, contact_person,
                contact_number, registration_link, poster_url, max_participants,
                is_published, created_by)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING id, title, scope, starts_at, venue, registration_link""",
        (dept["id"] if dept else None, body.scope, body.event_type, body.title,
         body.description, body.venue, body.starts_at, body.ends_at, body.organiser,
         body.speaker, body.contact_person, body.contact_number, body.registration_link,
         body.poster_url, body.max_participants, body.publish_now, user["id"]),
    )

    queue_message(f"Event: {body.title}", draft_event_message(row), "event", row["id"])
    return {"id": row["id"], "draft_queued": True}


# ===========================================================================
#  5. LMS DOCUMENTS
# ===========================================================================

DOC_TYPES = {"notes", "assignment", "question_bank", "practical_manual",
             "circular", "syllabus", "timetable", "other"}


@router.get("/subjects")
def list_subjects(user: dict = Depends(hod)):
    """Feeds the subject picker on the upload form."""
    return db.query_all(
        """SELECT s.id, s.code, s.name, s.semester, c.short_name AS course
           FROM subjects s JOIN courses c ON c.id = s.course_id
           ORDER BY s.semester NULLS LAST, s.name"""
    )


@router.get("/lms")
def list_lms(user: dict = Depends(hod)):
    return db.query_all(
        """SELECT l.id, l.title, l.doc_type, l.semester, l.file_size_kb,
                  l.is_indexed, l.uploaded_at, l.download_count,
                  s.name AS subject_name, u.name AS uploaded_by_name
           FROM lms_documents l
           LEFT JOIN subjects s ON s.id = l.subject_id
           JOIN users u ON u.id = l.uploaded_by
           ORDER BY l.uploaded_at DESC"""
    )


@router.post("/lms", status_code=201)
def upload_lms(
    file: UploadFile = File(...),
    title: str = Form(...),
    doc_type: str = Form("notes"),
    subject_id: int | None = Form(None),
    semester: int | None = Form(None),
    description: str | None = Form(None),
    user: dict = Depends(hod),
):
    if doc_type not in DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Type must be one of: {sorted(DOC_TYPES)}")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400, detail=f"File type {ext or 'unknown'} is not allowed"
        )

    safe = f"{datetime.now():%Y%m%d%H%M%S}_{os.path.basename(file.filename or 'upload')}"
    path = os.path.join(UPLOAD_DIR, safe)
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    size_kb = os.path.getsize(path) // 1024
    if size_kb > MAX_UPLOAD_MB * 1024:
        os.remove(path)
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_MB} MB")

    row = db.execute(
        """INSERT INTO lms_documents
               (subject_id, uploaded_by, title, doc_type, description,
                file_path, file_type, file_size_kb, semester)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (subject_id, user["id"], title, doc_type, description,
         path, ext.lstrip("."), size_kb, semester),
    )
    return {"id": row["id"], "filename": safe, "size_kb": size_kb}


@router.delete("/lms/{doc_id}")
def delete_lms(doc_id: int, user: dict = Depends(hod)):
    row = db.execute("DELETE FROM lms_documents WHERE id = %s RETURNING file_path", (doc_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    if row["file_path"] and os.path.exists(row["file_path"]):
        os.remove(row["file_path"])
    return {"ok": True}


# ===========================================================================
#  6. FACULTY DIRECTORY
# ===========================================================================

@router.get("/faculty")
def list_faculty(user: dict = Depends(hod)):
    return db.query_all("SELECT * FROM v_faculty_directory ORDER BY is_hod DESC, name")


@router.get("/faculty/{faculty_id}")
def faculty_detail(faculty_id: int, user: dict = Depends(hod)):
    row = db.query_one(
        """SELECT f.id, u.name, u.email, u.mobile, f.designation, f.qualification,
                  f.specialization, f.research_areas, f.experience_years,
                  f.office_location, f.available_hours, f.is_hod, f.date_of_joining
           FROM faculty f JOIN users u ON u.id = f.user_id WHERE f.id = %s""",
        (faculty_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Faculty member not found")

    row["achievements"] = db.query_all(
        "SELECT id, title, category, venue, impact_factor, achieved_on "
        "FROM faculty_achievements WHERE faculty_id = %s ORDER BY achieved_on DESC NULLS LAST",
        (faculty_id,),
    )
    row["scholars"] = db.query_all(
        "SELECT name, topic, status FROM research_scholars WHERE supervisor_id = %s",
        (faculty_id,),
    )
    row["subjects"] = db.query_all(
        "SELECT code, name, semester FROM subjects WHERE faculty_id = %s ORDER BY semester",
        (faculty_id,),
    )
    return row


# ===========================================================================
#  DASHBOARD SUMMARY
# ===========================================================================

@router.get("/stats")
def stats(user: dict = Depends(hod)):
    row = db.query_one("SELECT * FROM v_dashboard_stats")
    row["pending_approvals"] = db.query_one(
        "SELECT count(*) AS c FROM notifications WHERE status = 'pending'"
    )["c"]
    return row