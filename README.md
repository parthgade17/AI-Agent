# Department AI Agent

A knowledge assistant and workflow system for the Department of Computer Science and Engineering, Sanjivani University, Kopargaon.

Built for the Inter-Departmental LLM Competition, Institution's Innovation Council.

---

## What it does

Students, faculty and the Head of Department log into one platform. Each sees what their role allows. An AI assistant answers questions about the department — but only from the department's own records, and it says so plainly when it has no source.

Three things make it more than a chatbot:

**It is grounded.** Every answer comes from a real department document, and the assistant names the source. No source, no answer.

**It stays current.** When the HOD approves an achievement, it is indexed immediately. Ask the assistant about it seconds later and it answers. Nobody re-runs a script.

**It reports its own gaps.** Every question the assistant cannot answer is logged, so the HOD sees exactly what the department has failed to document.

---

## Approach

This is a **retrieval-augmented generation (RAG)** system, not a fine-tuned model.

Training a language model needs thousands of GPU-hours and enormous datasets. Instead, department documents are converted into vector embeddings and stored in PostgreSQL. When someone asks a question, the relevant passages are retrieved and passed to a language model with strict instructions: answer only from this context, cite the source, and refuse otherwise.

The model does the writing. The database supplies the facts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React 19 + TypeScript + Vite                           │
│  Landing page · Student · Faculty · HOD dashboards      │
└───────────────────────────┬─────────────────────────────┘
                            │  REST over HTTP, bearer token
┌───────────────────────────▼─────────────────────────────┐
│  FastAPI                                                │
│  auth · public · student · faculty · hod · chat         │
└─────────┬─────────────────────────────────┬─────────────┘
          │                                 │
┌─────────▼─────────────┐      ┌────────────▼─────────────┐
│  PostgreSQL 18        │      │  RAG pipeline            │
│  22 tables, 6 views   │◄─────┤  MiniLM embeddings       │
│  kb_documents         │      │  cosine + keyword search │
│  kb_chunks (vectors)  │      │  role-filtered retrieval │
└───────────────────────┘      └────────────┬─────────────┘
                                            │
                                 ┌──────────▼─────────────┐
                                 │  Groq                  │
                                 │  openai/gpt-oss-120b   │
                                 └────────────────────────┘
```

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19, TypeScript, Vite | Component reuse across three dashboards; type errors caught at build time |
| Animation | GSAP + ScrollTrigger | Scroll reveals and card tilt on the landing page |
| Backend | Python, FastAPI, Uvicorn | Best ecosystem for AI work; automatic API documentation |
| Database | PostgreSQL 18 | Constraints and triggers enforce rules the application cannot bypass |
| Embeddings | sentence-transformers, all-MiniLM-L6-v2 | 384 dimensions, runs locally, no cost, no data leaves the machine |
| Language model | openai/gpt-oss-120b via Groq | Strong free-tier model, very fast inference |
| Auth | PBKDF2-HMAC-SHA256, database sessions | Passwords never stored, only salted hashes |

---

## How retrieval works

1. **Embed the question.** `all-MiniLM-L6-v2` converts it into 384 numbers representing its meaning. Runs locally.

2. **Expand shorthand.** Students type "HOD"; documents say "Head of Department". Common abbreviations are expanded before searching.

3. **Search by meaning.** Cosine similarity against every chunk in `kb_chunks`. Similar meaning produces similar vectors, so this matches even when the wording differs.

4. **Keyword rescue.** A small model can rank an exact name surprisingly low. Up to three chunks are also pulled by literal term match, so names and specific terms always reach the model.

5. **Filter by role.** Each document is flagged `aud_student`, `aud_faculty`, `aud_admin`. A student's search never considers staff-only material. The role comes from the bearer token, not the request body.

6. **Generate.** Retrieved chunks plus the question go to the language model with a grounding prompt. If the context does not contain the answer, it must refuse.

7. **Log.** Question, answer, sources, whether it succeeded, latency and model are written to `ai_messages`. Failures become the HOD's knowledge-gap list.

---

## The approval workflow

```
Faculty records a student achievement
        │
        ▼  saved unpublished, unverified
AI writes the announcement from the record's own fields
        │
        ▼
Draft appears in the HOD's Message Approvals
        │
        ├─ Rewrite with AI   → different wording, same facts
        ├─ Edit              → HOD adjusts by hand
        └─ Reject            → sent back
        │
        ▼  Approve
Record published to the landing page
Record indexed, so the assistant can answer about it
WhatsApp opens with the message ready to send
```

**On WhatsApp:** the official Cloud API cannot post to groups — it only sends to individual opted-in numbers. That is a platform restriction, not a pricing tier. So the message is generated and approved automatically, and the final send is one tap by the HOD.

---

## Database

22 tables across seven groups.

| Group | Tables |
|---|---|
| Accounts | `users`, `sessions` |
| People | `department`, `faculty`, `students`, `research_scholars` |
| Academics | `courses`, `subjects`, `labs` |
| Achievements | `student_achievements`, `faculty_achievements` |
| Content | `events`, `announcements`, `media` |
| AI | `kb_documents`, `kb_chunks`, `ai_conversations`, `ai_messages` |
| Operations | `notifications`, `audit_log` |

**Rules live in the database.** An achievement cannot be marked published without a verifier recorded — a CHECK constraint, not an application check, so it holds even against direct API calls. A trigger keeps `users.role = 'admin'` and `faculty.is_hod` consistent, and a partial unique index permits exactly one HOD.

`kb_documents` holds one row per document with its audience flags. `kb_chunks` holds the text split into pieces, each with its 384-dimension embedding.

---

## Setup

### Requirements

- Node.js 18+
- Python 3.11+
- PostgreSQL 16+
- A free Groq API key from [console.groq.com](https://console.groq.com)

### 1. Clone

```bash
git clone -b integrated-system https://github.com/parthgade17/AI-Agent.git
cd AI-Agent
```

### 2. Frontend

```bash
npm install
```

### 3. Backend

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 4. Environment

Create `backend/.env`:

```
DATABASE_URL=postgresql://postgres:YOURPASSWORD@127.0.0.1:5432/cse_agent
LLM_PROVIDER=groq
GROQ_MODEL=openai/gpt-oss-120b
GROQ_API_KEY=gsk_your_key_here
```

Spare keys can be added as `GROQ_API_KEY_2`, `GROQ_API_KEY_3` and so on. A key returning 401 or 429 rolls over to the next automatically.

> **Windows note:** write this file with an editor or `python -c`, not `Set-Content`. PowerShell produces UTF-16, which `python-dotenv` cannot read. `env_loader.py` handles both encodings, but a clean ASCII file avoids the problem entirely.

### 5. Database

```bash
psql -U postgres -c "CREATE DATABASE cse_agent;"

psql -U postgres -d cse_agent -f schema.sql
psql -U postgres -d cse_agent -f fix_kb.sql          # only if pgvector is unavailable
psql -U postgres -d cse_agent -f schema_media.sql

python seed_users.py
psql -U postgres -d cse_agent -f seed.sql
psql -U postgres -d cse_agent -f seed_content.sql
psql -U postgres -d cse_agent -f seed_faculty_additional.sql
psql -U postgres -d cse_agent -f seed_media.sql
```

> `CREATE EXTENSION vector` failing is expected without pgvector. `fix_kb.sql` creates `kb_chunks` with a `DOUBLE PRECISION[]` column instead, and similarity is computed in Python. With a few hundred chunks this takes under a millisecond.

### 6. Build the knowledge base

```bash
python ingest_kb.py
```

Downloads the embedding model (~90 MB) on first run, then embeds the corpus.

### 7. Run

```bash
# terminal 1
cd backend && uvicorn app:app --reload --port 8000

# terminal 2
npm run dev
```

Open <http://localhost:5173>.

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| HOD | `hod@sanjivani.edu.in` | `hod12345` |
| Faculty | `teacher@sanjivani.edu.in` | `teacher12345` |
| Student | `student@sanjivani.edu.in` | `student12345` |

Signing up creates an account with the role matching the login option used. Only one HOD account may exist, enforced by the database.

---

## API

Base URL `http://localhost:8000`. Interactive documentation at `/docs`.

### Public — no authentication

| Method | Path | Returns |
|---|---|---|
| GET | `/api/public/department` | Overview, vision, mission, courses, labs, live counts |
| GET | `/api/public/faculty` | Faculty directory with publication counts |
| GET | `/api/public/achievements` | Published department and student achievements |
| GET | `/api/public/events` | Upcoming and past events |
| GET | `/api/public/announcements` | Published announcements |
| GET | `/api/public/knowledge` | Everything flattened for ingestion |

### Authentication

| Method | Path |
|---|---|
| POST | `/api/login` |
| POST | `/api/signup` |
| GET | `/api/me` |
| POST | `/api/logout` |

### Chat

| Method | Path | Notes |
|---|---|---|
| POST | `/api/chat/ask` | Retrieval scoped by the role on the token |
| GET | `/api/chat/conversations` | This user's history |

### Student · Faculty · HOD

Scoped under `/api/student/`, `/api/faculty/` and `/api/hod/`. Each resolves the caller from the bearer token, so a student cannot reach another student's records by changing an id.

---

## Project structure

```
AI-Agent/
├── src/
│   ├── api.ts                    API client, one object per role
│   └── components/
│       ├── LandingPage.tsx       Public page, animated, role routing
│       ├── AuthModal.tsx         Login and signup, rendered via portal
│       ├── StudentDashboard.tsx
│       ├── TeacherDashboard.tsx
│       ├── HodDashboard.tsx
│       └── AiChat.tsx            Shared assistant interface
│
├── backend/
│   ├── app.py                    FastAPI application, router registration
│   ├── db.py                     Connection pool and query helpers
│   ├── auth.py                   Hashing, sessions, role checks
│   ├── env_loader.py             Reads .env in any Windows encoding
│   │
│   ├── auth_routes.py
│   ├── public_routes.py
│   ├── student_routes.py
│   ├── faculty_routes.py
│   ├── hod_routes.py
│   ├── chat_routes.py
│   │
│   ├── rag_engine.py             Retrieval and generation
│   ├── ingest_kb.py              Builds the knowledge base from kb.json
│   ├── kb_sync.py                Keeps it current as records change
│   ├── ai_compose.py             Writes announcements for approval
│   │
│   ├── schema.sql                22 tables, views, triggers, indexes
│   ├── seed*.sql                 Department data
│   └── kb.json                   Source corpus
│
└── public/                       Logo and images
```

---

## Security

| Concern | Approach |
|---|---|
| Passwords | PBKDF2-HMAC-SHA256, 260,000 iterations, random per-user salt |
| Sessions | Random tokens in the database, checked per request, expiring |
| Roles | Resolved server-side from the token; client cannot influence it |
| Content visibility | Audience flags per document, filtered before retrieval |
| SQL injection | Parameterised queries throughout |
| Secrets | `.env` is gitignored; the repository history contains no keys |

Anyone may register as a student. Staff accounts are created by the department office. Verifying real identity requires college email integration, which is a deployment concern rather than a code one.

---

## Design decisions worth explaining

**No invented numbers.** Earlier versions of the dashboards displayed attendance percentages and assignment counts. The schema has no attendance table and no submission tracking, so those figures had no source. They were removed rather than left as plausible-looking placeholders. Fewer metrics, all of them real.

**Refusal is a feature.** Ask the assistant about something the department has not documented and it declines. That is the evidence answers come from retrieval rather than the model's general knowledge.

**Indexing never blocks a save.** If the embedding model fails to load, the HOD's approval still succeeds and the failure is logged. Publishing a record matters more than the search index being instantly current, and `kb_sync.rebuild_all()` repairs any gap.

**Constraints in the database.** Publication rules and role consistency are enforced by PostgreSQL, so they hold regardless of which code path runs.

---

## Current scope

Implemented:

- Role-based authentication across three portals
- Public landing page reading live from the database
- RAG assistant with grounding, citation, role-filtered retrieval and logging
- Approval workflow with AI-drafted announcements and WhatsApp handoff
- Live knowledge base sync on publish and unpublish
- Knowledge-gap reporting from unanswered questions

Not yet implemented:

- **Agentic actions.** The assistant answers questions; it does not yet register a student for an event or file a request. The tables and endpoints exist; wiring them to the assistant is the next step.
- **Attendance tracking.** Deliberately absent rather than displayed with placeholder data.
- **Deployment.** Runs locally. The backend needs roughly 800 MB of RAM because of PyTorch, so a free-tier host will not hold it without switching to an embedding API.

---

## Troubleshooting

**`python-dotenv could not parse statement`** — `.env` is UTF-16. Rewrite it as ASCII.

**`404` from the Groq endpoint** — the model ID has been retired. Run `python check_llm.py` to list what your key can use, then set `GROQ_MODEL`.

**`401` from Groq** — a stale key. `env_loader` uses the last occurrence of a duplicated variable and warns about duplicates.

**`relation "kb_chunks" does not exist`** — `fix_kb.sql` was not applied.

**Assistant says it has no record of something that exists** — it is not in the knowledge base. Run `python ingest_kb.py`, or `kb_sync.rebuild_all()` for live records.

**Blank landing page** — open the browser console. Usually the backend is not running, or `API_BASE` in `src/api.ts` points elsewhere.

---

## Team

Department of Computer Science and Engineering
School of Engineering and Technology
Sanjivani University, Kopargaon, Maharashtra
