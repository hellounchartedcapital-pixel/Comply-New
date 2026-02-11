-- SmartCOI Unified Data Model Migration
-- Creates the unified requirement profile system for both vendors and tenants

-- ============================================
-- REQUIREMENT PROFILES (shared by vendors & tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS requirement_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),
  entity_id UUID NOT NULL,
  building_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  -- General Liability
  gl_occurrence_limit BIGINT,
  gl_occurrence_source TEXT DEFAULT 'manual' CHECK (gl_occurrence_source IN ('building_default', 'lease_extracted', 'coi_prefill', 'manual')),
  gl_occurrence_confidence SMALLINT,
  gl_occurrence_ref TEXT,
  gl_aggregate_limit BIGINT,
  gl_aggregate_source TEXT DEFAULT 'manual',
  gl_aggregate_confidence SMALLINT,
  gl_aggregate_ref TEXT,

  -- Automobile Liability
  auto_csl BIGINT,
  auto_source TEXT DEFAULT 'manual',
  auto_confidence SMALLINT,
  auto_ref TEXT,

  -- Workers Compensation
  wc_statutory BOOLEAN DEFAULT FALSE,
  wc_statutory_source TEXT DEFAULT 'manual',
  wc_statutory_confidence SMALLINT,
  wc_statutory_ref TEXT,
  wc_employers_liability BIGINT,
  wc_employers_source TEXT DEFAULT 'manual',
  wc_employers_confidence SMALLINT,
  wc_employers_ref TEXT,

  -- Umbrella / Excess
  umbrella_limit BIGINT,
  umbrella_source TEXT DEFAULT 'manual',
  umbrella_confidence SMALLINT,
  umbrella_ref TEXT,

  -- Professional Liability
  professional_limit BIGINT,
  professional_source TEXT DEFAULT 'manual',
  professional_confidence SMALLINT,
  professional_ref TEXT,

  -- Property Insurance (tenant-focused)
  property_limit BIGINT,
  property_source TEXT DEFAULT 'manual',
  property_confidence SMALLINT,
  property_ref TEXT,

  -- Business Interruption (tenant-focused)
  bi_required BOOLEAN DEFAULT FALSE,
  bi_source TEXT DEFAULT 'manual',
  bi_confidence SMALLINT,
  bi_ref TEXT,
  bi_duration TEXT,

  -- Custom coverages (JSON array)
  custom_coverages JSONB DEFAULT '[]'::jsonb,

  -- Endorsements
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

  -- Lease tracking (tenant only)
  lease_term_start DATE,
  lease_term_end DATE,
  lease_renewal_date DATE,
  lease_document_path TEXT,

  -- Creation metadata
  creation_method TEXT NOT NULL DEFAULT 'manual' CHECK (creation_method IN ('building_default', 'lease_extracted', 'coi_prefill', 'manual')),
  raw_extraction_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_req_profiles_user ON requirement_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_req_profiles_entity ON requirement_profiles(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_req_profiles_building ON requirement_profiles(building_id);

-- ============================================
-- BUILDING DEFAULTS
-- ============================================
CREATE TABLE IF NOT EXISTS building_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),

  -- Coverage defaults
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

  -- Endorsement defaults
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

-- ============================================
-- REQUIREMENT TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'tenant')),
  description TEXT,

  -- Coverage template
  coverages JSONB NOT NULL DEFAULT '{}'::jsonb,
  endorsements JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_coverages JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_templates_user ON requirement_templates(user_id);

-- ============================================
-- ACTIVITY LOG (unified)
-- ============================================
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

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE requirement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Requirement Profiles policies
CREATE POLICY "Users can view own requirement profiles"
  ON requirement_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requirement profiles"
  ON requirement_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requirement profiles"
  ON requirement_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own requirement profiles"
  ON requirement_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Building Defaults policies
CREATE POLICY "Users can view own building defaults"
  ON building_defaults FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own building defaults"
  ON building_defaults FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own building defaults"
  ON building_defaults FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own building defaults"
  ON building_defaults FOR DELETE
  USING (auth.uid() = user_id);

-- Requirement Templates policies
CREATE POLICY "Users can view own templates"
  ON requirement_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON requirement_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON requirement_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON requirement_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Activity Log policies
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_requirement_profiles_updated_at
  BEFORE UPDATE ON requirement_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_defaults_updated_at
  BEFORE UPDATE ON building_defaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requirement_templates_updated_at
  BEFORE UPDATE ON requirement_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
