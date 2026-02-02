-- =============================================================================
-- TENANT ACTIVITY TRACKING
-- =============================================================================
-- Adds activity logging for tenants similar to vendor_activity

-- Create tenant_activity table for logging follow-ups and activities
CREATE TABLE IF NOT EXISTS tenant_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tenant_activity_tenant ON tenant_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_user ON tenant_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_type ON tenant_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_created ON tenant_activity(created_at DESC);

-- Enable RLS on tenant_activity
ALTER TABLE tenant_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant_activity
CREATE POLICY IF NOT EXISTS "Users can view own tenant activity"
  ON tenant_activity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own tenant activity"
  ON tenant_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow service role full access (for Edge Functions and automated processes)
GRANT ALL ON tenant_activity TO service_role;

-- Add last_contacted_at to tenants if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'last_contacted_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN last_contacted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index on tenants.last_contacted_at for follow-up queries
CREATE INDEX IF NOT EXISTS idx_tenants_last_contacted ON tenants(last_contacted_at);
