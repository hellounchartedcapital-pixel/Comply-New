-- ============================================
-- SmartCOI Definitive Schema Migration
-- This aligns the database with the canonical spec.
-- ============================================

-- ============================================
-- 1. PROPERTIES — add split address fields
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='address_street') THEN
    ALTER TABLE properties ADD COLUMN address_street text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='address_city') THEN
    ALTER TABLE properties ADD COLUMN address_city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='address_state') THEN
    ALTER TABLE properties ADD COLUMN address_state text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='address_zip') THEN
    ALTER TABLE properties ADD COLUMN address_zip text;
  END IF;
END$$;

-- ============================================
-- 2. VENDOR_REQUIREMENTS (per property)
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  general_liability_per_occurrence numeric,
  general_liability_aggregate numeric,
  auto_liability numeric,
  auto_includes_hired_non_owned boolean DEFAULT false,
  workers_comp_required boolean DEFAULT true,
  employers_liability numeric,
  umbrella_liability numeric,
  professional_liability numeric,
  waiver_of_subrogation_required boolean DEFAULT false,
  blanket_additional_insured_accepted boolean DEFAULT false,
  cancellation_notice_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- One set of requirements per property
CREATE UNIQUE INDEX IF NOT EXISTS vendor_requirements_property_id_idx
  ON vendor_requirements(property_id);

ALTER TABLE vendor_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own vendor_requirements" ON vendor_requirements;
CREATE POLICY "Users manage own vendor_requirements" ON vendor_requirements
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 3. VENDORS — ensure spec columns exist
-- ============================================
DO $$
BEGIN
  -- Add email column (spec uses 'email' not 'contact_email')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='email') THEN
    ALTER TABLE vendors ADD COLUMN email text;
  END IF;
END$$;

-- Copy data from contact_email to email if contact_email exists and email is empty
UPDATE vendors SET email = contact_email
  WHERE email IS NULL AND contact_email IS NOT NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='contact_email');

-- ============================================
-- 4. TENANTS — ensure spec columns exist
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='unit_suite') THEN
    ALTER TABLE tenants ADD COLUMN unit_suite text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='lease_start_date') THEN
    ALTER TABLE tenants ADD COLUMN lease_start_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='lease_end_date') THEN
    ALTER TABLE tenants ADD COLUMN lease_end_date date;
  END IF;
END$$;

-- Copy from 'unit' to 'unit_suite' if unit exists
UPDATE tenants SET unit_suite = unit
  WHERE unit_suite IS NULL AND unit IS NOT NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='unit');

-- Copy from 'lease_start'/'lease_end' to new date columns
UPDATE tenants SET lease_start_date = lease_start::date
  WHERE lease_start_date IS NULL AND lease_start IS NOT NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='lease_start');

UPDATE tenants SET lease_end_date = lease_end::date
  WHERE lease_end_date IS NULL AND lease_end IS NOT NULL
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='lease_end');

-- ============================================
-- 5. TENANT_REQUIREMENTS (per tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  source text, -- 'lease_extracted', 'template_office', 'template_retail', 'template_restaurant', 'manual'
  general_liability_per_occurrence numeric,
  general_liability_aggregate numeric,
  auto_liability numeric,
  workers_comp_required boolean DEFAULT true,
  employers_liability numeric,
  umbrella_liability numeric,
  property_insurance_required boolean DEFAULT false,
  business_interruption_required boolean DEFAULT false,
  business_interruption_minimum text, -- 'annual_rent' or dollar amount
  liquor_liability numeric,
  additional_insured_entities text[] DEFAULT '{}',
  waiver_of_subrogation_required boolean DEFAULT false,
  loss_payee_required boolean DEFAULT false,
  insurer_rating_minimum text,
  cancellation_notice_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- One set of requirements per tenant
CREATE UNIQUE INDEX IF NOT EXISTS tenant_requirements_tenant_id_idx
  ON tenant_requirements(tenant_id);

ALTER TABLE tenant_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own tenant_requirements" ON tenant_requirements;
CREATE POLICY "Users manage own tenant_requirements" ON tenant_requirements
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. CERTIFICATES table
-- ============================================
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  entity_type text NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),
  entity_id uuid NOT NULL,
  property_id uuid REFERENCES properties(id),
  file_path text,
  file_name text,
  extracted_data jsonb,
  compliance_result jsonb,
  overall_status text, -- 'compliant', 'non_compliant', 'expired'
  earliest_expiration date,
  uploaded_by text, -- 'pm' or 'self_service'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own certificates" ON certificates;
CREATE POLICY "Users manage own certificates" ON certificates
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS certificates_entity_idx ON certificates(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS certificates_property_idx ON certificates(property_id);

-- ============================================
-- 7. EMAIL_LOG — ensure matches spec
-- ============================================
CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  entity_type text,
  entity_id uuid,
  property_id uuid REFERENCES properties(id),
  email_type text, -- 'expiring_30', 'expiring_7', 'expired', 'non_compliant', 'follow_up', 'compliant_confirmed'
  recipient_email text,
  sent_at timestamptz DEFAULT now(),
  follow_up_count integer DEFAULT 0
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own email_log" ON email_log;
CREATE POLICY "Users manage own email_log" ON email_log
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 8. Updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vendor_requirements_updated_at') THEN
    CREATE TRIGGER vendor_requirements_updated_at
      BEFORE UPDATE ON vendor_requirements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tenant_requirements_updated_at') THEN
    CREATE TRIGGER tenant_requirements_updated_at
      BEFORE UPDATE ON tenant_requirements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;
