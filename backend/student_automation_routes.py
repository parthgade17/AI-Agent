"""
student_automation_routes.py
----------------------------
AI features for the student portal, mirroring the faculty automation.

Everything here is grounded in the student's own record — year, semester,
subjects, achievements — rather than generic advice, and in the department's
real placement and internship history from the knowledge base.

Wire into app.py:
    from student_automation_routes import router as student_automation_router
    app.include_router(student_automation_router)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import ai_compose
import auth
import db

router = APIRouter(prefix="/api/student/ai", tags=["student-ai"])


def me(user: dict = Depends(auth.current_user)) -> dict:
    row = db.query_one("SELECT id FROM students WHERE user_id = %s", (user["id"],))
    if not row:
        raise HTTPException(
            status_code=403,
            detail="This feature is for students. Use the login for your role.",
        )
    return {**user, "student_id": row["id"]}


def student_context(student_id: int) -> dict:
    """Everything we know about this student, for grounding the AI."""
    profile = db.query_one(
        """SELECT u.name, s.roll_no, s.current_year, s.current_semester,
                  s.division, s.github_url, s.linkedin_url,
                  d.name AS department
           FROM students s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN department d ON d.id = s.department_id
           WHERE s.id = %s""",
        (student_id,),
    ) or {}

    achievements = db.query_all(
        """SELECT title, category, position, event_name, achieved_on, is_published
           FROM student_achievements WHERE student_id = %s
           ORDER BY achieved_on DESC NULLS LAST LIMIT 20""",
        (student_id,),
    )

    subjects = db.query_all(
        """SELECT s.name, s.code, s.semester
           FROM subjects s
           WHERE %s IS NULL OR s.semester IS NULL OR s.semester <= %s
           ORDER BY s.semester NULLS LAST LIMIT 25""",
        (profile.get("current_semester"), profile.get("current_semester")),
    )

    # What the department has actually placed people into, so advice is
    # anchored to real outcomes rather than generic industry talk.
    placements = db.query_all(
        """SELECT title, description, achieved_on
           FROM faculty_achievements
           WHERE is_published AND (
                 title ILIKE '%placement%' OR title ILIKE '%internship%'
              OR title ILIKE '%certification%')
           ORDER BY achieved_on DESC NULLS LAST LIMIT 10"""
    )

    return {
        "profile": profile,
        "achievements": achievements,
        "subjects": subjects,
        "department_outcomes": placements,
    }


def as_facts(ctx: dict) -> str:
    p = ctx["profile"]
    lines = [
        f"Name: {p.get('name', 'the student')}",
        f"Department: {p.get('department') or 'Computer Science and Engineering'}",
        f"Year of study: {p.get('current_year') or 'not recorded'}",
        f"Current semester: {p.get('current_semester') or 'not recorded'}",
    ]
    if p.get("github_url"):
        lines.append(f"GitHub: {p['github_url']}")

    if ctx["achievements"]:
        lines.append("\nTheir achievements so far:")
        for a in ctx["achievements"]:
            bits = [a["title"]]
            if a.get("position"):
                bits.append(a["position"])
            if a.get("event_name"):
                bits.append(a["event_name"])
            lines.append("  - " + " — ".join(bits) + f" ({a['category']})")
    else:
        lines.append("\nThey have no achievements recorded yet.")

    if ctx["subjects"]:
        names = ", ".join(s["name"] for s in ctx["subjects"][:12])
        lines.append(f"\nSubjects covered so far: {names}")

    if ctx["department_outcomes"]:
        lines.append("\nWhat this department's students have recently achieved:")
        for o in ctx["department_outcomes"][:6]:
            lines.append(f"  - {o['title']}")

    return "\n".join(lines)


# ===========================================================================
#  PLACEMENT PREPARATION
# ===========================================================================

ROADMAP_PROMPT = """You are a placement mentor for final-year and pre-final-year \
Computer Science students at Sanjivani University, Kopargaon.

Write a preparation plan for the specific student described below.

Rules:
1. Use their actual year, semester, subjects and achievements. Refer to them.
2. Be concrete. Name topics, not categories. "Trees, graphs and DP on LeetCode
   medium" beats "practise data structures".
3. Scale the plan to their year. A second-year student has time to build
   fundamentals; a final-year student needs interview readiness now.
4. Plain text. No markdown, no asterisks, no emoji, no headings with hashes.
5. Structure it as: where they stand, the next 30 days, the next 3 months,
   and what to fix first.
6. Around 300 words. Direct and specific.
7. If they have few achievements, say so plainly and make building one the
   first priority. Do not flatter.
"""

GAP_PROMPT = """You are an honest academic advisor at a Computer Science department.

Look at this student's record and name the three most important gaps between
where they are and being placement-ready.

Rules:
1. Base every point on their actual record below. Do not invent weaknesses.
2. Be direct. If they have no internship, no projects or no certifications,
   say that.
3. For each gap, give one specific action they can start this week.
4. Plain text, no markdown. Three numbered points. Around 150 words.
5. Do not soften it with praise. They need to know what is missing.
"""

POLISH_PROMPT = """You rewrite a student's achievement description so it reads \
well on a department page and a CV.

Rules:
1. Use only the facts given. Never add a prize, rank, date or detail.
2. Two or three sentences. Factual, not boastful.
3. Plain text. No markdown, no emoji.
4. Output the description only.
"""


class PolishIn(BaseModel):
    title: str = Field(min_length=3)
    description: str | None = None
    event_name: str | None = None
    organiser: str | None = None
    position: str | None = None
    category: str | None = None


@router.get("/placement-roadmap")
def placement_roadmap(user: dict = Depends(me)):
    """A preparation plan built from this student's own record."""
    ctx = student_context(user["student_id"])
    try:
        text, model_id = ai_compose.chat(ROADMAP_PROMPT, as_facts(ctx))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"The AI is unavailable right now. {e}",
        )

    return {
        "roadmap": text,
        "model": model_id,
        "based_on": {
            "year": ctx["profile"].get("current_year"),
            "semester": ctx["profile"].get("current_semester"),
            "achievements": len(ctx["achievements"]),
            "subjects": len(ctx["subjects"]),
        },
    }


@router.get("/skill-gaps")
def skill_gaps(user: dict = Depends(me)):
    """The three things most worth fixing, from the student's actual record."""
    ctx = student_context(user["student_id"])
    try:
        text, model_id = ai_compose.chat(GAP_PROMPT, as_facts(ctx))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"The AI is unavailable right now. {e}")

    return {"gaps": text, "model": model_id}


@router.post("/polish-achievement")
def polish_achievement(body: PolishIn, user: dict = Depends(me)):
    """Rewrite an achievement description before submitting it.

    Returns a suggestion. The student chooses whether to use it — nothing is
    saved here.
    """
    facts = [f"Achievement: {body.title}"]
    for label, value in (
        ("Category", body.category), ("Position", body.position),
        ("Event", body.event_name), ("Organiser", body.organiser),
        ("What the student wrote", body.description),
    ):
        if value:
            facts.append(f"{label}: {value}")

    try:
        text, model_id = ai_compose.chat(POLISH_PROMPT, "\n".join(facts))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"The AI is unavailable right now. {e}")

    return {"description": text, "model": model_id}
