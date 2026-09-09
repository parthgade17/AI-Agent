"""
Authentication for the CSE Department AI Agent, backed by PostgreSQL.

Passwords are PBKDF2-SHA256 with a per-user salt. Sessions are random bearer
tokens stored in the sessions table, so they survive a server restart.

Security note on roles: self-signup always creates a student. Staff accounts
are created by seed_users.py, because otherwise anyone could register as HOD
by changing the role in the request body.
"""
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Header, HTTPException

import db

TOKEN_TTL_HOURS = 12
PBKDF2_ROUNDS = 120_000

ROLE_LABELS = {"student": "Student", "faculty": "Teacher", "admin": "HOD"}

# Roles that can be created through the public signup form.
# Narrow this to {"student"} to close staff self-registration again.
ROLE_SELF_SIGNUP = {"student", "faculty", "admin"}


# --------------------------------------------------------------- passwords

def hash_password(password: str, salt: str | None = None) -> str:
    """Return 'salt$hash'. Generates a random salt when none is supplied."""
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ROUNDS)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored)


# ---------------------------------------------------------------- sessions

def _issue_token(user: dict) -> dict:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)
    db.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user["id"], expires),
    )
    return {
        "token": token,
        "role": user["role"],
        "role_label": ROLE_LABELS.get(user["role"], user["role"]),
        "name": user["name"],
        "email": user["email"],
    }


def current_user(authorization: str = Header(default="")) -> dict:
    """FastAPI dependency. Resolves 'Authorization: Bearer <token>' to a user."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    row = db.query_one(
        """SELECT u.id, u.name, u.email, u.role, s.expires_at
           FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token = %s AND u.is_active""",
        (authorization[7:],),
    )
    if not row:
        raise HTTPException(status_code=401, detail="Session not found, please sign in again")
    if row["expires_at"] < datetime.now(timezone.utc):
        db.execute("DELETE FROM sessions WHERE token = %s", (authorization[7:],))
        raise HTTPException(status_code=401, detail="Session expired, please sign in again")

    return row


def require_admin(user: dict) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="This view is restricted to department staff")
    return user


def logout(token: str) -> None:
    db.execute("DELETE FROM sessions WHERE token = %s", (token,))


# ------------------------------------------------------------------ login

def login(email: str, password: str) -> dict:
    user = db.query_one(
        "SELECT id, name, email, password_hash, role, is_active "
        "FROM users WHERE lower(email) = lower(%s)",
        (email.strip(),),
    )

    # Verify against a dummy hash when the email is unknown, so a wrong email
    # and a wrong password take the same time and cannot be distinguished.
    stored = user["password_hash"] if user else hash_password("dummy", "0" * 32)
    ok = verify_password(password, stored)

    if not user or not ok:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="This account has been deactivated")

    return _issue_token(user)


# ----------------------------------------------------------------- signup

def register(name: str, email: str, mobile: str, password: str,
             role: str = "student") -> dict:
    """Create an account.

    Self-registration is open to all three roles. Two rules still hold, both
    imposed by the database rather than by preference:

      * only one Head of Department can exist at a time, enforced by a partial
        unique index on faculty.is_hod
      * users.role = 'admin' and faculty.is_hod must agree, enforced by a
        trigger, so the faculty row is created here rather than lazily

    If you later want staff registration closed, change ROLE_SELF_SIGNUP below
    to {"student"} and staff accounts come from seed_users.py again.
    """
    name, email, mobile = name.strip(), email.strip(), mobile.strip()
    role = (role or "student").strip().lower()

    if role not in ROLE_SELF_SIGNUP:
        raise HTTPException(
            status_code=400,
            detail=f"Accounts cannot be created with the role '{role}'",
        )
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Please enter your full name")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if not (mobile.isdigit() and len(mobile) == 10):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    if db.query_one("SELECT 1 FROM users WHERE lower(email) = lower(%s)", (email,)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Only one HOD. Check before inserting so the caller gets a readable
    # message instead of a unique-index violation.
    if role == "admin":
        existing = db.query_one(
            """SELECT u.name, u.email FROM faculty f
               JOIN users u ON u.id = f.user_id WHERE f.is_hod"""
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"A Head of Department account already exists "
                    f"({existing['name']}, {existing['email']}). "
                    f"Only one HOD account is allowed."
                ),
            )

    user = db.execute(
        """INSERT INTO users (name, email, mobile, password_hash, role)
           VALUES (%s, %s, %s, %s, %s)
           RETURNING id, name, email, role""",
        (name, email, mobile, hash_password(password), role),
    )

    dept = db.query_one("SELECT id FROM department WHERE code = 'CSE'")
    dept_id = dept["id"] if dept else None

    # Create the matching profile row so the portal works on first login.
    if role == "student":
        db.execute(
            "INSERT INTO students (user_id, department_id) VALUES (%s, %s)",
            (user["id"], dept_id),
        )
    else:
        db.execute(
            "INSERT INTO faculty (user_id, department_id, is_hod) VALUES (%s, %s, %s)",
            (user["id"], dept_id, role == "admin"),
        )

    return _issue_token(user)