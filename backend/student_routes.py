"""
Student portal endpoints.

Every route requires a signed-in user. Students only ever see their own
records; the queries are scoped by the user id resolved from the bearer
token, never from anything the client sends.

Wire into app.py:
    from student_routes import router as student_router
    app.include_router(student_router)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import auth
import db

router = APIRouter(prefix="/api/student", tags=["student"])

CATEGORIES = {"hackathon", "competition", "coding", "sports", "research",
              "certification", "internship", "placement", "entrepreneurship",
              "academic", "other"}


def me(user: dict = Depends(auth.current_user)) -> dict:
    """Resolve the signed-in user to their student row, creating it if needed.

    Someone who registers through the signup form gets a users row but no
    students row, so the first visit to the portal creates one rather than
    failing with a 404.
    """
    row = db.query_one("SELECT * FROM students WHERE user_id = %s", (user["id"],))
    if row:
        return {**user, "student_id": row["id"]}

    if user["role"] != "student":
        raise HTTPException(
            status_code=403,
            detail="This portal is for students. Use the login for your role.",
        )

    dept = db.query_one("SELECT id FROM department WHERE code = 'CSE'")
    created = db.execute(
        "INSERT INTO students (user_id, department_id) VALUES (%s, %s) RETURNING id",
        (user["id"], dept["id"] if dept else None),
    )
    return {**user, "student_id": created["id"]}


# ===========================================================================
#  PROFILE
# ===========================================================================

class ProfileIn(BaseModel):
    name: str | None = None
    mobile: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None


@router.get("/profile")
def get_profile(user: dict = Depends(me)):
    return db.query_one(
        """SELECT s.id, u.name, u.email, u.mobile,
                  s.roll_no, s.prn, s.current_year, s.current_semester,
                  s.division, s.admission_year, s.graduation_year,
                  s.github_url, s.linkedin_url,
                  d.name AS department_name,
                  (SELECT c.name FROM courses c
                    WHERE c.department_id = d.id AND c.degree_level = 'UG'
                    ORDER BY c.id LIMIT 1) AS course_name
           FROM students s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN department d ON d.id = s.department_id
           WHERE s.id = %s""",
        (user["student_id"],),
    )


@router.put("/profile")
def update_profile(body: ProfileIn, user: dict = Depends(me)):
    """Students may edit their contact details only.

    Roll number, year, division and department are set by the office, so they
    are not writable here even though the form displays them.
    """
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    for col in ("name", "mobile"):
        if col in data:
            db.execute(f"UPDATE users SET {col} = %s WHERE id = %s", (data.pop(col), user["id"]))

    if data:
        sets = ", ".join(f"{k} = %s" for k in data)
        db.execute(f"UPDATE students SET {sets} WHERE id = %s",
                   (*data.values(), user["student_id"]))

    return get_profile(user)


# ===========================================================================
#  DEPARTMENT
# ===========================================================================

@router.get("/department")
def department(user: dict = Depends(me)):
    dept = db.query_one("SELECT * FROM department WHERE code = 'CSE'")
    if not dept:
        raise HTTPException(status_code=404, detail="Department record not found")

    dept["labs"] = db.query_all(
        """SELECT name, total_systems, operating_system, processor, memory,
                  software, features, sponsored_by, is_coe, is_24x7
           FROM labs WHERE department_id = %s ORDER BY name""",
        (dept["id"],),
    )
    dept["courses"] = db.query_all(
        "SELECT name, short_name, degree_level, duration_years, intake "
        "FROM courses WHERE department_id = %s ORDER BY degree_level",
        (dept["id"],),
    )
    dept["faculty_count"] = db.query_one(
        "SELECT count(*) AS c FROM faculty WHERE is_active"
    )["c"]
    dept["student_count"] = db.query_one(
        "SELECT count(*) AS c FROM students WHERE is_active"
    )["c"]
    return dept


@router.get("/faculty")
def faculty(user: dict = Depends(me)):
    return db.query_all(
        """SELECT id, name, designation, qualification, specialization,
                  research_areas, office_location, available_hours, is_hod,
                  achievement_count
           FROM v_faculty_directory ORDER BY is_hod DESC, name"""
    )


@router.get("/labs")
def labs(user: dict = Depends(me)):
    return db.query_all(
        """SELECT l.id, l.name, l.location, l.total_systems, l.operating_system,
                  l.processor, l.memory, l.software, l.features,
                  l.sponsored_by, l.is_coe, l.is_24x7
           FROM labs l ORDER BY l.name"""
    )


# ===========================================================================
#  ACHIEVEMENTS
# ===========================================================================

class AchievementIn(BaseModel):
    title: str = Field(min_length=3)
    category: str = "other"
    description: str | None = None
    event_name: str | None = None
    organiser: str | None = None
    position: str | None = None
    achieved_on: str | None = None
    proof_url: str | None = None


@router.get("/achievements")
def list_achievements(user: dict = Depends(me)):
    """The student's own achievements, including ones still awaiting approval."""
    return db.query_all(
        """SELECT sa.id, sa.title, sa.category, sa.description, sa.event_name,
                  sa.organiser, sa.position, sa.prize_amount, sa.achieved_on,
                  sa.is_published, sa.verified_at, sa.created_at,
                  vu.name AS verified_by_name
           FROM student_achievements sa
           LEFT JOIN faculty vf ON vf.id = sa.verified_by
           LEFT JOIN users vu   ON vu.id = vf.user_id
           WHERE sa.student_id = %s
           ORDER BY sa.achieved_on DESC NULLS LAST, sa.id DESC""",
        (user["student_id"],),
    )


@router.post("/achievements", status_code=201)
def add_achievement(body: AchievementIn, user: dict = Depends(me)):
    """Submitted unverified. A faculty member must approve it before it is public."""
    if body.category not in CATEGORIES:
        raise HTTPException(
            status_code=400, detail=f"Category must be one of: {sorted(CATEGORIES)}"
        )

    row = db.execute(
        """INSERT INTO student_achievements
               (student_id, title, category, description, event_name, organiser,
                position, achieved_on, proof_url, created_by, is_published)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,FALSE)
           RETURNING id""",
        (user["student_id"], body.title, body.category, body.description,
         body.event_name, body.organiser, body.position, body.achieved_on,
         body.proof_url, user["id"]),
    )
    return {"id": row["id"], "status": "pending_verification"}


@router.delete("/achievements/{ach_id}")
def delete_achievement(ach_id: int, user: dict = Depends(me)):
    """Only your own, and only while it is still unverified."""
    owner = db.query_one(
        "SELECT student_id, verified_at FROM student_achievements WHERE id = %s", (ach_id,)
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Achievement not found")
    if owner["student_id"] != user["student_id"]:
        raise HTTPException(status_code=403, detail="That achievement belongs to someone else")
    if owner["verified_at"] is not None:
        raise HTTPException(
            status_code=409,
            detail="This achievement has been verified by faculty and cannot be removed. "
                   "Contact the department office.",
        )

    db.execute("DELETE FROM student_achievements WHERE id = %s", (ach_id,))
    return {"ok": True}


# ===========================================================================
#  LMS
# ===========================================================================

@router.get("/lms")
def lms(user: dict = Depends(me)):
    profile = db.query_one(
        "SELECT current_semester, current_year FROM students WHERE id = %s",
        (user["student_id"],),
    )
    semester = profile["current_semester"] if profile else None

    subjects = db.query_all(
        """SELECT s.id, s.code, s.name, s.semester, s.credits, s.subject_type,
                  u.name AS faculty_name
           FROM subjects s
           LEFT JOIN faculty f ON f.id = s.faculty_id
           LEFT JOIN users u   ON u.id = f.user_id
           WHERE %s IS NULL OR s.semester IS NULL OR s.semester = %s
           ORDER BY s.name""",
        (semester, semester),
    )

    documents = db.query_all(
        """SELECT l.id, l.title, l.doc_type, l.semester, l.unit_number,
                  l.file_size_kb, l.uploaded_at,
                  s.name AS subject_name, u.name AS uploaded_by_name
           FROM lms_documents l
           LEFT JOIN subjects s ON s.id = l.subject_id
           JOIN users u ON u.id = l.uploaded_by
           WHERE l.for_students
           ORDER BY l.uploaded_at DESC""",
    )

    return {
        "current_semester": semester,
        "current_year": profile["current_year"] if profile else None,
        "subjects": subjects,
        "documents": documents,
    }


# ===========================================================================
#  EVENTS AND ANNOUNCEMENTS
# ===========================================================================

@router.get("/events")
def events(user: dict = Depends(me)):
    return db.query_all("SELECT * FROM v_upcoming_events")


@router.get("/announcements")
def announcements(user: dict = Depends(me)):
    return db.query_all(
        """SELECT id, title, body, priority, is_pinned, published_at, attachment_url
           FROM announcements
           WHERE for_students
             AND published_at IS NOT NULL
             AND (expires_at IS NULL OR expires_at > now())
           ORDER BY is_pinned DESC, published_at DESC
           LIMIT 50"""
    )