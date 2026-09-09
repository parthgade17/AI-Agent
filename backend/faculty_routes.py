"""
Faculty portal endpoints.

Every route resolves the caller to their own faculty row from the bearer
token. A faculty member can manage their own profile and achievements, add
and verify student achievements, and upload teaching material.

Wire into app.py:
    from faculty_routes import router as faculty_router
    app.include_router(faculty_router)
"""
import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

import auth
import db

router = APIRouter(prefix="/api/faculty", tags=["faculty"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXT = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".zip"}
MAX_UPLOAD_MB = 25

FACULTY_CATEGORIES = {"publication", "patent", "grant", "award",
                      "invited_talk", "certification", "book", "other"}

STUDENT_CATEGORIES = {"hackathon", "competition", "coding", "sports", "research",
                      "certification", "internship", "placement",
                      "entrepreneurship", "academic", "other"}

DOC_TYPES = {"notes", "assignment", "question_bank", "practical_manual",
             "circular", "syllabus", "timetable", "other"}


def me(user: dict = Depends(auth.current_user)) -> dict:
    """Resolve the caller to their faculty row, creating it on first visit.

    The HOD is a faculty member too, so admin passes here as well.
    """
    row = db.query_one("SELECT id FROM faculty WHERE user_id = %s", (user["id"],))
    if row:
        return {**user, "faculty_id": row["id"]}

    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(
            status_code=403,
            detail="This portal is for faculty. Use the login for your role.",
        )

    dept = db.query_one("SELECT id FROM department WHERE code = 'CSE'")
    created = db.execute(
        "INSERT INTO faculty (user_id, department_id, is_hod) VALUES (%s, %s, %s) RETURNING id",
        (user["id"], dept["id"] if dept else None, user["role"] == "admin"),
    )
    return {**user, "faculty_id": created["id"]}


# ===========================================================================
#  PROFILE
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
    employee_code: str | None = None
    linkedin_url: str | None = None
    scholar_url: str | None = None


@router.get("/profile")
def get_profile(user: dict = Depends(me)):
    row = db.query_one(
        """SELECT f.id, u.name, u.email, u.mobile,
                  f.employee_code, f.designation, f.qualification, f.specialization,
                  f.research_areas, f.experience_years, f.office_location,
                  f.available_hours, f.linkedin_url, f.scholar_url, f.is_hod,
                  d.name AS department_name
           FROM faculty f
           JOIN users u ON u.id = f.user_id
           LEFT JOIN department d ON d.id = f.department_id
           WHERE f.id = %s""",
        (user["faculty_id"],),
    )
    row["scholars"] = db.query_all(
        "SELECT id, name, topic, status FROM research_scholars "
        "WHERE supervisor_id = %s ORDER BY name",
        (user["faculty_id"],),
    )
    return row


@router.put("/profile")
def update_profile(body: ProfileIn, user: dict = Depends(me)):
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    for col in ("name", "mobile"):
        if col in data:
            db.execute(f"UPDATE users SET {col} = %s WHERE id = %s", (data.pop(col), user["id"]))

    if data:
        sets = ", ".join(f"{k} = %s" for k in data)
        db.execute(f"UPDATE faculty SET {sets} WHERE id = %s",
                   (*data.values(), user["faculty_id"]))

    return get_profile(user)


# ===========================================================================
#  OWN ACHIEVEMENTS
# ===========================================================================

class FacultyAchievementIn(BaseModel):
    title: str = Field(min_length=3)
    category: str = "publication"
    description: str | None = None
    venue: str | None = None
    publisher: str | None = None
    impact_factor: float | None = None
    doi: str | None = None
    co_authors: str | None = None
    is_main_author: bool | None = None
    grant_amount: float | None = None
    achieved_on: str | None = None
    proof_url: str | None = None


@router.get("/achievements")
def list_achievements(user: dict = Depends(me)):
    return db.query_all(
        """SELECT id, title, category, description, venue, publisher,
                  impact_factor, doi, co_authors, is_main_author,
                  grant_amount, achieved_on, proof_url, created_at
           FROM faculty_achievements
           WHERE faculty_id = %s
           ORDER BY achieved_on DESC NULLS LAST, id DESC""",
        (user["faculty_id"],),
    )


@router.post("/achievements", status_code=201)
def add_achievement(body: FacultyAchievementIn, user: dict = Depends(me)):
    if body.category not in FACULTY_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Category must be one of: {sorted(FACULTY_CATEGORIES)}",
        )
    row = db.execute(
        """INSERT INTO faculty_achievements
               (faculty_id, title, category, description, venue, publisher,
                impact_factor, doi, co_authors, is_main_author, grant_amount,
                achieved_on, proof_url)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (user["faculty_id"], body.title, body.category, body.description,
         body.venue, body.publisher, body.impact_factor, body.doi,
         body.co_authors, body.is_main_author, body.grant_amount,
         body.achieved_on, body.proof_url),
    )
    return {"id": row["id"]}


@router.put("/achievements/{ach_id}")
def edit_achievement(ach_id: int, body: FacultyAchievementIn, user: dict = Depends(me)):
    owner = db.query_one(
        "SELECT faculty_id FROM faculty_achievements WHERE id = %s", (ach_id,)
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Achievement not found")
    if owner["faculty_id"] != user["faculty_id"]:
        raise HTTPException(status_code=403, detail="That record belongs to someone else")
    if body.category not in FACULTY_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Category must be one of: {sorted(FACULTY_CATEGORIES)}",
        )

    db.execute(
        """UPDATE faculty_achievements
              SET title=%s, category=%s, description=%s, venue=%s, publisher=%s,
                  impact_factor=%s, doi=%s, co_authors=%s, is_main_author=%s,
                  grant_amount=%s, achieved_on=%s, proof_url=%s
            WHERE id=%s""",
        (body.title, body.category, body.description, body.venue, body.publisher,
         body.impact_factor, body.doi, body.co_authors, body.is_main_author,
         body.grant_amount, body.achieved_on, body.proof_url, ach_id),
    )
    return {"ok": True}


@router.delete("/achievements/{ach_id}")
def delete_achievement(ach_id: int, user: dict = Depends(me)):
    owner = db.query_one(
        "SELECT faculty_id FROM faculty_achievements WHERE id = %s", (ach_id,)
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Achievement not found")
    if owner["faculty_id"] != user["faculty_id"]:
        raise HTTPException(status_code=403, detail="That record belongs to someone else")

    db.execute("DELETE FROM faculty_achievements WHERE id = %s", (ach_id,))
    return {"ok": True}


# ===========================================================================
#  STUDENT ACHIEVEMENTS  —  add and verify
# ===========================================================================

class StudentAchievementIn(BaseModel):
    student_id: int
    title: str = Field(min_length=3)
    category: str = "other"
    description: str | None = None
    event_name: str | None = None
    organiser: str | None = None
    position: str | None = None
    prize_amount: float | None = None
    achieved_on: str | None = None


@router.get("/students")
def list_students(user: dict = Depends(me)):
    return db.query_all(
        """SELECT s.id, u.name, s.roll_no, s.current_year, s.division
           FROM students s JOIN users u ON u.id = s.user_id
           WHERE s.is_active ORDER BY u.name"""
    )


@router.get("/student-achievements")
def list_student_achievements(pending_only: bool = False, user: dict = Depends(me)):
    where = "WHERE sa.verified_at IS NULL" if pending_only else ""
    return db.query_all(
        f"""SELECT sa.id, sa.title, sa.category, sa.description, sa.event_name,
                   sa.organiser, sa.position, sa.prize_amount, sa.achieved_on,
                   sa.is_published, sa.verified_at, sa.created_at,
                   u.name AS student_name, s.roll_no, s.current_year, s.division,
                   vu.name AS verified_by_name
            FROM student_achievements sa
            JOIN students s ON s.id = sa.student_id
            JOIN users u    ON u.id = s.user_id
            LEFT JOIN faculty vf ON vf.id = sa.verified_by
            LEFT JOIN users vu   ON vu.id = vf.user_id
            {where}
            ORDER BY sa.created_at DESC"""
    )


@router.post("/student-achievements", status_code=201)
def add_student_achievement(body: StudentAchievementIn, user: dict = Depends(me)):
    """Added by faculty, so it is verified on creation but not yet published."""
    if body.category not in STUDENT_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Category must be one of: {sorted(STUDENT_CATEGORIES)}",
        )
    if not db.query_one("SELECT 1 FROM students WHERE id = %s", (body.student_id,)):
        raise HTTPException(status_code=404, detail="Student not found")

    row = db.execute(
        """INSERT INTO student_achievements
               (student_id, title, category, description, event_name, organiser,
                position, prize_amount, achieved_on, created_by, verified_by,
                is_published)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,FALSE) RETURNING id""",
        (body.student_id, body.title, body.category, body.description,
         body.event_name, body.organiser, body.position, body.prize_amount,
         body.achieved_on, user["id"], user["faculty_id"]),
    )
    return {"id": row["id"], "status": "verified_pending_publication"}


@router.post("/student-achievements/{ach_id}/verify")
def verify_student_achievement(ach_id: int, publish: bool = True, user: dict = Depends(me)):
    """Approve a student submission. The trigger stamps verified_at."""
    row = db.query_one("SELECT verified_at FROM student_achievements WHERE id = %s", (ach_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Achievement not found")

    db.execute(
        "UPDATE student_achievements SET verified_by = %s, is_published = %s WHERE id = %s",
        (user["faculty_id"], publish, ach_id),
    )
    db.execute(
        "INSERT INTO audit_log (user_id, action, table_name, record_id) "
        "VALUES (%s, 'verify', 'student_achievements', %s)",
        (user["id"], ach_id),
    )
    return {"ok": True, "published": publish}


@router.post("/student-achievements/{ach_id}/reject")
def reject_student_achievement(ach_id: int, user: dict = Depends(me)):
    """Clear verification and unpublish, leaving the record for the student to fix."""
    if not db.query_one("SELECT 1 FROM student_achievements WHERE id = %s", (ach_id,)):
        raise HTTPException(status_code=404, detail="Achievement not found")

    db.execute(
        "UPDATE student_achievements SET is_published = FALSE, verified_by = NULL "
        "WHERE id = %s",
        (ach_id,),
    )
    return {"ok": True}


# ===========================================================================
#  LMS  —  subjects and teaching material
# ===========================================================================

@router.get("/subjects")
def subjects(user: dict = Depends(me)):
    """Subjects assigned to this faculty member, plus the rest of the syllabus."""
    return db.query_all(
        """SELECT s.id, s.code, s.name, s.semester, s.credits, s.subject_type,
                  (s.faculty_id = %s) AS is_mine
           FROM subjects s
           ORDER BY (s.faculty_id = %s) DESC, s.semester NULLS LAST, s.name""",
        (user["faculty_id"], user["faculty_id"]),
    )


@router.get("/lms")
def list_lms(mine_only: bool = False, user: dict = Depends(me)):
    where = "WHERE l.uploaded_by = %s" if mine_only else ""
    params = (user["id"],) if mine_only else ()
    return db.query_all(
        f"""SELECT l.id, l.title, l.doc_type, l.description, l.semester,
                   l.unit_number, l.file_size_kb, l.for_students, l.is_indexed,
                   l.uploaded_at, l.download_count,
                   s.name AS subject_name, u.name AS uploaded_by_name,
                   (l.uploaded_by = {'%s' if mine_only else 'l.uploaded_by'}) AS is_mine
            FROM lms_documents l
            LEFT JOIN subjects s ON s.id = l.subject_id
            JOIN users u ON u.id = l.uploaded_by
            {where}
            ORDER BY l.uploaded_at DESC""",
        params * 2 if mine_only else params,
    )


@router.post("/lms", status_code=201)
def upload_lms(
    file: UploadFile = File(...),
    title: str = Form(...),
    doc_type: str = Form("notes"),
    subject_id: int | None = Form(None),
    semester: int | None = Form(None),
    unit_number: int | None = Form(None),
    description: str | None = Form(None),
    user: dict = Depends(me),
):
    if doc_type not in DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Type must be one of: {sorted(DOC_TYPES)}")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"File type {ext or 'unknown'} is not allowed")

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
                file_path, file_type, file_size_kb, semester, unit_number)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (subject_id, user["id"], title, doc_type, description,
         path, ext.lstrip("."), size_kb, semester, unit_number),
    )
    return {"id": row["id"], "filename": safe, "size_kb": size_kb}


@router.delete("/lms/{doc_id}")
def delete_lms(doc_id: int, user: dict = Depends(me)):
    row = db.query_one(
        "SELECT uploaded_by, file_path FROM lms_documents WHERE id = %s", (doc_id,)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    if row["uploaded_by"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="You can only delete your own uploads")

    db.execute("DELETE FROM lms_documents WHERE id = %s", (doc_id,))
    if row["file_path"] and os.path.exists(row["file_path"]):
        os.remove(row["file_path"])
    return {"ok": True}


# ===========================================================================
#  DASHBOARD
# ===========================================================================

@router.get("/stats")
def stats(user: dict = Depends(me)):
    fid, uid = user["faculty_id"], user["id"]
    return {
        "my_achievements": db.query_one(
            "SELECT count(*) AS c FROM faculty_achievements WHERE faculty_id = %s", (fid,)
        )["c"],
        "my_subjects": db.query_one(
            "SELECT count(*) AS c FROM subjects WHERE faculty_id = %s", (fid,)
        )["c"],
        "my_uploads": db.query_one(
            "SELECT count(*) AS c FROM lms_documents WHERE uploaded_by = %s", (uid,)
        )["c"],
        "my_scholars": db.query_one(
            "SELECT count(*) AS c FROM research_scholars "
            "WHERE supervisor_id = %s AND status = 'ongoing'", (fid,)
        )["c"],
        "pending_verifications": db.query_one(
            "SELECT count(*) AS c FROM student_achievements WHERE verified_at IS NULL"
        )["c"],
        "verified_by_me": db.query_one(
            "SELECT count(*) AS c FROM student_achievements WHERE verified_by = %s", (fid,)
        )["c"],
        "total_students": db.query_one(
            "SELECT count(*) AS c FROM students WHERE is_active"
        )["c"],
        "upcoming_events": db.query_one(
            "SELECT count(*) AS c FROM events WHERE is_published AND starts_at >= now()"
        )["c"],
    }


@router.get("/activity")
def activity(user: dict = Depends(me)):
    """Recent actions by this user, read from the audit log."""
    return db.query_all(
        """SELECT action, table_name, record_id, created_at
           FROM audit_log WHERE user_id = %s
           ORDER BY created_at DESC LIMIT 8""",
        (user["id"],),
    )