"""
kb_sync.py
----------
Keeps the AI agent's knowledge base current without re-running ingest_kb.py.

The gap this closes: kb_documents / kb_chunks were built once from kb.json.
A student achievement approved today is in student_achievements, shows on the
landing page, and is completely invisible to the assistant — ask about it and
you get "I don't have that information in the department records."

Now, the moment the HOD approves something, this writes it straight into the
knowledge base as its own document and chunks, using the same model, the same
chunking and the same 384-dimension embeddings as ingest_kb.py, so retrieval
treats it identically to the seeded content.

Design notes:

  * One kb_documents row per live record, keyed by a stable filename such as
    live-achievement-42.json. Re-approving updates in place rather than
    duplicating — the same ON CONFLICT (filename) pattern ingest_kb.py uses.
  * Unpublishing removes it again, so the assistant never answers from a
    record the department has withdrawn.
  * Every call is wrapped so a sync failure can never fail an approval. The
    HOD publishing a record matters more than the index being instantly
    current; a failed sync is logged and fixed by the next ingest_kb.py run.
  * The embedding model is loaded once per process and reused.
"""

import hashlib
from datetime import date
from typing import Any

import db

MODEL_NAME = "all-MiniLM-L6-v2"          # 384-dim, matches ingest_kb.py
CHUNK_MAX_CHARS = 1200
CHUNK_OVERLAP = 120

_model = None


def model():
    """Loaded lazily so importing this module stays cheap."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def split_long_text(text: str, max_chars: int = CHUNK_MAX_CHARS,
                    overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Same splitter as ingest_kb.py, so chunk sizes stay consistent."""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    out, start = [], 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        piece = text[start:end].strip()
        if piece:
            out.append(piece)
        if end == len(text):
            break
        start = end - overlap
    return out


# ---------------------------------------------------------------- rendering

def _fmt_date(value: Any) -> str:
    if not value:
        return ""
    if isinstance(value, (date,)):
        return value.strftime("%d %B %Y")
    return str(value)


def render_achievement(row: dict) -> tuple[str, str, str]:
    """Returns (title, text, source) for one published student achievement."""
    who = row.get("student_name") or "A student"
    parts = [f"{who} — {row['title']}."]

    if row.get("position"):
        parts.append(f"Position: {row['position']}.")
    if row.get("event_name"):
        parts.append(f"Event: {row['event_name']}.")
    if row.get("organiser"):
        parts.append(f"Organised by {row['organiser']}.")
    if row.get("location"):
        parts.append(f"Location: {row['location']}.")
    if row.get("prize_amount"):
        parts.append(f"Prize money: Rs. {int(row['prize_amount']):,}.")
    if row.get("achieved_on"):
        parts.append(f"Date: {_fmt_date(row['achieved_on'])}.")
    if row.get("current_year"):
        parts.append(f"Year of study at the time: {row['current_year']}.")
    if row.get("roll_no"):
        parts.append(f"Roll number: {row['roll_no']}.")
    if row.get("category"):
        parts.append(f"Category: {row['category'].replace('_', ' ')}.")
    if row.get("description"):
        parts.append(row["description"])
    if row.get("verified_by_name"):
        parts.append(f"Verified by {row['verified_by_name']}.")

    title = f"{who} — {row['title']}"
    text = (
        f"Student achievement, Department of Computer Science and Engineering, "
        f"Sanjivani University. " + " ".join(parts)
    )
    return title, text, "Verified student achievement record"


def render_event(row: dict) -> tuple[str, str, str]:
    """Returns (title, text, source) for one published event."""
    scope = ("Institute level, open to the whole university"
             if row.get("scope") == "institute" else "CSE department level")
    parts = [
        f"{row['title']} — a {scope} "
        f"{(row.get('event_type') or 'event').replace('_', ' ')}."
    ]

    if row.get("starts_at"):
        parts.append(f"Starts: {row['starts_at']:%d %B %Y at %I:%M %p}.")
    if row.get("ends_at"):
        parts.append(f"Ends: {row['ends_at']:%d %B %Y at %I:%M %p}.")
    if row.get("venue"):
        parts.append(f"Venue: {row['venue']}.")
    if row.get("speaker"):
        parts.append(f"Speaker: {row['speaker']}.")
    if row.get("organiser"):
        parts.append(f"Organiser: {row['organiser']}.")
    if row.get("contact_person"):
        parts.append(f"Contact: {row['contact_person']}"
                     + (f", {row['contact_number']}" if row.get("contact_number") else "")
                     + ".")
    if row.get("registration_link"):
        parts.append(f"Registration link: {row['registration_link']}")
    if row.get("max_participants"):
        parts.append(f"Seats: {row['max_participants']}.")
    if row.get("description"):
        parts.append(row["description"])

    text = (
        f"Department event, Department of Computer Science and Engineering, "
        f"Sanjivani University. " + " ".join(parts)
    )
    return row["title"], text, "Department events record"


# ------------------------------------------------------------------- lookup

def fetch_achievement(record_id: int) -> dict | None:
    return db.query_one(
        """SELECT sa.*, u.name AS student_name, s.roll_no, s.current_year,
                  vu.name AS verified_by_name
           FROM student_achievements sa
           JOIN students s  ON s.id = sa.student_id
           JOIN users u     ON u.id = s.user_id
           LEFT JOIN faculty vf ON vf.id = sa.verified_by
           LEFT JOIN users vu   ON vu.id = vf.user_id
           WHERE sa.id = %s""",
        (record_id,),
    )


def fetch_event(record_id: int) -> dict | None:
    return db.query_one("SELECT * FROM events WHERE id = %s", (record_id,))


# -------------------------------------------------------------------- write

def upsert(ref_type: str, record_id: int) -> dict:
    """Write one live record into the knowledge base.

    Returns a small status dict. Never raises — callers are request handlers
    where an approval must succeed even if indexing does not.
    """
    try:
        if ref_type == "achievement":
            row = fetch_achievement(record_id)
            if not row:
                return {"synced": False, "reason": "record not found"}
            if not row.get("is_published"):
                # Withdrawn or not yet approved: make sure it is not indexed.
                return remove(ref_type, record_id)
            title, text, source = render_achievement(row)
            section = "achievements"

        elif ref_type == "event":
            row = fetch_event(record_id)
            if not row:
                return {"synced": False, "reason": "record not found"}
            if not row.get("is_published"):
                return remove(ref_type, record_id)
            title, text, source = render_event(row)
            section = "events"

        else:
            return {"synced": False, "reason": f"unsupported type {ref_type}"}

        filename = f"live-{ref_type}-{record_id}.json"
        chunks = split_long_text(text)
        if not chunks:
            return {"synced": False, "reason": "nothing to index"}

        vectors = model().encode(chunks, normalize_embeddings=True)
        content_hash = hashlib.sha1(text.encode("utf-8")).hexdigest()

        doc = db.execute(
            """INSERT INTO kb_documents
                   (filename, title, section, source,
                    aud_student, aud_faculty, aud_admin, content_hash, updated)
               VALUES (%s, %s, %s, %s, TRUE, TRUE, TRUE, %s, CURRENT_DATE)
               ON CONFLICT (filename) DO UPDATE
                   SET title = EXCLUDED.title,
                       section = EXCLUDED.section,
                       source = EXCLUDED.source,
                       content_hash = EXCLUDED.content_hash,
                       updated = EXCLUDED.updated
               RETURNING id""",
            (filename, title, section, source, content_hash),
        )
        document_id = doc["id"]

        # Replace rather than append, so re-approving never duplicates.
        db.execute("DELETE FROM kb_chunks WHERE document_id = %s", (document_id,))

        for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
            db.execute(
                """INSERT INTO kb_chunks (document_id, chunk_index, chunk_text, embedding)
                   VALUES (%s, %s, %s, %s)""",
                (document_id, idx, chunk, vec.tolist()),
            )

        print(f"[kb_sync] indexed {filename} ({len(chunks)} chunk(s)) — "
              f"the assistant can answer about it now")
        return {"synced": True, "document_id": document_id, "chunks": len(chunks)}

    except Exception as e:
        # An approval must never fail because indexing did. The next
        # ingest_kb.py run picks up anything missed here.
        print(f"[kb_sync] could not index {ref_type} {record_id}: {e}")
        return {"synced": False, "reason": str(e)}


def remove(ref_type: str, record_id: int) -> dict:
    """Drop a record from the knowledge base, for unpublish or delete."""
    try:
        filename = f"live-{ref_type}-{record_id}.json"
        row = db.execute(
            "DELETE FROM kb_documents WHERE filename = %s RETURNING id", (filename,)
        )
        # kb_chunks cascades on document delete.
        if row:
            print(f"[kb_sync] removed {filename} from the knowledge base")
            return {"synced": True, "removed": True}
        return {"synced": True, "removed": False}
    except Exception as e:
        print(f"[kb_sync] could not remove {ref_type} {record_id}: {e}")
        return {"synced": False, "reason": str(e)}


# ------------------------------------------------------------- backfill

def backfill() -> dict:
    """Index everything already published but missing from the knowledge base.

    Run once after installing this module, so records approved before it
    existed become answerable too:

        python -c "import kb_sync; print(kb_sync.backfill())"
    """
    done = {"achievements": 0, "events": 0, "failed": 0}

    for r in db.query_all(
        "SELECT id FROM student_achievements WHERE is_published ORDER BY id"
    ):
        if upsert("achievement", r["id"]).get("synced"):
            done["achievements"] += 1
        else:
            done["failed"] += 1

    for r in db.query_all(
        "SELECT id FROM events WHERE is_published ORDER BY id"
    ):
        if upsert("event", r["id"]).get("synced"):
            done["events"] += 1
        else:
            done["failed"] += 1

    print(f"[kb_sync] backfill complete: {done}")
    return done
