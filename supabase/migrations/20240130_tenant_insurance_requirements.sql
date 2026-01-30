-- Add additional insurance requirement fields to tenants table
-- Supports standard COI requirements for property management

-- Add new coverage type columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS required_auto_liability_min numeric DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS required_workers_comp boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS workers_comp_exempt boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS required_employers_liability_min numeric DEFAULT 0;

-- Certificate holder information
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS certificate_holder_name text DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS certificate_holder_address text DEFAULT '';

-- Additional requirements
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancellation_notice_days integer DEFAULT 30;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS requires_declarations_page boolean DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS requires_endorsement_pages boolean DEFAULT true;

-- Update requires_additional_insured default to true
ALTER TABLE tenants ALTER COLUMN requires_additional_insured SET DEFAULT true;

-- Add comment explaining the fields
COMMENT ON COLUMN tenants.required_auto_liability_min IS 'Business Auto Liability minimum coverage amount';
COMMENT ON COLUMN tenants.required_workers_comp IS 'Whether Workers Compensation is required';
COMMENT ON COLUMN tenants.workers_comp_exempt IS 'Whether tenant has exemption from WC requirement';
COMMENT ON COLUMN tenants.required_employers_liability_min IS 'Employers Liability minimum coverage amount';
COMMENT ON COLUMN tenants.certificate_holder_name IS 'Certificate holder entity name';
COMMENT ON COLUMN tenants.certificate_holder_address IS 'Certificate holder mailing address';
COMMENT ON COLUMN tenants.cancellation_notice_days IS 'Minimum days notice required for coverage cancellation';
COMMENT ON COLUMN tenants.requires_declarations_page IS 'Whether declarations page is required';
COMMENT ON COLUMN tenants.requires_endorsement_pages IS 'Whether endorsement pages are required';
