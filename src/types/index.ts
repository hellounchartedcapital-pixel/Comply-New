/**
 * Core type definitions for SmartCOI
 * These types document the expected shape of data throughout the application
 */

// ============================================
// VENDOR TYPES
// ============================================

export interface VendorCoverage {
  eachOccurrence?: number;
  aggregate?: number;
  amount: number;
  expirationDate?: string;
  compliant?: boolean;
  expired?: boolean;
  expiringSoon?: boolean;
}

export interface VendorCoverageSet {
  generalLiability?: VendorCoverage;
  autoLiability?: VendorCoverage;
  workersComp?: {
    amount: number | 'Statutory';
    expirationDate?: string;
    compliant?: boolean;
    expired?: boolean;
    expiringSoon?: boolean;
  };
  employersLiability?: VendorCoverage;
}

export interface VendorIssue {
  type: 'critical' | 'error' | 'warning';
  message: string;
}

export interface AdditionalCoverage {
  type: string;
  amount: number;
  expirationDate?: string;
  expired?: boolean;
  expiringSoon?: boolean;
}

export type VendorStatus = 'compliant' | 'non-compliant' | 'expiring' | 'expired' | 'pending';

export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  dba?: string | null;
  status: VendorStatus;
  expiration_date?: string | null;
  days_overdue?: number;
  coverage?: VendorCoverageSet;
  issues?: VendorIssue[] | string[];
  additional_coverages?: AdditionalCoverage[];
  additional_insured?: string | null;
  certificate_holder?: string | null;
  has_additional_insured?: boolean;
  missing_additional_insured?: boolean;
  waiver_of_subrogation?: string | null;
  has_waiver_of_subrogation?: boolean;
  missing_waiver_of_subrogation?: boolean;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_notes?: string | null;
  last_contacted_at?: string | null;
  upload_token?: string | null;
  upload_token_expires_at?: string | null;
  raw_data?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  property_id?: string | null;
  property_ids?: string[];
  created_at: string;
  updated_at: string;
}

// Transformed vendor for UI (camelCase)
export interface VendorUI {
  id: string;
  name: string;
  dba?: string | null;
  status: VendorStatus;
  expirationDate?: string | null;
  daysOverdue?: number;
  coverage?: VendorCoverageSet;
  issues?: VendorIssue[] | string[];
  additionalCoverages?: AdditionalCoverage[];
  additionalInsured?: string | null;
  certificateHolder?: string | null;
  hasAdditionalInsured?: boolean;
  missingAdditionalInsured?: boolean;
  waiverOfSubrogation?: string | null;
  hasWaiverOfSubrogation?: boolean;
  missingWaiverOfSubrogation?: boolean;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactNotes?: string | null;
  lastContactedAt?: string | null;
  uploadToken?: string | null;
  uploadTokenExpiresAt?: string | null;
  rawData?: Record<string, unknown>;
  propertyId?: string | null;
  propertyIds?: string[];
}

// ============================================
// TENANT TYPES
// ============================================

export type TenantStatus = 'active' | 'pending' | 'moved_out' | 'evicted';
export type TenantInsuranceStatus = 'compliant' | 'non-compliant' | 'expiring' | 'expired' | 'pending';

export interface Tenant {
  id: string;
  user_id: string;
  property_id?: string | null;
  unit_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  lease_start?: string | null;
  lease_end?: string | null;
  status: TenantStatus;
  insurance_status: TenantInsuranceStatus;
  policy_expiration_date?: string | null;
  policy_liability_amount?: number | null;
  policy_coverage?: Record<string, unknown>;
  policy_additional_insured?: string | null;
  has_additional_insured?: boolean;
  policy_document_path?: string | null;
  compliance_issues?: string[] | null;
  raw_policy_data?: Record<string, unknown>;
  policy_uploaded_at?: string | null;
  // Requirements
  required_liability_min?: number;
  required_property_damage_min?: number;
  required_auto_liability_min?: number;
  required_workers_comp?: boolean;
  workers_comp_exempt?: boolean;
  required_employers_liability_min?: number;
  requires_additional_insured?: boolean;
  additional_insured_text?: string | null;
  certificate_holder_name?: string | null;
  certificate_holder_address?: string | null;
  cancellation_notice_days?: number;
  requires_declarations_page?: boolean;
  requires_endorsement_pages?: boolean;
  // Upload portal
  upload_token?: string | null;
  upload_token_expires_at?: string | null;
  last_contacted_at?: string | null;
  // New requirement profile fields
  requirement_profile_id?: string | null;
  has_requirement_profile?: boolean;
  lease_renewal_date?: string | null;
  coi_document_path?: string | null;
  coi_uploaded_at?: string | null;
  coi_raw_data?: Record<string, unknown> | null;
  coi_coverage?: Record<string, unknown> | null;
  coi_additional_coverages?: AdditionalCoverage[] | null;
  coi_expiration_date?: string | null;
  coi_additional_insured?: string | null;
  coi_has_additional_insured?: boolean;
  coi_waiver_of_subrogation?: string | null;
  coi_has_waiver_of_subrogation?: boolean;
  coi_certificate_holder?: string | null;
  coi_insurance_company?: string | null;
  compliance_details?: TenantComplianceResult | null;
  created_at: string;
  updated_at: string;
  // Relations
  unit?: { id: string; unit_number: string; property_id?: string } | null;
  property?: { id: string; name: string; address?: string } | null;
  requirement_profile?: TenantRequirementProfile | null;
}

// ============================================
// PROPERTY TYPES
// ============================================

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address?: string | null;
  general_liability?: number;
  gl_aggregate?: number;
  auto_liability?: number;
  auto_liability_required?: boolean;
  workers_comp_required?: boolean;
  employers_liability?: number;
  company_name?: string | null;
  require_additional_insured?: boolean;
  require_waiver_of_subrogation?: boolean;
  custom_coverages?: Array<{
    type: string;
    amount: number;
    required: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

// ============================================
// SETTINGS TYPES
// ============================================

export interface UserSettings {
  id: string;
  user_id: string;
  company_name?: string | null;
  // Legacy vendor requirements (use property-level instead)
  general_liability?: number;
  auto_liability?: number;
  workers_comp?: string | number;
  employers_liability?: number;
  require_additional_insured?: boolean;
  require_waiver_of_subrogation?: boolean;
  custom_coverages?: Array<{
    type: string;
    amount: number;
    required: boolean;
  }>;
  // Auto follow-up settings
  auto_follow_up_enabled?: boolean;
  follow_up_days?: number[];
  follow_up_on_expired?: boolean;
  follow_up_on_non_compliant?: boolean;
  follow_up_frequency_days?: number;
  // Tenant defaults
  tenant_default_liability_min?: number;
  tenant_default_auto_liability_min?: number;
  tenant_default_workers_comp?: boolean;
  tenant_default_employers_liability_min?: number;
  tenant_default_requires_additional_insured?: boolean;
  tenant_default_additional_insured_text?: string | null;
  tenant_default_certificate_holder_name?: string | null;
  tenant_default_certificate_holder_address?: string | null;
  tenant_default_cancellation_notice_days?: number;
  tenant_default_requires_declarations_page?: boolean;
  tenant_default_requires_endorsement_pages?: boolean;
  // Onboarding
  onboarding_completed?: boolean;
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export type PlanType = 'free' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  vendor_limit: number;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// ACTIVITY TYPES
// ============================================

export type ActivityType =
  | 'coi_uploaded'
  | 'email_sent'
  | 'status_changed'
  | 'contact_updated'
  | 'vendor_created'
  | 'vendor_deleted';

export interface VendorActivity {
  id: string;
  vendor_id: string;
  user_id: string;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TenantActivity {
  id: string;
  tenant_id: string;
  user_id: string;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================
// API TYPES
// ============================================

export interface ExtractionRequirements {
  general_liability?: number;
  auto_liability?: number;
  workers_comp?: string | number | boolean;
  employers_liability?: number;
  company_name?: string;
  require_additional_insured?: boolean;
  require_waiver_of_subrogation?: boolean;
  custom_coverages?: Array<{
    type: string;
    amount: number;
    required: boolean;
  }>;
  is_tenant_policy?: boolean;
}

export interface ExtractionResult {
  success: boolean;
  data?: {
    name?: string;
    companyName?: string;
    dba?: string | null;
    expirationDate?: string;
    coverage?: VendorCoverageSet;
    additionalCoverages?: AdditionalCoverage[];
    additionalInsured?: string;
    certificateHolder?: string;
    waiverOfSubrogation?: string;
    hasAdditionalInsured?: boolean;
    hasWaiverOfSubrogation?: boolean;
    issues?: VendorIssue[];
    rawData?: Record<string, unknown>;
  };
  error?: string;
}

// ============================================
// TENANT REQUIREMENT PROFILE TYPES
// ============================================

export type RequirementSource = 'building_default' | 'lease_extracted' | 'manual';
export type ProfileCreationMethod = 'building_default' | 'lease_extracted' | 'manual';

/** A single requirement field with source tracking and AI confidence */
export interface TrackedField<T> {
  value: T;
  source: RequirementSource;
  confidence?: number; // 0-100, only for lease_extracted
  leaseRef?: string; // e.g. "Section 12.3" or "Exhibit B, Page 2"
}

/** Building-level tenant insurance defaults */
export interface BuildingTenantDefaults {
  id: string;
  user_id: string;
  property_id: string;
  gl_occurrence_limit?: number | null;
  gl_aggregate_limit?: number | null;
  property_contents_limit?: number | null;
  umbrella_limit?: number | null;
  workers_comp_statutory?: boolean;
  workers_comp_employers_liability_limit?: number | null;
  commercial_auto_csl?: number | null;
  professional_liability_limit?: number | null;
  business_interruption_required?: boolean;
  business_interruption_duration?: string | null;
  custom_coverages?: CustomCoverageRequirement[];
  additional_insured_entities?: string[];
  additional_insured_language?: string | null;
  loss_payee_entities?: string[];
  waiver_of_subrogation_required?: boolean;
  waiver_of_subrogation_coverages?: string[];
  certificate_holder_name?: string | null;
  certificate_holder_address?: string | null;
  cancellation_notice_days?: number;
  special_endorsements?: string[];
  created_at: string;
  updated_at: string;
}

export interface CustomCoverageRequirement {
  name: string;
  limit: number;
  source?: RequirementSource;
  confidence?: number;
  leaseRef?: string;
}

/** Full tenant requirement profile */
export interface TenantRequirementProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  property_id?: string | null;

  // General Liability
  gl_occurrence_limit?: number | null;
  gl_occurrence_limit_source?: RequirementSource;
  gl_occurrence_limit_confidence?: number | null;
  gl_occurrence_limit_lease_ref?: string | null;
  gl_aggregate_limit?: number | null;
  gl_aggregate_limit_source?: RequirementSource;
  gl_aggregate_limit_confidence?: number | null;
  gl_aggregate_limit_lease_ref?: string | null;

  // Property / Contents
  property_contents_limit?: number | null;
  property_contents_limit_source?: RequirementSource;
  property_contents_limit_confidence?: number | null;
  property_contents_limit_lease_ref?: string | null;

  // Umbrella / Excess
  umbrella_limit?: number | null;
  umbrella_limit_source?: RequirementSource;
  umbrella_limit_confidence?: number | null;
  umbrella_limit_lease_ref?: string | null;

  // Workers Comp
  workers_comp_statutory?: boolean;
  workers_comp_statutory_source?: RequirementSource;
  workers_comp_statutory_confidence?: number | null;
  workers_comp_statutory_lease_ref?: string | null;
  workers_comp_employers_liability_limit?: number | null;
  workers_comp_employers_liability_limit_source?: RequirementSource;
  workers_comp_employers_liability_limit_confidence?: number | null;
  workers_comp_employers_liability_limit_lease_ref?: string | null;

  // Commercial Auto
  commercial_auto_csl?: number | null;
  commercial_auto_csl_source?: RequirementSource;
  commercial_auto_csl_confidence?: number | null;
  commercial_auto_csl_lease_ref?: string | null;

  // Professional Liability / E&O
  professional_liability_limit?: number | null;
  professional_liability_limit_source?: RequirementSource;
  professional_liability_limit_confidence?: number | null;
  professional_liability_limit_lease_ref?: string | null;

  // Business Interruption
  business_interruption_required?: boolean;
  business_interruption_required_source?: RequirementSource;
  business_interruption_required_confidence?: number | null;
  business_interruption_required_lease_ref?: string | null;
  business_interruption_duration?: string | null;

  // Custom coverages
  custom_coverages?: CustomCoverageRequirement[];

  // Additional Insured
  additional_insured_entities?: string[];
  additional_insured_language?: string | null;
  additional_insured_source?: RequirementSource;
  additional_insured_confidence?: number | null;
  additional_insured_lease_ref?: string | null;

  // Loss Payee
  loss_payee_entities?: string[];
  loss_payee_source?: RequirementSource;
  loss_payee_confidence?: number | null;
  loss_payee_lease_ref?: string | null;

  // Waiver of Subrogation
  waiver_of_subrogation_required?: boolean;
  waiver_of_subrogation_coverages?: string[];
  waiver_of_subrogation_source?: RequirementSource;
  waiver_of_subrogation_confidence?: number | null;
  waiver_of_subrogation_lease_ref?: string | null;

  // Certificate Holder
  certificate_holder_name?: string | null;
  certificate_holder_address?: string | null;
  certificate_holder_source?: RequirementSource;
  certificate_holder_confidence?: number | null;
  certificate_holder_lease_ref?: string | null;

  // Notice of Cancellation
  cancellation_notice_days?: number;
  cancellation_notice_days_source?: RequirementSource;
  cancellation_notice_days_confidence?: number | null;
  cancellation_notice_days_lease_ref?: string | null;

  // Special endorsements
  special_endorsements?: string[];

  // Lease details
  lease_start_date?: string | null;
  lease_end_date?: string | null;
  lease_renewal_date?: string | null;
  lease_document_path?: string | null;
  lease_document_uploaded_at?: string | null;

  // Creation metadata
  creation_method: ProfileCreationMethod;
  raw_extraction_data?: Record<string, unknown> | null;

  created_at: string;
  updated_at: string;
}

/** AI lease extraction result */
export interface LeaseExtractionResult {
  success: boolean;
  data?: LeaseExtractionData;
  error?: string;
}

export interface LeaseExtractionField {
  value: unknown;
  confidence: number;
  leaseRef?: string;
}

export interface LeaseExtractionData {
  documentType: string; // 'lease' | 'insurance_exhibit' | 'unknown'
  documentTypeConfidence: number;

  tenantName?: LeaseExtractionField;
  propertyAddress?: LeaseExtractionField;
  suiteUnit?: LeaseExtractionField;
  leaseStartDate?: LeaseExtractionField;
  leaseEndDate?: LeaseExtractionField;
  leaseRenewalDate?: LeaseExtractionField;

  requirements: {
    glOccurrenceLimit?: LeaseExtractionField;
    glAggregateLimit?: LeaseExtractionField;
    propertyContentsLimit?: LeaseExtractionField;
    umbrellaLimit?: LeaseExtractionField;
    workersCompStatutory?: LeaseExtractionField;
    workersCompEmployersLiabilityLimit?: LeaseExtractionField;
    commercialAutoCsl?: LeaseExtractionField;
    professionalLiabilityLimit?: LeaseExtractionField;
    businessInterruptionRequired?: LeaseExtractionField;
    businessInterruptionDuration?: LeaseExtractionField;
    additionalInsuredEntities?: LeaseExtractionField;
    additionalInsuredLanguage?: LeaseExtractionField;
    lossPayeeEntities?: LeaseExtractionField;
    waiverOfSubrogationRequired?: LeaseExtractionField;
    waiverOfSubrogationCoverages?: LeaseExtractionField;
    certificateHolderName?: LeaseExtractionField;
    certificateHolderAddress?: LeaseExtractionField;
    cancellationNoticeDays?: LeaseExtractionField;
    specialEndorsements?: LeaseExtractionField;
    customCoverages?: Array<{
      name: string;
      limit: number;
      confidence: number;
      leaseRef?: string;
    }>;
  };

  extractionNotes?: string;
  referencesExternalDocuments?: boolean;
  externalDocumentReferences?: string[];
}

/** Tenant COI compliance field status */
export type ComplianceFieldStatus = 'compliant' | 'non_compliant' | 'expiring_soon' | 'expired' | 'not_required';

export interface TenantComplianceField {
  fieldName: string;
  required: number | boolean | string | null;
  actual: number | boolean | string | null;
  status: ComplianceFieldStatus;
  source?: RequirementSource;
  expirationDate?: string | null;
}

export interface TenantComplianceResult {
  overallStatus: TenantInsuranceStatus;
  fields: TenantComplianceField[];
  issues: VendorIssue[];
}

// ============================================
// COMPLIANCE STATS
// ============================================

export interface ComplianceStats {
  total: number;
  compliant: number;
  nonCompliant: number;
  expiring: number;
  expired: number;
  pending?: number;
}

export interface CombinedComplianceStats extends ComplianceStats {
  vendors: ComplianceStats;
  tenants: ComplianceStats & { pending: number };
}
