"""
Public endpoints — no authentication required.

These feed the landing page. Everything here is department information that
is already public, and it is read from the same tables the AI agent ingests,
so the website and the assistant cannot drift apart.

Only published, non-sensitive rows are exposed: student names appear solely
through achievements a faculty member has verified and published.

Wire into app.py:
    from public_routes import router as public_router
    app.include_router(public_router)
"""
from fastapi import APIRouter, HTTPException

import db

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/department")
def department():
    """Everything the Department Overview tab needs, in one call."""
    dept = db.query_one(
        """SELECT id, name, code, school, university, established_year,
                  about, vision, mission, hod_message, accreditation,
                  email, phone, address
           FROM department WHERE code = 'CSE'"""
    )
    if not dept:
        # A 200 carrying {"error": ...} looks like valid data to the caller,
        # which is how a missing row turned into a crash on dept.stats.faculty.
        raise HTTPException(
            status_code=404,
            detail="Department record not found. Run seed.sql and seed_content.sql.",
        )

    dept["courses"] = db.query_all(
        """SELECT name, short_name, degree_level, duration_years, intake
           FROM courses WHERE department_id = %s AND is_active
           ORDER BY CASE degree_level WHEN 'UG' THEN 1 WHEN 'PG' THEN 2 ELSE 3 END""",
        (dept["id"],),
    )
    dept["subjects"] = db.query_all(
        """SELECT s.code, s.name, s.semester, s.subject_type
           FROM subjects s JOIN courses c ON c.id = s.course_id
           WHERE c.department_id = %s AND s.subject_type = 'core'
           ORDER BY s.name""",
        (dept["id"],),
    )
    dept["labs"] = db.query_all(
        """SELECT name, location, total_systems, operating_system, processor,
                  memory, software, features, sponsored_by, is_coe, is_24x7
           FROM labs WHERE department_id = %s ORDER BY is_coe DESC, name""",
        (dept["id"],),
    )

    # Headline counts, computed rather than hardcoded, so the page can never
    # claim a number the database does not support.
    # Always present, always integers. The page reads dept.stats.faculty
    # directly, so this object must never be missing or partial.
    dept["stats"] = {
        "faculty": db.query_one("SELECT count(*) AS c FROM faculty WHERE is_active")["c"] or 0,
        "students": db.query_one("SELECT count(*) AS c FROM students WHERE is_active")["c"] or 0,
        "programmes": len(dept["courses"]),
        "laboratories": len(dept["labs"]),
    }

    # Lists are never null, so the page can map over them without guarding.
    for key in ("courses", "subjects", "labs"):
        dept[key] = dept.get(key) or []

    return dept


@router.get("/faculty")
def faculty():
    """Public faculty directory. Personal mobile numbers are not exposed."""
    return db.query_all(
        """SELECT f.id, u.name, u.email, f.designation, f.qualification,
                  f.specialization, f.research_areas, f.experience_years,
                  f.office_location, f.available_hours, f.is_hod,
                  (SELECT count(*) FROM faculty_achievements fa
                    WHERE fa.faculty_id = f.id AND fa.is_published) AS publications,
                  (SELECT count(*) FROM research_scholars rs
                    WHERE rs.supervisor_id = f.id AND rs.status = 'ongoing') AS scholars
           FROM faculty f JOIN users u ON u.id = f.user_id
           WHERE f.is_active AND u.is_active
           ORDER BY f.is_hod DESC, u.name"""
    )


@router.get("/achievements")
def achievements():
    """Department and student achievements.

    Student achievements appear only once a faculty member has verified and
    published them, which the database enforces with a CHECK constraint.
    """
    return {
        "department": db.query_all(
            """SELECT fa.title, fa.category, fa.description, fa.venue,
                      fa.impact_factor, fa.achieved_on, u.name AS faculty_name
               FROM faculty_achievements fa
               JOIN faculty f ON f.id = fa.faculty_id
               JOIN users u   ON u.id = f.user_id
               WHERE fa.is_published
               ORDER BY fa.achieved_on DESC NULLS LAST, fa.id DESC"""
        ),
        "students": db.query_all(
            """SELECT sa.title, sa.category, sa.description, sa.event_name,
                      sa.organiser, sa.position, sa.prize_amount, sa.achieved_on,
                      u.name AS student_name, s.current_year
               FROM student_achievements sa
               JOIN students s ON s.id = sa.student_id
               JOIN users u    ON u.id = s.user_id
               WHERE sa.is_published
               ORDER BY sa.achieved_on DESC NULLS LAST"""
        ),
    }


@router.get("/events")
def events():
    """Upcoming and recent events, split so the page can show both."""
    return {
        "upcoming": db.query_all(
            """SELECT id, title, scope, event_type, description, venue,
                      starts_at, ends_at, organiser, speaker, registration_link
               FROM events
               WHERE is_published AND starts_at >= now()
               ORDER BY starts_at"""
        ),
        "past": db.query_all(
            """SELECT id, title, scope, event_type, description, venue,
                      starts_at, organiser, speaker
               FROM events
               WHERE is_published AND starts_at < now()
               ORDER BY starts_at DESC
               LIMIT 12"""
        ),
    }


@router.get("/announcements")
def announcements():
    return db.query_all(
        """SELECT id, title, body, priority, is_pinned, published_at
           FROM announcements
           WHERE published_at IS NOT NULL
             AND (expires_at IS NULL OR expires_at > now())
           ORDER BY is_pinned DESC, published_at DESC
           LIMIT 20"""
    )


@router.get("/gallery")
def gallery(section: str | None = None):
    """Department photographs, grouped by subject.

    Images are served from /static/gallery/<filename>. Grouping by media_key
    keeps the three Micromouse photos together as one item rather than three
    unrelated tiles.
    """
    where = "AND section = %s" if section else ""
    params = (section,) if section else ()
    rows = db.query_all(
        f"""SELECT filename, caption, media_key, section, source_doc,
                   event_title, lab_name, achievement_title, sort_order
            FROM v_gallery WHERE TRUE {where}
            ORDER BY section, media_key, sort_order""",
        params,
    )

    grouped: dict[str, dict] = {}
    for r in rows:
        g = grouped.setdefault(r["media_key"], {
            "key": r["media_key"],
            "caption": r["caption"],
            "section": r["section"],
            "source": r["source_doc"],
            "linked_to": r["event_title"] or r["lab_name"] or r["achievement_title"],
            "images": [],
        })
        g["images"].append(f"/static/gallery/{r['filename']}")

    return {"count": len(rows), "groups": list(grouped.values())}


@router.get("/knowledge")
def knowledge():
    """Flattened department knowledge, ready for the AI agent to ingest.

    This is deliberately the same data the landing page shows. Ingesting from
    here rather than from a separate corpus means the assistant can never
    contradict the website, and any update by the HOD reaches both at once.

    Each item carries the section and source that retrieval filters and
    citations rely on.
    """
    items: list[dict] = []

    dept = db.query_one(
        "SELECT name, about, vision, mission, hod_message, school, university "
        "FROM department WHERE code = 'CSE'"
    )
    if dept:
        for field, title in (
            ("about", "About the Department"),
            ("vision", "Department Vision"),
            ("mission", "Department Mission"),
            ("hod_message", "Message from the Head of Department"),
        ):
            if dept.get(field):
                items.append({
                    "section": "department",
                    "title": title,
                    "content": f"{title} — {dept['name']}, {dept['school']}, "
                               f"{dept['university']}.\n\n{dept[field]}",
                    "source": "Department record",
                })

    for lab in db.query_all("SELECT * FROM labs ORDER BY name"):
        spec = ", ".join(
            filter(None, [
                f"{lab['total_systems']} systems" if lab["total_systems"] else None,
                lab["operating_system"], lab["processor"], lab["memory"],
            ])
        )
        items.append({
            "section": "infrastructure",
            "title": lab["name"],
            "content": f"{lab['name']}. {spec}. "
                       f"{'Centre of Excellence. ' if lab['is_coe'] else ''}"
                       f"{'Open 24x7. ' if lab['is_24x7'] else ''}"
                       f"{'Sponsored by ' + lab['sponsored_by'] + '. ' if lab['sponsored_by'] else ''}"
                       f"{lab['features'] or ''}",
            "source": "CSE Laboratory Information",
        })

    for f in db.query_all(
        """SELECT u.name, f.designation, f.qualification, f.specialization,
                  f.research_areas, f.experience_years, f.office_location, f.is_hod
           FROM faculty f JOIN users u ON u.id = f.user_id WHERE f.is_active"""
    ):
        items.append({
            "section": "faculty",
            "title": f["name"],
            "content": f"{f['name']}, {f['designation'] or 'Faculty'}"
                       f"{' (Head of Department)' if f['is_hod'] else ''}. "
                       f"Qualification: {f['qualification'] or 'not recorded'}. "
                       f"Specialization: {f['specialization'] or 'not recorded'}. "
                       f"Research areas: {f['research_areas'] or 'not recorded'}. "
                       f"Experience: {f['experience_years'] or 'not recorded'} years."
                       f"{' Office: ' + f['office_location'] + '.' if f['office_location'] else ''}",
            "source": "Faculty profile",
        })

    for a in db.query_all(
        """SELECT fa.title, fa.category, fa.description, fa.venue, fa.achieved_on
           FROM faculty_achievements fa WHERE fa.is_published"""
    ):
        items.append({
            "section": "achievements",
            "title": a["title"],
            "content": f"{a['title']}. {a['description'] or ''} "
                       f"{'Venue: ' + a['venue'] + '.' if a['venue'] else ''} "
                       f"{'Date: ' + str(a['achieved_on']) + '.' if a['achieved_on'] else ''}",
            "source": "CSE Department Achievements and Highlights 2025-26",
        })

    for a in db.query_all(
        """SELECT sa.title, sa.description, sa.event_name, sa.organiser,
                  sa.position, sa.prize_amount, sa.achieved_on, u.name AS student
           FROM student_achievements sa
           JOIN students s ON s.id = sa.student_id
           JOIN users u    ON u.id = s.user_id
           WHERE sa.is_published"""
    ):
        items.append({
            "section": "achievements",
            "title": f"{a['student']} — {a['title']}",
            "content": f"{a['student']} achieved {a['title']}. "
                       f"{'Event: ' + a['event_name'] + '. ' if a['event_name'] else ''}"
                       f"{'Organiser: ' + a['organiser'] + '. ' if a['organiser'] else ''}"
                       f"{'Position: ' + a['position'] + '. ' if a['position'] else ''}"
                       f"{a['description'] or ''}",
            "source": "Verified student achievement record",
        })

    for e in db.query_all(
        "SELECT title, scope, event_type, description, venue, starts_at, "
        "organiser, speaker FROM events WHERE is_published"
    ):
        items.append({
            "section": "events",
            "title": e["title"],
            "content": f"{e['title']} — a {e['scope']}-level {e['event_type'].replace('_', ' ')}. "
                       f"{e['description'] or ''} "
                       f"{'Speaker: ' + e['speaker'] + '. ' if e['speaker'] else ''}"
                       f"{'Venue: ' + e['venue'] + '. ' if e['venue'] else ''}"
                       f"Date: {e['starts_at']:%d %B %Y}.",
            "source": "Department events record",
        })

    for c in db.query_all(
        """SELECT c.name, c.degree_level, c.duration_years,
                  string_agg(s.name, ', ' ORDER BY s.name) AS subjects
           FROM courses c LEFT JOIN subjects s ON s.course_id = c.id
           GROUP BY c.id, c.name, c.degree_level, c.duration_years"""
    ):
        items.append({
            "section": "academics",
            "title": c["name"],
            "content": f"{c['name']} ({c['degree_level']}"
                       f"{', ' + str(c['duration_years']) + ' years' if c['duration_years'] else ''}). "
                       f"{'Core subjects: ' + c['subjects'] + '.' if c['subjects'] else ''}",
            "source": "Curriculum record",
        })

    # Photograph captions are department facts too: they name events, dates
    # and the people in them, and give the assistant something to point at.
    for m in db.query_all(
        """SELECT filename, caption, section, source_doc,
                  event_title, lab_name, achievement_title
           FROM v_gallery"""
    ):
        linked = m["event_title"] or m["lab_name"] or m["achievement_title"]
        items.append({
            "section": m["section"],
            "title": f"Photograph: {m['caption']}",
            "content": f"{m['caption']}."
                       f"{' Documents: ' + linked + '.' if linked else ''} "
                       f"Photograph available at /static/gallery/{m['filename']}.",
            "source": m["source_doc"] or "Department photograph",
        })

    return {"count": len(items), "items": items}