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
  created_at: string;
  updated_at: string;
  // Relations
  unit?: { id: string; unit_number: string; property_id?: string } | null;
  property?: { id: string; name: string; address?: string } | null;
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
