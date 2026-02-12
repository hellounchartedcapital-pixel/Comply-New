-- ============================================================
-- SmartCOI: Complete Initial Database Setup
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor (supabase.com → SQL Editor)
-- This creates all tables, columns, indexes, and RLS policies.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS throughout.
-- ============================================================

-- ========================
-- 1. CORE TABLES
-- ========================

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  general_liability NUMERIC,
  auto_liability NUMERIC,
  workers_comp TEXT,
  employers_liability NUMERIC,
  additional_requirements JSONB,
  company_name TEXT,
  auto_follow_up_enabled BOOLEAN DEFAULT false,
  follow_up_days INTEGER[] DEFAULT ARRAY[30, 14, 7],
  follow_up_on_expired BOOLEAN DEFAULT true,
  follow_up_on_non_compliant BOOLEAN DEFAULT true,
  follow_up_frequency_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  general_liability INTEGER DEFAULT 1000000,
  gl_aggregate INTEGER DEFAULT 2000000,
  auto_liability INTEGER DEFAULT 1000000,
  auto_liability_required BOOLEAN DEFAULT false,
  workers_comp_required BOOLEAN DEFAULT true,
  employers_liability INTEGER DEFAULT 500000,
  company_name TEXT,
  require_additional_insured BOOLEAN DEFAULT true,
  require_waiver_of_subrogation BOOLEAN DEFAULT false,
  custom_coverages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);

-- Vendors table (full schema with all columns)
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dba TEXT,
  status TEXT DEFAULT 'non-compliant',
  expiration_date DATE,           -- nullable: new vendors have no COI yet
  days_overdue INTEGER,
  coverage JSONB,                 -- nullable: populated after COI processing
  issues JSONB,
  raw_data JSONB,
  requirements JSONB,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_ids UUID[] DEFAULT '{}',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  upload_token UUID DEFAULT gen_random_uuid(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_property_id ON vendors(property_id);
CREATE INDEX IF NOT EXISTS idx_vendors_property_ids ON vendors USING GIN (property_ids);
CREATE INDEX IF NOT EXISTS idx_vendors_contact_email ON vendors(contact_email) WHERE contact_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_upload_token ON vendors(upload_token);
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at ON vendors(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_last_contacted ON vendors(last_contacted_at);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT,
  status TEXT DEFAULT 'non-compliant',
  expiration_date DATE,
  coverage JSONB,
  issues JSONB,
  raw_data JSONB,
  requirements JSONB,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  upload_token UUID DEFAULT gen_random_uuid(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NULL;

-- Vendor activity table
CREATE TABLE IF NOT EXISTS vendor_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  activity_type VARCHAR(50),
  description TEXT,
  details JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_activity_vendor ON vendor_activity(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_user ON vendor_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_action ON vendor_activity(action);
CREATE INDEX IF NOT EXISTS idx_vendor_activity_created_at ON vendor_activity(created_at DESC);

-- ========================
-- 2. REQUIREMENT & COMPLIANCE TABLES
-- ========================

-- Requirement templates
CREATE TABLE IF NOT EXISTS requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),
  description TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  coverages JSONB NOT NULL DEFAULT '{}'::jsonb,
  endorsements JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_coverages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_templates_user ON requirement_templates(user_id);

-- Requirement profiles
CREATE TABLE IF NOT EXISTS requirement_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),
  entity_id UUID NOT NULL,
  building_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  gl_occurrence_limit BIGINT,
  gl_occurrence_source TEXT DEFAULT 'manual',
  gl_occurrence_confidence SMALLINT,
  gl_occurrence_ref TEXT,
  gl_aggregate_limit BIGINT,
  gl_aggregate_source TEXT DEFAULT 'manual',
  gl_aggregate_confidence SMALLINT,
  gl_aggregate_ref TEXT,

  auto_csl BIGINT,
  auto_source TEXT DEFAULT 'manual',
  auto_confidence SMALLINT,
  auto_ref TEXT,

  wc_statutory BOOLEAN DEFAULT FALSE,
  wc_statutory_source TEXT DEFAULT 'manual',
  wc_statutory_confidence SMALLINT,
  wc_statutory_ref TEXT,
  wc_employers_liability BIGINT,
  wc_employers_source TEXT DEFAULT 'manual',
  wc_employers_confidence SMALLINT,
  wc_employers_ref TEXT,

  umbrella_limit BIGINT,
  umbrella_source TEXT DEFAULT 'manual',
  umbrella_confidence SMALLINT,
  umbrella_ref TEXT,

  professional_limit BIGINT,
  professional_source TEXT DEFAULT 'manual',
  professional_confidence SMALLINT,
  professional_ref TEXT,

  property_limit BIGINT,
  property_source TEXT DEFAULT 'manual',
  property_confidence SMALLINT,
  property_ref TEXT,

  bi_required BOOLEAN DEFAULT FALSE,
  bi_source TEXT DEFAULT 'manual',
  bi_confidence SMALLINT,
  bi_ref TEXT,
  bi_duration TEXT,

  custom_coverages JSONB DEFAULT '[]'::jsonb,

  additional_insured_required BOOLEAN DEFAULT FALSE,
  additional_insured_entities TEXT[] DEFAULT '{}',
  additional_insured_language TEXT,
  additional_insured_source TEXT DEFAULT 'manual',
  additional_insured_confidence SMALLINT,
  additional_insured_ref TEXT,

  loss_payee_required BOOLEAN DEFAULT FALSE,
  loss_payee_entities TEXT[] DEFAULT '{}',
  loss_payee_source TEXT DEFAULT 'manual',
  loss_payee_confidence SMALLINT,
  loss_payee_ref TEXT,

  waiver_of_subrogation_required BOOLEAN DEFAULT FALSE,
  waiver_of_subrogation_coverages TEXT[] DEFAULT '{}',
  waiver_of_subrogation_source TEXT DEFAULT 'manual',
  waiver_of_subrogation_confidence SMALLINT,
  waiver_of_subrogation_ref TEXT,

  certificate_holder_name TEXT,
  certificate_holder_address TEXT,
  certificate_holder_source TEXT DEFAULT 'manual',
  certificate_holder_confidence SMALLINT,
  certificate_holder_ref TEXT,

  cancellation_notice_days INTEGER DEFAULT 30,
  cancellation_source TEXT DEFAULT 'manual',
  cancellation_confidence SMALLINT,
  cancellation_ref TEXT,

  special_endorsements TEXT[] DEFAULT '{}',

  lease_term_start DATE,
  lease_term_end DATE,
  lease_renewal_date DATE,
  lease_document_path TEXT,

  creation_method TEXT NOT NULL DEFAULT 'manual' CHECK (creation_method IN ('building_default', 'lease_extracted', 'coi_prefill', 'manual')),
  raw_extraction_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_profiles_user ON requirement_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_req_profiles_entity ON requirement_profiles(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_req_profiles_building ON requirement_profiles(building_id);

-- Building defaults
CREATE TABLE IF NOT EXISTS building_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),

  gl_occurrence_limit BIGINT,
  gl_aggregate_limit BIGINT,
  auto_csl BIGINT,
  wc_statutory BOOLEAN DEFAULT FALSE,
  wc_employers_liability BIGINT,
  umbrella_limit BIGINT,
  professional_limit BIGINT,
  property_limit BIGINT,
  bi_required BOOLEAN DEFAULT FALSE,
  custom_coverages JSONB DEFAULT '[]'::jsonb,

  additional_insured_required BOOLEAN DEFAULT FALSE,
  additional_insured_entities TEXT[] DEFAULT '{}',
  waiver_of_subrogation_required BOOLEAN DEFAULT FALSE,
  certificate_holder_name TEXT,
  certificate_holder_address TEXT,
  cancellation_notice_days INTEGER DEFAULT 30,
  special_endorsements TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(building_id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_building_defaults_user ON building_defaults(user_id);
CREATE INDEX IF NOT EXISTS idx_building_defaults_building ON building_defaults(building_id);

-- Activity log (unified)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant', 'property')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- ========================
-- 3. ROW LEVEL SECURITY
-- ========================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Settings policies
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE USING (auth.uid() = user_id);

-- Properties policies
DROP POLICY IF EXISTS "Users can view own properties" ON properties;
CREATE POLICY "Users can view own properties"
  ON properties FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own properties" ON properties;
CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own properties" ON properties;
CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Vendors policies
DROP POLICY IF EXISTS "Users can view their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can view own vendors" ON vendors;
CREATE POLICY "Users can view own vendors"
  ON vendors FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view own deleted vendors" ON vendors;
CREATE POLICY "Users can view own deleted vendors"
  ON vendors FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert their own vendors" ON vendors;
CREATE POLICY "Users can insert their own vendors"
  ON vendors FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vendors" ON vendors;
CREATE POLICY "Users can update their own vendors"
  ON vendors FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own vendors" ON vendors;
CREATE POLICY "Users can delete their own vendors"
  ON vendors FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow vendor update via upload token" ON vendors;
CREATE POLICY "Allow vendor update via upload token"
  ON vendors FOR UPDATE USING (upload_token IS NOT NULL) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow vendor select via upload token" ON vendors;
CREATE POLICY "Allow vendor select via upload token"
  ON vendors FOR SELECT USING (upload_token IS NOT NULL);

-- Tenants policies
DROP POLICY IF EXISTS "Users can view own tenants" ON tenants;
CREATE POLICY "Users can view own tenants"
  ON tenants FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view own deleted tenants" ON tenants;
CREATE POLICY "Users can view own deleted tenants"
  ON tenants FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert own tenants" ON tenants;
CREATE POLICY "Users can insert own tenants"
  ON tenants FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tenants" ON tenants;
CREATE POLICY "Users can update own tenants"
  ON tenants FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tenants" ON tenants;
CREATE POLICY "Users can delete own tenants"
  ON tenants FOR DELETE USING (auth.uid() = user_id);

-- Vendor activity policies
DROP POLICY IF EXISTS "Users can view own vendor activity" ON vendor_activity;
CREATE POLICY "Users can view own vendor activity"
  ON vendor_activity FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own vendor activity" ON vendor_activity;
CREATE POLICY "Users can insert own vendor activity"
  ON vendor_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anonymous activity insert" ON vendor_activity;
CREATE POLICY "Allow anonymous activity insert"
  ON vendor_activity FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON vendor_activity TO authenticated;
GRANT INSERT ON vendor_activity TO anon;

-- Requirement templates policies
DROP POLICY IF EXISTS "Users can view own templates" ON requirement_templates;
CREATE POLICY "Users can view own templates"
  ON requirement_templates FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON requirement_templates;
CREATE POLICY "Users can insert own templates"
  ON requirement_templates FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON requirement_templates;
CREATE POLICY "Users can update own templates"
  ON requirement_templates FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON requirement_templates;
CREATE POLICY "Users can delete own templates"
  ON requirement_templates FOR DELETE USING (auth.uid() = user_id);

-- Requirement profiles policies
DROP POLICY IF EXISTS "Users can view own requirement profiles" ON requirement_profiles;
CREATE POLICY "Users can view own requirement profiles"
  ON requirement_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own requirement profiles" ON requirement_profiles;
CREATE POLICY "Users can insert own requirement profiles"
  ON requirement_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own requirement profiles" ON requirement_profiles;
CREATE POLICY "Users can update own requirement profiles"
  ON requirement_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own requirement profiles" ON requirement_profiles;
CREATE POLICY "Users can delete own requirement profiles"
  ON requirement_profiles FOR DELETE USING (auth.uid() = user_id);

-- Building defaults policies
DROP POLICY IF EXISTS "Users can view own building defaults" ON building_defaults;
CREATE POLICY "Users can view own building defaults"
  ON building_defaults FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own building defaults" ON building_defaults;
CREATE POLICY "Users can insert own building defaults"
  ON building_defaults FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own building defaults" ON building_defaults;
CREATE POLICY "Users can update own building defaults"
  ON building_defaults FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own building defaults" ON building_defaults;
CREATE POLICY "Users can delete own building defaults"
  ON building_defaults FOR DELETE USING (auth.uid() = user_id);

-- Activity log policies
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity" ON activity_log;
CREATE POLICY "Users can insert own activity"
  ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================
-- 4. TRIGGERS
-- ========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requirement_profiles_updated_at ON requirement_profiles;
CREATE TRIGGER update_requirement_profiles_updated_at
  BEFORE UPDATE ON requirement_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_building_defaults_updated_at ON building_defaults;
CREATE TRIGGER update_building_defaults_updated_at
  BEFORE UPDATE ON building_defaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requirement_templates_updated_at ON requirement_templates;
CREATE TRIGGER update_requirement_templates_updated_at
  BEFORE UPDATE ON requirement_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================
-- 5. GRANTS
-- ========================

GRANT ALL ON properties TO service_role;
GRANT ALL ON vendor_activity TO service_role;
