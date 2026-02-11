-- Migration: Tenant Requirement Profiles
-- Creates the tenant_requirement_profiles table and building_tenant_defaults table
-- for lease-driven insurance requirement extraction workflow

-- ============================================
-- Building-Level Tenant Insurance Defaults
-- ============================================
CREATE TABLE IF NOT EXISTS building_tenant_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- General Liability
  gl_occurrence_limit BIGINT,
  gl_aggregate_limit BIGINT,

  -- Property / Contents Insurance
  property_contents_limit BIGINT,

  -- Umbrella / Excess Liability
  umbrella_limit BIGINT,

  -- Workers Compensation
  workers_comp_statutory BOOLEAN DEFAULT false,
  workers_comp_employers_liability_limit BIGINT,

  -- Commercial Auto
  commercial_auto_csl BIGINT,

  -- Professional Liability / E&O
  professional_liability_limit BIGINT,

  -- Business Interruption
  business_interruption_required BOOLEAN DEFAULT false,
  business_interruption_duration TEXT,

  -- Custom / Additional Coverages (flexible key-value)
  custom_coverages JSONB DEFAULT '[]'::jsonb,

  -- Additional Insured
  additional_insured_entities JSONB DEFAULT '[]'::jsonb,
  additional_insured_language TEXT,

  -- Loss Payee
  loss_payee_entities JSONB DEFAULT '[]'::jsonb,

  -- Waiver of Subrogation
  waiver_of_subrogation_required BOOLEAN DEFAULT false,
  waiver_of_subrogation_coverages JSONB DEFAULT '[]'::jsonb,

  -- Certificate Holder
  certificate_holder_name TEXT,
  certificate_holder_address TEXT,

  -- Notice of Cancellation
  cancellation_notice_days INTEGER DEFAULT 30,

  -- Special endorsements or exclusions
  special_endorsements JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(property_id)
);

-- ============================================
-- Tenant Requirement Profiles
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_requirement_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  -- General Liability
  gl_occurrence_limit BIGINT,
  gl_occurrence_limit_source TEXT DEFAULT 'manual' CHECK (gl_occurrence_limit_source IN ('building_default', 'lease_extracted', 'manual')),
  gl_occurrence_limit_confidence INTEGER CHECK (gl_occurrence_limit_confidence BETWEEN 0 AND 100),
  gl_occurrence_limit_lease_ref TEXT,
  gl_aggregate_limit BIGINT,
  gl_aggregate_limit_source TEXT DEFAULT 'manual' CHECK (gl_aggregate_limit_source IN ('building_default', 'lease_extracted', 'manual')),
  gl_aggregate_limit_confidence INTEGER CHECK (gl_aggregate_limit_confidence BETWEEN 0 AND 100),
  gl_aggregate_limit_lease_ref TEXT,

  -- Property / Contents Insurance
  property_contents_limit BIGINT,
  property_contents_limit_source TEXT DEFAULT 'manual' CHECK (property_contents_limit_source IN ('building_default', 'lease_extracted', 'manual')),
  property_contents_limit_confidence INTEGER CHECK (property_contents_limit_confidence BETWEEN 0 AND 100),
  property_contents_limit_lease_ref TEXT,

  -- Umbrella / Excess Liability
  umbrella_limit BIGINT,
  umbrella_limit_source TEXT DEFAULT 'manual' CHECK (umbrella_limit_source IN ('building_default', 'lease_extracted', 'manual')),
  umbrella_limit_confidence INTEGER CHECK (umbrella_limit_confidence BETWEEN 0 AND 100),
  umbrella_limit_lease_ref TEXT,

  -- Workers Compensation
  workers_comp_statutory BOOLEAN DEFAULT false,
  workers_comp_statutory_source TEXT DEFAULT 'manual' CHECK (workers_comp_statutory_source IN ('building_default', 'lease_extracted', 'manual')),
  workers_comp_statutory_confidence INTEGER CHECK (workers_comp_statutory_confidence BETWEEN 0 AND 100),
  workers_comp_statutory_lease_ref TEXT,
  workers_comp_employers_liability_limit BIGINT,
  workers_comp_employers_liability_limit_source TEXT DEFAULT 'manual' CHECK (workers_comp_employers_liability_limit_source IN ('building_default', 'lease_extracted', 'manual')),
  workers_comp_employers_liability_limit_confidence INTEGER CHECK (workers_comp_employers_liability_limit_confidence BETWEEN 0 AND 100),
  workers_comp_employers_liability_limit_lease_ref TEXT,

  -- Commercial Auto
  commercial_auto_csl BIGINT,
  commercial_auto_csl_source TEXT DEFAULT 'manual' CHECK (commercial_auto_csl_source IN ('building_default', 'lease_extracted', 'manual')),
  commercial_auto_csl_confidence INTEGER CHECK (commercial_auto_csl_confidence BETWEEN 0 AND 100),
  commercial_auto_csl_lease_ref TEXT,

  -- Professional Liability / E&O
  professional_liability_limit BIGINT,
  professional_liability_limit_source TEXT DEFAULT 'manual' CHECK (professional_liability_limit_source IN ('building_default', 'lease_extracted', 'manual')),
  professional_liability_limit_confidence INTEGER CHECK (professional_liability_limit_confidence BETWEEN 0 AND 100),
  professional_liability_limit_lease_ref TEXT,

  -- Business Interruption
  business_interruption_required BOOLEAN DEFAULT false,
  business_interruption_required_source TEXT DEFAULT 'manual' CHECK (business_interruption_required_source IN ('building_default', 'lease_extracted', 'manual')),
  business_interruption_required_confidence INTEGER CHECK (business_interruption_required_confidence BETWEEN 0 AND 100),
  business_interruption_required_lease_ref TEXT,
  business_interruption_duration TEXT,

  -- Custom / Additional Coverages (flexible key-value)
  -- Array of { name, limit, source, confidence, lease_ref }
  custom_coverages JSONB DEFAULT '[]'::jsonb,

  -- Additional Insured
  additional_insured_entities JSONB DEFAULT '[]'::jsonb,
  additional_insured_language TEXT,
  additional_insured_source TEXT DEFAULT 'manual' CHECK (additional_insured_source IN ('building_default', 'lease_extracted', 'manual')),
  additional_insured_confidence INTEGER CHECK (additional_insured_confidence BETWEEN 0 AND 100),
  additional_insured_lease_ref TEXT,

  -- Loss Payee
  loss_payee_entities JSONB DEFAULT '[]'::jsonb,
  loss_payee_source TEXT DEFAULT 'manual' CHECK (loss_payee_source IN ('building_default', 'lease_extracted', 'manual')),
  loss_payee_confidence INTEGER CHECK (loss_payee_confidence BETWEEN 0 AND 100),
  loss_payee_lease_ref TEXT,

  -- Waiver of Subrogation
  waiver_of_subrogation_required BOOLEAN DEFAULT false,
  waiver_of_subrogation_coverages JSONB DEFAULT '[]'::jsonb,
  waiver_of_subrogation_source TEXT DEFAULT 'manual' CHECK (waiver_of_subrogation_source IN ('building_default', 'lease_extracted', 'manual')),
  waiver_of_subrogation_confidence INTEGER CHECK (waiver_of_subrogation_confidence BETWEEN 0 AND 100),
  waiver_of_subrogation_lease_ref TEXT,

  -- Certificate Holder
  certificate_holder_name TEXT,
  certificate_holder_address TEXT,
  certificate_holder_source TEXT DEFAULT 'manual' CHECK (certificate_holder_source IN ('building_default', 'lease_extracted', 'manual')),
  certificate_holder_confidence INTEGER CHECK (certificate_holder_confidence BETWEEN 0 AND 100),
  certificate_holder_lease_ref TEXT,

  -- Notice of Cancellation
  cancellation_notice_days INTEGER DEFAULT 30,
  cancellation_notice_days_source TEXT DEFAULT 'manual' CHECK (cancellation_notice_days_source IN ('building_default', 'lease_extracted', 'manual')),
  cancellation_notice_days_confidence INTEGER CHECK (cancellation_notice_days_confidence BETWEEN 0 AND 100),
  cancellation_notice_days_lease_ref TEXT,

  -- Special endorsements or exclusions
  special_endorsements JSONB DEFAULT '[]'::jsonb,

  -- Lease term dates
  lease_start_date DATE,
  lease_end_date DATE,
  lease_renewal_date DATE,

  -- Lease document reference
  lease_document_path TEXT,
  lease_document_uploaded_at TIMESTAMPTZ,

  -- Profile creation method
  creation_method TEXT NOT NULL DEFAULT 'manual' CHECK (creation_method IN ('building_default', 'lease_extracted', 'manual')),

  -- Raw AI extraction data for audit
  raw_extraction_data JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id)
);

-- ============================================
-- Add new columns to tenants table for enhanced tracking
-- ============================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS requirement_profile_id UUID REFERENCES tenant_requirement_profiles(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lease_start DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lease_end DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lease_renewal_date DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_requirement_profile BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_document_path TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_uploaded_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_raw_data JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_coverage JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_additional_coverages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_expiration_date DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_additional_insured TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_has_additional_insured BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_waiver_of_subrogation TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_has_waiver_of_subrogation BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_certificate_holder TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS coi_insurance_company TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_details JSONB;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE building_tenant_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_requirement_profiles ENABLE ROW LEVEL SECURITY;

-- Building tenant defaults policies
CREATE POLICY "Users can view their own building tenant defaults"
  ON building_tenant_defaults FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own building tenant defaults"
  ON building_tenant_defaults FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own building tenant defaults"
  ON building_tenant_defaults FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own building tenant defaults"
  ON building_tenant_defaults FOR DELETE
  USING (auth.uid() = user_id);

-- Tenant requirement profiles policies
CREATE POLICY "Users can view their own tenant requirement profiles"
  ON tenant_requirement_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tenant requirement profiles"
  ON tenant_requirement_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenant requirement profiles"
  ON tenant_requirement_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenant requirement profiles"
  ON tenant_requirement_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_building_tenant_defaults_property ON building_tenant_defaults(property_id);
CREATE INDEX IF NOT EXISTS idx_building_tenant_defaults_user ON building_tenant_defaults(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_requirement_profiles_tenant ON tenant_requirement_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_requirement_profiles_property ON tenant_requirement_profiles(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_requirement_profiles_user ON tenant_requirement_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_requirement_profile ON tenants(requirement_profile_id);
CREATE INDEX IF NOT EXISTS idx_tenants_has_requirement_profile ON tenants(has_requirement_profile);
CREATE INDEX IF NOT EXISTS idx_tenants_lease_end ON tenants(lease_end);
CREATE INDEX IF NOT EXISTS idx_tenants_lease_renewal_date ON tenants(lease_renewal_date);
