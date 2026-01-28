-- Migration: Add auto follow-up settings columns to settings table
-- Run this in the Supabase SQL Editor

-- Add auto follow-up columns to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS auto_follow_up_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_days INTEGER[] DEFAULT ARRAY[30, 14, 7],
ADD COLUMN IF NOT EXISTS follow_up_on_expired BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS follow_up_on_non_compliant BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS follow_up_frequency_days INTEGER DEFAULT 7;

-- Add upload_token column to vendors table if not exists
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS upload_token UUID DEFAULT gen_random_uuid();

-- Create index on upload_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_upload_token ON vendors(upload_token);

-- Create index on contact_email for follow-up queries
CREATE INDEX IF NOT EXISTS idx_vendors_contact_email ON vendors(contact_email) WHERE contact_email IS NOT NULL;

-- Create index on last_contacted_at for follow-up frequency checks
CREATE INDEX IF NOT EXISTS idx_vendors_last_contacted ON vendors(last_contacted_at);

-- Create vendor_activity table for logging follow-ups if not exists
CREATE TABLE IF NOT EXISTS vendor_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on vendor_activity for querying by vendor
CREATE INDEX IF NOT EXISTS idx_vendor_activity_vendor ON vendor_activity(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_user ON vendor_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_action ON vendor_activity(action);

-- Enable RLS on vendor_activity
ALTER TABLE vendor_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vendor_activity
CREATE POLICY IF NOT EXISTS "Users can view own vendor activity"
  ON vendor_activity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own vendor activity"
  ON vendor_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Grant service role full access to vendor_activity (for Edge Functions)
GRANT ALL ON vendor_activity TO service_role;

-- =============================================================================
-- CRON JOB SETUP (Optional - requires pg_cron extension)
-- =============================================================================
-- To enable automatic daily follow-ups, run this in your Supabase SQL Editor:
--
-- 1. First, enable the pg_cron extension (if not already enabled):
--    CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- 2. Then set up the cron job to run daily at 9 AM UTC:
--    SELECT cron.schedule(
--      'auto-follow-up-daily',
--      '0 9 * * *',
--      $$
--      SELECT net.http_post(
--        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-follow-up',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--        ),
--        body := '{}'
--      );
--      $$
--    );
--
-- Replace YOUR_PROJECT_REF with your Supabase project reference
-- Replace YOUR_SERVICE_ROLE_KEY with your service role key
-- =============================================================================

COMMENT ON COLUMN settings.auto_follow_up_enabled IS 'Whether automated vendor follow-ups are enabled';
COMMENT ON COLUMN settings.follow_up_days IS 'Days before expiration to send follow-up reminders';
COMMENT ON COLUMN settings.follow_up_on_expired IS 'Send follow-up when COI is expired';
COMMENT ON COLUMN settings.follow_up_on_non_compliant IS 'Send follow-up when vendor is non-compliant';
COMMENT ON COLUMN settings.follow_up_frequency_days IS 'Minimum days between follow-ups to same vendor';
