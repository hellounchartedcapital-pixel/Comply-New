-- ============================================================================
-- SmartCOI — Complete Fresh Database Setup (v2 schema)
-- ============================================================================
-- Run this on a FRESH Supabase project (no prior migrations needed).
-- Creates all tables, indexes, RLS policies, triggers, and seed data.
-- Safe to run on a clean database.
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (linked to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  property_type TEXT DEFAULT 'other'
    CHECK (property_type IN ('office', 'retail', 'industrial', 'mixed_use', 'multifamily', 'other')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Property entities (certificate holders / additional insured per property)
CREATE TABLE IF NOT EXISTS property_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_address TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('certificate_holder', 'additional_insured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization-level default entities
CREATE TABLE IF NOT EXISTS organization_default_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_address TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('certificate_holder', 'additional_insured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Requirement templates
CREATE TABLE IF NOT EXISTS requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'vendor' CHECK (category IN ('vendor', 'tenant')),
  risk_level TEXT DEFAULT 'standard'
    CHECK (risk_level IN ('standard', 'high_risk', 'professional_services', 'restaurant', 'industrial')),
  is_system_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template coverage requirements
CREATE TABLE IF NOT EXISTS template_coverage_requirements (
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

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  vendor_type TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  template_id UUID REFERENCES requirement_templates(id) ON DELETE SET NULL,
  compliance_status TEXT DEFAULT 'pending'
    CHECK (compliance_status IN ('compliant', 'non_compliant', 'expiring_soon', 'expired', 'pending', 'under_review')),
  notifications_paused BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  template_id UUID REFERENCES requirement_templates(id) ON DELETE SET NULL,
  compliance_status TEXT DEFAULT 'pending'
    CHECK (compliance_status IN ('compliant', 'non_compliant', 'expiring_soon', 'expired', 'pending', 'under_review')),
  notifications_paused BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT,
  upload_source TEXT DEFAULT 'pm_upload'
    CHECK (upload_source IN ('pm_upload', 'portal_upload')),
  processing_status TEXT DEFAULT 'processing'
    CHECK (processing_status IN ('processing', 'extracted', 'review_confirmed', 'failed')),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Extracted coverages (from COI processing)
CREATE TABLE IF NOT EXISTS extracted_coverages (
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

-- Extracted entities (from COI processing)
CREATE TABLE IF NOT EXISTS extracted_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_address TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('certificate_holder', 'additional_insured')),
  confidence_flag BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance results
CREATE TABLE IF NOT EXISTS compliance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  coverage_requirement_id UUID REFERENCES template_coverage_requirements(id) ON DELETE SET NULL,
  extracted_coverage_id UUID REFERENCES extracted_coverages(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('met', 'not_met', 'missing', 'not_required')),
  gap_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Entity compliance results
CREATE TABLE IF NOT EXISTS entity_compliance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  property_entity_id UUID NOT NULL REFERENCES property_entities(id) ON DELETE CASCADE,
  extracted_entity_id UUID REFERENCES extracted_entities(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('found', 'missing', 'partial_match')),
  match_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
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

-- Upload portal tokens
CREATE TABLE IF NOT EXISTS upload_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'coi_uploaded', 'coi_processed', 'coi_review_confirmed', 'compliance_checked',
    'notification_sent', 'status_changed', 'template_updated',
    'vendor_created', 'tenant_created', 'portal_upload_received'
  )),
  description TEXT NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON properties(organization_id);

CREATE INDEX IF NOT EXISTS idx_vendors_organization_id ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_property_id ON vendors(property_id);
CREATE INDEX IF NOT EXISTS idx_vendors_compliance_status ON vendors(compliance_status);
CREATE INDEX IF NOT EXISTS idx_vendors_org_compliance ON vendors(organization_id, compliance_status);

CREATE INDEX IF NOT EXISTS idx_tenants_organization_id ON tenants(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_compliance_status ON tenants(compliance_status);
CREATE INDEX IF NOT EXISTS idx_tenants_org_compliance ON tenants(organization_id, compliance_status);

CREATE INDEX IF NOT EXISTS idx_certificates_vendor_id ON certificates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_certificates_tenant_id ON certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_certificates_processing_status ON certificates(processing_status);

CREATE INDEX IF NOT EXISTS idx_extracted_coverages_certificate_id ON extracted_coverages(certificate_id);
CREATE INDEX IF NOT EXISTS idx_extracted_coverages_expiration_date ON extracted_coverages(expiration_date);

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_date ON notifications(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_activity_log_organization_id ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);


-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- 4. RLS HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================================
-- 5. ENABLE RLS + POLICIES
-- ============================================================================

-- ---- organizations ----
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT TO authenticated
  USING (id = get_user_organization_id());

CREATE POLICY "Users can update own organization"
  ON organizations FOR UPDATE TO authenticated
  USING (id = get_user_organization_id());

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- ---- users ----
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of own organization"
  ON users FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ---- properties ----
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE requirement_templates ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Public can look up active portal tokens"
  ON upload_portal_tokens FOR SELECT TO anon
  USING (is_active = true AND expires_at > now());

-- ---- activity_log ----
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view activity log"
  ON activity_log FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org members can insert activity log"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());


-- ============================================================================
-- 6. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
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


-- ============================================================================
-- 7. SEED DATA — System-default requirement templates
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
