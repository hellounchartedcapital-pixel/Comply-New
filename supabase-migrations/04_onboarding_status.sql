-- Add onboarding completion tracking to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_onboarding ON settings(onboarding_completed);
