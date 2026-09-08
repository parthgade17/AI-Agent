# Authentication — setup

## Backend

```bash
pip install -r backend/requirements.txt

createdb cse_agent
psql -d cse_agent -f backend/schema_auth.sql
```

Copy `backend/.env.example` to `backend/.env` and set your database URL.

Then create the staff accounts:

```bash
python seed_users.py
```

| Email | Password | Role |
|---|---|---|
| hod@sanjivani.edu.in | hod12345 | admin |
| teacher@sanjivani.edu.in | teacher12345 | faculty |
| student@sanjivani.edu.in | student12345 | student |

Add two lines to your existing `app.py`:

```python
from auth_routes import router as auth_router
app.include_router(auth_router)
```

If you have no `app.py` yet, this runs on its own:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth_routes import router as auth_router
import db

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router)

@app.on_event("startup")
def startup():
    db.check_connection()
```

Start it: `uvicorn app:app --reload --port 8000`

Test:

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hod@sanjivani.edu.in","password":"hod12345"}'
```

## Frontend

Copy into your React project:

- `api.ts` → `src/api.ts`
- `components/AuthModal.tsx` → `src/components/AuthModal.tsx`
- `components/AuthModal.css` → `src/components/AuthModal.css`

Then apply the four edits to `src/components/LandingPage.tsx` shown in
`LandingPage.patch`, or apply it directly:

```bash
git apply LandingPage.patch
```

Also append this to `src/components/LandingPage.css`:

```css
.login-menu-user {
  display: block;
  padding: 8px 12px 10px;
  margin-bottom: 4px;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 13px;
}
```

## Forms

**Login** — email, password.
**Sign up** — full name, email, +91 mobile, password, confirm password.

Validation runs before the request: valid email format, 10-digit mobile starting
6–9, password at least 8 characters, confirm must match. Errors appear under each
field.

## Note on roles

`auth.register` always creates a `student`, whatever role the form sends. Otherwise
anyone could register as HOD by editing the request in devtools. Staff accounts come
from `seed_users.py`.
