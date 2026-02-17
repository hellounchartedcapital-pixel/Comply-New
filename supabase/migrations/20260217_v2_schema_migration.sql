-- ============================================================================
-- SmartCOI v2 — Complete Schema Migration
-- Migrates from the legacy per-user model to organization-based multi-tenant
-- Alters existing tables where possible; creates new tables for new concepts
-- ============================================================================

-- ============================================================================
-- PHASE 0: Drop old triggers, functions, and RLS policies
-- ============================================================================

-- Drop triggers that reference tables/functions being removed
DROP TRIGGER IF EXISTS check_vendor_limit ON vendors;
DROP TRIGGER IF EXISTS check_property_limit ON properties;
DROP TRIGGER IF EXISTS check_tenant_limit ON tenants;
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
DROP TRIGGER IF EXISTS update_requirement_profiles_updated_at ON requirement_profiles;
DROP TRIGGER IF EXISTS update_building_defaults_updated_at ON building_defaults;
DROP TRIGGER IF EXISTS update_requirement_templates_updated_at ON requirement_templates;
DROP TRIGGER IF EXISTS vendor_requirements_updated_at ON vendor_requirements;
DROP TRIGGER IF EXISTS tenant_requirements_updated_at ON tenant_requirements;

-- Drop old functions
DROP FUNCTION IF EXISTS enforce_vendor_limit() CASCADE;
DROP FUNCTION IF EXISTS enforce_property_limit() CASCADE;
DROP FUNCTION IF EXISTS enforce_tenant_limit() CASCADE;
DROP FUNCTION IF EXISTS create_default_subscription() CASCADE;
DROP FUNCTION IF EXISTS get_user_vendor_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_property_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_follow_up() CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS cleanup_rate_limits() CASCADE;

-- Drop ALL existing RLS policies on tables we will alter or drop
-- properties
DROP POLICY IF EXISTS "Users can view own properties" ON properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
DROP POLICY IF EXISTS "Users can update own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON properties;

-- vendors
DROP POLICY IF EXISTS "Users can view own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can view own deleted vendors" ON vendors;
DROP POLICY IF EXISTS "Users can insert their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can update their own vendors" ON vendors;
DROP POLICY IF EXISTS "Users can delete their own vendors" ON vendors;
DROP POLICY IF EXISTS "Allow vendor update via upload token" ON vendors;
DROP POLICY IF EXISTS "Allow vendor select via upload token" ON vendors;

-- tenants
DROP POLICY IF EXISTS "Users can view own tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view own deleted tenants" ON tenants;
DROP POLICY IF EXISTS "Users can insert own tenants" ON tenants;
DROP POLICY IF EXISTS "Users can update own tenants" ON tenants;
DROP POLICY IF EXISTS "Users can delete own tenants" ON tenants;

-- requirement_templates
DROP POLICY IF EXISTS "Users can view own templates" ON requirement_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON requirement_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON requirement_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON requirement_templates;

-- certificates
DROP POLICY IF EXISTS "Users manage own certificates" ON certificates;

-- activity_log
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON activity_log;

-- Drop old indexes that will conflict with new ones
DROP INDEX IF EXISTS idx_properties_user_id;
DROP INDEX IF EXISTS idx_vendors_property_id;
DROP INDEX IF EXISTS idx_vendors_property_ids;
DROP INDEX IF EXISTS idx_vendors_contact_email;
DROP INDEX IF EXISTS idx_vendors_upload_token;
DROP INDEX IF EXISTS idx_vendors_upload_token_expires;
DROP INDEX IF EXISTS idx_vendors_deleted_at;
DROP INDEX IF EXISTS idx_vendors_last_contacted;
DROP INDEX IF EXISTS idx_tenants_deleted_at;
DROP INDEX IF EXISTS idx_tenants_last_contacted;
DROP INDEX IF EXISTS idx_tenants_requirement_profile;
DROP INDEX IF EXISTS idx_tenants_has_requirement_profile;
DROP INDEX IF EXISTS idx_tenants_lease_end;
DROP INDEX IF EXISTS idx_tenants_lease_renewal_date;
DROP INDEX IF EXISTS idx_req_templates_user;
DROP INDEX IF EXISTS idx_req_templates_property;
DROP INDEX IF EXISTS certificates_entity_idx;
DROP INDEX IF EXISTS certificates_property_idx;
DROP INDEX IF EXISTS idx_activity_user;
DROP INDEX IF EXISTS idx_activity_entity;
DROP INDEX IF EXISTS idx_activity_created;

-- ============================================================================
-- PHASE 1: Drop tables not in the new spec
-- ============================================================================

DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS vendor_activity CASCADE;
DROP TABLE IF EXISTS tenant_activity CASCADE;
DROP TABLE IF EXISTS requirement_profiles CASCADE;
DROP TABLE IF EXISTS building_defaults CASCADE;
DROP TABLE IF EXISTS building_tenant_defaults CASCADE;
DROP TABLE IF EXISTS tenant_requirement_profiles CASCADE;
DROP TABLE IF EXISTS vendor_requirements CASCADE;
DROP TABLE IF EXISTS tenant_requirements CASCADE;
DROP TABLE IF EXISTS email_queue CASCADE;
DROP TABLE IF EXISTS email_log CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS cron_job_runs CASCADE;

-- ============================================================================
-- PHASE 2: Create new foundation tables (organizations, users)
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 3: Alter existing tables
-- ============================================================================

-- ---- properties ----
ALTER TABLE properties ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'other'
  CHECK (property_type IN ('office', 'retail', 'industrial', 'mixed_use', 'multifamily', 'other'));

-- Rename split address fields to match spec
ALTER TABLE properties RENAME COLUMN address_street TO address;
ALTER TABLE properties RENAME COLUMN address_city TO city;
ALTER TABLE properties RENAME COLUMN address_state TO state;
ALTER TABLE properties RENAME COLUMN address_zip TO zip;

-- Drop columns not in spec
ALTER TABLE properties
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS general_liability,
  DROP COLUMN IF EXISTS gl_aggregate,
  DROP COLUMN IF EXISTS auto_liability,
  DROP COLUMN IF EXISTS auto_liability_required,
  DROP COLUMN IF EXISTS workers_comp_required,
  DROP COLUMN IF EXISTS employers_liability,
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS require_additional_insured,
  DROP COLUMN IF EXISTS require_waiver_of_subrogation,
  DROP COLUMN IF EXISTS custom_coverages,
  DROP COLUMN IF EXISTS additional_insured_entities,
  DROP COLUMN IF EXISTS certificate_holder_name,
  DROP COLUMN IF EXISTS certificate_holder_address_line1,
  DROP COLUMN IF EXISTS certificate_holder_address_line2,
  DROP COLUMN IF EXISTS certificate_holder_city,
  DROP COLUMN IF EXISTS certificate_holder_state,
  DROP COLUMN IF EXISTS certificate_holder_zip,
  DROP COLUMN IF EXISTS loss_payee_entities;

-- ---- vendors ----
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_type TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'pending'
  CHECK (compliance_status IN ('compliant', 'non_compliant', 'expiring_soon', 'expired', 'pending', 'under_review'));
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notifications_paused BOOLEAN DEFAULT false;

-- Copy name → company_name for existing rows, then drop name
UPDATE vendors SET company_name = name WHERE company_name IS NULL AND name IS NOT NULL;
ALTER TABLE vendors DROP COLUMN IF EXISTS name;
-- Make company_name NOT NULL now that data is copied
ALTER TABLE vendors ALTER COLUMN company_name SET NOT NULL;

-- Drop old status column (replaced by compliance_status)
ALTER TABLE vendors DROP COLUMN IF EXISTS status;

-- Drop columns not in spec
ALTER TABLE vendors
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS dba,
  DROP COLUMN IF EXISTS expiration_date,
  DROP COLUMN IF EXISTS days_overdue,
  DROP COLUMN IF EXISTS coverage,
  DROP COLUMN IF EXISTS issues,
  DROP COLUMN IF EXISTS raw_data,
  DROP COLUMN IF EXISTS requirements,
  DROP COLUMN IF EXISTS property_ids,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS contact_notes,
  DROP COLUMN IF EXISTS last_contacted_at,
  DROP COLUMN IF EXISTS last_email_sent_at,
  DROP COLUMN IF EXISTS upload_token,
  DROP COLUMN IF EXISTS upload_token_expires_at,
  DROP COLUMN IF EXISTS compliance_percentage,
  DROP COLUMN IF EXISTS endorsements,
  DROP COLUMN IF EXISTS certificate_holder_on_coi;

-- ---- tenants ----
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'pending'
  CHECK (compliance_status IN ('compliant', 'non_compliant', 'expiring_soon', 'expired', 'pending', 'under_review'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notifications_paused BOOLEAN DEFAULT false;

-- Copy name → company_name, then drop name
UPDATE tenants SET company_name = name WHERE company_name IS NULL AND name IS NOT NULL;
ALTER TABLE tenants DROP COLUMN IF EXISTS name;
ALTER TABLE tenants ALTER COLUMN company_name SET NOT NULL;

-- Drop old status column (replaced by compliance_status)
ALTER TABLE tenants DROP COLUMN IF EXISTS status;

-- Drop columns not in spec
ALTER TABLE tenants
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS expiration_date,
  DROP COLUMN IF EXISTS coverage,
  DROP COLUMN IF EXISTS issues,
  DROP COLUMN IF EXISTS raw_data,
  DROP COLUMN IF EXISTS requirements,
  DROP COLUMN IF EXISTS upload_token,
  DROP COLUMN IF EXISTS last_contacted_at,
  DROP COLUMN IF EXISTS last_email_sent_at,
  DROP COLUMN IF EXISTS compliance_percentage,
  DROP COLUMN IF EXISTS endorsements,
  DROP COLUMN IF EXISTS certificate_holder_on_coi,
  DROP COLUMN IF EXISTS requirement_profile_id,
  DROP COLUMN IF EXISTS lease_start,
  DROP COLUMN IF EXISTS lease_end,
  DROP COLUMN IF EXISTS lease_start_date,
  DROP COLUMN IF EXISTS lease_end_date,
  DROP COLUMN IF EXISTS lease_renewal_date,
  DROP COLUMN IF EXISTS has_requirement_profile,
  DROP COLUMN IF EXISTS coi_document_path,
  DROP COLUMN IF EXISTS coi_uploaded_at,
  DROP COLUMN IF EXISTS coi_raw_data,
  DROP COLUMN IF EXISTS coi_coverage,
  DROP COLUMN IF EXISTS coi_additional_coverages,
  DROP COLUMN IF EXISTS coi_expiration_date,
  DROP COLUMN IF EXISTS coi_additional_insured,
  DROP COLUMN IF EXISTS coi_has_additional_insured,
  DROP COLUMN IF EXISTS coi_waiver_of_subrogation,
  DROP COLUMN IF EXISTS coi_has_waiver_of_subrogation,
  DROP COLUMN IF EXISTS coi_certificate_holder,
  DROP COLUMN IF EXISTS coi_insurance_company,
  DROP COLUMN IF EXISTS compliance_details,
  DROP COLUMN IF EXISTS policy_number,
  DROP COLUMN IF EXISTS policy_expiration_date,
  DROP COLUMN IF EXISTS required_auto_liability_min,
  DROP COLUMN IF EXISTS required_workers_comp,
  DROP COLUMN IF EXISTS workers_comp_exempt,
  DROP COLUMN IF EXISTS required_employers_liability_min,
  DROP COLUMN IF EXISTS certificate_holder_name,
  DROP COLUMN IF EXISTS certificate_holder_address,
  DROP COLUMN IF EXISTS cancellation_notice_days,
  DROP COLUMN IF EXISTS requires_declarations_page,
  DROP COLUMN IF EXISTS requires_endorsement_pages,
  DROP COLUMN IF EXISTS requires_additional_insured,
  DROP COLUMN IF EXISTS policy_liability_amount,
  DROP COLUMN IF EXISTS policy_property_damage_amount,
  DROP COLUMN IF EXISTS policy_auto_liability_amount,
  DROP COLUMN IF EXISTS policy_employers_liability_amount,
  DROP COLUMN IF EXISTS policy_workers_comp,
  DROP COLUMN IF EXISTS policy_additional_insured,
  DROP COLUMN IF EXISTS has_additional_insured,
  DROP COLUMN IF EXISTS policy_certificate_holder,
  DROP COLUMN IF EXISTS policy_document_path,
  DROP COLUMN IF EXISTS policy_coverage,
  DROP COLUMN IF EXISTS compliance_issues,
  DROP COLUMN IF EXISTS raw_policy_data,
  DROP COLUMN IF EXISTS policy_uploaded_at;

-- ---- requirement_templates ----
ALTER TABLE requirement_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE requirement_templates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'vendor'
  CHECK (category IN ('vendor', 'tenant'));
ALTER TABLE requirement_templates ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'standard'
  CHECK (risk_level IN ('standard', 'high_risk', 'professional_services', 'restaurant', 'industrial'));
ALTER TABLE requirement_templates ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN DEFAULT false;

-- Copy entity_type → category for existing rows
UPDATE requirement_templates SET category = entity_type WHERE category IS NULL AND entity_type IS NOT NULL;

-- Drop old columns
ALTER TABLE requirement_templates
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS entity_type,
  DROP COLUMN IF EXISTS property_id,
  DROP COLUMN IF EXISTS coverages,
  DROP COLUMN IF EXISTS endorsements,
  DROP COLUMN IF EXISTS custom_coverages;

-- ---- certificates ----
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'pm_upload'
  CHECK (upload_source IN ('pm_upload', 'portal_upload'));
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'processing'
  CHECK (processing_status IN ('processing', 'extracted', 'review_confirmed', 'failed'));
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Copy created_at → uploaded_at for existing rows
UPDATE certificates SET uploaded_at = created_at WHERE uploaded_at IS NULL;

-- Map old entity_type/entity_id to vendor_id/tenant_id
UPDATE certificates SET vendor_id = entity_id WHERE entity_type = 'vendor' AND vendor_id IS NULL;
UPDATE certificates SET tenant_id = entity_id WHERE entity_type = 'tenant' AND tenant_id IS NULL;

-- Map old uploaded_by to upload_source
UPDATE certificates SET upload_source = CASE
  WHEN uploaded_by = 'self_service' THEN 'portal_upload'
  ELSE 'pm_upload'
END WHERE upload_source = 'pm_upload' AND uploaded_by IS NOT NULL;

-- Drop old columns
ALTER TABLE certificates
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS entity_type,
  DROP COLUMN IF EXISTS entity_id,
  DROP COLUMN IF EXISTS property_id,
  DROP COLUMN IF EXISTS file_name,
  DROP COLUMN IF EXISTS extracted_data,
  DROP COLUMN IF EXISTS compliance_result,
  DROP COLUMN IF EXISTS overall_status,
  DROP COLUMN IF EXISTS earliest_expiration,
  DROP COLUMN IF EXISTS uploaded_by;

-- Drop old created_at (replaced by uploaded_at)
ALTER TABLE certificates DROP COLUMN IF EXISTS created_at;

-- ---- activity_log ----
-- Restructure activity_log for the new spec
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Copy activity_type → action for existing rows
UPDATE activity_log SET action = activity_type WHERE action IS NULL AND activity_type IS NOT NULL;

-- Add CHECK constraint on action
ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_check
  CHECK (action IN (
    'coi_uploaded', 'coi_processed', 'coi_review_confirmed', 'compliance_checked',
    'notification_sent', 'status_changed', 'template_updated',
    'vendor_created', 'tenant_created', 'portal_upload_received'
  ));

-- Drop old columns
ALTER TABLE activity_log
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS entity_type,
  DROP COLUMN IF EXISTS entity_id,
  DROP COLUMN IF EXISTS entity_name,
  DROP COLUMN IF EXISTS activity_type,
  DROP COLUMN IF EXISTS metadata;

-- ============================================================================
-- PHASE 4: Add FK from vendors/tenants → requirement_templates
-- (must happen after requirement_templates is altered)
-- ============================================================================

ALTER TABLE vendors ADD CONSTRAINT vendors_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES requirement_templates(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD CONSTRAINT tenants_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES requirement_templates(id) ON DELETE SET NULL;

-- ============================================================================
-- PHASE 5: Create new tables
-- ============================================================================

CREATE TABLE property_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_address TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('certificate_holder', 'additional_insured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_default_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_address TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('certificate_holder', 'additional_insured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE template_coverage_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES requirement_templates(id) ON DELETE CASCADE,
  coverage_type TEXT NOT NULL CHECK (coverage_type IN (
    'general_liability', 'automobile_liability', 'workers_compensation',
    'employers_liability', 'umbrella_excess_liability', 'professional_liability_eo',
    'property_inland_marine', 'pollution_liability', 'liquor_liability', 'cyber_liability'
  )),
  is_required BOOLEAN NOT NULL DEFAULT true,
  minimum_limit NUMERIC,
  limit_type TEXT CHECK (limit_type IN (
    'per_occurrence', 'aggregate', 'combined_single_limit', 'statutory', 'per_person', 'per_accident'
  )),
  requires_additional_insured BOOLEAN NOT NULL DEFAULT false,
  requires_waiver_of_subrogation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE extracted_coverages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  coverage_type TEXT NOT NULL CHECK (coverage_type IN (
    'general_liability', 'automobile_liability', 'workers_compensation',
    'employers_liability', 'umbrella_excess_liability', 'professional_liability_eo',
    'property_inland_marine', 'pollution_liability', 'liquor_liability', 'cyber_liability'
  )),
  carrier_name TEXT,
  policy_number TEXT,
  limit_amount NUMERIC,
  limit_type TEXT CHECK (limit_type IN (
    'per_occurrence', 'aggregate', 'combined_single_limit', 'statutory', 'per_person', 'per_accident'
  )),
  effective_date DATE,
  expiration_date DATE,
  additional_insured_listed BOOLEAN DEFAULT false,
  additional_insured_entities TEXT[] DEFAULT '{}',
  waiver_of_subrogation BOOLEAN DEFAULT false,
  confidence_flag BOOLEAN DEFAULT true,
  raw_extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE extracted_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_address TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('certificate_holder', 'additional_insured')),
  confidence_flag BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE compliance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  coverage_requirement_id UUID REFERENCES template_coverage_requirements(id) ON DELETE SET NULL,
  extracted_coverage_id UUID REFERENCES extracted_coverages(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('met', 'not_met', 'missing', 'not_required')),
  gap_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entity_compliance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  property_entity_id UUID NOT NULL REFERENCES property_entities(id) ON DELETE CASCADE,
  extracted_entity_id UUID REFERENCES extracted_entities(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('found', 'missing', 'partial_match')),
  match_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'expiration_warning', 'gap_notification', 'follow_up_reminder', 'escalation'
  )),
  scheduled_date TIMESTAMPTZ NOT NULL,
  sent_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  portal_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE upload_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 6: Create / recreate trigger function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requirement_templates_updated_at
  BEFORE UPDATE ON requirement_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 7: Create indexes
-- ============================================================================

-- properties
CREATE INDEX idx_properties_organization_id ON properties(organization_id);

-- vendors
CREATE INDEX idx_vendors_organization_id ON vendors(organization_id);
CREATE INDEX idx_vendors_property_id ON vendors(property_id);
CREATE INDEX idx_vendors_compliance_status ON vendors(compliance_status);
CREATE INDEX idx_vendors_org_compliance ON vendors(organization_id, compliance_status);

-- tenants
CREATE INDEX idx_tenants_organization_id ON tenants(organization_id);
CREATE INDEX idx_tenants_property_id ON tenants(property_id);
CREATE INDEX idx_tenants_compliance_status ON tenants(compliance_status);
CREATE INDEX idx_tenants_org_compliance ON tenants(organization_id, compliance_status);

-- certificates
CREATE INDEX idx_certificates_vendor_id ON certificates(vendor_id);
CREATE INDEX idx_certificates_tenant_id ON certificates(tenant_id);
CREATE INDEX idx_certificates_processing_status ON certificates(processing_status);

-- extracted_coverages
CREATE INDEX idx_extracted_coverages_certificate_id ON extracted_coverages(certificate_id);
CREATE INDEX idx_extracted_coverages_expiration_date ON extracted_coverages(expiration_date);

-- notifications
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_date ON notifications(scheduled_date);

-- activity_log
CREATE INDEX idx_activity_log_organization_id ON activity_log(organization_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- ============================================================================
-- PHASE 8: RLS helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- PHASE 9: Enable RLS and create policies on ALL tables
-- ============================================================================

-- ---- organizations ----
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT TO authenticated
  USING (id = get_user_organization_id());

CREATE POLICY "Users can update own organization"
  ON organizations FOR UPDATE TO authenticated
  USING (id = get_user_organization_id());

-- ---- users ----
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of own organization"
  ON users FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ---- properties ----
-- RLS already enabled from prior migrations
CREATE POLICY "Org members can view properties"
  ON properties FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can insert properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Org members can update properties"
  ON properties FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can delete properties"
  ON properties FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- ---- property_entities ----
ALTER TABLE property_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage property entities"
  ON property_entities FOR ALL TO authenticated
  USING (
    property_id IN (SELECT id FROM properties WHERE organization_id = get_user_organization_id())
  )
  WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE organization_id = get_user_organization_id())
  );

-- ---- organization_default_entities ----
ALTER TABLE organization_default_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage default entities"
  ON organization_default_entities FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ---- requirement_templates ----
-- RLS already enabled
CREATE POLICY "Org members can view own and system templates"
  ON requirement_templates FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR (is_system_default = true AND organization_id IS NULL)
  );

CREATE POLICY "Org members can insert templates"
  ON requirement_templates FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Org members can update own templates"
  ON requirement_templates FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can delete own templates"
  ON requirement_templates FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- ---- template_coverage_requirements ----
ALTER TABLE template_coverage_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view coverage requirements"
  ON template_coverage_requirements FOR SELECT TO authenticated
  USING (
    template_id IN (
      SELECT id FROM requirement_templates
      WHERE organization_id = get_user_organization_id()
        OR (is_system_default = true AND organization_id IS NULL)
    )
  );

CREATE POLICY "Org members can manage own coverage requirements"
  ON template_coverage_requirements FOR ALL TO authenticated
  USING (
    template_id IN (
      SELECT id FROM requirement_templates WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM requirement_templates WHERE organization_id = get_user_organization_id()
    )
  );

-- ---- vendors ----
-- RLS already enabled
CREATE POLICY "Org members can view vendors"
  ON vendors FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can insert vendors"
  ON vendors FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Org members can update vendors"
  ON vendors FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can delete vendors"
  ON vendors FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- ---- tenants ----
-- RLS already enabled
CREATE POLICY "Org members can view tenants"
  ON tenants FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can insert tenants"
  ON tenants FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Org members can update tenants"
  ON tenants FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can delete tenants"
  ON tenants FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- ---- certificates ----
-- RLS already enabled
CREATE POLICY "Org members can manage certificates"
  ON certificates FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ---- extracted_coverages ----
ALTER TABLE extracted_coverages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage extracted coverages"
  ON extracted_coverages FOR ALL TO authenticated
  USING (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id = get_user_organization_id()
    )
  );

-- ---- extracted_entities ----
ALTER TABLE extracted_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage extracted entities"
  ON extracted_entities FOR ALL TO authenticated
  USING (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id = get_user_organization_id()
    )
  );

-- ---- compliance_results ----
ALTER TABLE compliance_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage compliance results"
  ON compliance_results FOR ALL TO authenticated
  USING (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id = get_user_organization_id()
    )
  );

-- ---- entity_compliance_results ----
ALTER TABLE entity_compliance_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage entity compliance results"
  ON entity_compliance_results FOR ALL TO authenticated
  USING (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    certificate_id IN (
      SELECT id FROM certificates WHERE organization_id = get_user_organization_id()
    )
  );

-- ---- notifications ----
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage notifications"
  ON notifications FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ---- upload_portal_tokens ----
ALTER TABLE upload_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Authenticated org members can manage their tokens
CREATE POLICY "Org members can manage portal tokens"
  ON upload_portal_tokens FOR ALL TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE organization_id = get_user_organization_id())
    OR tenant_id IN (SELECT id FROM tenants WHERE organization_id = get_user_organization_id())
  )
  WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE organization_id = get_user_organization_id())
    OR tenant_id IN (SELECT id FROM tenants WHERE organization_id = get_user_organization_id())
  );

-- Public (anon) can read active, non-expired tokens for portal access
CREATE POLICY "Public can look up active portal tokens"
  ON upload_portal_tokens FOR SELECT TO anon
  USING (is_active = true AND expires_at > now());

-- ---- activity_log ----
-- RLS already enabled
CREATE POLICY "Org members can view activity log"
  ON activity_log FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can insert activity log"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================================
-- PHASE 10: Seed system-default requirement templates
-- ============================================================================

-- Vendor: Standard Vendor
INSERT INTO requirement_templates (id, organization_id, name, description, category, risk_level, is_system_default)
VALUES (
  'a0000000-0000-0000-0000-000000000001', NULL,
  'Standard Vendor', 'Standard insurance requirements for general vendors and contractors',
  'vendor', 'standard', true
);

INSERT INTO template_coverage_requirements (template_id, coverage_type, is_required, minimum_limit, limit_type, requires_additional_insured, requires_waiver_of_subrogation) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'general_liability', true, 1000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000001', 'general_liability', true, 2000000, 'aggregate', true, true),
  ('a0000000-0000-0000-0000-000000000001', 'automobile_liability', true, 1000000, 'combined_single_limit', true, true),
  ('a0000000-0000-0000-0000-000000000001', 'workers_compensation', true, NULL, 'statutory', true, true),
  ('a0000000-0000-0000-0000-000000000001', 'employers_liability', true, 500000, 'per_accident', true, true),
  ('a0000000-0000-0000-0000-000000000001', 'umbrella_excess_liability', false, 1000000, 'per_occurrence', false, false);

-- Vendor: High-Risk Vendor
INSERT INTO requirement_templates (id, organization_id, name, description, category, risk_level, is_system_default)
VALUES (
  'a0000000-0000-0000-0000-000000000002', NULL,
  'High-Risk Vendor', 'Elevated insurance requirements for high-risk vendors (construction, hazardous materials, etc.)',
  'vendor', 'high_risk', true
);

INSERT INTO template_coverage_requirements (template_id, coverage_type, is_required, minimum_limit, limit_type, requires_additional_insured, requires_waiver_of_subrogation) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'general_liability', true, 2000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000002', 'general_liability', true, 4000000, 'aggregate', true, true),
  ('a0000000-0000-0000-0000-000000000002', 'automobile_liability', true, 1000000, 'combined_single_limit', true, true),
  ('a0000000-0000-0000-0000-000000000002', 'workers_compensation', true, NULL, 'statutory', true, true),
  ('a0000000-0000-0000-0000-000000000002', 'employers_liability', true, 1000000, 'per_accident', true, true),
  ('a0000000-0000-0000-0000-000000000002', 'umbrella_excess_liability', true, 5000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000002', 'pollution_liability', false, 1000000, 'per_occurrence', false, false);

-- Vendor: Professional Services
INSERT INTO requirement_templates (id, organization_id, name, description, category, risk_level, is_system_default)
VALUES (
  'a0000000-0000-0000-0000-000000000003', NULL,
  'Professional Services', 'Requirements for professional service providers (consultants, accountants, attorneys, etc.)',
  'vendor', 'professional_services', true
);

INSERT INTO template_coverage_requirements (template_id, coverage_type, is_required, minimum_limit, limit_type, requires_additional_insured, requires_waiver_of_subrogation) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'general_liability', true, 1000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000003', 'general_liability', true, 2000000, 'aggregate', true, true),
  ('a0000000-0000-0000-0000-000000000003', 'professional_liability_eo', true, 1000000, 'per_occurrence', false, false),
  ('a0000000-0000-0000-0000-000000000003', 'workers_compensation', true, NULL, 'statutory', false, false),
  ('a0000000-0000-0000-0000-000000000003', 'cyber_liability', false, 1000000, 'per_occurrence', false, false);

-- Tenant: Standard Commercial Tenant
INSERT INTO requirement_templates (id, organization_id, name, description, category, risk_level, is_system_default)
VALUES (
  'a0000000-0000-0000-0000-000000000004', NULL,
  'Standard Commercial Tenant', 'Standard insurance requirements for office and commercial tenants',
  'tenant', 'standard', true
);

INSERT INTO template_coverage_requirements (template_id, coverage_type, is_required, minimum_limit, limit_type, requires_additional_insured, requires_waiver_of_subrogation) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'general_liability', true, 1000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000004', 'general_liability', true, 2000000, 'aggregate', true, true),
  ('a0000000-0000-0000-0000-000000000004', 'property_inland_marine', false, 100000, 'per_occurrence', false, false),
  ('a0000000-0000-0000-0000-000000000004', 'workers_compensation', true, NULL, 'statutory', false, false),
  ('a0000000-0000-0000-0000-000000000004', 'umbrella_excess_liability', false, 1000000, 'per_occurrence', false, false);

-- Tenant: Restaurant / Food Service
INSERT INTO requirement_templates (id, organization_id, name, description, category, risk_level, is_system_default)
VALUES (
  'a0000000-0000-0000-0000-000000000005', NULL,
  'Restaurant / Food Service', 'Insurance requirements for restaurant and food service tenants including liquor liability',
  'tenant', 'restaurant', true
);

INSERT INTO template_coverage_requirements (template_id, coverage_type, is_required, minimum_limit, limit_type, requires_additional_insured, requires_waiver_of_subrogation) VALUES
  ('a0000000-0000-0000-0000-000000000005', 'general_liability', true, 1000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000005', 'general_liability', true, 2000000, 'aggregate', true, true),
  ('a0000000-0000-0000-0000-000000000005', 'liquor_liability', true, 1000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000005', 'property_inland_marine', false, 250000, 'per_occurrence', false, false),
  ('a0000000-0000-0000-0000-000000000005', 'workers_compensation', true, NULL, 'statutory', false, false),
  ('a0000000-0000-0000-0000-000000000005', 'umbrella_excess_liability', true, 2000000, 'per_occurrence', true, true);

-- Tenant: Industrial / Warehouse
INSERT INTO requirement_templates (id, organization_id, name, description, category, risk_level, is_system_default)
VALUES (
  'a0000000-0000-0000-0000-000000000006', NULL,
  'Industrial / Warehouse', 'Insurance requirements for industrial and warehouse tenants',
  'tenant', 'industrial', true
);

INSERT INTO template_coverage_requirements (template_id, coverage_type, is_required, minimum_limit, limit_type, requires_additional_insured, requires_waiver_of_subrogation) VALUES
  ('a0000000-0000-0000-0000-000000000006', 'general_liability', true, 2000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000006', 'general_liability', true, 4000000, 'aggregate', true, true),
  ('a0000000-0000-0000-0000-000000000006', 'automobile_liability', true, 1000000, 'combined_single_limit', true, true),
  ('a0000000-0000-0000-0000-000000000006', 'workers_compensation', true, NULL, 'statutory', true, true),
  ('a0000000-0000-0000-0000-000000000006', 'employers_liability', true, 500000, 'per_accident', true, true),
  ('a0000000-0000-0000-0000-000000000006', 'pollution_liability', true, 1000000, 'per_occurrence', true, true),
  ('a0000000-0000-0000-0000-000000000006', 'umbrella_excess_liability', true, 5000000, 'per_occurrence', true, true);

-- ============================================================================
-- PHASE 11: Grant permissions
-- ============================================================================

GRANT SELECT ON organizations TO authenticated;
GRANT UPDATE ON organizations TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON properties TO authenticated;
GRANT ALL ON property_entities TO authenticated;
GRANT ALL ON organization_default_entities TO authenticated;
GRANT ALL ON requirement_templates TO authenticated;
GRANT ALL ON template_coverage_requirements TO authenticated;
GRANT ALL ON vendors TO authenticated;
GRANT ALL ON tenants TO authenticated;
GRANT ALL ON certificates TO authenticated;
GRANT ALL ON extracted_coverages TO authenticated;
GRANT ALL ON extracted_entities TO authenticated;
GRANT ALL ON compliance_results TO authenticated;
GRANT ALL ON entity_compliance_results TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON upload_portal_tokens TO authenticated;
GRANT ALL ON activity_log TO authenticated;

-- Anon access for portal
GRANT SELECT ON upload_portal_tokens TO anon;
GRANT SELECT ON vendors TO anon;
GRANT SELECT ON tenants TO anon;
