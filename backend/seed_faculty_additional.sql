-- ###########################################################################
--  SEED — ADDITIONAL FACULTY (Chopde, Kalita, Bramhane)
--
--  Your seed.sql only creates the HOD (hod@sanjivani.edu.in) and one
--  generic placeholder 'teacher@sanjivani.edu.in' Assistant Professor with
--  no real details. The department has three more named faculty on file
--  with real emails, employee IDs and profiles:
--
--      Dr. Nitin R. Chopde       — Associate Professor
--      Ms. Jyotimoyee Kalita     — Assistant Professor
--      Mr. Siddhesh Bramhane     — Assistant Professor
--
--  This file adds them as real users + faculty rows (matching your actual
--  schema, not a separate one), plus their achievements. It does NOT
--  replace or duplicate the generic 'teacher@sanjivani.edu.in' account —
--  that's still there if you use it for demo login; these three are in
--  addition to it.
--
--  SECURITY NOTE: password_hash below is a literal placeholder, not a
--  working hash. Nobody can log in with it as-is. Replace it by running
--  these three through your existing seed_users.py (or your app's normal
--  signup/reset flow) before you rely on these accounts for login. Nothing
--  else in this file depends on the password being real.
--
--  Run order (after your existing schema.sql / seed.sql / seed_content.sql):
--      psql -d cse_agent -f seed_faculty_additional.sql
--
--  Safe to re-run.
-- ###########################################################################

-- --------------------------------------------------------------------- users
INSERT INTO users (name, email, mobile, password_hash, role)
VALUES
    ('Dr. Nitin R. Chopde',   'nitinchopdeset@sanjivani.edu.in',   '9730426099', 'PENDING_PASSWORD_RESET', 'faculty'),
    ('Ms. Jyotimoyee Kalita', 'jyotimoyeekalitaset@sanjivani.edu.in', '9864906364', 'PENDING_PASSWORD_RESET', 'faculty'),
    ('Mr. Siddhesh Bramhane', 'siddeshbramhaneset@sanjivani.edu.in', '9136123079', 'PENDING_PASSWORD_RESET', 'faculty')
ON CONFLICT (email) DO NOTHING;


-- ------------------------------------------------------------------ faculty
INSERT INTO faculty (user_id, department_id, employee_code, designation,
                     qualification, research_areas, experience_years,
                     date_of_joining, scholar_url, is_hod)
SELECT u.id, d.id, '2101061T', 'Associate Professor',
       'B.E. (Computer Engg, 1st Class), M.E. (Computer Engg, 1st Class), PhD (Computer Science & Engineering)',
       NULL, 19.0, DATE '2025-06-26',
       'https://scholar.google.com/?authuser=1', FALSE
FROM users u, department d
WHERE u.email = 'nitinchopdeset@sanjivani.edu.in' AND d.code = 'CSE'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO faculty (user_id, department_id, employee_code, designation,
                     qualification, experience_years, date_of_joining, is_hod)
SELECT u.id, d.id, '2101032', 'Assistant Professor',
       'B.Tech (7.99 CGPA, 1st Class), M.Tech (8.42 CGPA, 1st Class)',
       1.0, DATE '2025-07-26', FALSE
FROM users u, department d
WHERE u.email = 'jyotimoyeekalitaset@sanjivani.edu.in' AND d.code = 'CSE'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO faculty (user_id, department_id, employee_code, designation,
                     qualification, experience_years, date_of_joining, is_hod)
SELECT u.id, d.id, '2101091t', 'Assistant Professor',
       'PG', 0.7, DATE '2026-02-02', FALSE
FROM users u, department d
WHERE u.email = 'siddeshbramhaneset@sanjivani.edu.in' AND d.code = 'CSE'
ON CONFLICT (user_id) DO NOTHING;


-- -------------------------------------------------------- faculty_achievements
-- Dr. Chopde — publication/patent/guidance record from his profile document.
-- Individual paper titles were not itemised in the source doc (only counts),
-- so the publication row below records the aggregate rather than inventing
-- titles that aren't on file.
INSERT INTO faculty_achievements (faculty_id, title, category, description, venue, is_main_author)
SELECT f.id, v.title, v.cat, v.descr, v.venue, v.main
FROM faculty f
JOIN users u ON u.id = f.user_id, (VALUES

  ('Research profile: 15 conference papers, 8 Scopus-indexed papers, 44 non-Scopus papers',
   'publication',
   'Aggregate publication count as recorded on file; individual paper titles not itemised in the source profile document.',
   NULL, NULL::boolean),

  ('6 patents published', 'patent',
   'Patents published (source profile document does not record whether any have been granted).',
   NULL, NULL),

  ('PhD Co-Guide, CSE/AIDS, G H Raisoni University, Amravati', 'other',
   'Co-guiding PhD candidates in Computer Science & Engineering / AI & Data Science. Also guided 32 UG and 26 PG projects and 1 PhD at the home institution.',
   'G H Raisoni University, Amravati', NULL),

  ('1 book published', 'book', NULL, NULL, NULL),

  ('Research grant fetched (1)', 'grant', NULL, NULL, NULL),

  ('Professional memberships and external collaborations', 'other',
   'Member of ISTE, IFERP, IAENG, ABCD, CETA, SIAM, ISFSEA. Collaborations recorded with VNIT Nagpur, NIT Kurukshetra, IIT Bombay, VIT Nagpur, GHRCE Nagpur, Sahyadri COE Mangalore, YCCE Nagpur and Symbiosis Pune.',
   NULL, NULL)

) AS v(title, cat, descr, venue, main)
WHERE u.email = 'nitinchopdeset@sanjivani.edu.in'
  AND NOT EXISTS (SELECT 1 FROM faculty_achievements fa
                   WHERE fa.faculty_id = f.id AND fa.title = v.title);

-- Ms. Kalita — awards from her profile document.
INSERT INTO faculty_achievements (faculty_id, title, category)
SELECT f.id, v.title, 'award'
FROM faculty f
JOIN users u ON u.id = f.user_id, (VALUES
  ('Chemistry Olympiad'),
  ('National Talent Search Examination (NTSE)')
) AS v(title)
WHERE u.email = 'jyotimoyeekalitaset@sanjivani.edu.in'
  AND NOT EXISTS (SELECT 1 FROM faculty_achievements fa
                   WHERE fa.faculty_id = f.id AND fa.title = v.title);

-- Mr. Bramhane — no publications, patents or awards on file yet (recent
-- appointment, 8 months total experience). Intentionally no achievement
-- rows inserted here; add them as they're recorded rather than inventing
-- placeholders.


-- --------------------------------------------------------------------- check
SELECT u.name, u.email, u.role, f.employee_code, f.designation, f.experience_years, f.is_hod
FROM faculty f JOIN users u ON u.id = f.user_id
WHERE u.email IN ('nitinchopdeset@sanjivani.edu.in', 'jyotimoyeekalitaset@sanjivani.edu.in',
                  'siddeshbramhaneset@sanjivani.edu.in')
ORDER BY u.name;

SELECT u.name, count(fa.id) AS achievement_count
FROM faculty f JOIN users u ON u.id = f.user_id
LEFT JOIN faculty_achievements fa ON fa.faculty_id = f.id
WHERE u.email IN ('nitinchopdeset@sanjivani.edu.in', 'jyotimoyeekalitaset@sanjivani.edu.in',
                  'siddeshbramhaneset@sanjivani.edu.in')
GROUP BY u.name
ORDER BY u.name;
