-- Add endorsements JSONB and certificate_holder_on_coi columns to vendors and tenants
-- Stores extracted endorsement data + certificate holder text from COI for compliance checking

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS endorsements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS certificate_holder_on_coi TEXT DEFAULT '';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS endorsements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS certificate_holder_on_coi TEXT DEFAULT '';
