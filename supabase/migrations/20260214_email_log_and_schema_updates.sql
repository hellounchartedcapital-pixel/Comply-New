-- SmartCOI Launch Build - Email Log & Schema Refinements
-- Part 6 email infrastructure + missing columns

-- ============================================
-- EMAIL LOG (tracks all sent/attempted emails)
-- ============================================
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),
  entity_id UUID NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'initial_request',
    'expiration_30day',
    'expiration_14day',
    'expiration_day_of',
    'non_compliance',
    'coi_received_confirmation'
  )),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  portal_link TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_entity ON email_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_log(user_id);

-- RLS
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs"
  ON email_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email logs"
  ON email_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Add last_email_sent_at to vendors & tenants
-- for email throttling / chase logic
-- ============================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;

-- ============================================
-- Add compliance_percentage to vendors & tenants
-- for quick dashboard sorting without re-computing
-- ============================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS compliance_percentage SMALLINT DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_percentage SMALLINT DEFAULT 0;

-- ============================================
-- Ensure property_id column exists on requirement_templates
-- ============================================
ALTER TABLE requirement_templates ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_req_templates_property ON requirement_templates(property_id);
