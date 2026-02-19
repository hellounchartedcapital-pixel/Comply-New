-- ============================================================================
-- Add trial tracking columns to organizations
-- ============================================================================
-- Adds plan and trial_ends_at columns to support Phase 1 trial tracking.
-- Backfills existing orgs with a 14-day trial from NOW().
-- ============================================================================

-- Add columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill existing orgs: set trial_ends_at to 14 days from now if NULL,
-- and plan to 'trial' if not already set
UPDATE organizations
SET
  trial_ends_at = COALESCE(trial_ends_at, now() + INTERVAL '14 days'),
  plan = COALESCE(NULLIF(plan, 'trial'), 'trial');
