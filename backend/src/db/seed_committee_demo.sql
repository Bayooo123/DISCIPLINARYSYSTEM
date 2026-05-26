-- ============================================================
-- TIDDS — Committee Member Demo Seed
-- Account: Onyekachi Onumajuru  (o.onumajuru@unilag.edu.ng / Committee123)
-- Creates 16 cases across every workflow stage with full supporting data.
-- Safe to run multiple times (idempotent via ON CONFLICT).
-- ============================================================

DO $$
DECLARE
  v_iid   UUID;  -- institution id
  v_cm    UUID;  -- committee member
  v_off   UUID;  -- complaints officer
  v_pm1   UUID;  -- panel member – chairperson
  v_pm2   UUID;  -- panel member – secretary
  v_pm3   UUID;  -- panel member – member
  v_feng  UUID;  -- faculty of engineering
  v_flaw  UUID;  -- faculty of law
  v_fsoc  UUID;  -- faculty of social sciences
  v_suid  UUID;  -- student user id (temp)
  v_sid   UUID;  -- student profile id (temp)
  v_cid   UUID;  -- case id (temp)
  v_pid   UUID;  -- panel id (temp)
  v_ref   TEXT;

BEGIN

  -- ── 1. Institution ────────────────────────────────────────────────────────────
  SELECT id INTO v_iid FROM institutions WHERE domain = 'unilag.edu.ng';
  IF v_iid IS NULL THEN
    RAISE EXCEPTION 'UNILAG not found — run the main seed.sql first.';
  END IF;

  -- ── 2. Committee member ───────────────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'o.onumajuru@unilag.edu.ng',
          crypt('Committee123', gen_salt('bf', 10)),
          'Onyekachi Onumajuru', 'committee_member', true)
  ON CONFLICT (institution_id, email)
  DO UPDATE SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_cm;
  IF v_cm IS NULL THEN
    SELECT id INTO v_cm FROM users WHERE institution_id = v_iid AND email = 'o.onumajuru@unilag.edu.ng';
  END IF;

  -- ── 3. Complaints officer ─────────────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'officer@unilag.edu.ng',
          crypt('Password123', gen_salt('bf', 10)),
          'Dr. Amaka Osei', 'complaints_officer', true)
  ON CONFLICT (institution_id, email)
  DO UPDATE SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_off;
  IF v_off IS NULL THEN
    SELECT id INTO v_off FROM users WHERE institution_id = v_iid AND email = 'officer@unilag.edu.ng';
  END IF;

  -- ── 4. Panel members ──────────────────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'a.okonkwo@unilag.edu.ng', crypt('Panel123', gen_salt('bf', 8)),
          'Prof. Adebayo Okonkwo', 'panel_member', true)
  ON CONFLICT (institution_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_pm1;
  IF v_pm1 IS NULL THEN SELECT id INTO v_pm1 FROM users WHERE institution_id = v_iid AND email = 'a.okonkwo@unilag.edu.ng'; END IF;

  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'c.eze@unilag.edu.ng', crypt('Panel123', gen_salt('bf', 8)),
          'Dr. Chioma Eze', 'panel_member', true)
  ON CONFLICT (institution_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_pm2;
  IF v_pm2 IS NULL THEN SELECT id INTO v_pm2 FROM users WHERE institution_id = v_iid AND email = 'c.eze@unilag.edu.ng'; END IF;

  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'b.adewale@unilag.edu.ng', crypt('Panel123', gen_salt('bf', 8)),
          'Mr. Babatunde Adewale', 'panel_member', true)
  ON CONFLICT (institution_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_pm3;
  IF v_pm3 IS NULL THEN SELECT id INTO v_pm3 FROM users WHERE institution_id = v_iid AND email = 'b.adewale@unilag.edu.ng'; END IF;

  -- ── 5. Faculties ──────────────────────────────────────────────────────────────
  INSERT INTO faculties (institution_id, name, code)
  VALUES (v_iid, 'Faculty of Engineering', 'ENG')
  ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_feng;
  IF v_feng IS NULL THEN SELECT id INTO v_feng FROM faculties WHERE institution_id = v_iid AND code = 'ENG'; END IF;

  INSERT INTO faculties (institution_id, name, code)
  VALUES (v_iid, 'Faculty of Law', 'LAW')
  ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_flaw;
  IF v_flaw IS NULL THEN SELECT id INTO v_flaw FROM faculties WHERE institution_id = v_iid AND code = 'LAW'; END IF;

  INSERT INTO faculties (institution_id, name, code)
  VALUES (v_iid, 'Faculty of Social Sciences', 'SOC')
  ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_fsoc;
  IF v_fsoc IS NULL THEN SELECT id INTO v_fsoc FROM faculties WHERE institution_id = v_iid AND code = 'SOC'; END IF;


  -- ══════════════════════════════════════════════════════════════════════════════
  -- CLOSED CASES (4) — complete workflow, verdict recorded
  -- ══════════════════════════════════════════════════════════════════════════════

  -- ── C1: UPHELD — Examination malpractice → Suspended 1 semester ───────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'chi.okafor@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Chibueze Okafor', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'chi.okafor@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2021/100001', v_feng, '400L', 'Electrical Engineering')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2021/100001'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, outcome, response_deadline, filed_at, closed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Examination malpractice: candidate found in possession of a micro-written cheat sheet concealed inside a wristwatch during the 2025/1 EEE 401 examination.',
    'UNILAG Examination Regulations 2019, Section 7(2)(a): Possession of unauthorised materials in the examination hall.',
    CURRENT_DATE - 52, 'Faculty of Engineering Examination Hall — Hall B',
    'closed', 'upheld',
    NOW() - INTERVAL '45 days', NOW() - INTERVAL '52 days', NOW() - INTERVAL '8 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I respectfully deny the allegation. The watch was a gift from my late grandfather and was not used for any unauthorised purpose. I was unaware of any written material on its surface. I appeal to the panel to consider my four years of clean academic record.',
    NOW() - INTERVAL '48 days');

  INSERT INTO evidence_files (case_id, uploaded_by, file_name, file_size, mime_type, storage_key)
  VALUES (v_cid, v_off, 'invigilator_report_EEE401.pdf', 184320, 'application/pdf', 'demo/invigilator_report_EEE401.pdf'),
         (v_cid, v_off, 'exhibit_wristwatch_photo.jpg',   92160,  'image/jpeg',      'demo/exhibit_wristwatch_photo.jpg');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '44 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm2, 'secretary');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'member');

  INSERT INTO hearings (panel_id, case_id, scheduled_at, venue, student_attended, hearing_notes, completed_at, recorded_by)
  VALUES (v_pid, v_cid, NOW() - INTERVAL '15 days', 'Senate Building, Conference Room 3', true,
    'Hearing commenced 10:00 AM. Invigilator Mr. Salami confirmed discovery of the cheat sheet inside the accused''s wristwatch. The accused maintained his denial. Panel examined the physical exhibit. After deliberation the charge was found proved on the balance of probabilities.',
    NOW() - INTERVAL '15 days', v_pm2);

  INSERT INTO verdicts (case_id, panel_id, outcome, penalty, effective_date, conditions, appeal_rights, ratified_by, recorded_by, recorded_at, communicated_at)
  VALUES (v_cid, v_pid, 'upheld',
    'Suspension from all academic activities for one (1) full academic semester. All 2025/1 examination scores cancelled.',
    CURRENT_DATE - 8,
    'Student must complete mandatory academic integrity workshop before readmission to examinations.',
    'The student may appeal within fourteen (14) days to the Vice-Chancellor in writing addressed to the Registrar.',
    v_pm1, v_pm2, NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days');

  -- ── C2: UPHELD — Physical assault → Rustication ───────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'a.nwosu@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Adaeze Nwosu', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'a.nwosu@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2020/100002', v_flaw, '500L', 'Law')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2020/100002'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, outcome, response_deadline, filed_at, closed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Physical assault: student violently attacked a 300-level colleague causing a broken nose and laceration requiring four stitches, triggered by a dispute over library seating.',
    'UNILAG Student Conduct Regulations 2021, Article 12(1): Physical assault or battery of any member of the university community.',
    CURRENT_DATE - 65, 'Faculty of Law Library, Ground Floor',
    'closed', 'upheld',
    NOW() - INTERVAL '58 days', NOW() - INTERVAL '65 days', NOW() - INTERVAL '12 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'admit',
    'I acknowledge that my actions were wrong and inexcusable. I was under severe personal stress at the time. I deeply regret the injury caused and have personally apologised. I humbly appeal for a lenient sanction that will allow me to complete my final year.',
    NOW() - INTERVAL '62 days');

  INSERT INTO evidence_files (case_id, uploaded_by, file_name, file_size, mime_type, storage_key)
  VALUES (v_cid, v_off, 'medical_report_victim.pdf', 210944, 'application/pdf', 'demo/medical_report_victim.pdf'),
         (v_cid, v_off, 'witness_statements.pdf',    143360, 'application/pdf', 'demo/witness_statements.pdf');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '55 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm2, 'secretary');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'member');

  INSERT INTO hearings (panel_id, case_id, scheduled_at, venue, student_attended, hearing_notes, completed_at, recorded_by)
  VALUES (v_pid, v_cid, NOW() - INTERVAL '20 days', 'Registrar''s Conference Room, Main Admin Building', true,
    'Student appeared and admitted the allegation in full. Medical evidence confirming the victim''s injuries was tendered. Panel noted the seriousness of the offence but took account of the student''s admission and personal circumstances. After deliberation a severe sanction was determined to be warranted.',
    NOW() - INTERVAL '20 days', v_pm2);

  INSERT INTO verdicts (case_id, panel_id, outcome, penalty, effective_date, conditions, appeal_rights, ratified_by, recorded_by, recorded_at, communicated_at)
  VALUES (v_cid, v_pid, 'upheld',
    'Rustication from the University of Lagos for one (1) full academic session, effective immediately. Student barred from all university premises during the rustication period.',
    CURRENT_DATE - 12,
    'Student must complete mandatory anger management counselling with the University Counselling Centre and obtain a clearance certificate before applying for readmission.',
    'The student may appeal within fourteen (14) days to the Vice-Chancellor''s office.',
    v_pm1, v_pm2, NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days');

  -- ── C3: DISMISSED — Plagiarism allegation (insufficient evidence) ─────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'o.adeyemi2@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Olumide Adeyemi', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'o.adeyemi2@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2022/100003', v_fsoc, '300L', 'Economics')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2022/100003'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, outcome, response_deadline, filed_at, closed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Academic fraud: student''s term paper on "Exchange Rate Determinants" contains substantial passages reproduced without attribution from a 2022 CBN working paper, including figures and conclusions.',
    'UNILAG Academic Integrity Policy 2023, Section 4: Plagiarism and misappropriation of academic work.',
    CURRENT_DATE - 40, 'Department of Economics, Project Submission Office',
    'closed', 'dismissed',
    NOW() - INTERVAL '33 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '6 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I completely deny this allegation. The passages represent common economic terminology that cannot be attributed to any single source. I attached a full bibliography which the complaints officer failed to reference. The Turnitin similarity score was 14%, well below the university threshold of 25%.',
    NOW() - INTERVAL '37 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '30 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'secretary');

  INSERT INTO hearings (panel_id, case_id, scheduled_at, venue, student_attended, hearing_notes, completed_at, recorded_by)
  VALUES (v_pid, v_cid, NOW() - INTERVAL '10 days', 'Faculty of Social Sciences, Dean''s Boardroom', true,
    'Student submitted supplementary evidence including original bibliography and certified Turnitin report showing 14% similarity. Expert analysis from the Department of Economics confirmed that passages constitute standard economic terminology. Evidence did not meet the threshold to establish plagiarism. Complaint dismissed.',
    NOW() - INTERVAL '10 days', v_pm3);

  INSERT INTO verdicts (case_id, panel_id, outcome, appeal_rights, ratified_by, recorded_by, recorded_at, communicated_at)
  VALUES (v_cid, v_pid, 'dismissed',
    'The Complaints Officer may refer this matter to the Senate Academic Standards Committee if new evidence emerges.',
    v_pm1, v_pm3, NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days');

  -- ── C4: REFERRED — Drug possession (referred to Vice-Chancellor) ──────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'h.garba@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Hauwa Garba', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'h.garba@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2021/100004', v_fsoc, '400L', 'Sociology')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2021/100004'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, outcome, response_deadline, filed_at, closed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Drug possession: approximately 42 grams of cannabis sativa discovered during a scheduled room inspection of Moremi Hall. NDLEA laboratory analysis has confirmed the nature of the substance.',
    'UNILAG Student Conduct Regulations 2021, Article 18(1): Possession of illegal substances on university premises.',
    CURRENT_DATE - 38, 'Moremi Hall of Residence, Room 217',
    'closed', 'referred',
    NOW() - INTERVAL '31 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I deny ownership of the substance found in my room. I share access with a visiting student who was present during the inspection. The substance was not found on my person. I am cooperating fully with university and law enforcement authorities.',
    NOW() - INTERVAL '35 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '28 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm2, 'secretary');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'member');

  INSERT INTO hearings (panel_id, case_id, scheduled_at, venue, student_attended, hearing_notes, completed_at, recorded_by)
  VALUES (v_pid, v_cid, NOW() - INTERVAL '6 days', 'Student Affairs Division, Hearing Room 1', true,
    'Given the involvement of law enforcement and potential criminal dimensions, the panel resolved that this matter exceeds its mandate. Referred to the Vice-Chancellor for determination in consultation with the University''s Legal Unit.',
    NOW() - INTERVAL '6 days', v_pm2);

  INSERT INTO verdicts (case_id, panel_id, outcome, conditions, appeal_rights, ratified_by, recorded_by, recorded_at, communicated_at)
  VALUES (v_cid, v_pid, 'referred',
    'Case referred to the Vice-Chancellor''s office. Student suspended from university premises pending determination. Access card deactivated.',
    'The student may make written representations to the Vice-Chancellor within seven (7) days.',
    v_pm1, v_pm2, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');


  -- ══════════════════════════════════════════════════════════════════════════════
  -- HEARING COMPLETED (2) — awaiting verdict
  -- ══════════════════════════════════════════════════════════════════════════════

  -- ── H1: Document forgery ──────────────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'e.obiora@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Emeka Obiora', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'e.obiora@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2022/100005', v_feng, '300L', 'Mechanical Engineering')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2022/100005'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Document forgery: student submitted a falsified medical certificate purportedly issued by the University Health Centre to excuse absence from the MEE 302 CA examination. The Health Centre confirmed no such certificate was issued and the reference number belongs to a different patient.',
    'UNILAG Student Conduct Regulations 2021, Article 15: Forgery or falsification of university documents.',
    CURRENT_DATE - 22, 'Department of Mechanical Engineering',
    'hearing_completed', NOW() - INTERVAL '18 days', NOW() - INTERVAL '22 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I deny forging any document. I obtained the certificate from a private medical facility, not the University Health Centre, and submitted it in good faith. I acknowledge I should have been clearer about its source.',
    NOW() - INTERVAL '20 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '17 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm2, 'secretary');

  INSERT INTO hearings (panel_id, case_id, scheduled_at, venue, student_attended, hearing_notes, completed_at, recorded_by)
  VALUES (v_pid, v_cid, NOW() - INTERVAL '3 days', 'Faculty of Engineering, Seminar Room A', true,
    'Health Centre Administrator confirmed no record of the certificate. Student produced a receipt from "City Medical Centre" but could not account for the discrepancy in certificate header and reference number. Panel has concluded deliberations. Verdict to be communicated within 48 hours.',
    NOW() - INTERVAL '3 days', v_pm2);

  -- ── H2: Cyberbullying of academic staff ───────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 's.afolabi@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Sade Afolabi', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 's.afolabi@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2021/100006', v_flaw, '400L', 'Law')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2021/100006'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Cyberbullying: student conducted a sustained harassment campaign on Instagram and Twitter/X targeting Dr. Ngozi Ohaeri of the Law Faculty, including manipulated photographs and mass report-flagging of her academic profiles.',
    'UNILAG ICT and Social Media Policy 2022, Section 9: Harassment or intimidation via electronic platforms.',
    CURRENT_DATE - 18, 'Online — Instagram and Twitter/X',
    'hearing_completed', NOW() - INTERVAL '14 days', NOW() - INTERVAL '18 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'admit',
    'I admit to posting the content and deeply regret causing distress to Dr. Ohaeri. My actions were motivated by a belief that I had been unfairly graded, but I acknowledge that social media was not an appropriate channel. I have deleted all relevant posts and formally apologise.',
    NOW() - INTERVAL '16 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '13 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'secretary');

  INSERT INTO hearings (panel_id, case_id, scheduled_at, venue, student_attended, hearing_notes, completed_at, recorded_by)
  VALUES (v_pid, v_cid, NOW() - INTERVAL '2 days', 'Senate Building, Small Conference Room', true,
    'Dr. Ohaeri submitted a written impact statement. Screenshots exhibited. Student maintained her admission. Panel has completed deliberations and will communicate verdict within two working days.',
    NOW() - INTERVAL '2 days', v_pm3);


  -- ══════════════════════════════════════════════════════════════════════════════
  -- HEARING SCHEDULED (2)
  -- ══════════════════════════════════════════════════════════════════════════════

  -- ── HS1: Vandalism — hearing in 3 days ────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'u.abdullahi@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Umar Abdullahi', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'u.abdullahi@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2021/100007', v_feng, '400L', 'Computer Engineering')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2021/100007'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Vandalism: student intentionally destroyed two workstations and a network switch in the Computer Engineering laboratory following a failed examination result notification. Total assessed damage is ₦2,340,000.',
    'UNILAG Student Conduct Regulations 2021, Article 14(1): Wilful destruction of university property.',
    CURRENT_DATE - 14, 'Computer Engineering Laboratory 3 (CEL-3)',
    'hearing_scheduled', NOW() - INTERVAL '10 days', NOW() - INTERVAL '14 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'admit',
    'I admit that I damaged the equipment and am deeply ashamed. I was in extreme distress after seeing my examination results and completely lost control. I offer to make full restitution and am currently receiving support from the university counselling service.',
    NOW() - INTERVAL '12 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '9 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm2, 'secretary');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'member');

  INSERT INTO hearings (panel_id, case_id, scheduled_at, venue)
  VALUES (v_pid, v_cid, NOW() + INTERVAL '3 days', 'Faculty of Engineering, Dean''s Boardroom');

  -- ── HS2: Theft — hearing tomorrow ─────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'b.okonkwo2@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Blessing Okonkwo', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'b.okonkwo2@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2023/100008', v_flaw, '200L', 'Law')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2023/100008'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Theft: student removed restricted periodicals and three bound law reports valued at ₦95,000 from the Faculty of Law library without authorisation. Security footage corroborates the librarian''s report.',
    'UNILAG Student Conduct Regulations 2021, Article 13: Theft or misappropriation of university property.',
    CURRENT_DATE - 11, 'Faculty of Law Library — Restricted Periodicals Section',
    'hearing_scheduled', NOW() - INTERVAL '7 days', NOW() - INTERVAL '11 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I deny the allegation of theft. I removed the materials for an urgent moot court preparation exercise and intended to return them the following morning. I was unaware they were non-borrowable. All materials were returned within 18 hours.',
    NOW() - INTERVAL '9 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '7 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'secretary');

  INSERT INTO hearings (panel_id, case_id, scheduled_at, venue)
  VALUES (v_pid, v_cid, NOW() + INTERVAL '1 day', 'Faculty of Law, Moot Court Room');


  -- ══════════════════════════════════════════════════════════════════════════════
  -- PANEL CONSTITUTED (3) — panel formed, hearing not yet scheduled
  -- ══════════════════════════════════════════════════════════════════════════════

  -- ── P1: Sexual harassment ─────────────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 't.adekunle@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Taiwo Adekunle', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 't.adekunle@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2020/100009', v_fsoc, '500L', 'Psychology')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2020/100009'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Sexual harassment: student repeatedly made unwanted physical contact and directed sexually explicit remarks towards a fellow student on multiple occasions between October and December 2024, following a formal written warning issued by the Dean of Students in November 2024.',
    'UNILAG Sexual Harassment Policy 2020, Article 3(b): Repeated unwanted sexual advances following a formal warning.',
    CURRENT_DATE - 7, 'Faculty of Social Sciences Campus — Common Areas',
    'panel_constituted', NOW() - INTERVAL '4 days', NOW() - INTERVAL '7 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I deny making any unwanted advances. My interactions with the complainant were entirely consensual. I acknowledge receiving the written warning in November but maintain that the circumstances were mischaracterised. I have not had any contact with the complainant since the warning was issued.',
    NOW() - INTERVAL '5 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '3 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm2, 'secretary');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'member');

  -- ── P2: Examination impersonation ─────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'ch.ezeobi@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Chinwe Ezeobi', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'ch.ezeobi@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2023/100010', v_flaw, '200L', 'Law')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2023/100010'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Examination impersonation: student sat for the LAW 211 (Contract Law) examination in place of a fellow student, carrying that student''s examination card. Biometric verification at the hall entrance flagged the irregularity.',
    'UNILAG Examination Regulations 2019, Section 12(1): Impersonation in examinations.',
    CURRENT_DATE - 5, 'Main Examination Hall, Faculty of Law',
    'panel_constituted', NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I categorically deny impersonating any student. I was sitting in the seat assigned to me. The examination card in my possession was handed to me by mistake during distribution. I raised the issue with the invigilator but was told to proceed.',
    NOW() - INTERVAL '4 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '2 days') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm2, 'secretary');

  -- ── P3: Disruption of academic activities ─────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'r.adesanya@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Rotimi Adesanya', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'r.adesanya@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2020/100011', v_fsoc, '500L', 'Political Science')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2020/100011'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Disruption of academic activities: student organised and led an unsanctioned protest that blockaded the Faculty of Social Sciences for two consecutive days, preventing lectures, laboratory sessions, and a mid-semester examination affecting over 1,400 students.',
    'UNILAG Student Conduct Regulations 2021, Article 20: Organised disruption of academic activities.',
    CURRENT_DATE - 6, 'Faculty of Social Sciences — Main Entrance and Lecture Complex',
    'panel_constituted', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I deny leading any organised protest. I was present at a spontaneous student assembly responding to an announced increase in examination fees. Any disruption was unintended and not organised by me. The right to peaceful assembly is protected by the Constitution of the Federal Republic of Nigeria.',
    NOW() - INTERVAL '4 days');

  INSERT INTO panels (case_id, institution_id, constituted_by, constituted_at)
  VALUES (v_cid, v_iid, v_cm, NOW() - INTERVAL '1 day') RETURNING id INTO v_pid;
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm1, 'chairperson');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm3, 'secretary');
  INSERT INTO panel_members (panel_id, user_id, panel_role) VALUES (v_pid, v_pm2, 'member');


  -- ══════════════════════════════════════════════════════════════════════════════
  -- RESPONSE RECEIVED (2)
  -- ══════════════════════════════════════════════════════════════════════════════

  -- ── RR1: Plagiarism — admitted ────────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'f.bello@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Fatimah Bello', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'f.bello@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2022/100012', v_feng, '300L', 'Civil Engineering')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2022/100012'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Plagiarism: student''s CVE 301 project report shows a Turnitin similarity score of 71%, with entire sections reproduced verbatim from a 2023 final-year project submitted by a graduate of the department, including figures, calculations, and conclusions.',
    'UNILAG Academic Integrity Policy 2023, Section 4(2): Submission of another person''s work as one''s own.',
    CURRENT_DATE - 9, 'Department of Civil Engineering, Project Submission Office',
    'response_received', NOW() - INTERVAL '4 days', NOW() - INTERVAL '9 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'admit',
    'I acknowledge that my submission contained material drawn from a prior project without adequate attribution. The decision was made under extreme pressure as I was dealing with a family health emergency. I have no prior academic integrity violations and respectfully request the panel consider these mitigating circumstances.',
    NOW() - INTERVAL '6 days');

  -- ── RR2: Insubordination — denied ─────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'ch.nwachukwu@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Chidi Nwachukwu', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'ch.nwachukwu@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2022/100013', v_fsoc, '300L', 'Sociology')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2022/100013'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Gross insubordination: student verbally abused and threatened Prof. Kehinde Soyinka in front of approximately 120 students, accusing him of favouritism and refusing to leave the lecture theatre when instructed. The incident was recorded on multiple students'' mobile phones.',
    'UNILAG Student Conduct Regulations 2021, Article 11: Insubordination or threatening behaviour towards academic staff.',
    CURRENT_DATE - 8, 'SOC 301 Lecture, Faculty of Social Sciences — Lecture Theatre 2',
    'response_received', NOW() - INTERVAL '3 days', NOW() - INTERVAL '8 days')
  RETURNING id INTO v_cid;

  INSERT INTO student_responses (case_id, plea, response_text, submitted_at)
  VALUES (v_cid, 'deny',
    'I deny the characterisation of my conduct as grossly insubordinate. I raised a legitimate grievance about the marking of a CAT script. While my tone was raised I categorically deny making any threats. I was not asked to leave — I was told my concerns were "irrelevant" and I remained to have my query addressed.',
    NOW() - INTERVAL '5 days');


  -- ══════════════════════════════════════════════════════════════════════════════
  -- RESPONSE OVERDUE (1)
  -- ══════════════════════════════════════════════════════════════════════════════

  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'a.yusuf2@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Aminat Yusuf', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'a.yusuf2@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2021/100014', v_feng, '400L', 'Chemical Engineering')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2021/100014'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Unauthorised system access: student allegedly gained access to the departmental examination result management system using a technician''s credentials, viewing unconfirmed CHE 401 results prior to official release.',
    'UNILAG ICT and Social Media Policy 2022, Section 6: Unauthorised access to university computer systems.',
    CURRENT_DATE - 12, 'Chemical Engineering Department — IT Server Room (remote access)',
    'response_overdue', NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 days')
  RETURNING id INTO v_cid;


  -- ══════════════════════════════════════════════════════════════════════════════
  -- AWAITING RESPONSE (3)
  -- ══════════════════════════════════════════════════════════════════════════════

  -- ── AR1: Financial misconduct — deadline in 5 days ────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'g.eze@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Godwin Eze', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'g.eze@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2022/100015', v_fsoc, '300L', 'Political Science')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2022/100015'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Financial misconduct: student submitted falsified income and family circumstances documentation to the bursary office to qualify for the Lagos State Bursary Award, obtaining ₦180,000 in financial aid to which he was not entitled.',
    'UNILAG Student Conduct Regulations 2021, Article 16(2): Submission of false financial information to obtain university benefits.',
    CURRENT_DATE - 4, 'Bursary and Financial Aid Office, Senate Building',
    'awaiting_response', NOW() + INTERVAL '5 days', NOW() - INTERVAL '4 days')
  RETURNING id INTO v_cid;

  -- ── AR2: Harassment of teaching assistant — deadline in 2 days ────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'i.okeke@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Ifeoma Okeke', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'i.okeke@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2023/100016', v_flaw, '200L', 'Law')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2023/100016'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Harassment of a university employee: student repeatedly intercepted and verbally intimidated a postgraduate teaching assistant outside his office, demanding review of her LAW 201 assignment grade that had already been moderated and confirmed by the course coordinator.',
    'UNILAG Student Conduct Regulations 2021, Article 11(3): Intimidation or harassment of university staff including postgraduate employees.',
    CURRENT_DATE - 3, 'Faculty of Law — Postgraduate Wing, Office PG-07',
    'awaiting_response', NOW() + INTERVAL '2 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO v_cid;

  -- ── AR3: Hostel misconduct — deadline tomorrow ────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (v_iid, 'k.badmus@unilag.edu.ng', crypt('Student123', gen_salt('bf', 8)), 'Kunle Badmus', 'student', true)
  ON CONFLICT (institution_id, email) DO NOTHING RETURNING id INTO v_suid;
  IF v_suid IS NULL THEN SELECT id INTO v_suid FROM users WHERE institution_id = v_iid AND email = 'k.badmus@unilag.edu.ng'; END IF;
  INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
  VALUES (v_suid, v_iid, '2022/100017', v_feng, '300L', 'Systems Engineering')
  ON CONFLICT (institution_id, matric_number) DO NOTHING RETURNING id INTO v_sid;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE institution_id = v_iid AND matric_number = '2022/100017'; END IF;

  SELECT next_case_reference(v_iid, 'UNILAG') INTO v_ref;
  INSERT INTO cases (reference, institution_id, student_id, filed_by,
    offence_description, regulation_breached, incident_date, incident_location,
    current_stage, response_deadline, filed_at)
  VALUES (v_ref, v_iid, v_sid, v_off,
    'Serious hostel misconduct: student hosted an unsanctioned overnight gathering of seventeen non-resident individuals in Biobaku Hall, twelve of whom had no university ID. Two guests were found in possession of alcohol, which is prohibited on hall premises.',
    'UNILAG Hall of Residence Rules 2022, Rules 8 and 11: Prohibition on unauthorised overnight guests and possession of alcohol on hall premises.',
    CURRENT_DATE - 2, 'Biobaku Hall of Residence, Room 118 and Common Room',
    'awaiting_response', NOW() + INTERVAL '1 day', NOW() - INTERVAL '2 days')
  RETURNING id INTO v_cid;


  RAISE NOTICE '';
  RAISE NOTICE '✓ Demo seed complete.';
  RAISE NOTICE '  Login : o.onumajuru@unilag.edu.ng';
  RAISE NOTICE '  Password : Committee123';
  RAISE NOTICE '  Cases created : 16 (4 closed · 2 hearing_completed · 2 hearing_scheduled · 3 panel_constituted · 2 response_received · 1 response_overdue · 3 awaiting_response)';
  RAISE NOTICE '  Panel members : Prof. Adebayo Okonkwo · Dr. Chioma Eze · Mr. Babatunde Adewale';

END $$;
