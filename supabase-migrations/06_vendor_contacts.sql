-- Add vendor contact management fields to vendors table

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_notes TEXT,
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE;

-- Create index for contact email lookups
CREATE INDEX IF NOT EXISTS idx_vendors_contact_email ON vendors(contact_email);

-- Add helpful comments
COMMENT ON COLUMN vendors.contact_name IS 'Primary contact person name for the vendor';
COMMENT ON COLUMN vendors.contact_email IS 'Email address for vendor contact';
COMMENT ON COLUMN vendors.contact_phone IS 'Phone number for vendor contact';
COMMENT ON COLUMN vendors.contact_notes IS 'Additional notes about contacting this vendor';
COMMENT ON COLUMN vendors.last_contacted_at IS 'Timestamp of last contact with vendor';
