// ============================================
// SmartCOI — Definitive Type Definitions
// ============================================

// ============================================
// ENTITY & STATUS TYPES
// ============================================

export type EntityType = 'vendor' | 'tenant';

export type ComplianceStatus =
  | 'compliant'
  | 'non_compliant'
  | 'expired'
  | 'expiring_soon'
  | 'pending';

export type RequirementSource =
  | 'lease_extracted'
  | 'template_office'
  | 'template_retail'
  | 'template_restaurant'
  | 'manual';

// ============================================
// PROPERTY
// ============================================

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  // Legacy — some existing rows may have a single 'address' field
  address?: string;
  additional_insured_entities: string[];
  certificate_holder_name?: string;
  certificate_holder_address_line1?: string;
  certificate_holder_address_line2?: string;
  certificate_holder_city?: string;
  certificate_holder_state?: string;
  certificate_holder_zip?: string;
  loss_payee_entities: string[];
  // Computed
  vendor_count?: number;
  tenant_count?: number;
  compliance_percentage?: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// VENDOR REQUIREMENTS (per property)
// ============================================

export interface VendorRequirements {
  id: string;
  property_id: string;
  user_id: string;
  general_liability_per_occurrence: number | null;
  general_liability_aggregate: number | null;
  auto_liability: number | null;
  auto_includes_hired_non_owned: boolean;
  workers_comp_required: boolean;
  employers_liability: number | null;
  umbrella_liability: number | null;
  professional_liability: number | null;
  waiver_of_subrogation_required: boolean;
  blanket_additional_insured_accepted: boolean;
  cancellation_notice_days: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// VENDOR
// ============================================

export interface Vendor {
  id: string;
  user_id: string;
  property_id?: string;
  property?: Property;
  name: string;
  email?: string;
  status: ComplianceStatus;
  upload_token?: string;
  created_at: string;
  updated_at: string;
  // Legacy fields still on the DB table
  contact_email?: string;
  contact_name?: string;
  expiration_date?: string;
  coverage?: ExtractedCoverage[] | null;
  endorsements?: ExtractedEndorsement[] | null;
  certificate_holder_on_coi?: string;
  deleted_at?: string | null;
}

// ============================================
// TENANT
// ============================================

export interface Tenant {
  id: string;
  user_id: string;
  property_id?: string;
  property?: Property;
  name: string;
  email?: string;
  unit_suite?: string;
  tenant_type?: string; // 'office', 'retail', 'restaurant'
  status: ComplianceStatus;
  upload_token?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  created_at: string;
  updated_at: string;
  // Legacy fields still on the DB table
  unit?: string;
  phone?: string;
  insurance_status?: string;
  expiration_date?: string;
  coverage?: ExtractedCoverage[] | null;
  endorsements?: ExtractedEndorsement[] | null;
  certificate_holder_on_coi?: string;
  lease_start?: string;
  lease_end?: string;
  deleted_at?: string | null;
}

// ============================================
// TENANT REQUIREMENTS (per tenant)
// ============================================

export interface TenantRequirements {
  id: string;
  tenant_id: string;
  user_id: string;
  source: RequirementSource;
  general_liability_per_occurrence: number | null;
  general_liability_aggregate: number | null;
  auto_liability: number | null;
  workers_comp_required: boolean;
  employers_liability: number | null;
  umbrella_liability: number | null;
  property_insurance_required: boolean;
  business_interruption_required: boolean;
  business_interruption_minimum: string | null;
  liquor_liability: number | null;
  additional_insured_entities: string[];
  waiver_of_subrogation_required: boolean;
  loss_payee_required: boolean;
  insurer_rating_minimum: string | null;
  cancellation_notice_days: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// CERTIFICATES
// ============================================

export interface Certificate {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  property_id?: string;
  file_path?: string;
  file_name?: string;
  extracted_data: COIExtractedData | null;
  compliance_result: ComplianceResult | null;
  overall_status: string; // 'compliant', 'non_compliant', 'expired'
  earliest_expiration?: string;
  uploaded_by: string; // 'pm' or 'self_service'
  created_at: string;
}

// ============================================
// COI EXTRACTION
// ============================================

export interface COIExtractedData {
  insured_name?: string;
  general_liability_per_occurrence: number | null;
  general_liability_aggregate: number | null;
  auto_liability: number | null;
  workers_comp_found: boolean;
  employers_liability: number | null;
  umbrella_per_occurrence: number | null;
  umbrella_aggregate: number | null;
  property_insurance: number | null;
  policies: COIPolicy[];
  additional_insured_names: string[];
  certificate_holder_name: string | null;
  certificate_holder_address: string | null;
  description_of_operations: string | null;
}

export interface COIPolicy {
  coverage_type: string;
  policy_number?: string;
  carrier?: string;
  effective_date?: string;
  expiration_date?: string;
}

/** Legacy extraction types kept for backward compatibility with existing components */
export interface ExtractedCoverage {
  type: string;
  occurrence_limit?: number;
  aggregate_limit?: number;
  combined_single_limit?: number;
  is_statutory?: boolean;
  expiration_date?: string;
  confidence_score: number;
}

export interface ExtractedEndorsement {
  type: string;
  present: boolean;
  details?: string;
  confidence_score: number;
}

export interface COIExtractionResult {
  success: boolean;
  data?: COIExtractedData;
  error?: string;
  // Legacy fields for backward compat
  carrier?: string;
  policy_number?: string;
  named_insured?: string;
  certificate_holder?: string;
  effective_date?: string;
  expiration_date?: string;
  coverages: ExtractedCoverage[];
  endorsements: ExtractedEndorsement[];
  confidence_score: number;
}

// ============================================
// LEASE EXTRACTION
// ============================================

export interface LeaseExtractedData {
  tenant_name: string | null;
  premises_description: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  general_liability_per_occurrence: number | null;
  general_liability_aggregate: number | null;
  auto_liability: number | null;
  workers_comp_required: boolean;
  employers_liability: number | null;
  umbrella_liability: number | null;
  property_insurance_required: boolean;
  business_interruption_required: boolean;
  business_interruption_minimum: string | null;
  liquor_liability: number | null;
  additional_insured_entities: string[];
  waiver_of_subrogation_required: boolean;
  loss_payee_required: boolean;
  insurer_rating_minimum: string | null;
  cancellation_notice_days: number | null;
}

export interface LeaseExtractionResult {
  success: boolean;
  data?: LeaseExtractedData;
  error?: string;
}

// ============================================
// COMPLIANCE
// ============================================

export interface ComplianceItem {
  field: string;
  display_name: string;
  required: string;
  actual: string | null;
  status: 'pass' | 'fail' | 'not_found' | 'expired' | 'expiring';
  reason: string | null;
}

export interface ComplianceResult {
  overall_status: 'compliant' | 'non_compliant' | 'expired';
  earliest_expiration: string | null;
  items: ComplianceItem[];
}

// ============================================
// COMPLIANCE STATS (for dashboard)
// ============================================

export interface ComplianceStats {
  total: number;
  compliant: number;
  non_compliant: number;
  expiring_soon: number;
  expired: number;
  pending: number;
}

// ============================================
// EMAIL LOG
// ============================================

export interface EmailLogEntry {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  property_id?: string;
  email_type: string;
  recipient_email: string;
  sent_at: string;
  follow_up_count: number;
}

// ============================================
// ACTIVITY
// ============================================

export type ActivityType =
  | 'coi_uploaded'
  | 'requirement_set'
  | 'status_changed'
  | 'entity_created'
  | 'entity_deleted'
  | 'email_sent'
  | 'lease_uploaded';

export interface Activity {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================
// LEGACY COMPAT — types referenced by existing components
// that we keep to avoid breaking imports
// ============================================

/** @deprecated Use VendorRequirements or TenantRequirements instead */
export interface RequirementTemplate {
  id: string;
  user_id: string;
  name: string;
  entity_type: EntityType;
  description?: string;
  property_id?: string;
  property_count?: number;
  coverages: {
    general_liability_required?: boolean;
    general_liability_occurrence?: number;
    general_liability_aggregate?: number;
    general_liability_contractual?: boolean;
    general_liability_umbrella_note?: boolean;
    automobile_liability_required?: boolean;
    automobile_liability_csl?: number;
    automobile_liability_owned_hired_non_owned?: boolean;
    workers_comp_statutory?: boolean;
    workers_comp_accept_exemption?: boolean;
    employers_liability_required?: boolean;
    workers_comp_employers_liability?: number;
    umbrella_required?: boolean;
    umbrella_limit?: number;
    professional_liability_required?: boolean;
    professional_liability_limit?: number;
    property_insurance_limit?: number;
    business_interruption_required?: boolean;
  };
  endorsements: {
    require_additional_insured?: boolean;
    additional_insured_entities?: string;
    blanket_additional_insured_accepted?: boolean;
    require_waiver_of_subrogation?: boolean;
    certificate_holder_name?: string;
    certificate_holder_address?: string;
    cancellation_notice_days?: number;
    property_address_on_coi_required?: boolean;
    dec_pages_required?: boolean;
  };
  custom_coverages?: CustomCoverageRequirement[];
  created_at: string;
  updated_at: string;
}

export interface CustomCoverageRequirement {
  name: string;
  limit: number;
  required: boolean;
  source: RequirementSource;
  confidence_score?: number;
  source_reference?: string;
}

/** @deprecated Use types directly */
export interface RequirementProfile {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  building_id: string;
  general_liability?: CoverageRequirement;
  automobile_liability?: CoverageRequirement;
  workers_compensation?: CoverageRequirement;
  umbrella_excess?: CoverageRequirement;
  professional_liability?: CoverageRequirement;
  property_insurance?: CoverageRequirement;
  business_interruption?: CoverageRequirement;
  custom_coverages?: CustomCoverageRequirement[];
  additional_insured?: EndorsementRequirement;
  loss_payee?: EndorsementRequirement;
  waiver_of_subrogation?: WaiverRequirement;
  certificate_holder?: CertificateHolderRequirement;
  notice_of_cancellation_days?: NumberRequirement;
  special_endorsements?: SpecialEndorsementRequirement[];
  lease_term_start?: string;
  lease_term_end?: string;
  lease_renewal_date?: string;
  creation_method: string;
  created_at: string;
  updated_at: string;
}

export interface CoverageRequirement {
  occurrence_limit?: number;
  aggregate_limit?: number;
  combined_single_limit?: number;
  is_statutory?: boolean;
  required: boolean;
  source: RequirementSource;
  confidence_score?: number;
  source_reference?: string;
}

export interface EndorsementRequirement {
  required: boolean;
  entities?: string[];
  language?: string;
  source: RequirementSource;
  confidence_score?: number;
  source_reference?: string;
}

export interface WaiverRequirement {
  required: boolean;
  coverages?: string[];
  source: RequirementSource;
  confidence_score?: number;
  source_reference?: string;
}

export interface CertificateHolderRequirement {
  name?: string;
  address?: string;
  required: boolean;
  source: RequirementSource;
  confidence_score?: number;
  source_reference?: string;
}

export interface NumberRequirement {
  value: number;
  source: RequirementSource;
  confidence_score?: number;
  source_reference?: string;
}

export interface SpecialEndorsementRequirement {
  description: string;
  required: boolean;
  source: RequirementSource;
  confidence_score?: number;
  source_reference?: string;
}

export interface BuildingDefaults {
  id: string;
  building_id: string;
  entity_type: EntityType;
  general_liability_occurrence?: number;
  general_liability_aggregate?: number;
  automobile_liability_csl?: number;
  workers_comp_statutory?: boolean;
  workers_comp_employers_liability?: number;
  umbrella_limit?: number;
  professional_liability_limit?: number;
  property_insurance_limit?: number;
  business_interruption_required?: boolean;
  custom_coverages?: CustomCoverageRequirement[];
  require_additional_insured?: boolean;
  additional_insured_entities?: string[];
  require_waiver_of_subrogation?: boolean;
  certificate_holder_name?: string;
  certificate_holder_address?: string;
  cancellation_notice_days?: number;
  special_endorsements?: string[];
  created_at: string;
  updated_at: string;
}

/** Legacy compat types */
export type TenantStatus = 'active' | 'pending' | 'moved_out' | 'evicted';
export type ProfileCreationMethod = string;
export type ComplianceField = ComplianceItem;

export interface OrganizationSettings {
  id: string;
  user_id: string;
  company_name?: string;
  company_address?: string;
  additional_insured_name?: string;
  default_gl_occurrence?: number;
  default_gl_aggregate?: number;
  default_auto_liability?: number;
  default_umbrella_limit?: number;
  default_wc_required?: boolean;
  default_ai_required?: boolean;
  default_wos_required?: boolean;
  auto_follow_up_enabled?: boolean;
  follow_up_days?: number[];
  notification_email_enabled?: boolean;
  notification_expiring_days?: number;
  notify_expiring_alerts?: boolean;
  notify_coi_uploaded?: boolean;
  notify_status_changes?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'active' | 'pending';
  invited_at: string;
}

/** @deprecated — legacy extraction field type */
export interface ExtractedField<T> {
  value: T | null;
  confidence: number;
  lease_ref?: string;
}

/** @deprecated — use LeaseExtractionResult */
export interface LegacyLeaseExtractionResult {
  success: boolean;
  error?: string;
  document_type?: string;
  document_type_confidence?: number;
  tenant_name?: string;
  property_address?: string;
  premises_description?: string;
  lease_start?: string;
  lease_end?: string;
  extracted?: Record<string, ExtractedField<unknown>>;
  requirements: Partial<RequirementProfile>;
  extraction_notes?: string;
  references_external_docs?: boolean;
  external_doc_references?: string[];
}

export interface CombinedComplianceStats {
  vendors: ComplianceStats;
  tenants: ComplianceStats;
  combined: ComplianceStats;
}
