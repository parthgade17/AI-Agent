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
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import ai_compose
import auth
import db
import kb_sync
import kb_rebuild
from public_routes import knowledge as public_knowledge

router = APIRouter(prefix="/api/hod", tags=["hod"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")



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


def refresh_pending_draft(ref_type: str, ref_id: int) -> dict:
    """Re-compose a still-pending draft from the record's current fields.

    Needed because a certificate is uploaded in a second call, after the
    achievement (and its WhatsApp draft) already exists — so the draft is
    born without the certificate link. Call this right after anything that
    changes a field the drafted message depends on. If the draft was
    already approved/rejected, or never existed, this is a no-op.
    """
    msg = db.query_one(
        """SELECT id FROM notifications
           WHERE ref_type = %s AND ref_id = %s AND status = 'pending'
           ORDER BY id DESC LIMIT 1""",
        (ref_type, ref_id),
    )
    if not msg:
        return {"refreshed": False, "reason": "no pending draft for this record"}

    if ref_type == "achievement":
        rec = db.query_one(
            """SELECT sa.*, u.name AS student_name, s.current_year AS student_year
               FROM student_achievements sa
               JOIN students s ON s.id = sa.student_id
               JOIN users u    ON u.id = s.user_id
               WHERE sa.id = %s""",
            (ref_id,),
        )
        if not rec:
            return {"refreshed": False, "reason": "achievement record not found"}
        body, _ = ai_compose.compose_achievement(rec)
    elif ref_type == "event":
        rec = db.query_one("SELECT * FROM events WHERE id = %s", (ref_id,))
        if not rec:
            return {"refreshed": False, "reason": "event record not found"}
        body, _ = ai_compose.compose_event(rec)
    else:
        return {"refreshed": False, "reason": f"unsupported ref_type '{ref_type}'"}

    db.execute("UPDATE notifications SET body = %s WHERE id = %s", (body, msg["id"]))
    return {"refreshed": True}


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

    # Index it into the AI agent's knowledge base right away, so a question
    # about this record answers correctly without waiting for a manual
    # rebuild. achievement/event are the only types kb_sync understands;
    # anything else is a no-op, not an error.
    sync_result = (
        kb_sync.upsert(msg["ref_type"], msg["ref_id"])
        if msg["ref_type"] in ("achievement", "event")
        else {"synced": False, "reason": "not applicable"}
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
        "indexed_for_ai": sync_result.get("synced", False),
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




@router.get("/students")
def list_students(user: dict = Depends(hod)):
    """Feeds the student picker on the achievement form."""
    return db.query_all(
        """SELECT s.id, u.name, s.roll_no, s.current_year, s.division
           FROM students s JOIN users u ON u.id = s.user_id
           WHERE s.is_active ORDER BY u.name"""
    )


# ===========================================================================
#  4. EVENTS
# ===========================================================================




# ===========================================================================
#  5. LMS DOCUMENTS
# ===========================================================================



# ===========================================================================
#  6. AI KNOWLEDGE BASE
# ===========================================================================

@router.post("/knowledge-base/rebuild")
def rebuild_knowledge_base(user: dict = Depends(hod)):
    """One-click full rebuild of the AI agent's knowledge base from live
    database rows.

    Achievements and events already sync the instant they are approved
    (see kb_sync.py, wired into /approvals/{id}/approve above). This covers
    everything that has no such hook: department vision/mission/about,
    faculty profile edits, labs, subjects, announcements. Use it after
    editing any of those, or any time you want to be certain the AI agent
    is fully caught up with the live database.
    """
    items = public_knowledge()["items"]
    result = kb_rebuild.rebuild(items)
    return {"ok": True, **result}


@router.get("/knowledge-base/status")
def knowledge_base_status(user: dict = Depends(hod)):
    """Current size of the AI knowledge base, for the dashboard to display
    next to the rebuild button."""
    docs = db.query_one("SELECT count(*) AS c FROM kb_documents")["c"]
    chunks = db.query_one("SELECT count(*) AS c FROM kb_chunks")["c"]
    return {"documents": docs, "chunks": chunks}


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