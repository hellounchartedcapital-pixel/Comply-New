// Tenant type default insurance requirement templates
// These are pre-built starting points — PMs review and adjust before saving.

export interface TenantTemplate {
  key: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  // Core Liability
  general_liability_per_occurrence: number | null;
  general_liability_aggregate: number | null;
  general_liability_must_be_occurrence_basis: boolean;
  // Auto
  auto_liability: number | null;
  auto_liability_includes_hired_non_owned: boolean;
  // Workers Comp
  workers_comp_required: boolean;
  employers_liability: number | null;
  // Umbrella
  umbrella_liability: number | null;
  // Property / Tenant Improvements
  property_insurance_required: boolean;
  property_insurance_type: 'replacement_cost' | 'specific_amount' | null;
  property_insurance_amount: number | null;
  property_coverage_includes_tenant_improvements: boolean;
  // Business Interruption
  business_interruption_required: boolean;
  business_interruption_minimum: string | null;
  // Specialty
  professional_liability: number | null;
  liquor_liability: number | null;
  pollution_liability: number | null;
  cyber_liability: number | null;
  product_liability: number | null;
  // Endorsements
  additional_insured_required: boolean;
  waiver_of_subrogation_required: boolean;
  loss_payee_required: boolean;
  // Insurer
  insurer_rating_minimum: string | null;
  // Admin
  cancellation_notice_days: number | null;
  renewal_proof_days_before_expiry: number | null;
}

export const TENANT_TEMPLATES: TenantTemplate[] = [
  {
    key: 'office',
    name: 'Office',
    description: 'Standard office, professional services, coworking',
    icon: 'Building2',
    general_liability_per_occurrence: 1000000,
    general_liability_aggregate: 2000000,
    general_liability_must_be_occurrence_basis: true,
    auto_liability: null,
    auto_liability_includes_hired_non_owned: false,
    workers_comp_required: true,
    employers_liability: 500000,
    umbrella_liability: null,
    property_insurance_required: true,
    property_insurance_type: 'replacement_cost',
    property_insurance_amount: null,
    property_coverage_includes_tenant_improvements: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    professional_liability: null,
    liquor_liability: null,
    pollution_liability: null,
    cyber_liability: null,
    product_liability: null,
    additional_insured_required: true,
    waiver_of_subrogation_required: true,
    loss_payee_required: false,
    insurer_rating_minimum: 'A.M. Best A VII',
    cancellation_notice_days: 30,
    renewal_proof_days_before_expiry: null,
  },
  {
    key: 'retail',
    name: 'Retail',
    description: 'Retail stores, shops, showrooms, salons',
    icon: 'Store',
    general_liability_per_occurrence: 1000000,
    general_liability_aggregate: 2000000,
    general_liability_must_be_occurrence_basis: true,
    auto_liability: 1000000,
    auto_liability_includes_hired_non_owned: true,
    workers_comp_required: true,
    employers_liability: 500000,
    umbrella_liability: 2000000,
    property_insurance_required: true,
    property_insurance_type: 'replacement_cost',
    property_insurance_amount: null,
    property_coverage_includes_tenant_improvements: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    professional_liability: null,
    liquor_liability: null,
    pollution_liability: null,
    cyber_liability: null,
    product_liability: 1000000,
    additional_insured_required: true,
    waiver_of_subrogation_required: true,
    loss_payee_required: true,
    insurer_rating_minimum: 'A.M. Best A VII',
    cancellation_notice_days: 30,
    renewal_proof_days_before_expiry: null,
  },
  {
    key: 'restaurant',
    name: 'Restaurant',
    description: 'Restaurants, bars, cafes, food halls, breweries',
    icon: 'UtensilsCrossed',
    general_liability_per_occurrence: 1000000,
    general_liability_aggregate: 2000000,
    general_liability_must_be_occurrence_basis: true,
    auto_liability: 1000000,
    auto_liability_includes_hired_non_owned: true,
    workers_comp_required: true,
    employers_liability: 1000000,
    umbrella_liability: 2000000,
    property_insurance_required: true,
    property_insurance_type: 'replacement_cost',
    property_insurance_amount: null,
    property_coverage_includes_tenant_improvements: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    professional_liability: null,
    liquor_liability: 1000000,
    pollution_liability: null,
    cyber_liability: null,
    product_liability: 1000000,
    additional_insured_required: true,
    waiver_of_subrogation_required: true,
    loss_payee_required: true,
    insurer_rating_minimum: 'A.M. Best A VIII',
    cancellation_notice_days: 30,
    renewal_proof_days_before_expiry: null,
  },
  {
    key: 'industrial',
    name: 'Industrial',
    description: 'Warehouses, distribution centers, light manufacturing, flex space',
    icon: 'Factory',
    general_liability_per_occurrence: 2000000,
    general_liability_aggregate: 4000000,
    general_liability_must_be_occurrence_basis: true,
    auto_liability: 1000000,
    auto_liability_includes_hired_non_owned: true,
    workers_comp_required: true,
    employers_liability: 1000000,
    umbrella_liability: 5000000,
    property_insurance_required: true,
    property_insurance_type: 'replacement_cost',
    property_insurance_amount: null,
    property_coverage_includes_tenant_improvements: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    professional_liability: null,
    liquor_liability: null,
    pollution_liability: 1000000,
    cyber_liability: null,
    product_liability: 2000000,
    additional_insured_required: true,
    waiver_of_subrogation_required: true,
    loss_payee_required: true,
    insurer_rating_minimum: 'A.M. Best A VIII',
    cancellation_notice_days: 30,
    renewal_proof_days_before_expiry: null,
  },
  {
    key: 'medical',
    name: 'Medical',
    description: 'Medical offices, dental, urgent care, clinics, labs',
    icon: 'Stethoscope',
    general_liability_per_occurrence: 1000000,
    general_liability_aggregate: 3000000,
    general_liability_must_be_occurrence_basis: true,
    auto_liability: 1000000,
    auto_liability_includes_hired_non_owned: true,
    workers_comp_required: true,
    employers_liability: 1000000,
    umbrella_liability: 2000000,
    property_insurance_required: true,
    property_insurance_type: 'replacement_cost',
    property_insurance_amount: null,
    property_coverage_includes_tenant_improvements: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    professional_liability: 1000000,
    liquor_liability: null,
    pollution_liability: null,
    cyber_liability: 1000000,
    product_liability: null,
    additional_insured_required: true,
    waiver_of_subrogation_required: true,
    loss_payee_required: true,
    insurer_rating_minimum: 'A.M. Best A VIII',
    cancellation_notice_days: 30,
    renewal_proof_days_before_expiry: null,
  },
  {
    key: 'fitness',
    name: 'Fitness',
    description: 'Gyms, yoga studios, climbing gyms, recreation centers',
    icon: 'Dumbbell',
    general_liability_per_occurrence: 1000000,
    general_liability_aggregate: 3000000,
    general_liability_must_be_occurrence_basis: true,
    auto_liability: null,
    auto_liability_includes_hired_non_owned: false,
    workers_comp_required: true,
    employers_liability: 500000,
    umbrella_liability: 2000000,
    property_insurance_required: true,
    property_insurance_type: 'replacement_cost',
    property_insurance_amount: null,
    property_coverage_includes_tenant_improvements: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    professional_liability: 1000000,
    liquor_liability: null,
    pollution_liability: null,
    cyber_liability: null,
    product_liability: null,
    additional_insured_required: true,
    waiver_of_subrogation_required: true,
    loss_payee_required: false,
    insurer_rating_minimum: 'A.M. Best A VII',
    cancellation_notice_days: 30,
    renewal_proof_days_before_expiry: null,
  },
];

/** Coverage limit dropdown options (in dollars) */
export const COVERAGE_AMOUNT_OPTIONS = [
  500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000,
];

/** Format a template's key coverages as a summary string */
export function templateCoverageSummary(t: TenantTemplate): string {
  const parts: string[] = [];
  if (t.general_liability_per_occurrence) {
    parts.push(`GL: $${(t.general_liability_per_occurrence / 1000000).toFixed(0)}M/$${(t.general_liability_aggregate! / 1000000).toFixed(0)}M`);
  }
  if (t.workers_comp_required) parts.push('WC: Statutory');
  if (t.umbrella_liability) parts.push(`Umbrella: $${(t.umbrella_liability / 1000000).toFixed(0)}M`);
  if (t.auto_liability) parts.push(`Auto: $${(t.auto_liability / 1000000).toFixed(0)}M`);
  if (t.professional_liability) parts.push(`Prof: $${(t.professional_liability / 1000000).toFixed(0)}M`);
  if (t.liquor_liability) parts.push(`Liquor: $${(t.liquor_liability / 1000000).toFixed(0)}M`);
  if (t.pollution_liability) parts.push(`Pollution: $${(t.pollution_liability / 1000000).toFixed(0)}M`);
  if (t.cyber_liability) parts.push(`Cyber: $${(t.cyber_liability / 1000000).toFixed(0)}M`);
  if (t.product_liability) parts.push(`Product: $${(t.product_liability / 1000000).toFixed(0)}M`);
  return parts.join(' \u00B7 ');
}
