-- ============================================================
-- TIDDS — Core Database Schema
-- PostgreSQL — Multi-tenant from day one
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'platform_admin',
  'committee_member',
  'panel_member',
  'complaints_officer',
  'student'
);

CREATE TYPE officer_jurisdiction AS ENUM (
  'faculty',
  'hostel',
  'general'
);

CREATE TYPE case_stage AS ENUM (
  'complaint_filed',       -- Stage 01
  'student_notified',      -- Stage 02
  'awaiting_response',     -- Stage 02 (response window open)
  'response_received',     -- Stage 03
  'response_overdue',      -- Stage 03 (no response, escalated)
  'panel_constituted',     -- Stage 04
  'appearance_noticed',    -- Stage 05
  'hearing_scheduled',     -- Stage 05
  'hearing_completed',     -- Stage 06
  'verdict_recorded',      -- Stage 07
  'closed'                 -- Final state
);

CREATE TYPE case_outcome AS ENUM (
  'upheld',
  'dismissed',
  'referred'
);

CREATE TYPE notification_channel AS ENUM ('email', 'sms');

CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TYPE audit_action AS ENUM (
  'user_created',
  'user_login',
  'user_invited',
  'complaint_filed',
  'student_notified',
  'student_response_submitted',
  'response_deadline_missed',
  'panel_constituted',
  'panel_member_assigned',
  'appearance_notice_sent',
  'hearing_scheduled',
  'hearing_record_saved',
  'verdict_recorded',
  'verdict_communicated',
  'case_closed',
  'evidence_uploaded',
  'notification_sent',
  'notification_failed',
  'role_changed',
  'institution_created',
  'settings_updated'
);

-- ============================================================
-- INSTITUTIONS (multi-tenant root)
-- ============================================================

CREATE TABLE institutions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  short_name      TEXT NOT NULL,           -- e.g. "UNILAG"
  domain          TEXT NOT NULL UNIQUE,    -- e.g. "unilag.edu.ng"
  logo_url        TEXT,
  brand_colour    TEXT DEFAULT '#003366',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS (all roles share this table, differentiated by role)
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID REFERENCES institutions(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  role            user_role NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  invited_at      TIMESTAMPTZ,
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Platform admins have NULL institution_id (they span all)
  CONSTRAINT users_email_institution_unique UNIQUE (institution_id, email)
);

CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_invitation_token ON users(invitation_token);

-- ============================================================
-- FACULTIES
-- ============================================================

CREATE TABLE faculties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,           -- e.g. "LAW", "ENG", "MED"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (institution_id, code)
);

-- ============================================================
-- HOSTELS
-- ============================================================

CREATE TABLE hostels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STUDENTS (extends users where role = 'student')
-- ============================================================

CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  matric_number   TEXT NOT NULL,
  faculty_id      UUID REFERENCES faculties(id),
  level           TEXT,                    -- e.g. "300L"
  programme       TEXT,
  gpa             NUMERIC(3,2),
  phone           TEXT,

  UNIQUE (institution_id, matric_number)
);

CREATE INDEX idx_students_matric ON students(institution_id, matric_number);

-- ============================================================
-- OFFICER ASSIGNMENTS
-- Each complaints officer is linked to a jurisdiction
-- ============================================================

CREATE TABLE officer_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  jurisdiction    officer_jurisdiction NOT NULL,
  faculty_id      UUID REFERENCES faculties(id),    -- set when jurisdiction = 'faculty'
  hostel_id       UUID REFERENCES hostels(id),      -- set when jurisdiction = 'hostel'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OFFENCE CATEGORIES (configurable per institution)
-- ============================================================

CREATE TABLE offence_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  severity        TEXT,                    -- 'minor', 'major', 'gross'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CASES (core entity — one per complaint filed)
-- ============================================================

CREATE TABLE cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       TEXT NOT NULL UNIQUE,    -- e.g. "UNILAG-2025-0001"
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,

  -- Parties
  student_id      UUID NOT NULL REFERENCES students(id),
  filed_by        UUID NOT NULL REFERENCES users(id),  -- complaints officer

  -- Complaint details
  offence_category_id UUID REFERENCES offence_categories(id),
  offence_description TEXT NOT NULL,
  regulation_breached TEXT,
  incident_date       DATE,
  incident_location   TEXT,

  -- Workflow state
  current_stage   case_stage NOT NULL DEFAULT 'complaint_filed',
  outcome         case_outcome,

  -- Timeline targets
  response_deadline    TIMESTAMPTZ,        -- 3 working days from notification
  panel_deadline       TIMESTAMPTZ,        -- 4 working days from response
  verdict_deadline     TIMESTAMPTZ,        -- 2 working days from hearing

  filed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_institution ON cases(institution_id);
CREATE INDEX idx_cases_student ON cases(student_id);
CREATE INDEX idx_cases_stage ON cases(current_stage);
CREATE INDEX idx_cases_filed_by ON cases(filed_by);

-- ============================================================
-- EVIDENCE FILES
-- ============================================================

CREATE TABLE evidence_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  file_name       TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT,
  storage_key     TEXT NOT NULL,           -- S3 object key or local path
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_case ON evidence_files(case_id);

-- ============================================================
-- STUDENT RESPONSES (Stage 03)
-- ============================================================

CREATE TABLE student_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  plea            TEXT NOT NULL CHECK (plea IN ('admit', 'deny')),
  response_text   TEXT NOT NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PANELS (Stage 04)
-- ============================================================

CREATE TABLE panels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  constituted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  constituted_by  UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE panel_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id        UUID NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  panel_role      TEXT NOT NULL CHECK (panel_role IN ('chairperson', 'secretary', 'member')),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (panel_id, user_id)
);

-- ============================================================
-- HEARINGS (Stage 06)
-- ============================================================

CREATE TABLE hearings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id        UUID NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  venue           TEXT NOT NULL,
  student_attended BOOLEAN,
  hearing_notes   TEXT,                   -- secretary's record of proceedings
  completed_at    TIMESTAMPTZ,
  recorded_by     UUID REFERENCES users(id)
);

-- ============================================================
-- VERDICTS (Stage 07)
-- ============================================================

CREATE TABLE verdicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  panel_id        UUID NOT NULL REFERENCES panels(id),
  outcome         case_outcome NOT NULL,
  penalty         TEXT,                   -- free text: "Suspension for 1 semester"
  effective_date  DATE,
  appeal_rights   TEXT,
  conditions      TEXT,
  ratified_by     UUID NOT NULL REFERENCES users(id),  -- chairperson
  recorded_by     UUID NOT NULL REFERENCES users(id),  -- secretary
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  communicated_at TIMESTAMPTZ            -- when the verdict email was sent
);

-- ============================================================
-- NOTIFICATIONS LOG
-- Every email/SMS dispatched by the system is recorded here
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID REFERENCES cases(id),
  recipient_id    UUID NOT NULL REFERENCES users(id),
  channel         notification_channel NOT NULL,
  template_name   TEXT NOT NULL,          -- e.g. 'complaint_notice', 'verdict_letter'
  subject         TEXT,
  body            TEXT NOT NULL,
  status          notification_status NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_case ON notifications(case_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);

-- ============================================================
-- AUDIT LOG (tamper-evident, append-only)
-- Every action in the system writes here — never updated or deleted
-- ============================================================

CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  institution_id  UUID REFERENCES institutions(id),
  actor_id        UUID REFERENCES users(id),          -- who performed the action
  actor_role      user_role,
  action          audit_action NOT NULL,
  case_id         UUID REFERENCES cases(id),
  target_id       UUID,                               -- the entity affected
  target_type     TEXT,                               -- e.g. 'user', 'panel', 'verdict'
  metadata        JSONB,                              -- action-specific detail
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_institution ON audit_logs(institution_id);
CREATE INDEX idx_audit_case ON audit_logs(case_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- The audit log must NEVER be updated or deleted.
-- Enforce at DB level by revoking UPDATE and DELETE privileges
-- on this table from the application role.

-- ============================================================
-- CASE REFERENCE SEQUENCE (per institution)
-- Generates references like UNILAG-2025-0001
-- ============================================================

CREATE TABLE case_reference_sequences (
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  year            INTEGER NOT NULL,
  last_seq        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (institution_id, year)
);

-- Function to generate the next case reference
CREATE OR REPLACE FUNCTION next_case_reference(p_institution_id UUID, p_short_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year    INTEGER := EXTRACT(YEAR FROM NOW());
  v_seq     INTEGER;
BEGIN
  INSERT INTO case_reference_sequences (institution_id, year, last_seq)
  VALUES (p_institution_id, v_year, 1)
  ON CONFLICT (institution_id, year)
  DO UPDATE SET last_seq = case_reference_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN p_short_name || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- updated_at trigger (auto-maintain updated_at columns)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_institutions_updated_at
  BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
