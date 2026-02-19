// ============================================================================
// SmartCOI v2 — Type Definitions
// Matches the database schema defined in 20260217_v2_schema_migration.sql
// ============================================================================

// ============================================================================
// Enum types (mirror CHECK constraints in the database)
// ============================================================================

export type UserRole = 'manager';

export type PropertyType =
  | 'office'
  | 'retail'
  | 'industrial'
  | 'mixed_use'
  | 'multifamily'
  | 'other';

export type EntityType = 'certificate_holder' | 'additional_insured';

export type TemplateCategory = 'vendor' | 'tenant';

export type RiskLevel =
  | 'standard'
  | 'high_risk'
  | 'professional_services'
  | 'restaurant'
  | 'industrial';

export type CoverageType =
  | 'general_liability'
  | 'automobile_liability'
  | 'workers_compensation'
  | 'employers_liability'
  | 'umbrella_excess_liability'
  | 'professional_liability_eo'
  | 'property_inland_marine'
  | 'pollution_liability'
  | 'liquor_liability'
  | 'cyber_liability';

export type LimitType =
  | 'per_occurrence'
  | 'aggregate'
  | 'combined_single_limit'
  | 'statutory'
  | 'per_person'
  | 'per_accident';

export type ComplianceStatus =
  | 'compliant'
  | 'non_compliant'
  | 'expiring_soon'
  | 'expired'
  | 'pending'
  | 'under_review';

export type UploadSource = 'pm_upload' | 'portal_upload';

export type ProcessingStatus =
  | 'processing'
  | 'extracted'
  | 'review_confirmed'
  | 'failed';

export type ComplianceResultStatus = 'met' | 'not_met' | 'missing' | 'not_required';

export type EntityComplianceStatus = 'found' | 'missing' | 'partial_match';

export type NotificationType =
  | 'expiration_warning'
  | 'gap_notification'
  | 'follow_up_reminder'
  | 'escalation';

export type NotificationStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';

export type ActivityAction =
  | 'coi_uploaded'
  | 'coi_processed'
  | 'coi_review_confirmed'
  | 'compliance_checked'
  | 'notification_sent'
  | 'status_changed'
  | 'template_updated'
  | 'vendor_created'
  | 'tenant_created'
  | 'portal_upload_received';

// ============================================================================
// Table types
// ============================================================================

/** organizations */
export interface Organization {
  id: string;
  name: string;
  plan: string;
  trial_ends_at: string | null;
  settings: OrganizationSettings;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  payment_failed: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  onboarding_completed?: boolean;
  notification_preferences?: {
    expiration_warning_days?: number[];
    auto_follow_up_enabled?: boolean;
    follow_up_frequency_days?: number;
  };
  expiration_warning_threshold_days?: number;
}

/** users */
export interface User {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

/** properties */
export interface Property {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: PropertyType;
  created_at: string;
  updated_at: string;
}

/** property_entities */
export interface PropertyEntity {
  id: string;
  property_id: string;
  entity_name: string;
  entity_address: string | null;
  entity_type: EntityType;
  created_at: string;
}

/** organization_default_entities */
export interface OrganizationDefaultEntity {
  id: string;
  organization_id: string;
  entity_name: string;
  entity_address: string | null;
  entity_type: EntityType;
  created_at: string;
}

/** requirement_templates */
export interface RequirementTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  category: TemplateCategory;
  risk_level: RiskLevel;
  is_system_default: boolean;
  created_at: string;
  updated_at: string;
  // Joined relation
  coverage_requirements?: TemplateCoverageRequirement[];
}

/** template_coverage_requirements */
export interface TemplateCoverageRequirement {
  id: string;
  template_id: string;
  coverage_type: CoverageType;
  is_required: boolean;
  minimum_limit: number | null;
  limit_type: LimitType | null;
  requires_additional_insured: boolean;
  requires_waiver_of_subrogation: boolean;
  created_at: string;
}

/** vendors */
export interface Vendor {
  id: string;
  property_id: string | null;
  organization_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  vendor_type: string | null;
  template_id: string | null;
  compliance_status: ComplianceStatus;
  notifications_paused: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined relations
  property?: Property;
  template?: RequirementTemplate;
}

/** tenants */
export interface Tenant {
  id: string;
  property_id: string | null;
  organization_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  unit_suite: string | null;
  tenant_type: string | null;
  template_id: string | null;
  compliance_status: ComplianceStatus;
  notifications_paused: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined relations
  property?: Property;
  template?: RequirementTemplate;
}

/** certificates */
export interface Certificate {
  id: string;
  vendor_id: string | null;
  tenant_id: string | null;
  organization_id: string;
  file_path: string | null;
  file_hash: string | null;
  upload_source: UploadSource;
  processing_status: ProcessingStatus;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // Joined relations
  extracted_coverages?: ExtractedCoverage[];
  extracted_entities?: ExtractedEntity[];
  compliance_results?: ComplianceResult[];
}

/** extracted_coverages */
export interface ExtractedCoverage {
  id: string;
  certificate_id: string;
  coverage_type: CoverageType;
  carrier_name: string | null;
  policy_number: string | null;
  limit_amount: number | null;
  limit_type: LimitType | null;
  effective_date: string | null;
  expiration_date: string | null;
  additional_insured_listed: boolean;
  additional_insured_entities: string[];
  waiver_of_subrogation: boolean;
  confidence_flag: boolean;
  raw_extracted_text: string | null;
  created_at: string;
}

/** extracted_entities */
export interface ExtractedEntity {
  id: string;
  certificate_id: string;
  entity_name: string;
  entity_address: string | null;
  entity_type: EntityType;
  confidence_flag: boolean;
  created_at: string;
}

/** compliance_results */
export interface ComplianceResult {
  id: string;
  certificate_id: string;
  coverage_requirement_id: string | null;
  extracted_coverage_id: string | null;
  status: ComplianceResultStatus;
  gap_description: string | null;
  created_at: string;
}

/** entity_compliance_results */
export interface EntityComplianceResult {
  id: string;
  certificate_id: string;
  property_entity_id: string;
  extracted_entity_id: string | null;
  status: EntityComplianceStatus;
  match_details: string | null;
  created_at: string;
}

/** notifications */
export interface Notification {
  id: string;
  vendor_id: string | null;
  tenant_id: string | null;
  organization_id: string;
  type: NotificationType;
  scheduled_date: string;
  sent_date: string | null;
  status: NotificationStatus;
  email_subject: string;
  email_body: string;
  portal_link: string | null;
  created_at: string;
}

/** upload_portal_tokens */
export interface UploadPortalToken {
  id: string;
  vendor_id: string | null;
  tenant_id: string | null;
  token: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

/** activity_log */
export interface ActivityLogEntry {
  id: string;
  organization_id: string;
  property_id: string | null;
  vendor_id: string | null;
  tenant_id: string | null;
  certificate_id: string | null;
  action: ActivityAction;
  description: string;
  performed_by: string | null;
  created_at: string;
}

// ============================================================================
// Derived / aggregate types for the UI
// ============================================================================

export interface ComplianceStats {
  total: number;
  compliant: number;
  non_compliant: number;
  expiring_soon: number;
  expired: number;
  pending: number;
  under_review: number;
}

// ============================================================================
// AI extraction result types (returned by Supabase Edge Functions)
// These are the raw shapes from the AI — mapped into extracted_coverages
// and extracted_entities rows by application code.
// ============================================================================

export interface COIExtractionResult {
  success: boolean;
  error?: string;
  coverages: RawExtractedCoverage[];
  entities: RawExtractedEntity[];
  confidence_score: number;
}

export interface RawExtractedCoverage {
  coverage_type: CoverageType;
  carrier_name: string | null;
  policy_number: string | null;
  limit_amount: number | null;
  limit_type: LimitType | null;
  effective_date: string | null;
  expiration_date: string | null;
  additional_insured_listed: boolean;
  additional_insured_entities: string[];
  waiver_of_subrogation: boolean;
  raw_text: string | null;
}

export interface RawExtractedEntity {
  entity_name: string;
  entity_address: string | null;
  entity_type: EntityType;
}

export interface LeaseExtractionResult {
  success: boolean;
  error?: string;
  data?: LeaseExtractedData;
}

export interface LeaseExtractedData {
  tenant_name: string | null;
  premises_description: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  coverage_requirements: LeaseExtractedCoverage[];
  entity_requirements: LeaseExtractedEntityRequirement[];
}

export interface LeaseExtractedCoverage {
  coverage_type: CoverageType;
  is_required: boolean;
  minimum_limit: number | null;
  limit_type: LimitType | null;
  requires_additional_insured: boolean;
  requires_waiver_of_subrogation: boolean;
  confidence: number;
  lease_reference: string | null;
}

export interface LeaseExtractedEntityRequirement {
  entity_name: string;
  entity_type: EntityType;
  confidence: number;
  lease_reference: string | null;
}
