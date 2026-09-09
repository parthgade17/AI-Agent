"""
CSE Department AI Agent — backend.

Serves authentication, the HOD dashboard, and the student and faculty portals. The RAG endpoints get added on
top of this later; nothing here needs to change when they do.

Run:  uvicorn app:app --reload --port 8000
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import db
from auth_routes import router as auth_router
from hod_routes import router as hod_router
from student_routes import router as student_router
from faculty_routes import router as faculty_router
from public_routes import router as public_router

app = FastAPI(title="CSE Department AI Agent")

# Allow any localhost port. Vite picks 5174, 5175 and so on when 5173 is
# already taken, and a hardcoded list fails the CORS preflight when that
# happens — the browser then never sends the login request at all.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers are registered after the middleware, which is required for CORS
# headers to be applied to their responses.
app.include_router(auth_router)
app.include_router(hod_router)
app.include_router(student_router)
app.include_router(faculty_router)
app.include_router(public_router)

# Department photographs. Files live in backend/static/gallery/ and are
# referenced from the media table by filename only.
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(STATIC_DIR, "gallery"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


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