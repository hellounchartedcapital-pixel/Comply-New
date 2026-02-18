-- ============================================================================
-- Add missing indexes on all unindexed foreign key columns
-- Unindexed FKs cause slow joins, slow cascading deletes, and sequential
-- scans during constraint checks. Using IF NOT EXISTS to be idempotent.
-- ============================================================================

-- activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_certificate_id ON activity_log(certificate_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_performed_by ON activity_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_activity_log_property_id ON activity_log(property_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_vendor_id ON activity_log(vendor_id);

-- certificates
CREATE INDEX IF NOT EXISTS idx_certificates_organization_id ON certificates(organization_id);
CREATE INDEX IF NOT EXISTS idx_certificates_reviewed_by ON certificates(reviewed_by);

-- compliance_results
CREATE INDEX IF NOT EXISTS idx_compliance_results_certificate_id ON compliance_results(certificate_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_coverage_requirement_id ON compliance_results(coverage_requirement_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_extracted_coverage_id ON compliance_results(extracted_coverage_id);

-- entity_compliance_results
CREATE INDEX IF NOT EXISTS idx_entity_compliance_results_certificate_id ON entity_compliance_results(certificate_id);
CREATE INDEX IF NOT EXISTS idx_entity_compliance_results_extracted_entity_id ON entity_compliance_results(extracted_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_compliance_results_property_entity_id ON entity_compliance_results(property_entity_id);

-- extracted_entities
CREATE INDEX IF NOT EXISTS idx_extracted_entities_certificate_id ON extracted_entities(certificate_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_vendor_id ON notifications(vendor_id);

-- organization_default_entities
CREATE INDEX IF NOT EXISTS idx_organization_default_entities_organization_id ON organization_default_entities(organization_id);

-- property_entities
CREATE INDEX IF NOT EXISTS idx_property_entities_property_id ON property_entities(property_id);

-- requirement_templates
CREATE INDEX IF NOT EXISTS idx_requirement_templates_organization_id ON requirement_templates(organization_id);

-- template_coverage_requirements
CREATE INDEX IF NOT EXISTS idx_template_coverage_requirements_template_id ON template_coverage_requirements(template_id);

-- tenants
CREATE INDEX IF NOT EXISTS idx_tenants_template_id ON tenants(template_id);

-- upload_portal_tokens
CREATE INDEX IF NOT EXISTS idx_upload_portal_tokens_tenant_id ON upload_portal_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upload_portal_tokens_vendor_id ON upload_portal_tokens(vendor_id);

-- users
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- vendors
CREATE INDEX IF NOT EXISTS idx_vendors_template_id ON vendors(template_id);
