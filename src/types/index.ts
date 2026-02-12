// ============================================
// ENTITY TYPES
// ============================================

export type EntityType = 'vendor' | 'tenant';

export type ComplianceStatus = 'compliant' | 'non-compliant' | 'expiring' | 'expired';
export type TenantStatus = 'active' | 'pending' | 'moved_out' | 'evicted';
export type RequirementSource = 'building_default' | 'lease_extracted' | 'coi_prefill' | 'manual';
export type ProfileCreationMethod = 'building_default' | 'lease_extracted' | 'coi_prefill' | 'manual';

// ============================================
// COVERAGE & REQUIREMENT TYPES
// ============================================

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

export interface CustomCoverageRequirement {
  name: string;
  limit: number;
  required: boolean;
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

// ============================================
// REQUIREMENT PROFILE (shared by vendor & tenant)
// ============================================

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

  creation_method: ProfileCreationMethod;
  created_at: string;
  updated_at: string;
}

// ============================================
// BUILDING DEFAULTS
// ============================================

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

// ============================================
// PROPERTY
// ============================================

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  ownership_entity?: string;
  vendor_count?: number;
  tenant_count?: number;
  compliance_percentage?: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// VENDOR
// ============================================

export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  dba?: string;
  status: ComplianceStatus;
  property_id?: string;
  property?: Property;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  coverage_types?: string[];
  expiration_date?: string;
  requirement_profile_id?: string;
  requirement_profile?: RequirementProfile;
  upload_token?: string;
  upload_token_expires_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// TENANT
// ============================================

export interface Tenant {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  status: TenantStatus;
  insurance_status: ComplianceStatus;
  property_id?: string;
  property?: Property;
  unit?: string;
  lease_start?: string;
  lease_end?: string;
  lease_renewal_date?: string;
  lease_document_path?: string;
  requirement_profile_id?: string;
  requirement_profile?: RequirementProfile;
  upload_token?: string;
  upload_token_expires_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// COI EXTRACTION
// ============================================

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
  carrier?: string;
  policy_number?: string;
  named_insured?: string;
  effective_date?: string;
  expiration_date?: string;
  coverages: ExtractedCoverage[];
  endorsements: ExtractedEndorsement[];
  confidence_score: number;
  error?: string;
}

export interface LeaseExtractionResult {
  success: boolean;
  document_type?: string;
  document_type_confidence?: number;
  tenant_name?: string;
  property_address?: string;
  suite_unit?: string;
  lease_start?: string;
  lease_end?: string;
  requirements: Partial<RequirementProfile>;
  extraction_notes?: string;
  references_external_docs?: boolean;
  external_doc_references?: string[];
  error?: string;
}

// ============================================
// COMPLIANCE
// ============================================

export interface ComplianceField {
  field_name: string;
  required_value: number | boolean | string | null;
  actual_value: number | boolean | string | null;
  status: ComplianceStatus | 'not-required';
  source?: RequirementSource;
  expiration_date?: string;
}

export interface ComplianceResult {
  overall_status: ComplianceStatus;
  compliance_percentage: number;
  fields: ComplianceField[];
  expiring_within_30_days: number;
  expired_count: number;
}

export interface ComplianceStats {
  total: number;
  compliant: number;
  non_compliant: number;
  expiring: number;
  expired: number;
}

export interface CombinedComplianceStats {
  vendors: ComplianceStats;
  tenants: ComplianceStats;
  combined: ComplianceStats;
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
// REQUIREMENT TEMPLATE
// ============================================

export interface RequirementTemplate {
  id: string;
  user_id: string;
  name: string;
  entity_type: EntityType;
  description?: string;
  property_id?: string;
  property_count?: number;
  coverages: {
    // General Liability
    general_liability_required?: boolean;
    general_liability_occurrence?: number;
    general_liability_aggregate?: number;
    general_liability_contractual?: boolean;
    general_liability_umbrella_note?: boolean;
    // Business Auto Liability
    automobile_liability_required?: boolean;
    automobile_liability_csl?: number;
    automobile_liability_owned_hired_non_owned?: boolean;
    // Workers' Compensation
    workers_comp_statutory?: boolean;
    workers_comp_accept_exemption?: boolean;
    // Employers' Liability
    employers_liability_required?: boolean;
    workers_comp_employers_liability?: number;
    // Umbrella / Excess
    umbrella_required?: boolean;
    umbrella_limit?: number;
    // Professional Liability / E&O
    professional_liability_required?: boolean;
    professional_liability_limit?: number;
    // Tenant-specific
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

// ============================================
// SETTINGS
// ============================================

export interface OrganizationSettings {
  id: string;
  user_id: string;
  company_name?: string;
  company_address?: string;
  additional_insured_name?: string;
  // Default requirement limits
  default_gl_occurrence?: number;
  default_gl_aggregate?: number;
  default_auto_liability?: number;
  default_umbrella_limit?: number;
  default_wc_required?: boolean;
  default_ai_required?: boolean;
  default_wos_required?: boolean;
  // Notification settings
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
