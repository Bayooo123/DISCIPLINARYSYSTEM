-- ============================================================
-- TIDDS — Development Seed Data
-- Paste into: Supabase → SQL Editor → New query → Run
--
-- Creates: UNILAG institution, 10 students, 10 complaints,
-- 10 panels — assigns the most-recently-signed-up panel_member
-- as chairperson on every panel.
-- ============================================================

DO $$
DECLARE
  v_panel_member_id   UUID;
  v_institution_id    UUID;
  v_officer_id        UUID;
  v_faculty_id        UUID;
  v_student_user_id   UUID;
  v_student_id        UUID;
  v_case_id           UUID;
  v_panel_id          UUID;
  i                   INT;

  students TEXT[][] := ARRAY[
    ['Chukwuemeka Obi',   'c.obi@unilag.edu.ng',     '2020/123456'],
    ['Fatima Abubakar',   'f.abubakar@unilag.edu.ng', '2020/234567'],
    ['Oluwaseun Adeyemi', 'o.adeyemi@unilag.edu.ng',  '2021/345678'],
    ['Ibrahim Musa',      'i.musa@unilag.edu.ng',     '2021/456789'],
    ['Ngozi Okonkwo',     'n.okonkwo@unilag.edu.ng',  '2022/567890'],
    ['Tunde Bakare',      't.bakare@unilag.edu.ng',   '2019/678901'],
    ['Amina Yusuf',       'a.yusuf@unilag.edu.ng',    '2020/789012'],
    ['Emeka Nwosu',       'e.nwosu@unilag.edu.ng',    '2021/890123'],
    ['Blessing Eze',      'b.eze@unilag.edu.ng',      '2022/901234'],
    ['Hakeem Lawal',      'h.lawal@unilag.edu.ng',    '2019/012345']
  ];

  offences TEXT[] := ARRAY[
    'Examination malpractice: found in possession of unauthorised materials during the first-semester examination',
    'Physical assault: unprovoked attack on a fellow student within the Faculty of Engineering corridor',
    'Academic fraud: submission of a plagiarised final-year project lifted entirely from an online repository',
    'Vandalism: deliberate destruction of oscilloscopes and PCB equipment worth ₦180,000 in the EE laboratory',
    'Cyberbullying: sustained harassment campaign targeting Dr. Obasi via Twitter and departmental WhatsApp groups',
    'Theft: removal of restricted reference materials from the Kenneth Dike Library valued above ₦75,000',
    'Drug possession: controlled substances discovered during a routine hostel room inspection by student affairs',
    'Sexual harassment: repeated unwanted advances toward a fellow student after a formal written warning',
    'Forgery: production of a falsified medical certificate to excuse absence from semester examinations',
    'Disruption of academic activities: leading an unlawful protest that halted lectures for two consecutive days'
  ];

  locations TEXT[] := ARRAY[
    'Main Examination Hall, Faculty of Engineering',
    'Engineering Faculty Corridor, Ground Floor',
    'Academic Registry — Project Submission Office',
    'Electrical Engineering Laboratory 2',
    'Online (Twitter / WhatsApp)',
    'Kenneth Dike Library, Reference Section',
    'Biobaku Hall Male Hostel, Room 214',
    'Faculty of Social Sciences Common Room',
    'Student Affairs Division Office',
    'Faculty of Arts, Lecture Theatre 3'
  ];

  levels TEXT[] := ARRAY['200L','200L','300L','300L','300L','400L','400L','400L','500L','500L'];

BEGIN
  -- ── 1. Find the signed-up panel member ──────────────────────────────────────
  SELECT id INTO v_panel_member_id
  FROM users WHERE role = 'panel_member'
  ORDER BY created_at DESC LIMIT 1;

  IF v_panel_member_id IS NULL THEN
    RAISE EXCEPTION 'No panel_member found — sign up as Panel Member on the app first.';
  END IF;

  -- ── 2. Institution ──────────────────────────────────────────────────────────
  INSERT INTO institutions (name, short_name, domain, brand_colour)
  VALUES ('University of Lagos', 'UNILAG', 'unilag.edu.ng', '#003366')
  ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_institution_id;

  -- Attach the panel member to UNILAG
  UPDATE users SET institution_id = v_institution_id WHERE id = v_panel_member_id;

  -- ── 3. Faculty ──────────────────────────────────────────────────────────────
  INSERT INTO faculties (institution_id, name, code)
  VALUES (v_institution_id, 'Faculty of Engineering', 'ENG')
  ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_faculty_id;

  -- ── 4. Complaints officer ───────────────────────────────────────────────────
  INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
  VALUES (
    v_institution_id, 'officer@unilag.edu.ng',
    crypt('Password123', gen_salt('bf', 10)),
    'Dr. Amaka Osei', 'complaints_officer', true
  )
  ON CONFLICT (institution_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_officer_id;

  IF v_officer_id IS NULL THEN
    SELECT id INTO v_officer_id FROM users
    WHERE institution_id = v_institution_id AND email = 'officer@unilag.edu.ng';
  END IF;

  -- ── 5. Ten students → complaints → panels ───────────────────────────────────
  FOR i IN 1..10 LOOP

    -- Student user account
    INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
    VALUES (
      v_institution_id, students[i][2],
      crypt('Student123', gen_salt('bf', 8)),
      students[i][1], 'student', true
    )
    ON CONFLICT (institution_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO v_student_user_id;

    -- Student profile
    INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
    VALUES (v_student_user_id, v_institution_id, students[i][3], v_faculty_id,
            levels[i], 'Computer Engineering')
    ON CONFLICT (institution_id, matric_number) DO NOTHING
    RETURNING id INTO v_student_id;

    IF v_student_id IS NULL THEN
      SELECT id INTO v_student_id FROM students
      WHERE institution_id = v_institution_id AND matric_number = students[i][3];
    END IF;

    -- Complaint / case
    INSERT INTO cases (
      reference, institution_id, student_id, filed_by,
      offence_description, incident_location, incident_date,
      current_stage, response_deadline, panel_deadline, filed_at
    ) VALUES (
      'UNILAG-2025-' || LPAD(i::TEXT, 4, '0'),
      v_institution_id, v_student_id, v_officer_id,
      offences[i], locations[i], CURRENT_DATE - (i * 3),
      'panel_constituted',
      NOW() - INTERVAL '10 days',
      NOW() + INTERVAL '4 days',
      NOW() - ((i * 2) || ' days')::INTERVAL
    ) RETURNING id INTO v_case_id;

    -- Panel
    INSERT INTO panels (case_id, institution_id, constituted_by)
    VALUES (v_case_id, v_institution_id, v_panel_member_id)
    RETURNING id INTO v_panel_id;

    -- You as chairperson
    INSERT INTO panel_members (panel_id, user_id, panel_role)
    VALUES (v_panel_id, v_panel_member_id, 'chairperson');

  END LOOP;

  RAISE NOTICE 'Seed complete — 10 cases and panels created. Panel member ID: %', v_panel_member_id;
END $$;
