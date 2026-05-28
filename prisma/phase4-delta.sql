-- Phase 4 Delta: Committee & Panel Module
-- Run in Supabase SQL Editor AFTER phase3-delta.sql

-- ── User: isChairman flag ─────────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isChairman" BOOLEAN NOT NULL DEFAULT FALSE;

-- ── User: verdict relations (FK cols added below on Case) ─────────────────────
-- No columns needed on User — FKs live on Case

-- ── Case: remove old panel FK (was Case.panelId → Panel.id) ──────────────────
-- Panel is now the owning side (Panel.caseId → Case.id)
ALTER TABLE "Case"
  DROP COLUMN IF EXISTS "panelId";

-- ── Case: hearing fields ──────────────────────────────────────────────────────
ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "hearingTime"              TEXT,
  ADD COLUMN IF NOT EXISTS "penaltyRange"             TEXT,
  ADD COLUMN IF NOT EXISTS "internalHearingNotes"     TEXT,
  ADD COLUMN IF NOT EXISTS "studentAppeared"          BOOLEAN,
  ADD COLUMN IF NOT EXISTS "nonAppearanceFlaggedAt"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "nonAppearanceAlertSentAt" TIMESTAMPTZ;

-- Rename old columns that change meaning in Phase 4
-- hearingVenue already exists — keep it
-- verdict → hearingOutcome (rename)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='Case' AND column_name='verdict') THEN
    ALTER TABLE "Case" RENAME COLUMN "verdict" TO "hearingOutcome";
  ELSE
    ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "hearingOutcome" TEXT;
  END IF;
END $$;

-- penalty → verdictPenalty (rename)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='Case' AND column_name='penalty') THEN
    ALTER TABLE "Case" RENAME COLUMN "penalty" TO "verdictPenalty";
  ELSE
    ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "verdictPenalty" TEXT;
  END IF;
END $$;

-- verdictAt → verdictRecordedAt (rename)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='Case' AND column_name='verdictAt') THEN
    ALTER TABLE "Case" RENAME COLUMN "verdictAt" TO "verdictRecordedAt";
  ELSE
    ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "verdictRecordedAt" TIMESTAMPTZ;
  END IF;
END $$;

-- ── Case: verdict fields ──────────────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS "VerdictFinding" AS ENUM ('UPHELD', 'DISMISSED', 'PARTIALLY_UPHELD');

ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "verdictFinding"          "VerdictFinding",
  ADD COLUMN IF NOT EXISTS "verdictEffectiveDate"    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "verdictDeliberationNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "verdictRecordedById"     TEXT REFERENCES "User"(id),
  ADD COLUMN IF NOT EXISTS "verdictRatifiedAt"       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "verdictRatifiedById"     TEXT REFERENCES "User"(id),
  ADD COLUMN IF NOT EXISTS "appealDeadline"          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "appealFiled"             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "appealFiledAt"           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "appealNotes"             TEXT,
  ADD COLUMN IF NOT EXISTS "caseRecordPdfUrl"        TEXT,
  ADD COLUMN IF NOT EXISTS "verdictLetterPdfUrl"     TEXT;

-- ── CaseStatus: add ESCALATED if not present ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
                 WHERE enumlabel = 'ESCALATED'
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CaseStatus')) THEN
    ALTER TYPE "CaseStatus" ADD VALUE 'ESCALATED';
  END IF;
END $$;

-- ── Panel: restructure to one-panel-per-case ──────────────────────────────────
-- Drop old isActive column, add status + dissolvedAt + caseId
ALTER TABLE "Panel"
  DROP COLUMN IF EXISTS "isActive";

CREATE TYPE IF NOT EXISTS "PanelStatus" AS ENUM ('ACTIVE', 'CONCLUDED', 'DISSOLVED');

ALTER TABLE "Panel"
  ADD COLUMN IF NOT EXISTS "caseId"      TEXT UNIQUE REFERENCES "Case"(id),
  ADD COLUMN IF NOT EXISTS "status"      "PanelStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "dissolvedAt" TIMESTAMPTZ;

-- Index for fast panel lookup by case
CREATE UNIQUE INDEX IF NOT EXISTS "Panel_caseId_key"
  ON "Panel" ("caseId")
  WHERE "caseId" IS NOT NULL;
