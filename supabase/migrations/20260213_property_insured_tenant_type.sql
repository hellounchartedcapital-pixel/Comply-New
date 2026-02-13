-- Add property-level insurance identity fields
-- These cascade down to all vendors and tenants at this property
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS additional_insured_entities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certificate_holder_name text,
  ADD COLUMN IF NOT EXISTS certificate_holder_address_line1 text,
  ADD COLUMN IF NOT EXISTS certificate_holder_address_line2 text,
  ADD COLUMN IF NOT EXISTS certificate_holder_city text,
  ADD COLUMN IF NOT EXISTS certificate_holder_state text,
  ADD COLUMN IF NOT EXISTS certificate_holder_zip text,
  ADD COLUMN IF NOT EXISTS loss_payee_entities text[] DEFAULT '{}';

-- Add tenant_type column for template tracking
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS tenant_type text;

COMMENT ON COLUMN properties.additional_insured_entities IS 'Entity names required as Additional Insured on all COIs for this property';
COMMENT ON COLUMN properties.certificate_holder_name IS 'Certificate Holder name for all COIs at this property';
COMMENT ON COLUMN properties.loss_payee_entities IS 'Loss Payee entity names for property coverage COIs';
COMMENT ON COLUMN tenants.tenant_type IS 'Template type used at creation (office, retail, restaurant, industrial, medical, fitness)';
