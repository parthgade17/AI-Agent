-- ===========================================================================
--  MEDIA — photographs from the department documents
--
--  Run after schema.sql:
--      psql -d cse_agent -f schema_media.sql
--
--  Images themselves live on disk under backend/static/gallery/ and are
--  served by FastAPI. Only the path and its caption are stored here, which
--  keeps the database small and lets the AI agent cite a photo by caption.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS media (
    id          SERIAL PRIMARY KEY,
    filename    TEXT NOT NULL UNIQUE,
    caption     TEXT NOT NULL,
    media_key   TEXT NOT NULL,           -- groups photos of the same subject
    section     TEXT NOT NULL DEFAULT 'general'
                CHECK (section IN ('general', 'department', 'infrastructure',
                                   'faculty', 'achievements', 'events', 'academics')),
    source_doc  TEXT,                    -- which document it came from
    -- Optional links to the record the photo documents.
    event_id       INTEGER REFERENCES events(id) ON DELETE SET NULL,
    lab_id         INTEGER REFERENCES labs(id) ON DELETE SET NULL,
    achievement_id INTEGER REFERENCES faculty_achievements(id) ON DELETE SET NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_key_idx     ON media (media_key, sort_order);
CREATE INDEX IF NOT EXISTS media_section_idx ON media (section) WHERE is_published;
CREATE INDEX IF NOT EXISTS media_event_idx   ON media (event_id);

-- Photos attached to the records they illustrate.
CREATE OR REPLACE VIEW v_gallery AS
SELECT m.id, m.filename, m.caption, m.media_key, m.section, m.source_doc,
       m.sort_order,
       e.title AS event_title,
       l.name  AS lab_name,
       fa.title AS achievement_title
FROM media m
LEFT JOIN events e               ON e.id = m.event_id
LEFT JOIN labs l                 ON l.id = m.lab_id
LEFT JOIN faculty_achievements fa ON fa.id = m.achievement_id
WHERE m.is_published
ORDER BY m.section, m.media_key, m.sort_order;
