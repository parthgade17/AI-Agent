"""
hod_automation_routes.py
------------------------
AI insights for the HOD, built only from data the database actually holds.

The panel this replaces showed invented students with invented attendance
and LMS percentages. There is no attendance table and no per-student activity
tracking in this schema, so those numbers could not have come from anywhere.
Everything below is a real query.

Wire into app.py:
    from hod_automation_routes import router as hod_automation_router
    app.include_router(hod_automation_router)
"""
from fastapi import APIRouter, Depends, HTTPException

import ai_compose
import auth
import db

router = APIRouter(prefix="/api/hod/ai", tags=["hod-ai"])


def hod(user: dict = Depends(auth.current_user)) -> dict:
    return auth.require_admin(user)


# ===========================================================================
#  REAL SIGNALS
# ===========================================================================

@router.get("/engagement")
def engagement(user: dict = Depends(hod)):
    """Student participation, measured by what the department actually records.

    Achievements are the one per-student signal this database holds. There is
    no attendance or LMS-activity tracking, so nothing here pretends otherwise.
    """
    students = db.query_all(
        """SELECT s.id, u.name, s.roll_no, s.current_year, s.division,
                  count(sa.id)                                   AS submitted,
                  count(sa.id) FILTER (WHERE sa.is_published)     AS published,
                  count(sa.id) FILTER (WHERE sa.verified_at IS NULL) AS awaiting,
                  max(sa.achieved_on)                            AS latest
           FROM students s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN student_achievements sa ON sa.student_id = s.id
           WHERE s.is_active
           GROUP BY s.id, u.name, s.roll_no, s.current_year, s.division
           ORDER BY published DESC, submitted DESC, u.name"""
    )

    total = len(students)
    active = sum(1 for s in students if s["submitted"] > 0)

    return {
        "total_students": total,
        "with_achievements": active,
        "without_achievements": total - active,
        "participation_pct": round(100 * active / total, 1) if total else 0,
        "awaiting_verification": sum(s["awaiting"] for s in students),
        "students": students,
    }


@router.get("/knowledge-gaps")
def knowledge_gaps(user: dict = Depends(hod)):
    """Questions students asked the assistant that it could not answer.

    Each one is a piece of department information that exists nowhere in the
    knowledge base. This is the most actionable list on the dashboard.
    """
    gaps = db.query_all(
        """SELECT q.content AS question, count(*) AS times_asked,
                  max(a.created_at) AS last_asked
           FROM ai_messages a
           JOIN ai_messages q
             ON q.conversation_id = a.conversation_id
            AND q.role = 'user'
            AND q.id = (SELECT max(id) FROM ai_messages m
                         WHERE m.conversation_id = a.conversation_id
                           AND m.role = 'user' AND m.id < a.id)
           WHERE a.role = 'assistant' AND a.answered = FALSE
           GROUP BY q.content
           ORDER BY times_asked DESC, last_asked DESC
           LIMIT 15"""
    )

    totals = db.query_one(
        """SELECT count(*) AS answers,
                  count(*) FILTER (WHERE answered) AS answered
           FROM ai_messages WHERE role = 'assistant'"""
    ) or {"answers": 0, "answered": 0}

    return {
        "total_questions": totals["answers"],
        "answered": totals["answered"],
        "coverage_pct": round(100 * totals["answered"] / totals["answers"], 1)
                        if totals["answers"] else 0,
        "gaps": gaps,
    }


@router.get("/materials")
def materials(user: dict = Depends(hod)):
    """Which uploaded documents students are actually downloading."""
    return {
        "documents": db.query_all(
            """SELECT l.title, l.doc_type, l.download_count, l.uploaded_at,
                      s.name AS subject_name, u.name AS uploaded_by_name
               FROM lms_documents l
               LEFT JOIN subjects s ON s.id = l.subject_id
               JOIN users u ON u.id = l.uploaded_by
               ORDER BY l.download_count DESC, l.uploaded_at DESC
               LIMIT 15"""
        ),
        "never_downloaded": db.query_one(
            "SELECT count(*) AS c FROM lms_documents WHERE download_count = 0"
        )["c"],
    }


# ===========================================================================
#  AI SUMMARY
# ===========================================================================

BRIEF_PROMPT = """You are writing a short briefing for the Head of a Computer \
Science department.

Rules:
1. Use ONLY the figures given. Never invent a number, a name or a trend.
2. Lead with what needs attention, not with praise.
3. Name specific actions. "Document the bonafide certificate process" beats
   "improve documentation".
4. Plain text. No markdown, no asterisks, no emoji, no headings.
5. Around 180 words, four short paragraphs at most.
6. If a figure is zero or the data is thin, say so plainly rather than
   filling the space.
"""


@router.get("/brief")
def brief(user: dict = Depends(hod)):
    """An AI briefing over the real numbers above."""
    eng = engagement(user)
    gaps = knowledge_gaps(user)
    mat = materials(user)

    pending = db.query_one(
        "SELECT count(*) AS c FROM notifications WHERE status = 'pending'"
    )["c"]
    events = db.query_one(
        "SELECT count(*) AS c FROM events WHERE is_published AND starts_at >= now()"
    )["c"]
    faculty = db.query_one(
        "SELECT count(*) AS c FROM faculty WHERE is_active"
    )["c"]

    facts = [
        f"Active students: {eng['total_students']}",
        f"Students with at least one recorded achievement: {eng['with_achievements']}",
        f"Students with none: {eng['without_achievements']}",
        f"Participation rate: {eng['participation_pct']}%",
        f"Achievements awaiting verification: {eng['awaiting_verification']}",
        f"Announcements awaiting HOD approval: {pending}",
        f"Active faculty: {faculty}",
        f"Published upcoming events: {events}",
        f"Questions asked of the department assistant: {gaps['total_questions']}",
        f"Of those, answered from the knowledge base: {gaps['answered']} "
        f"({gaps['coverage_pct']}%)",
        f"Uploaded documents never downloaded: {mat['never_downloaded']}",
    ]

    if gaps["gaps"]:
        facts.append("\nQuestions the assistant could not answer:")
        for g in gaps["gaps"][:8]:
            facts.append(f"  - \"{g['question']}\" (asked {g['times_asked']} time(s))")

    if mat["documents"]:
        top = mat["documents"][0]
        facts.append(
            f"\nMost downloaded material: {top['title']} "
            f"({top['download_count']} downloads)"
        )

    try:
        text, model_id = ai_compose.chat(BRIEF_PROMPT, "\n".join(facts))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"The AI is unavailable. {e}")

    return {
        "brief": text,
        "model": model_id,
        "figures": {
            "students": eng["total_students"],
            "participation_pct": eng["participation_pct"],
            "awaiting_verification": eng["awaiting_verification"],
            "pending_approvals": pending,
            "ai_coverage_pct": gaps["coverage_pct"],
            "unanswered_questions": len(gaps["gaps"]),
        },
    }