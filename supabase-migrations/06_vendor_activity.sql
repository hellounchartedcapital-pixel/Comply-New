-- Migration: Add vendor activity tracking and upload tokens
-- Run this in Supabase SQL Editor

-- Add upload_token column to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS upload_token UUID DEFAULT gen_random_uuid();

-- Create index on upload_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_vendors_upload_token ON vendors(upload_token);

-- Create vendor_activity table to track all vendor-related events
CREATE TABLE IF NOT EXISTS vendor_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_vendor_activity_vendor_id ON vendor_activity(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_user_id ON vendor_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_created_at ON vendor_activity(created_at DESC);

-- Enable Row Level Security
ALTER TABLE vendor_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own vendor activity
DROP POLICY IF EXISTS "Users can view own vendor activity" ON vendor_activity;
CREATE POLICY "Users can view own vendor activity"
  ON vendor_activity FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own vendor activity
DROP POLICY IF EXISTS "Users can insert own vendor activity" ON vendor_activity;
CREATE POLICY "Users can insert own vendor activity"
  ON vendor_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow anonymous insert for vendor uploads (via upload portal)
DROP POLICY IF EXISTS "Allow anonymous activity insert" ON vendor_activity;
CREATE POLICY "Allow anonymous activity insert"
  ON vendor_activity FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON vendor_activity TO authenticated;
GRANT INSERT ON vendor_activity TO anon;

-- Update vendors table to allow anonymous users to update via upload token
DROP POLICY IF EXISTS "Allow vendor update via upload token" ON vendors;
CREATE POLICY "Allow vendor update via upload token"
  ON vendors FOR UPDATE
  USING (upload_token IS NOT NULL)
  WITH CHECK (true);

-- Allow anonymous users to select vendors by upload token
DROP POLICY IF EXISTS "Allow vendor select via upload token" ON vendors;
CREATE POLICY "Allow vendor select via upload token"
  ON vendors FOR SELECT
  USING (upload_token IS NOT NULL);
