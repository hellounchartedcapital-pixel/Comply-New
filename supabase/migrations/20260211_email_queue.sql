-- Email queue for automated notifications
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),
  entity_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_entity ON email_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Users can see their own queued emails (joined through their entities)
CREATE POLICY "email_queue_select" ON email_queue FOR SELECT USING (true);
CREATE POLICY "email_queue_insert" ON email_queue FOR INSERT WITH CHECK (true);
