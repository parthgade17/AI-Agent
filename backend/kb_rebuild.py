"""
kb_rebuild.py
-------------
One-click full rebuild of the AI agent's knowledge base from live database
rows -- the manual counterpart to kb_sync.py's per-record instant sync.

kb_sync.py indexes one achievement or event the instant the HOD approves it.
That covers the two things that change during a demo. It does NOT cover:
department vision/mission/about edits, a new or edited faculty profile, a
new lab, a new subject, or a new announcement -- each lives in a different
endpoint with no natural "approval" moment to hook.

Rather than add a sync call to every one of those endpoints, this module
wipes the knowledge base and rebuilds it from exactly what
public_routes.knowledge() reports as true right now. That function already
flattens department, labs, faculty, published achievements, events,
curriculum and gallery captions into one list -- it is the same data the
landing page itself would show, so the AI agent can never say something the
website doesn't. Calling it fresh means editing ANY of those fields and
clicking "Rebuild" makes the AI current, with no per-endpoint hook to
forget.

kb_sync.py's instant sync keeps running underneath this -- an achievement
approved between two rebuilds still shows up immediately. This just adds a
full-coverage safety net on top, triggered by hand:

    POST /api/hod/knowledge-base/rebuild
"""
import hashlib
import re

import db
import kb_sync  # reuses the same embedding model instance and text splitter


def _slugify(text: str, maxlen: int = 150) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text or "").strip("-").lower()
    return slug[:maxlen] or "item"


def rebuild(knowledge_items: list[dict]) -> dict:
    """knowledge_items is exactly the list public_routes.knowledge() returns.

    Passed in rather than imported here, so this module has no dependency on
    FastAPI or routing and can be tested or reused standalone.

    Full reset: every row in kb_documents is deleted first (kb_chunks
    cascades on delete), including whatever kb_sync wrote incrementally --
    the rebuild below reinserts that too, since knowledge_items already
    includes published achievements and events. Nothing is lost, it is
    just re-indexed fresh in one pass.
    """
    db.execute("DELETE FROM kb_documents")

    written_docs = 0
    written_chunks = 0
    failed = 0
    seen_slugs: dict[str, int] = {}

    for item in knowledge_items:
        try:
            content = (item.get("content") or "").strip()
            if not content:
                continue

            base_slug = _slugify(f"{item.get('section', 'general')}-{item.get('title', '')}")
            seen_slugs[base_slug] = seen_slugs.get(base_slug, 0) + 1
            n = seen_slugs[base_slug]
            filename = f"kb-{base_slug}" + ("" if n == 1 else f"-{n}") + ".json"

            chunks = kb_sync.split_long_text(content)
            if not chunks:
                continue

            vectors = kb_sync.model().encode(chunks, normalize_embeddings=True)
            content_hash = hashlib.sha1(content.encode("utf-8")).hexdigest()

            doc = db.execute(
                """INSERT INTO kb_documents
                       (filename, title, section, source,
                        aud_student, aud_faculty, aud_admin, content_hash, updated)
                   VALUES (%s, %s, %s, %s, TRUE, TRUE, TRUE, %s, CURRENT_DATE)
                   RETURNING id""",
                (filename, item.get("title", ""), item.get("section", "general"),
                 item.get("source", "Department record"), content_hash),
            )
            document_id = doc["id"]

            for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
                db.execute(
                    """INSERT INTO kb_chunks (document_id, chunk_index, chunk_text, embedding)
                       VALUES (%s, %s, %s, %s)""",
                    (document_id, idx, chunk, vec.tolist()),
                )
                written_chunks += 1

            written_docs += 1

        except Exception as e:
            failed += 1
            print(f"[kb_rebuild] failed to index item {item.get('title')!r}: {e}")

    result = {"documents": written_docs, "chunks": written_chunks, "failed": failed}
    print(f"[kb_rebuild] rebuild complete: {result}")
    return result
