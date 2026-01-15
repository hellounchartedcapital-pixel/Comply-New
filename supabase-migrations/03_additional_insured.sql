-- Add additional insured verification and waiver of subrogation columns to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS require_additional_insured BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS require_waiver_of_subrogation BOOLEAN DEFAULT FALSE;

-- Add additional insured and waiver of subrogation fields to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS additional_insured TEXT,
ADD COLUMN IF NOT EXISTS certificate_holder TEXT,
ADD COLUMN IF NOT EXISTS has_additional_insured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS missing_additional_insured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS waiver_of_subrogation TEXT,
ADD COLUMN IF NOT EXISTS has_waiver_of_subrogation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS missing_waiver_of_subrogation BOOLEAN DEFAULT FALSE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_additional_insured ON vendors(has_additional_insured);
CREATE INDEX IF NOT EXISTS idx_vendors_missing_additional_insured ON vendors(missing_additional_insured);
CREATE INDEX IF NOT EXISTS idx_vendors_waiver_of_subrogation ON vendors(has_waiver_of_subrogation);
CREATE INDEX IF NOT EXISTS idx_vendors_missing_waiver ON vendors(missing_waiver_of_subrogation);
