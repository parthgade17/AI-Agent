"""
ingest_kb.py  (v2 -- matches your REAL database schema)
--------------------------------------------------------
Your actual kb_documents table (confirmed via \\d kb_documents):
    id, filename (UNIQUE, NOT NULL), title, section, source, source_url,
    aud_student (bool), aud_faculty (bool), aud_admin (bool),
    lms_document_id (FK), content_hash, updated (date), ingested_at

There is no free-text "audience" or "content" column -- audience is three
booleans, and kb_documents holds document-level metadata only. The actual
text lives in kb_chunks, which did not exist in your database yet, so this
script creates it (see ensure_kb_chunks below).

kb.json groups multiple chunks under the same "source" string (e.g. several
chunks all belong to "CSE Laboratories and Infrastructure, CSE-INFRA-2025-26").
Each unique source becomes ONE kb_documents row; every kb.json item under
that source becomes one kb_chunks row.

No pgvector: embeddings are stored as double precision[] and similarity is
computed in Python (see rag_engine.py) -- avoids the missing 'vector'
extension entirely.

USAGE:
    # .env in this folder must have DATABASE_URL set
    python ingest_kb.py
"""

import os
import sys
import re
import json
import hashlib
from collections import defaultdict
from datetime import datetime

import psycopg2
from psycopg2.extras import execute_values
from sentence_transformers import SentenceTransformer

import env_loader  # noqa: F401  (reads .env in any Windows encoding)

KB_JSON_PATH = os.environ.get("KB_JSON_PATH", "kb.json")
DATABASE_URL = os.environ.get("DATABASE_URL")
CHUNK_MAX_CHARS = 700
CHUNK_OVERLAP = 80
MODEL_NAME = "all-MiniLM-L6-v2"  # 384-dim


def load_kb(path: str):
    if not os.path.exists(path):
        print(f"ERROR: {path} not found.", file=sys.stderr)
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "chunks" in data:
        data = data["chunks"]
    if not isinstance(data, list):
        print("ERROR: kb.json is not a list of chunk objects.", file=sys.stderr)
        sys.exit(1)
    return data


def slugify(text: str, maxlen: int = 180) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return slug[:maxlen] or "document"


def split_long_text(text: str, max_chars=CHUNK_MAX_CHARS, overlap=CHUNK_OVERLAP):
    text = text.strip()
    if len(text) <= max_chars:
        return [text]
    pieces = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        pieces.append(text[start:end].strip())
        if end == len(text):
            break
        start = end - overlap
    return [p for p in pieces if p]


def ensure_kb_chunks(cur):
    """kb_chunks did not exist in your database -- create it. Does NOT
    touch kb_documents, which already exists with its real columns."""
    cur.execute("""
        CREATE TABLE IF NOT EXISTS kb_chunks (
            id SERIAL PRIMARY KEY,
            document_id INT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
            chunk_index INT NOT NULL,
            chunk_text TEXT NOT NULL,
            embedding DOUBLE PRECISION[],
            ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (document_id, chunk_index)
        );
    """)


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set (check your .env file).", file=sys.stderr)
        sys.exit(1)

    print(f"Loading {KB_JSON_PATH} ...")
    items = load_kb(KB_JSON_PATH)
    print(f"  {len(items)} source chunks found")

    # Group chunks by their shared "source" -- that's the real document.
    groups = defaultdict(list)
    for item in items:
        groups[item.get("source", "unknown")].append(item)
    print(f"  grouped into {len(groups)} documents")

    print(f"Loading embedding model ({MODEL_NAME}) ...")
    model = SentenceTransformer(MODEL_NAME)

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        ensure_kb_chunks(cur)

        total_chunks_written = 0
        for source, group_items in groups.items():
            section = group_items[0].get("section", "")
            filename = slugify(source) + ".json"
            title = source  # kb.json has no separate title field

            aud_student = any(
                "student" in (it.get("audience") or []) for it in group_items
            )
            aud_faculty = any(
                "faculty" in (it.get("audience") or []) for it in group_items
            )
            aud_admin = any(
                a in (it.get("audience") or []) for it in group_items
                for a in ("admin", "administrator")
            )

            content_hash = hashlib.sha1(
                "".join(it.get("text", "") for it in group_items).encode("utf-8")
            ).hexdigest()

            updated = None
            for it in group_items:
                d = parse_date(it.get("last_updated"))
                if d:
                    updated = d
                    break

            cur.execute("""
                INSERT INTO kb_documents
                    (filename, title, section, source, aud_student, aud_faculty,
                     aud_admin, content_hash, updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (filename) DO UPDATE
                    SET title = EXCLUDED.title,
                        section = EXCLUDED.section,
                        aud_student = EXCLUDED.aud_student,
                        aud_faculty = EXCLUDED.aud_faculty,
                        aud_admin = EXCLUDED.aud_admin,
                        content_hash = EXCLUDED.content_hash,
                        updated = EXCLUDED.updated
                RETURNING id;
            """, (filename, title, section, source, aud_student, aud_faculty,
                  aud_admin, content_hash, updated))
            document_id = cur.fetchone()[0]

            # Clear old chunks for this doc so re-running never duplicates
            cur.execute("DELETE FROM kb_chunks WHERE document_id = %s;", (document_id,))

            # Each kb.json item under this source may itself need splitting
            # if long; keep a running chunk_index across all of them.
            chunk_texts = []
            for it in group_items:
                chunk_texts.extend(split_long_text(it.get("text", "")))

            embeddings = model.encode(chunk_texts, normalize_embeddings=True)
            rows = [
                (document_id, idx, text, emb.tolist())
                for idx, (text, emb) in enumerate(zip(chunk_texts, embeddings))
            ]

            execute_values(
                cur,
                """INSERT INTO kb_chunks (document_id, chunk_index, chunk_text, embedding)
                   VALUES %s""",
                rows,
                template="(%s, %s, %s, %s)"
            )
            total_chunks_written += len(rows)
            print(f"  [{section}] {title[:60]!r}: {len(rows)} chunk(s), "
                  f"student={aud_student} faculty={aud_faculty} admin={aud_admin}")

        conn.commit()
        print(f"\nDone. {len(groups)} documents, {total_chunks_written} chunks embedded.")

        cur.execute("SELECT count(*) FROM kb_documents;")
        print(f"kb_documents total rows: {cur.fetchone()[0]}")
        cur.execute("SELECT count(*) FROM kb_chunks;")
        print(f"kb_chunks total rows: {cur.fetchone()[0]}")

    except Exception as e:
        conn.rollback()
        print(f"\nFAILED, rolled back. Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()