"""
Authentication endpoints.

Wire into your existing app.py with two lines:

    from auth_routes import router as auth_router
    app.include_router(auth_router)

Endpoints:
    POST /api/login    {username, password}   -> {token, role, role_label, name, email}
    POST /api/signup   {name, email, mobile, password, role}
    GET  /api/me       requires Authorization: Bearer <token>
    POST /api/logout
"""
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel

import auth

router = APIRouter(prefix="/api", tags=["auth"])


class LoginIn(BaseModel):
    username: str            # the login form sends the email address in this field
    password: str


class SignupIn(BaseModel):
    name: str
    email: str
    mobile: str
    password: str
    role: str = "student"    # accepted for convenience, ignored — see auth.register


@router.post("/login")
def login(body: LoginIn):
    return auth.login(body.username, body.password)


@router.post("/signup")
def signup(body: SignupIn):
    return auth.register(body.name, body.email, body.mobile, body.password)


@router.get("/me")
def me(user: dict = Depends(auth.current_user)):
    return {"name": user["name"], "email": user["email"], "role": user["role"]}


@router.post("/logout")
def logout(authorization: str = Header(default="")):
    if authorization.startswith("Bearer "):
        auth.logout(authorization[7:])
    return {"ok": True}
