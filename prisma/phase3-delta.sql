-- Phase 3 Delta: Student Portal fields
-- Run this in the Supabase SQL Editor AFTER phase2-delta.sql

-- ── Case table: student access token & response locking ──────────────────────

ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "studentAccessToken"   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "studentAccessExpiry"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "studentLastAccessAt"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "studentResponseEdited" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "studentResponseLocked" BOOLEAN NOT NULL DEFAULT FALSE;

-- Index speeds up the token lookup on every portal access
CREATE UNIQUE INDEX IF NOT EXISTS "Case_studentAccessToken_key"
  ON "Case" ("studentAccessToken")
  WHERE "studentAccessToken" IS NOT NULL;

-- ── Student table: portal last-seen timestamp ─────────────────────────────────

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "portalLastSeenAt" TIMESTAMPTZ;
