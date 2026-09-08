-- ###########################################################################
--
--  CSE AI AGENT PLATFORM — COMPLETE DATABASE SCHEMA
--  Department of Computer Science and Engineering, Sanjivani University
--
--  PostgreSQL 14+ with the pgvector extension.
--
--  Single file. Creates everything: authentication, people, academics,
--  achievements, events, LMS, student support, the RAG knowledge base and
--  the AI agent's conversation history.
--
--  Run:
--      createdb cse_agent
--      psql -U postgres -d cse_agent -f schema.sql
--
--  Safe to re-run — every object uses IF NOT EXISTS or OR REPLACE.
--
-- ###########################################################################

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- fuzzy text search on names/titles


-- ===========================================================================
--  SECTION 0 — SHARED HELPERS
-- ===========================================================================

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
--  SECTION 1 — AUTHENTICATION
-- ===========================================================================

-- Every person on the platform has exactly one row here. Academic identity
-- lives in students/faculty; this table holds only credentials and role.
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT        NOT NULL,
    email         TEXT        NOT NULL UNIQUE,
    mobile        VARCHAR(15),
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'student'
                  CHECK (role IN ('student', 'faculty', 'admin')),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role) WHERE is_active;

DROP TRIGGER IF EXISTS users_touch ON users;
CREATE TRIGGER users_touch BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- Bearer tokens. Stored in the database so a server restart does not sign
-- everybody out mid-demonstration.
CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT        PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);


-- ===========================================================================
--  SECTION 2 — DEPARTMENT
-- ===========================================================================

CREATE TABLE IF NOT EXISTS department (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    code             TEXT NOT NULL UNIQUE,
    school           TEXT,
    university       TEXT DEFAULT 'Sanjivani University',
    established_year INTEGER CHECK (established_year BETWEEN 1900 AND 2100),
    vision           TEXT,
    mission          TEXT,
    hod_message      TEXT,
    about            TEXT,
    accreditation    TEXT,                 -- NAAC / NBA status
    email            TEXT,
    phone            TEXT,
    address          TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS department_touch ON department;
CREATE TRIGGER department_touch BEFORE UPDATE ON department
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ===========================================================================
--  SECTION 3 — PEOPLE
-- ===========================================================================

CREATE TABLE IF NOT EXISTS faculty (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department_id     INTEGER REFERENCES department(id) ON DELETE SET NULL,
    employee_code     TEXT UNIQUE,
    designation       TEXT,
    qualification     TEXT,
    specialization    TEXT,
    research_areas    TEXT,
    experience_years  NUMERIC(4,1) CHECK (experience_years >= 0),
    date_of_joining   DATE,
    office_location   TEXT,
    available_hours   TEXT,
    profile_photo_url TEXT,
    linkedin_url      TEXT,
    scholar_url       TEXT,
    -- The HOD is a faculty member holding the 'admin' role, not a separate
    -- kind of person. The trigger below keeps the two in step.
    is_hod            BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one HOD at any time.
CREATE UNIQUE INDEX IF NOT EXISTS faculty_single_hod_idx ON faculty (is_hod) WHERE is_hod;
CREATE INDEX IF NOT EXISTS faculty_dept_idx ON faculty (department_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS faculty_spec_trgm_idx
    ON faculty USING gin (specialization gin_trgm_ops);

DROP TRIGGER IF EXISTS faculty_touch ON faculty;
CREATE TRIGGER faculty_touch BEFORE UPDATE ON faculty
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- Keeps users.role and faculty.is_hod consistent with one another.
CREATE OR REPLACE FUNCTION check_hod_role() RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM users WHERE id = NEW.user_id;

    IF NEW.is_hod AND user_role <> 'admin' THEN
        RAISE EXCEPTION
            'faculty.is_hod requires users.role = ''admin'' (user % has role ''%'')',
            NEW.user_id, user_role;
    END IF;

    IF NOT NEW.is_hod AND user_role = 'admin' THEN
        RAISE EXCEPTION
            'user % holds the admin role, which is reserved for the HOD; set is_hod = TRUE',
            NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faculty_role_check ON faculty;
CREATE TRIGGER faculty_role_check
    BEFORE INSERT OR UPDATE OF is_hod, user_id ON faculty
    FOR EACH ROW EXECUTE FUNCTION check_hod_role();


-- Research scholars supervised by a faculty member.
CREATE TABLE IF NOT EXISTS research_scholars (
    id            SERIAL PRIMARY KEY,
    supervisor_id INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    topic         TEXT,
    status        TEXT NOT NULL DEFAULT 'ongoing'
                  CHECK (status IN ('ongoing', 'thesis_submitted', 'awarded', 'discontinued')),
    enrolled_on   DATE,
    awarded_on    DATE,
    CHECK (awarded_on IS NULL OR status = 'awarded')
);

CREATE INDEX IF NOT EXISTS scholars_supervisor_idx ON research_scholars (supervisor_id);


CREATE TABLE IF NOT EXISTS students (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department_id   INTEGER REFERENCES department(id) ON DELETE SET NULL,
    roll_no         TEXT UNIQUE,
    prn             TEXT UNIQUE,
    current_year    INTEGER CHECK (current_year BETWEEN 1 AND 4),
    current_semester INTEGER CHECK (current_semester BETWEEN 1 AND 8),
    division        TEXT,
    admission_year  INTEGER,
    graduation_year INTEGER,
    is_lateral_entry BOOLEAN NOT NULL DEFAULT FALSE,
    profile_photo_url TEXT,
    github_url      TEXT,
    linkedin_url    TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (graduation_year IS NULL OR admission_year IS NULL
           OR graduation_year >= admission_year)
);

CREATE INDEX IF NOT EXISTS students_year_div_idx ON students (current_year, division)
    WHERE is_active;
CREATE INDEX IF NOT EXISTS students_dept_idx ON students (department_id);

DROP TRIGGER IF EXISTS students_touch ON students;
CREATE TRIGGER students_touch BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ===========================================================================
--  SECTION 4 — ACADEMICS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS courses (
    id             SERIAL PRIMARY KEY,
    department_id  INTEGER NOT NULL REFERENCES department(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    short_name     TEXT,
    degree_level   TEXT NOT NULL DEFAULT 'UG' CHECK (degree_level IN ('UG', 'PG', 'PhD')),
    duration_years INTEGER CHECK (duration_years BETWEEN 1 AND 6),
    total_semesters INTEGER,
    intake         INTEGER,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (department_id, name)
);


CREATE TABLE IF NOT EXISTS subjects (
    id          SERIAL PRIMARY KEY,
    course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    faculty_id  INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
    code        TEXT NOT NULL,
    name        TEXT NOT NULL,
    semester    INTEGER CHECK (semester BETWEEN 1 AND 8),
    credits     NUMERIC(3,1) CHECK (credits >= 0),
    subject_type TEXT NOT NULL DEFAULT 'core'
                CHECK (subject_type IN ('core', 'elective', 'lab', 'project', 'audit')),
    syllabus_url TEXT,
    description TEXT,
    UNIQUE (course_id, code)
);

CREATE INDEX IF NOT EXISTS subjects_semester_idx ON subjects (semester);
CREATE INDEX IF NOT EXISTS subjects_faculty_idx  ON subjects (faculty_id);
CREATE INDEX IF NOT EXISTS subjects_name_trgm_idx
    ON subjects USING gin (name gin_trgm_ops);


CREATE TABLE IF NOT EXISTS labs (
    id               SERIAL PRIMARY KEY,
    department_id    INTEGER NOT NULL REFERENCES department(id) ON DELETE CASCADE,
    incharge_id      INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
    name             TEXT NOT NULL,
    location         TEXT,
    total_systems    INTEGER CHECK (total_systems >= 0),
    operating_system TEXT,
    processor        TEXT,
    memory           TEXT,
    software         TEXT,
    features         TEXT,
    sponsored_by     TEXT,                 -- e.g. HitSpectra Pvt. Ltd., Taiwan
    is_coe           BOOLEAN NOT NULL DEFAULT FALSE,   -- Centre of Excellence
    is_24x7          BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (department_id, name)
);

CREATE INDEX IF NOT EXISTS labs_dept_idx ON labs (department_id);


-- ===========================================================================
--  SECTION 5 — ACHIEVEMENTS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS student_achievements (
    id           SERIAL PRIMARY KEY,
    student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    category     TEXT NOT NULL DEFAULT 'other'
                 CHECK (category IN ('hackathon', 'competition', 'coding', 'sports',
                                     'research', 'certification', 'internship',
                                     'placement', 'entrepreneurship', 'academic', 'other')),
    description  TEXT,
    event_name   TEXT,
    organiser    TEXT,
    location     TEXT,
    position     TEXT,                     -- 'First Prize', 'Runner-Up', 'Participant'
    prize_amount NUMERIC(12,2) CHECK (prize_amount >= 0),
    team_members TEXT,                     -- other participants, free text
    proof_url    TEXT,
    achieved_on  DATE,
    -- submitted -> verified -> published
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by  INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
    verified_at  TIMESTAMPTZ,
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Nothing reaches the public page without a named verifier.
    CONSTRAINT student_ach_publish_requires_verification
        CHECK (NOT is_published OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS student_ach_student_idx  ON student_achievements (student_id);
CREATE INDEX IF NOT EXISTS student_ach_category_idx ON student_achievements (category);
CREATE INDEX IF NOT EXISTS student_ach_published_idx
    ON student_achievements (achieved_on DESC) WHERE is_published;
CREATE INDEX IF NOT EXISTS student_ach_pending_idx
    ON student_achievements (created_at DESC) WHERE verified_at IS NULL;

DROP TRIGGER IF EXISTS student_ach_touch ON student_achievements;
CREATE TRIGGER student_ach_touch BEFORE UPDATE ON student_achievements
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- Stamps verified_at automatically when a verifier is recorded.
CREATE OR REPLACE FUNCTION stamp_verified_at() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verified_by IS NOT NULL AND NEW.verified_at IS NULL THEN
        NEW.verified_at = now();
    END IF;
    IF NEW.verified_by IS NULL THEN
        NEW.verified_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_ach_verify ON student_achievements;
CREATE TRIGGER student_ach_verify
    BEFORE INSERT OR UPDATE ON student_achievements
    FOR EACH ROW EXECUTE FUNCTION stamp_verified_at();


CREATE TABLE IF NOT EXISTS faculty_achievements (
    id            SERIAL PRIMARY KEY,
    faculty_id    INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    category      TEXT NOT NULL DEFAULT 'other'
                  CHECK (category IN ('publication', 'patent', 'grant', 'award',
                                      'invited_talk', 'certification', 'book', 'other')),
    description   TEXT,
    venue         TEXT,                    -- journal or conference name
    publisher     TEXT,
    impact_factor NUMERIC(6,3) CHECK (impact_factor >= 0),
    doi           TEXT,
    co_authors    TEXT,
    is_main_author BOOLEAN,
    grant_amount  NUMERIC(12,2),
    achieved_on   DATE,
    proof_url     TEXT,
    is_published  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faculty_ach_faculty_idx  ON faculty_achievements (faculty_id);
CREATE INDEX IF NOT EXISTS faculty_ach_category_idx ON faculty_achievements (category);


-- ===========================================================================
--  SECTION 6 — EVENTS AND ANNOUNCEMENTS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS events (
    id                SERIAL PRIMARY KEY,
    department_id     INTEGER REFERENCES department(id) ON DELETE CASCADE,
    scope             TEXT NOT NULL DEFAULT 'department'
                      CHECK (scope IN ('institute', 'department')),
    event_type        TEXT NOT NULL DEFAULT 'other'
                      CHECK (event_type IN ('workshop', 'seminar', 'guest_lecture',
                                            'competition', 'hackathon', 'industrial_visit',
                                            'cultural', 'sports', 'exhibition', 'other')),
    title             TEXT NOT NULL,
    description       TEXT,
    venue             TEXT,
    starts_at         TIMESTAMPTZ NOT NULL,
    ends_at           TIMESTAMPTZ,
    organiser         TEXT,
    speaker           TEXT,
    contact_person    TEXT,
    contact_number    VARCHAR(15),
    registration_link TEXT,
    poster_url        TEXT,
    max_participants  INTEGER,
    is_published      BOOLEAN NOT NULL DEFAULT FALSE,
    created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS events_upcoming_idx ON events (starts_at) WHERE is_published;
CREATE INDEX IF NOT EXISTS events_scope_idx    ON events (scope, starts_at DESC);

DROP TRIGGER IF EXISTS events_touch ON events;
CREATE TRIGGER events_touch BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


CREATE TABLE IF NOT EXISTS event_registrations (
    id            SERIAL PRIMARY KEY,
    event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attended      BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_reg_event_idx ON event_registrations (event_id);


CREATE TABLE IF NOT EXISTS announcements (
    id           SERIAL PRIMARY KEY,
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    priority     TEXT NOT NULL DEFAULT 'normal'
                 CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    for_students BOOLEAN NOT NULL DEFAULT TRUE,
    for_faculty  BOOLEAN NOT NULL DEFAULT TRUE,
    is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_url TEXT,
    published_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at)
);

CREATE INDEX IF NOT EXISTS announcements_live_idx
    ON announcements (is_pinned DESC, published_at DESC)
    WHERE published_at IS NOT NULL;


-- ===========================================================================
--  SECTION 7 — LMS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS lms_documents (
    id           SERIAL PRIMARY KEY,
    subject_id   INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    uploaded_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    doc_type     TEXT NOT NULL DEFAULT 'notes'
                 CHECK (doc_type IN ('notes', 'assignment', 'question_bank',
                                     'practical_manual', 'circular', 'syllabus',
                                     'timetable', 'other')),
    description  TEXT,
    file_path    TEXT NOT NULL,
    file_type    TEXT,
    file_size_kb INTEGER CHECK (file_size_kb >= 0),
    semester     INTEGER CHECK (semester BETWEEN 1 AND 8),
    unit_number  INTEGER,
    for_students BOOLEAN NOT NULL DEFAULT TRUE,
    download_count INTEGER NOT NULL DEFAULT 0,
    -- Set once this file has been chunked into the knowledge base below.
    is_indexed   BOOLEAN NOT NULL DEFAULT FALSE,
    indexed_at   TIMESTAMPTZ,
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_subject_idx  ON lms_documents (subject_id);
CREATE INDEX IF NOT EXISTS lms_type_idx     ON lms_documents (doc_type);
CREATE INDEX IF NOT EXISTS lms_unindexed_idx ON lms_documents (uploaded_at)
    WHERE NOT is_indexed;


-- ===========================================================================
--  SECTION 8 — STUDENT SUPPORT
-- ===========================================================================

-- Questions the assistant could not answer become tickets here, which is what
-- turns the student section into a real issue-management workflow.
CREATE TABLE IF NOT EXISTS student_issues (
    id           SERIAL PRIMARY KEY,
    raised_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title        TEXT NOT NULL,
    description  TEXT,
    category     TEXT NOT NULL DEFAULT 'other'
                 CHECK (category IN ('infrastructure', 'academic', 'examination',
                                     'documentation', 'scholarship', 'placement',
                                     'hostel', 'library', 'other')),
    priority     TEXT NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high')),
    status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    location     TEXT,
    resolution   TEXT,
    -- TRUE when the ticket was opened automatically from an unanswered query.
    from_ai      BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (status NOT IN ('resolved', 'closed') OR resolved_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS issues_open_idx
    ON student_issues (priority DESC, created_at) WHERE status IN ('open', 'in_progress');
CREATE INDEX IF NOT EXISTS issues_category_idx ON student_issues (category);
CREATE INDEX IF NOT EXISTS issues_raised_by_idx ON student_issues (raised_by);

DROP TRIGGER IF EXISTS issues_touch ON student_issues;
CREATE TRIGGER issues_touch BEFORE UPDATE ON student_issues
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


CREATE OR REPLACE FUNCTION stamp_resolved_at() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('resolved', 'closed') AND NEW.resolved_at IS NULL THEN
        NEW.resolved_at = now();
    END IF;
    IF NEW.status IN ('open', 'in_progress') THEN
        NEW.resolved_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS issues_resolve ON student_issues;
CREATE TRIGGER issues_resolve BEFORE INSERT OR UPDATE ON student_issues
    FOR EACH ROW EXECUTE FUNCTION stamp_resolved_at();


-- ===========================================================================
--  SECTION 9 — RAG KNOWLEDGE BASE
-- ===========================================================================

-- One row per source document in the assistant's knowledge base.
-- Separate from lms_documents: that table stores files for humans to download,
-- this one stores what the AI is allowed to read.
CREATE TABLE IF NOT EXISTS kb_documents (
    id           SERIAL PRIMARY KEY,
    filename     TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    section      TEXT NOT NULL,            -- infrastructure, faculty, achievements, ...
    source       TEXT NOT NULL,            -- the citation shown to the user
    source_url   TEXT,
    -- Per-role visibility. Retrieval filters on these before ranking, so a
    -- student's question can never surface a staff-only chunk.
    aud_student  BOOLEAN NOT NULL DEFAULT TRUE,
    aud_faculty  BOOLEAN NOT NULL DEFAULT TRUE,
    aud_admin    BOOLEAN NOT NULL DEFAULT TRUE,
    -- Optional link back to the LMS file this was built from.
    lms_document_id INTEGER REFERENCES lms_documents(id) ON DELETE SET NULL,
    content_hash TEXT,                     -- skip re-embedding unchanged files
    updated      DATE,
    ingested_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_docs_section_idx ON kb_documents (section);
CREATE INDEX IF NOT EXISTS kb_docs_audience_idx
    ON kb_documents (aud_student, aud_faculty, aud_admin);


-- VECTOR(384) matches sentence-transformers/all-MiniLM-L6-v2.
-- Change this number and re-create the table if you change the model.
CREATE TABLE IF NOT EXISTS kb_chunks (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content     TEXT NOT NULL,
    token_count INTEGER,
    embedding   VECTOR(384) NOT NULL,
    UNIQUE (document_id, chunk_index)
);

-- HNSW index for cosine distance (pgvector 0.5+).
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx
    ON kb_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS kb_chunks_document_idx ON kb_chunks (document_id);


-- ===========================================================================
--  SECTION 10 — AI AGENT CONVERSATIONS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT,
    message_count   INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_conv_user_idx
    ON ai_conversations (user_id, last_message_at DESC);


CREATE TABLE IF NOT EXISTS ai_messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT NOT NULL,
    -- Analytics for assistant turns; NULL on user turns.
    sources         JSONB,
    section         TEXT,
    answered        BOOLEAN,
    retrieved_count INTEGER,
    latency_ms      INTEGER CHECK (latency_ms >= 0),
    model           TEXT,
    feedback        SMALLINT CHECK (feedback IN (-1, 1)),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_msg_conv_idx    ON ai_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS ai_msg_section_idx ON ai_messages (section);
-- Powers the knowledge-gap panel on the dashboard.
CREATE INDEX IF NOT EXISTS ai_msg_unanswered_idx
    ON ai_messages (created_at DESC) WHERE answered = FALSE;


-- Keeps the conversation counters current without extra application code.
CREATE OR REPLACE FUNCTION bump_conversation() RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_conversations
       SET message_count   = message_count + 1,
           last_message_at = NEW.created_at
     WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_msg_bump ON ai_messages;
CREATE TRIGGER ai_msg_bump AFTER INSERT ON ai_messages
    FOR EACH ROW EXECUTE FUNCTION bump_conversation();


-- ===========================================================================
--  SECTION 11 — NOTIFICATIONS AND AUDIT
-- ===========================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    channel      TEXT NOT NULL DEFAULT 'in_app'
                 CHECK (channel IN ('in_app', 'email', 'whatsapp')),
    title        TEXT NOT NULL,
    body         TEXT,
    link_url     TEXT,
    -- What triggered it, so a notification can be traced back to its source.
    ref_type     TEXT CHECK (ref_type IN ('event', 'announcement', 'achievement', 'issue')),
    ref_id       INTEGER,
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    scheduled_for TIMESTAMPTZ,
    sent_at      TIMESTAMPTZ,
    error        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_pending_idx ON notifications (scheduled_for)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications (user_id, created_at DESC);


CREATE TABLE IF NOT EXISTS audit_log (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,              -- 'publish', 'verify', 'delete', ...
    table_name TEXT NOT NULL,
    record_id  INTEGER,
    details    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_user_idx    ON audit_log (user_id);


-- ===========================================================================
--  SECTION 12 — VIEWS
--  Query these from the API instead of repeating joins in Python.
-- ===========================================================================

CREATE OR REPLACE VIEW v_faculty_directory AS
SELECT f.id, u.name, u.email, u.mobile,
       f.designation, f.qualification, f.specialization, f.research_areas,
       f.experience_years, f.office_location, f.available_hours, f.is_hod,
       (SELECT count(*) FROM faculty_achievements fa WHERE fa.faculty_id = f.id)
           AS achievement_count,
       (SELECT count(*) FROM research_scholars rs
         WHERE rs.supervisor_id = f.id AND rs.status = 'ongoing') AS scholars_guiding
FROM faculty f
JOIN users u ON u.id = f.user_id
WHERE f.is_active AND u.is_active;


CREATE OR REPLACE VIEW v_published_achievements AS
SELECT sa.id, sa.title, sa.category, sa.event_name, sa.organiser, sa.position,
       sa.prize_amount, sa.achieved_on, sa.description,
       u.name AS student_name, s.roll_no, s.current_year, s.division,
       vu.name AS verified_by_name, sa.verified_at
FROM student_achievements sa
JOIN students s ON s.id = sa.student_id
JOIN users u    ON u.id = s.user_id
LEFT JOIN faculty vf ON vf.id = sa.verified_by
LEFT JOIN users vu   ON vu.id = vf.user_id
WHERE sa.is_published
ORDER BY sa.achieved_on DESC NULLS LAST;


CREATE OR REPLACE VIEW v_upcoming_events AS
SELECT e.id, e.title, e.scope, e.event_type, e.description, e.venue,
       e.starts_at, e.ends_at, e.organiser, e.speaker,
       e.registration_link, e.poster_url,
       (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id)
           AS registration_count
FROM events e
WHERE e.is_published AND e.starts_at >= now()
ORDER BY e.starts_at;


CREATE OR REPLACE VIEW v_open_issues AS
SELECT i.id, i.title, i.category, i.priority, i.status, i.location,
       i.from_ai, i.created_at,
       ru.name AS raised_by_name,
       au.name AS assigned_to_name
FROM student_issues i
JOIN users ru      ON ru.id = i.raised_by
LEFT JOIN users au ON au.id = i.assigned_to
WHERE i.status IN ('open', 'in_progress')
ORDER BY CASE i.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         i.created_at;


-- Department dashboard, in one query.
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    (SELECT count(*) FROM students WHERE is_active)                    AS total_students,
    (SELECT count(*) FROM faculty  WHERE is_active)                    AS total_faculty,
    (SELECT count(*) FROM student_achievements WHERE is_published)     AS published_achievements,
    (SELECT count(*) FROM student_achievements WHERE verified_at IS NULL)
                                                                       AS pending_verification,
    (SELECT count(*) FROM events WHERE is_published AND starts_at >= now())
                                                                       AS upcoming_events,
    (SELECT count(*) FROM lms_documents)                               AS lms_documents,
    (SELECT count(*) FROM kb_documents)                                AS kb_documents,
    (SELECT count(*) FROM kb_chunks)                                   AS kb_chunks,
    (SELECT count(*) FROM ai_messages WHERE role = 'assistant')        AS ai_answers,
    (SELECT count(*) FROM ai_messages WHERE answered = FALSE)          AS ai_unanswered,
    (SELECT count(*) FROM student_issues WHERE status IN ('open', 'in_progress'))
                                                                       AS open_issues;


-- Questions the knowledge base could not answer — what to document next.
CREATE OR REPLACE VIEW v_knowledge_gaps AS
SELECT q.content AS question,
       count(*)  AS times_asked,
       max(a.created_at) AS last_asked
FROM ai_messages a
JOIN ai_messages q
  ON q.conversation_id = a.conversation_id
 AND q.role = 'user'
 AND q.id = (SELECT max(id) FROM ai_messages m
              WHERE m.conversation_id = a.conversation_id
                AND m.role = 'user' AND m.id < a.id)
WHERE a.role = 'assistant' AND a.answered = FALSE
GROUP BY q.content
ORDER BY times_asked DESC, last_asked DESC;
