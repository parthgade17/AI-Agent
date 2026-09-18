-- ###########################################################################
--  SCHEMA — AUTOMATION FEATURES
--  Attendance alerts, assignment reminders, AI assignment evaluation
--
--  Run:
--      psql -d cse_agent -f schema_automation.sql
--
--  Safe to re-run. Additive only -- does not touch any existing table.
-- ###########################################################################

-- --------------------------------------------------------------- attendance
-- One row per attendance check. A student can have many rows over time
-- (the history itself is useful -- "attendance trending down" is a real
-- signal), rather than overwriting a single current value.
CREATE TABLE IF NOT EXISTS attendance_records (
    id             SERIAL PRIMARY KEY,
    student_id     INTEGER REFERENCES students(id) ON DELETE CASCADE,
    -- Kept as free text too, because the dashboard currently takes a typed
    -- name, not a student_id lookup. Backend resolves student_id when the
    -- name matches an enrolled student; if it doesn't match, the row is
    -- still recorded with student_id NULL so nothing is silently dropped.
    student_name_typed TEXT,
    subject_id     INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    percentage     NUMERIC(5,2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
    threshold      NUMERIC(5,2) NOT NULL DEFAULT 75,
    is_below_threshold BOOLEAN GENERATED ALWAYS AS (percentage < threshold) STORED,
    recorded_by    INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
    recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_student_idx ON attendance_records (student_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS attendance_alerts_idx ON attendance_records (recorded_at DESC)
    WHERE is_below_threshold;


-- ------------------------------------------------------- assignment reminders
CREATE TABLE IF NOT EXISTS assignment_reminders (
    id            SERIAL PRIMARY KEY,
    faculty_id    INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    subject_text  TEXT,                     -- free-text course/subject name from the form
    due_date      DATE NOT NULL,
    message       TEXT,
    -- How many student notifications were actually sent when this was created.
    -- 0 means it was saved but notifications haven't gone out yet.
    notified_count INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reminders_faculty_idx ON assignment_reminders (faculty_id, due_date);


-- ----------------------------------------------------- assignment evaluations
CREATE TABLE IF NOT EXISTS assignment_evaluations (
    id                SERIAL PRIMARY KEY,
    faculty_id        INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    assignment_title  TEXT NOT NULL,
    student_answer    TEXT NOT NULL,
    score             NUMERIC(4,1) CHECK (score BETWEEN 0 AND 10),
    feedback          TEXT,
    strengths         JSONB,                -- ["...", "..."]
    improvements      JSONB,
    model             TEXT,                 -- which LLM actually graded it
    latency_ms        INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evaluations_faculty_idx ON assignment_evaluations (faculty_id, created_at DESC);


-- --------------------------------------------------------------------- check
SELECT 'attendance_records' AS t, count(*) FROM attendance_records
UNION ALL SELECT 'assignment_reminders', count(*) FROM assignment_reminders
UNION ALL SELECT 'assignment_evaluations', count(*) FROM assignment_evaluations
ORDER BY 1;
