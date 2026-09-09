-- ###########################################################################
--  DEPARTMENT CONTENT SEED
--
--  Every fact below comes from one of three department documents:
--    - CSE Department Achievements and Highlights 2025-26
--    - CSE Laboratory Information
--    - MBG Profile (HOD)
--
--  This is the single source of truth. The landing page reads it through
--  /api/public/*, and the AI agent ingests the same rows into its knowledge
--  base, so the website and the assistant can never disagree.
--
--  Run order:
--      psql -d cse_agent -f schema.sql
--      python seed_users.py
--      psql -d cse_agent -f seed.sql
--      psql -d cse_agent -f seed_content.sql     <-- this file
--
--  Safe to re-run.
-- ###########################################################################

-- ---------------------------------------------------------------- department
UPDATE department SET
    school = 'School of Engineering and Technology',
    university = 'Sanjivani University',
    address = 'Kopargaon, Maharashtra, India',
    email = 'project@sanjivani.edu.in',

    about =
'The Department of Computer Science and Engineering at the School of Engineering and Technology, Sanjivani University, has completed an exceptional academic year marked by national recognition, international research collaborations, industry-aligned curriculum reform and outstanding student performance across competitive platforms.

The department has moved decisively beyond conventional classroom instruction towards a model built on applied learning, sustained industry engagement and genuine international exposure for its students. It delivers an industry co-created curriculum developed in association with HCLTech, reviewed periodically against current industry practice so that graduates enter the workforce with skills employers are actively hiring for.

Emerging technologies are offered as core rather than elective components of the programme: Prompt Engineering, Agentic Artificial Intelligence, Machine Learning, Neural Networks and Computer Vision, and Data Science and Analytics.

Two international centres established in partnership with Taiwanese institutions, an industry co-created curriculum with HCLTech, and core coursework in Prompt Engineering and Agentic AI position the department to sustain this trajectory.',

    vision =
'To achieve global recognition in the field of computer science and engineering through an innovative curriculum and quality in Education, Research, Innovation and Entrepreneurship, producing effective leaders who serve societal challenges.',

    mission =
'To provide a platform for students to become industry-ready technocrats as full stack developers, through a curriculum tailored to industry needs with a focus on complex problem-solving skills.

To impart high quality experiential learning in modern software tools and to meet the real-time requirements of industry.

To develop quality research, both national and international, enhancing learning through a strong research ecosystem.

To promote a supportive and positive community through initiatives that contribute to societal well-being and fulfil institutional social responsibility.',

    hod_message =
'The 21st century is the technical era, and Computer Science is one of the core fields most affected by this rapid transformation. Keeping these versatile needs in mind, the Department of Computer Science and Engineering offers highly qualified faculty, fully digitally equipped classrooms and state-of-the-art laboratories. The department follows the rules and regulations laid down by NEP-2020, with the flexibility to meet industry requirements and choice-based subject selection.'
WHERE code = 'CSE';


-- --------------------------------------------------------------------- labs
-- Two labs are documented in detail; two more are named in the 2025-26 report.
INSERT INTO labs (department_id, name, total_systems, operating_system,
                  processor, memory, software, features, sponsored_by, is_coe, is_24x7)
SELECT d.id, v.name, v.sys, v.os, v.cpu, v.mem, v.sw, v.feat, v.sponsor, v.coe, v.always
FROM department d, (VALUES
  ('Advanced Computing Laboratory', NULL::int, NULL, NULL, NULL, NULL,
   'Advanced computing laboratory equipped with high-performance GPUs, supporting deep learning and large-model workloads for project and research work.',
   NULL, FALSE, FALSE),
  ('Robotics and Automation Laboratory', NULL, NULL, NULL, NULL, NULL,
   'Robotics and automation laboratory supporting embedded systems, autonomous robotics and control projects. Department teams built the autonomous maze-solving robot that took First Prize at the Micromouse event, IIT Guwahati.',
   NULL, FALSE, FALSE)
) AS v(name, sys, os, cpu, mem, sw, feat, sponsor, coe, always)
WHERE d.code = 'CSE'
ON CONFLICT (department_id, name) DO NOTHING;


-- -------------------------------------------------------------- achievements
-- Recorded against the HOD's faculty row so they appear in the department
-- record. Student names are as printed in the 2025-26 report.
INSERT INTO faculty_achievements (faculty_id, title, category, description, venue, achieved_on)
SELECT f.id, v.title, v.cat, v.descr, v.venue, v.on_date::date
FROM faculty f, (VALUES

  ('First Prize, Micromouse event, IIT Guwahati', 'award',
   'A team from Sanjivani University secured Rank 1 at the Micromouse event hosted by IIT Guwahati. The competition required teams to design and build autonomous maze-solving robots, testing applied knowledge in robotics, embedded systems and algorithmic problem solving under national-level competitive conditions.',
   'IIT Guwahati', '2026-02-01'),

  ('First Runner-Up, TechDeviathon 2026, E-Waste Management domain', 'award',
   'Ms. Bhakti Bawake and Ms. Gargi Joshi of the Department of Computer Science and Engineering, working with Ms. Saishraddha Salmuthe of Sanjivani Junior College, secured First Runner-Up in the E-Waste Management domain at TechDeviathon 2026, a national-level hackathon at Panimalar Engineering College, Chennai. The team earned a cash prize of Rs. 50,000.',
   'Panimalar Engineering College, Chennai', '2026-02-14'),

  ('Third Prize, IInnoYudh 2K25 National Level Hackathon', 'award',
   'Students of the department secured Third Prize at the IInnoYudh 2K25 National Level Hackathon organised by NSRIT, Visakhapatnam, competing against teams from institutions across the country.',
   'NSRIT, Visakhapatnam', '2025-12-01'),

  ('Best Solution Award, Hackwave 2.0', 'award',
   'A departmental team received the Best Solution Award at Hackwave 2.0, hosted by the Chameli Devi Group of Institutions, Indore, in recognition of the practicality and technical strength of the solution presented.',
   'Chameli Devi Group of Institutions, Indore', '2026-01-15'),

  ('Centre of Excellence with Hitspectra Intelligence Technology, Taiwan', 'grant',
   'Hitspectra Intelligence Technology, Taiwan has established a Centre of Excellence within the department, providing students and faculty with access to advanced research problems, industrial mentorship and collaborative project opportunities with an international technology partner. The centre hosts 13 projects in hyperspectral imaging with colour science.',
   'Hitspectra Intelligence Technology, Taiwan', '2025-10-01'),

  ('Innovation Incubation Centre with National Chung Cheng University, Taiwan', 'grant',
   'National Chung Cheng University, Taiwan has established an Innovation Incubation Centre at the department, supporting student-led innovation, prototype development and early-stage venture building. It forms the institutional basis for the sponsored research internships.',
   'National Chung Cheng University, Taiwan', '2025-11-01'),

  ('Fully sponsored research internships, National Chung Cheng University, Taiwan', 'award',
   'Three students selected for fully sponsored research internships of three to six months: Ms. Ishwari Shrikrushna Pawar, Mr. Shrikant Ashok Pawar and Mr. Sanket Changdeo Jundhare.',
   'National Chung Cheng University, Taiwan', '2026-03-01'),

  ('International research internship, Ural Federal University, Russia', 'award',
   'Ms. Ishwari Shrikrishna Pawar selected for a fully funded fifteen-day research internship at Ural Federal University, Russia, a second international research engagement on her record.',
   'Ural Federal University, Russia', '2026-03-15'),

  ('Summer research internship, IIT (BHU) Varanasi', 'award',
   'Two third-year students selected for a three-month summer internship in Biomedical Signal and Image Processing under Dr. Jack Fredo A. R.: Mr. Yuvraj Sanjay Vikhe and Mr. Sameer Pradeep Jadhav.',
   'IIT (BHU), Varanasi', '2026-04-01'),

  ('SAP Global Certification, 12 students', 'certification',
   'Twelve students of the department completed the SAP Global Certification, strengthening their credentials in enterprise systems.',
   'SAP', '2026-01-01'),

  ('Goethe-Zertifikat A1 German examination, first cohort', 'certification',
   'In a first for the University, students from the department cleared the Goethe-Zertifikat A1 German examination. Ms. Gargi Shelke scored 90/100, Ms. Avani Kulkarni 73/100 and Mr. Raj Somvanshi 60/100, under the guidance of Ms. Riya Khandelwal, German Language Trainer.',
   'Goethe-Institut', '2026-02-01'),

  ('Placements: GB Tech, Teqsys and Techotlist Connects', 'award',
   'Ms. Priya Laxman Deshmukh placed at GB Tech, Mumbai. Mr. Aditya Shinde received an internship with a pre-placement offer at Teqsys Pvt. Ltd., Mumbai. Mr. Yuvraj Vikhe (Batch 2027) placed at Techotlist Connects Pvt. Ltd., Hyderabad with a CTC of 10 LPA, the highest package of the year.',
   'Campus placements 2025-26', '2026-05-01'),

  ('Student venture: Prenaya Softtech Solutions', 'award',
   'Mr. Yashvardhan Shinde, a current B.Tech. student of the department, established and opened the office of his own venture, Prenaya Softtech Solutions.',
   'Prenaya Softtech Solutions', '2026-04-01')

) AS v(title, cat, descr, venue, on_date)
WHERE f.is_hod
  AND NOT EXISTS (SELECT 1 FROM faculty_achievements fa
                   WHERE fa.faculty_id = f.id AND fa.title = v.title);


-- ------------------------------------------------------------------- events
-- Documented events from the 2025-26 report, published so they appear on
-- the site. Past events remain visible in the events archive.
INSERT INTO events (department_id, scope, event_type, title, description,
                    organiser, speaker, starts_at, is_published)
SELECT d.id, v.scope, v.etype, v.title, v.descr, v.org, v.speaker,
       v.starts::timestamptz, TRUE
FROM department d, (VALUES

  ('department', 'competition', 'Blind Coding Competition',
   'Organised with the ACE Association to mark the birthday week of Hon''ble Chairman Shri. Nitin Dada Kolhe Saheb. Participants wrote functional C++ or Java programs without viewing the monitor, within a twenty-minute time limit.',
   'Department of CSE with the ACE Association', NULL, '2025-09-16 10:00+05:30'),

  ('department', 'workshop', 'DevOps Workshop under the i-Connect Programme',
   'A hands-on DevOps workshop covering contemporary deployment pipelines and industry tooling in current professional use, delivered under Sanjivani''s i-Connect flagship programme.',
   'i-Connect Programme', 'Mr. Chandrashekhar Shukla, Founder and CEO, Codenixia Pvt. Ltd., Pune',
   '2025-11-12 10:00+05:30'),

  ('department', 'guest_lecture', 'MyStory Board: Alumni Sessions',
   'Under the MyStory Board flagship programme, alumni returned to share their professional journeys: Mr. Pankaj Vargude (Team Leader, Data Analytics, Atlas Copco Pvt. Ltd., Pune), Mr. Sai Abhale (Project Lead, KOGNiX Pvt. Ltd., Pune), Mr. Raghvendra Naidu (Project Manager, Sai Comptech Pvt. Ltd., Kopargaon) and Mr. Asad Shaikh (Data Engineer, Celebal Technologies, Pune).',
   'MyStory Board Programme', NULL, '2025-12-05 11:00+05:30'),

  ('institute', 'seminar', 'Sanjivani Thought Leader Session',
   'A Thought Leader Session addressing developments in artificial intelligence and their implications for early-career engineers.',
   'Sanjivani University', 'Prof. Ajit Jaokar', '2026-01-20 14:00+05:30'),

  ('institute', 'guest_lecture', 'International Session on Global Research Directions',
   'An international session on global research directions and higher education pathways in Central Asia.',
   'Sanjivani University', 'Prof. (Dr.) Abhijit Tarawade, Tashkent University',
   '2026-02-10 11:00+05:30'),

  ('department', 'exhibition', 'Department Project Competition',
   'A project competition giving students the opportunity to present their work to and receive feedback from an internationally recognised researcher.',
   'Department of CSE', 'Chief Guest: Dr. Chandra Kambhamettu', '2026-03-05 09:30+05:30'),

  ('department', 'industrial_visit', 'Indian Knowledge Systems Heritage Study',
   'A field activity giving students exposure to India''s heritage landscape and the engineering and design traditions within it. Learning objectives covered rock-cut engineering and construction logistics; aesthetics, iconography and ritual space design (Sthapatya Shastra and Silpa traditions); cultural synthesis across Buddhist, Hindu and Jain traditions; and site planning, water management on a basalt escarpment and conservation awareness.',
   'Department of CSE', NULL, '2026-01-08 08:00+05:30'),

  ('department', 'seminar', 'Third Year Parent-Teacher Meeting',
   'Strengthened collaboration between parents and faculty, gave parents insight into the University''s academic culture and support systems, and recognised student achievements.',
   'Department of CSE', NULL, '2026-02-22 10:00+05:30')

) AS v(scope, etype, title, descr, org, speaker, starts)
WHERE d.code = 'CSE'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.title = v.title);


-- ------------------------------------------------------------ announcements
INSERT INTO announcements (title, body, priority, is_pinned, published_at, created_by)
SELECT v.title, v.body, v.pri, v.pin, now(), u.id
FROM users u, (VALUES
  ('HCLTech-powered syllabus with Prompt Engineering and Agentic AI',
   'Emerging technologies are now core rather than elective components of the B.Tech. programme. Current core offerings include Prompt Engineering, Agentic Artificial Intelligence, Machine Learning, Neural Networks and Computer Vision, and Data Science and Analytics.',
   'high', TRUE),
  ('Two international centres established with Taiwanese institutions',
   'A Centre of Excellence with Hitspectra Intelligence Technology and an Innovation Incubation Centre with National Chung Cheng University are now operating within the department. Both support student research, prototype development and sponsored internships.',
   'high', TRUE),
  ('Highest placement package of the year: 10 LPA',
   'Mr. Yuvraj Vikhe (Batch 2027) has been placed at Techotlist Connects Pvt. Ltd., Hyderabad with a CTC of 10 LPA, the highest package recorded for the department this year.',
   'normal', FALSE)
) AS v(title, body, pri, pin)
WHERE u.email = 'hod@sanjivani.edu.in'
  AND NOT EXISTS (SELECT 1 FROM announcements a WHERE a.title = v.title);


-- --------------------------------------------------------------------- check
SELECT 'department'            AS t, count(*) FROM department
UNION ALL SELECT 'labs',            count(*) FROM labs
UNION ALL SELECT 'faculty_achv',    count(*) FROM faculty_achievements
UNION ALL SELECT 'events',          count(*) FROM events
UNION ALL SELECT 'announcements',   count(*) FROM announcements
UNION ALL SELECT 'subjects',        count(*) FROM subjects
ORDER BY 1;
