-- Add upload_token_expiry_days setting
-- Allows users to configure how long upload links remain valid (7-90 days)

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS upload_token_expiry_days INTEGER DEFAULT 30;

-- Add check constraint to ensure value is within valid range
ALTER TABLE settings
ADD CONSTRAINT upload_token_expiry_days_range
CHECK (upload_token_expiry_days >= 7 AND upload_token_expiry_days <= 90);

COMMENT ON COLUMN settings.upload_token_expiry_days IS 'Number of days until upload links expire (7-90, default 30)';
