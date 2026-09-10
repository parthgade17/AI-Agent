"""
rag_engine.py
-------------
Retrieval-augmented answering over the CSE department knowledge base.

Matches the real schema:
    kb_documents(id, filename, title, section, source, aud_student,
                 aud_faculty, aud_admin, content_hash, updated, ...)
    kb_chunks(id, document_id, chunk_index, chunk_text,
              embedding DOUBLE PRECISION[], ingested_at)
    ai_conversations(id, user_id NOT NULL, title, message_count,
                     started_at, last_message_at)
    ai_messages(id, conversation_id, role, content, sources JSONB, section,
                answered, retrieved_count, latency_ms, model, feedback)

No pgvector: embeddings are float arrays and cosine similarity is computed
in Python. With a few hundred chunks that is well under a millisecond.

Environment:
    DATABASE_URL   postgresql://postgres:PASSWORD@127.0.0.1:5432/cse_agent
    LLM_PROVIDER   groq (default) or gemini
    GROQ_API_KEY   or GEMINI_API_KEY
"""

import json
import os
import re
import time
from typing import Any

import psycopg2
import psycopg2.extras
import requests
from sentence_transformers import SentenceTransformer

# Reads .env whatever encoding Windows wrote it in, and ignores shell
# wrapper lines. Replaces python-dotenv, which silently loaded nothing
# from a UTF-16 file and left every variable unset.
import env_loader  # noqa: F401  (importing it performs the load)

DATABASE_URL = os.environ.get("DATABASE_URL")
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "groq").lower()
MODEL_NAME = "all-MiniLM-L6-v2"

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")

# Groq retires model IDs without much notice, which is what a 404 from the
# chat endpoint means. Rather than hardcode one name, ask the account which
# models it actually has and take the first preference that is available.
GROQ_PREFERENCES = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
]

_groq_model: str | None = None
_key_index = 0


def groq_keys() -> list[str]:
    """Every Groq key configured, in order.

    Supports GROQ_API_KEY plus GROQ_API_KEY_2, _3, ... so a dead or
    rate-limited key can roll over to the next instead of failing the request.
    """
    keys = []
    primary = os.environ.get("GROQ_API_KEY", "").strip()
    if primary:
        keys.append(primary)
    for n in range(2, 9):
        extra = os.environ.get(f"GROQ_API_KEY_{n}", "").strip()
        if extra:
            keys.append(extra)
    return keys


def groq_model() -> str:
    """The model to use, resolved once against the models the key can see."""
    global _groq_model
    if _groq_model:
        return _groq_model

    forced = os.environ.get("GROQ_MODEL")
    if forced:
        _groq_model = forced
        return _groq_model

    key = os.environ.get("GROQ_API_KEY")
    try:
        r = requests.get(
            GROQ_MODELS_URL,
            headers={"Authorization": f"Bearer {key}"},
            timeout=15,
        )
        r.raise_for_status()
        available = {m["id"] for m in r.json().get("data", [])}
    except Exception as e:
        raise RuntimeError(
            "Could not reach Groq to list models. Check GROQ_API_KEY and your "
            f"internet connection. Original error: {e}"
        )

    for candidate in GROQ_PREFERENCES:
        if candidate in available:
            _groq_model = candidate
            print(f"[rag_engine] using Groq model: {candidate}")
            return _groq_model

    # Nothing preferred is present, so take any chat model the key can see.
    chat_models = sorted(
        m for m in available
        if not any(x in m for x in ("whisper", "tts", "guard", "embed"))
    )
    if chat_models:
        _groq_model = chat_models[0]
        print(f"[rag_engine] no preferred model available, using: {_groq_model}")
        return _groq_model

    raise RuntimeError(
        f"Your Groq key exposes no usable chat model. Models visible: {sorted(available)}"
    )

TOP_K = 6            # chunks handed to the model
KEYWORD_RESCUE = 3   # extra chunks pulled by literal term match

REFUSAL = "I don't have that information in the department records."

SYSTEM_PROMPT = f"""You are the assistant for the Department of Computer Science \
and Engineering, Sanjivani University, Kopargaon.

Rules, without exception:
1. Answer ONLY from the CONTEXT below. It is the department's own documents.
2. If the context does not contain the answer, reply exactly: "{REFUSAL}"
   Never guess, and never use general knowledge about universities.
3. When you DO answer, end with a line beginning "Source:" naming the document
   titles you used. When you refuse, output ONLY the refusal sentence — no
   Source line, no [1] [2] citation markers, nothing else.
4. Be concise and factual. No praise, no filler.
5. When asked about a person, state only what the documents say.
"""

# Department shorthand the embedding model handles poorly on its own. The
# expansion is appended to the query before embedding, so "who is the HOD"
# also carries the words the documents actually use.
SYNONYMS = {
    r"\bhod\b": "Head of Department",
    r"\bcoe\b": "Centre of Excellence",
    r"\blms\b": "Learning Management System documents notes",
    r"\bcv lab\b": "Computer Vision Laboratory",
    r"\bds lab\b": "Data Science Laboratory",
    r"\bgpu\b": "Advanced Computing Laboratories high-performance GPU",
    r"\bsir\b": "faculty professor",
    r"\bma'?am\b": "faculty professor",
    r"\bplacement[s]?\b": "placement package CTC recruited company",
    r"\bfees?\b": "fee structure tuition",
    r"\bpaper[s]?\b": "research papers publications",
}

_model: SentenceTransformer | None = None


def embedder() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Check your .env file.")
    return psycopg2.connect(DATABASE_URL)


# ---------------------------------------------------------------- retrieval

def expand(question: str) -> str:
    """Append the long form of any department shorthand found in the question."""
    extra = [
        full for pattern, full in SYNONYMS.items()
        if re.search(pattern, question, re.I)
    ]
    return f"{question} {' '.join(extra)}".strip() if extra else question


# Words that clearly point at one section of the knowledge base. A small
# score bonus is enough to lift the right section above generic prose that
# merely happens to contain the same word.
SECTION_HINTS = {
    "faculty": ["faculty", "professor", "teacher", "staff", "hod",
                "head of department", "qualification", "teaches", "sir", "madam"],
    "infrastructure": ["lab", "laboratory", "computer", "system", "gpu",
                       "classroom", "facility", "software", "hardware"],
    "achievements": ["achievement", "won", "win", "prize", "award", "hackathon",
                     "competition", "internship", "certification", "placement",
                     "package", "certified"],
    "events": ["event", "workshop", "seminar", "session", "lecture",
               "programme", "program", "visit"],
    "department": ["vision", "mission", "about", "message", "curriculum",
                   "syllabus", "course", "programme offered", "centre"],
}
SECTION_BONUS = 0.08


def section_bias(question: str) -> dict[str, float]:
    """Which sections this question is probably about."""
    q = question.lower()
    return {
        section: SECTION_BONUS
        for section, words in SECTION_HINTS.items()
        if any(w in q for w in words)
    }


def cosine(a: list[float], b: list[float]) -> float:
    # Both sides are stored normalised, so the dot product is the cosine.
    return sum(x * y for x, y in zip(a, b))


def audience_column(role: str) -> str:
    return {
        "student": "aud_student",
        "faculty": "aud_faculty",
        "admin": "aud_admin",
        "administrator": "aud_admin",
    }.get((role or "student").lower(), "aud_student")


def keywords(question: str) -> list[str]:
    """Rare, meaningful words worth matching literally."""
    stop = {
        "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
        "is", "are", "was", "were", "the", "a", "an", "of", "in", "on", "at",
        "to", "for", "and", "or", "his", "her", "their", "our", "my", "me",
        "do", "does", "did", "can", "tell", "about", "give", "show", "list",
        "that", "this", "there", "have", "has", "with", "from", "get",
    }
    words = re.findall(r"[A-Za-z][A-Za-z0-9.&-]{2,}", question)
    return [w for w in words if w.lower() not in stop][:6]


def retrieve(question: str, role: str, k: int = TOP_K) -> list[dict[str, Any]]:
    """Vector similarity, plus a literal-keyword rescue pass.

    The rescue exists because a small embedding model can rank an exact term
    match surprisingly low. Anything the keyword pass finds is merged in, so
    a question naming a specific lab, person or certification always reaches
    the model even if the vector score is mediocre.
    """
    column = audience_column(role)
    query_vec = embedder().encode(expand(question), normalize_embeddings=True).tolist()

    conn = connect()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"""SELECT c.id, c.chunk_text, c.embedding,
                           d.title, d.source, d.section
                    FROM kb_chunks c
                    JOIN kb_documents d ON d.id = c.document_id
                    WHERE d.{column} AND c.embedding IS NOT NULL""",
            )
            rows = cur.fetchall()

            bias = section_bias(question)
            scored = sorted(
                (
                    {
                        **r,
                        "score": cosine(query_vec, r["embedding"])
                        + bias.get(r["section"], 0.0),
                    }
                    for r in rows
                ),
                key=lambda r: r["score"],
                reverse=True,
            )
            top = scored[:k]
            chosen = {r["id"] for r in top}

            # Literal rescue for terms the vector search may have missed.
            terms = keywords(question)
            if terms:
                pattern = "|".join(re.escape(t) for t in terms)
                cur.execute(
                    f"""SELECT c.id, c.chunk_text, d.title, d.source, d.section
                        FROM kb_chunks c
                        JOIN kb_documents d ON d.id = c.document_id
                        WHERE d.{column} AND c.chunk_text ~* %s
                        LIMIT %s""",
                    (pattern, KEYWORD_RESCUE),
                )
                for r in cur.fetchall():
                    if r["id"] not in chosen:
                        chosen.add(r["id"])
                        top.append({**r, "embedding": None, "score": 0.0})
    finally:
        conn.close()

    return top


def build_context(hits: list[dict[str, Any]]) -> str:
    return "\n\n---\n\n".join(
        f"[{i}] SOURCE: {h['source']}\nSECTION: {h['section']}\n{h['chunk_text']}"
        for i, h in enumerate(hits, 1)
    )


# --------------------------------------------------------------- generation

def call_llm(question: str, context: str) -> tuple[str, str]:
    """Returns (answer, model_id)."""
    user_msg = f"CONTEXT:\n{context}\n\nQUESTION: {question}"

    if LLM_PROVIDER == "gemini":
        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            return "GEMINI_API_KEY is not set.", GEMINI_MODEL
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_MODEL}:generateContent?key={key}"
        )
        r = requests.post(
            url,
            json={
                "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [{"parts": [{"text": user_msg}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 700},
            },
            timeout=45,
        )
        r.raise_for_status()
        parts = r.json()["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts).strip(), GEMINI_MODEL

    global _key_index

    keys = groq_keys()
    if not keys:
        return "No GROQ_API_KEY is set in your .env file.", "none"

    model_id = groq_model()
    errors = []

    # Try each key in turn. A 401 means that key is dead, a 429 means it is
    # rate limited; either way the next key may work, so roll over rather
    # than failing the student's question.
    for attempt in range(len(keys)):
        key = keys[(_key_index + attempt) % len(keys)]

        r = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {key}",
                     "Content-Type": "application/json"},
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.1,
                "max_tokens": 700,
            },
            timeout=45,
        )

        if r.ok:
            # Remember the key that worked, so the next question starts there.
            _key_index = (_key_index + attempt) % len(keys)
            return r.json()["choices"][0]["message"]["content"].strip(), model_id

        if r.status_code == 404:
            raise RuntimeError(
                f"Groq rejected the model '{model_id}' with 404. It has probably "
                f"been retired. Run 'python check_llm.py' to see what your key "
                f"can use, then set GROQ_MODEL in .env."
            )

        if r.status_code in (401, 429):
            label = "invalid" if r.status_code == 401 else "rate limited"
            errors.append(f"key ...{key[-6:]} {label}")
            continue

        r.raise_for_status()

    raise RuntimeError(
        "Every Groq key failed: " + "; ".join(errors) + ". "
        "Check the keys in .env, or wait for the rate limit to reset. "
        "Add spare keys as GROQ_API_KEY_2, GROQ_API_KEY_3 and so on."
    )


# ------------------------------------------------------------------ logging

def log_exchange(user_id, conversation_id, question, answer, hits,
                 section, answered, latency_ms, model_id) -> int | None:
    """Writes the user turn and the assistant turn.

    message_count and last_message_at are left alone: the ai_msg_bump
    trigger maintains them, and updating them here would double-count.
    """
    if not user_id:
        return conversation_id

    conn = connect()
    try:
        with conn.cursor() as cur:
            if not conversation_id:
                cur.execute(
                    "INSERT INTO ai_conversations (user_id, title) VALUES (%s, %s) "
                    "RETURNING id",
                    (user_id, question[:80]),
                )
                conversation_id = cur.fetchone()[0]

            cur.execute(
                "INSERT INTO ai_messages (conversation_id, role, content) "
                "VALUES (%s, 'user', %s)",
                (conversation_id, question),
            )
            cur.execute(
                """INSERT INTO ai_messages
                       (conversation_id, role, content, sources, section,
                        answered, retrieved_count, latency_ms, model)
                   VALUES (%s, 'assistant', %s, %s, %s, %s, %s, %s, %s)""",
                (
                    conversation_id,
                    answer,
                    # Only the sources the answer actually used. A refusal
                    # cites nothing, which keeps the dashboard honest.
                    json.dumps(sorted({h["source"] for h in hits}) if answered else []),
                    section,
                    answered,
                    len(hits),
                    latency_ms,
                    model_id,
                ),
            )
        conn.commit()
    except Exception as e:                       # logging must never break a reply
        conn.rollback()
        print(f"[rag_engine] logging failed: {e}")
    finally:
        conn.close()

    return conversation_id


# -------------------------------------------------------------------- entry

def generate_answer(question: str, role: str = "student",
                    user_id: int | None = None,
                    conversation_id: int | None = None) -> dict[str, Any]:
    started = time.perf_counter()

    hits = retrieve(question, role)

    if not hits:
        answer, model_id, answered, section = REFUSAL, "none", False, None
    else:
        answer, model_id = call_llm(question, build_context(hits))
        # The model refused, so it judged the context insufficient. Trust that
        # rather than a fixed similarity threshold, which was rejecting good
        # matches before the model ever saw them.
        answered = REFUSAL.lower()[:24] not in answer.lower()
        section = hits[0]["section"] if answered else None

    latency_ms = int((time.perf_counter() - started) * 1000)

    # Only cite sources when the answer actually used them.
    sources = sorted({h["source"] for h in hits}) if answered else []

    conversation_id = log_exchange(
        user_id, conversation_id, question, answer, hits,
        section, answered, latency_ms, model_id,
    )

    return {
        "answer": answer,
        "sources": sources,
        "conversation_id": conversation_id,
        "grounded": answered,
        "retrieved": len(hits),
        "latency_ms": latency_ms,
        "model": model_id,
    }