-- =====================================================
-- TIDDS Phase 2 Delta Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. New enums ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "OffenceCategory" AS ENUM ('EXAMINATION', 'DRUG_RELATED', 'SOCIAL_CONDUCT', 'HOSTEL', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PenaltyTier" AS ENUM ('EXPULSION', 'RUSTICATION_4', 'RUSTICATION_2', 'RUSTICATION_1', 'WARNING', 'PANEL_DECISION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Plea" AS ENUM ('GUILTY', 'NOT_GUILTY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubmitterType" AS ENUM ('COMPLAINANT', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OriginType" AS ENUM ('FACULTY', 'HOSTEL', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add missing CaseStatus values ─────────────────
DO $$ BEGIN
  ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'RESPONSE_OVERDUE';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'PANEL_CONSTITUTED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'HEARING_COMPLETE';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'VERDICT_DELIVERED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Student table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "Student" (
    "id"            TEXT        NOT NULL,
    "institutionId" TEXT        NOT NULL,
    "matricNumber"  TEXT        NOT NULL,
    "firstName"     TEXT        NOT NULL,
    "lastName"      TEXT        NOT NULL,
    "email"         TEXT        NOT NULL,
    "phone"         TEXT,
    "faculty"       TEXT        NOT NULL,
    "department"    TEXT,
    "level"         TEXT        NOT NULL,
    "gpa"           DOUBLE PRECISION,
    "portalUserId"  TEXT,
    "isActive"      BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Student_matricNumber_key" ON "Student"("matricNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Student_email_key" ON "Student"("email");

-- 4. OffenceType — upgrade category + add new columns
-- Drop old TEXT category column and add the enum one
ALTER TABLE "OffenceType" DROP COLUMN IF EXISTS "category";
ALTER TABLE "OffenceType" ADD COLUMN IF NOT EXISTS "category" "OffenceCategory" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "OffenceType" ADD COLUMN IF NOT EXISTS "penaltyTier" "PenaltyTier" NOT NULL DEFAULT 'PANEL_DECISION';
ALTER TABLE "OffenceType" ADD COLUMN IF NOT EXISTS "defaultPenalty" TEXT;

-- Remove DEFAULT now that backfill is done
ALTER TABLE "OffenceType" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "OffenceType" ALTER COLUMN "penaltyTier" DROP DEFAULT;

-- 5. Case — remove old single-offence FK, add new columns
ALTER TABLE "Case" DROP COLUMN IF EXISTS "offenceTypeId";
ALTER TABLE "Case" DROP COLUMN IF EXISTS "offenceType";

ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "studentId"                 TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "witnessName"               TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "courseCode"                TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "courseTitle"               TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "officerNotifiedOnResponse" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "officerNotifiedOnVerdict"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "studentResponse"           TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "studentResponseAt"         TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "plea"                      "Plea";
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "panelId"                   TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "hearingDate"               TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "hearingVenue"              TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "verdict"                   TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "penalty"                   TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "verdictAt"                 TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "closedAt"                  TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "originType"                "OriginType";

-- Backfill originType for any existing rows
UPDATE "Case" SET "originType" = 'FACULTY' WHERE "originType" IS NULL;
ALTER TABLE "Case" ALTER COLUMN "originType" SET NOT NULL;

-- 6. CaseOffence join table ─────────────────────────
CREATE TABLE IF NOT EXISTS "CaseOffence" (
    "id"            TEXT        NOT NULL,
    "caseId"        TEXT        NOT NULL,
    "offenceTypeId" TEXT        NOT NULL,
    "addedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseOffence_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "CaseOffence" ADD CONSTRAINT "CaseOffence_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CaseOffence" ADD CONSTRAINT "CaseOffence_offenceTypeId_fkey"
      FOREIGN KEY ("offenceTypeId") REFERENCES "OffenceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Evidence table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "Evidence" (
    "id"           TEXT           NOT NULL,
    "caseId"       TEXT           NOT NULL,
    "uploadedById" TEXT           NOT NULL,
    "submittedBy"  "SubmitterType" NOT NULL,
    "fileName"     TEXT           NOT NULL,
    "fileUrl"      TEXT           NOT NULL,
    "fileType"     TEXT           NOT NULL,
    "fileSize"     INTEGER        NOT NULL,
    "uploadedAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Foreign key: Case.studentId → Student ─────────
DO $$ BEGIN
  ALTER TABLE "Case" ADD CONSTRAINT "Case_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Foreign key: Case.panelId → Panel ────────────
DO $$ BEGIN
  ALTER TABLE "Case" ADD CONSTRAINT "Case_panelId_fkey"
      FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 10. AuditLog — ensure actorId is nullable ────────
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;

-- Done.
SELECT 'Phase 2 migration complete' AS status;
