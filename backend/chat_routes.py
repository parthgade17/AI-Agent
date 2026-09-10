"""
Shared AI Agent chat endpoint.

Every signed-in role — student, faculty, admin (HOD) — hits the same route.
rag_engine already scopes retrieval by role (aud_student / aud_faculty /
aud_admin columns on kb_documents) and logs the exchange, so this file is
deliberately thin: resolve the caller, hand off, translate errors.

Wire into app.py:
    from chat_routes import router as chat_router
    app.include_router(chat_router)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import auth
import db
import rag_engine

router = APIRouter(prefix="/api/chat", tags=["chat"])


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    conversation_id: int | None = None


@router.post("/ask")
def ask(body: AskIn, user: dict = Depends(auth.current_user)):
    """Ask the department AI agent a question.

    Available to every role. rag_engine.generate_answer resolves which
    knowledge-base documents this role may see, calls the LLM, and logs
    both turns to ai_conversations / ai_messages under this user's id.
    """
    try:
        return rag_engine.generate_answer(
            body.question,
            role=user["role"],
            user_id=user["id"],
            conversation_id=body.conversation_id,
        )
    except RuntimeError as e:
        # groq_model() / call_llm raise RuntimeError for configuration or
        # rate-limit problems (missing key, retired model, 429 exhausted).
        # Surface that as a clean 502 with the real message instead of a
        # raw stack trace reaching the browser.
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/conversations")
def conversations(user: dict = Depends(auth.current_user)):
    """This user's past conversations, most recent first."""
    return db.query_all(
        """SELECT id, title, message_count, started_at, last_message_at
           FROM ai_conversations
           WHERE user_id = %s
           ORDER BY last_message_at DESC
           LIMIT 30""",
        (user["id"],),
    )


@router.get("/conversations/{conversation_id}")
def history(conversation_id: int, user: dict = Depends(auth.current_user)):
    """Past turns in one conversation, for reloading a chat on page refresh.

    Scoped by user_id in the join, so a user can never read someone else's
    conversation by guessing an id.
    """
    owned = db.query_one(
        "SELECT id FROM ai_conversations WHERE id = %s AND user_id = %s",
        (conversation_id, user["id"]),
    )
    if not owned:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return db.query_all(
        """SELECT role, content, sources, answered, created_at
           FROM ai_messages
           WHERE conversation_id = %s
           ORDER BY created_at""",
        (conversation_id,),
    )