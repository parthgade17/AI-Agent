"""
CSE Department AI Agent — backend.

Currently serves authentication only. The RAG endpoints get added on top of
this later; nothing here needs to change when they do.

Run:  uvicorn app:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import db
from auth_routes import router as auth_router

app = FastAPI(title="CSE Department AI Agent")

# The Vite dev server runs on 5173. Both spellings are listed because the
# browser may use either depending on how you open the page.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.on_event("startup")
def startup():
    """Fail immediately with a readable message if the database is unreachable."""
    db.check_connection()


@app.get("/api/health")
def health():
    try:
        users = db.query_one("SELECT COUNT(*) AS c FROM users")["c"]
        return {"status": "ok", "users": users}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
