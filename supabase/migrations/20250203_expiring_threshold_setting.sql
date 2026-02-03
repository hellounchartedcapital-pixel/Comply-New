-- Add expiring_threshold_days setting
-- Allows users to configure how many days before expiration triggers "expiring" status

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS expiring_threshold_days INTEGER DEFAULT 30;

-- Add check constraint to ensure value is within valid range
ALTER TABLE settings
ADD CONSTRAINT expiring_threshold_days_range
CHECK (expiring_threshold_days >= 7 AND expiring_threshold_days <= 90);

COMMENT ON COLUMN settings.expiring_threshold_days IS 'Number of days before expiration to mark as "expiring" (default: 30)';
