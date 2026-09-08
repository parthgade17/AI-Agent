-- ###########################################################################
--  SEED DATA — real content from the HOD's documents
--
--  Run order:
--      psql -d cse_agent -f schema.sql
--      python seed_users.py        (creates the login accounts)
--      psql -d cse_agent -f seed.sql
--
--  Safe to re-run.
-- ###########################################################################

-- --------------------------------------------------------------- department
INSERT INTO department (name, code, school, university, vision, mission, email)
VALUES (
    'Computer Science and Engineering',
    'CSE',
    'School of Engineering and Technology',
    'Sanjivani University',
    'To build an AI ecosystem that serves the academic, research and administrative needs of the department.',
    'Applied learning, sustained industry engagement and international exposure for every student.',
    'project@sanjivani.edu.in'
)
ON CONFLICT (code) DO NOTHING;


-- ------------------------------------------------------------------ faculty
-- Links the seeded HOD account to a faculty record.
INSERT INTO faculty (user_id, department_id, designation, qualification,
                     specialization, research_areas, experience_years, is_hod)
SELECT u.id, d.id,
       'Head of Department',
       'BE (Computer), ME (Computer), PhD (IT), Postdoc (USA), LLB',
       'Digital Twin, Reinforcement Learning, Cloud Computing',
       'Digital Twin, Reinforcement Learning, Cloud Computing, Optimization, Machine Learning',
       18, TRUE
FROM users u, department d
WHERE u.email = 'hod@sanjivani.edu.in' AND d.code = 'CSE'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO faculty (user_id, department_id, designation)
SELECT u.id, d.id, 'Assistant Professor'
FROM users u, department d
WHERE u.email = 'teacher@sanjivani.edu.in' AND d.code = 'CSE'
ON CONFLICT (user_id) DO NOTHING;


-- ------------------------------------------------------------ student profile
-- Demo values. Replace roll_no/prn with real ones before any production use.
INSERT INTO students (user_id, department_id, roll_no, prn, current_year,
                      current_semester, division, admission_year, graduation_year)
SELECT u.id, d.id, 'DEMO-CSE-001', 'DEMOPRN0001', 3, 5, 'A', 2024, 2028
FROM users u, department d
WHERE u.email = 'student@sanjivani.edu.in' AND d.code = 'CSE'
ON CONFLICT (user_id) DO NOTHING;


-- --------------------------------------------------------- research scholars
INSERT INTO research_scholars (supervisor_id, name, status)
SELECT f.id, v.name, 'ongoing'
FROM faculty f, (VALUES
  ('Ms. Patil Arti Jay'), ('Ms. Pranali Shinde'), ('Mrs. Priyanka Sunil Aher'),
  ('Ms. Gursal Prabodhini Subhash'), ('Ms. Punamben Chhotubhai Patel'),
  ('Ms. Sujata Pandurang Kangune'), ('Mr. Satish Chokle'), ('Ms. Punam Hari Nemade')
) AS v(name)
WHERE f.is_hod
  AND NOT EXISTS (SELECT 1 FROM research_scholars r
                   WHERE r.supervisor_id = f.id AND r.name = v.name);


-- ------------------------------------------------------------------- course
INSERT INTO courses (department_id, name, short_name, degree_level,
                     duration_years, total_semesters)
SELECT id, 'B.Tech. Computer Science and Engineering', 'B.Tech. CSE', 'UG', 4, 8
FROM department WHERE code = 'CSE'
ON CONFLICT (department_id, name) DO NOTHING;


-- ----------------------------------------------------------------- subjects
-- Emerging-technology core courses from the HCLTech-powered syllabus.
INSERT INTO subjects (course_id, code, name, subject_type)
SELECT c.id, v.code, v.name, 'core'
FROM courses c, (VALUES
  ('CSE-PE',  'Prompt Engineering'),
  ('CSE-AAI', 'Agentic Artificial Intelligence'),
  ('CSE-ML',  'Machine Learning, Neural Networks and Computer Vision'),
  ('CSE-DSA', 'Data Science and Analytics')
) AS v(code, name)
WHERE c.short_name = 'B.Tech. CSE'
ON CONFLICT (course_id, code) DO NOTHING;


-- --------------------------------------------------------------------- labs
INSERT INTO labs (department_id, name, total_systems, operating_system,
                  processor, memory, software, features, sponsored_by,
                  is_coe, is_24x7)
SELECT d.id, v.name, v.systems, v.os, v.cpu, v.mem, v.sw, v.feat, v.sponsor, TRUE, TRUE
FROM department d, (VALUES
  ('Computer Vision Laboratory', 120, 'Ubuntu 24.04 LTS',
   '12th Gen Intel Core i5-12400F x 12', '16.0 GiB',
   'Anaconda IDE, Jupyter Python, Eclipse IDE, open-source tooling',
   'State-of-the-art systems for real-time societal computing problems. 13+ datasets received from National Chung Cheng University, Taiwan under the Centre of Excellence. High-speed internet and smart board. Projects include SCR detection, drone-imagery garbage segmentation, VR by hologram, Shirdi traffic tracking and IR face/gender/age recognition.',
   'National Chung Cheng University, Taiwan'),
  ('Data Science Laboratory', 120, 'Ubuntu 24.04 LTS',
   '12th Gen Intel Core i5-12400F x 12', '16.0 GiB',
   'Anaconda IDE, Jupyter Python, Eclipse IDE, open-source tooling',
   'Established to process data and produce meaningful output. Hosts the Centre of Excellence with 13 projects in hyperspectral imaging with colour science. High-speed internet and smart board.',
   'HitSpectra Pvt. Ltd., Taiwan')
) AS v(name, systems, os, cpu, mem, sw, feat, sponsor)
WHERE d.code = 'CSE'
ON CONFLICT (department_id, name) DO NOTHING;


-- ----------------------------------------------------- faculty achievements
INSERT INTO faculty_achievements (faculty_id, title, category, venue,
                                  impact_factor, is_main_author)
SELECT f.id, v.title, v.cat, v.venue, v.impact, v.main
FROM faculty f, (VALUES
  ('Task scheduling and resource allocation in cloud computing using a heuristic approach',
   'publication', 'Journal of Cloud Computing 7(1)', 4.3, TRUE),
  ('Optimized skill knowledge transfer model using hybrid Chicken Swarm plus Deer Hunting Optimization for human to robot interaction',
   'publication', 'Knowledge-Based Systems 220', 7.6, TRUE),
  ('A deep learning-based disease diagnosis with intrusion detection for a secured healthcare system',
   'publication', 'Knowledge and Information Systems 66(9)', 3.1, FALSE),
  ('Fault prediction model in wind turbines using deep learning structure with enhanced optimisation algorithm',
   'publication', 'Journal of Control and Decision 12(3)', 1.8, TRUE),
  ('Best Department Leader (HoD), 2nd Foundation Day of Sanjivani University',
   'award', 'Sanjivani University', NULL, NULL),
  ('Session on Machine Learning, Neural Networks and CNN',
   'invited_talk', 'Ural Federal University, Russia', NULL, NULL)
) AS v(title, cat, venue, impact, main)
WHERE f.is_hod
  AND NOT EXISTS (SELECT 1 FROM faculty_achievements fa
                   WHERE fa.faculty_id = f.id AND fa.title = v.title);


-- ----------------------------------------------------- demo student achievement
-- Deliberately left UNVERIFIED and UNPUBLISHED so the approval workflow
-- (submit -> faculty verifies -> publish) can be exercised through the API.
INSERT INTO student_achievements (student_id, title, category, description,
                                  event_name, organiser, location, position,
                                  prize_amount, achieved_on, created_by)
SELECT s.id,
       'Second Prize, National Level Coding Competition',
       'coding',
       'Demo record seeded for testing the verification workflow. Not a real achievement.',
       'Demo CodeSprint 2026',
       'Demo Institute of Technology',
       'Pune',
       'Second Prize',
       10000,
       DATE '2026-08-15',
       s.user_id
FROM students s
JOIN users u ON u.id = s.user_id
WHERE u.email = 'student@sanjivani.edu.in'
  AND NOT EXISTS (
      SELECT 1 FROM student_achievements sa
       WHERE sa.student_id = s.id
         AND sa.title = 'Second Prize, National Level Coding Competition');


-- --------------------------------------------------------------------- check
SELECT 'department' AS t, count(*) FROM department
UNION ALL SELECT 'faculty',              count(*) FROM faculty
UNION ALL SELECT 'research_scholars',    count(*) FROM research_scholars
UNION ALL SELECT 'courses',              count(*) FROM courses
UNION ALL SELECT 'subjects',             count(*) FROM subjects
UNION ALL SELECT 'labs',                 count(*) FROM labs
UNION ALL SELECT 'students',             count(*) FROM students
UNION ALL SELECT 'faculty_achievements', count(*) FROM faculty_achievements
UNION ALL SELECT 'student_achievements (pending)', count(*)
                                        FROM student_achievements WHERE verified_at IS NULL
ORDER BY 1;