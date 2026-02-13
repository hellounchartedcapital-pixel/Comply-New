// ============================================
// Tenant Type Insurance Requirement Templates
// ============================================

export interface TenantTemplate {
  id: string;
  name: string;
  description: string;
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
  waiver_of_subrogation_required: boolean;
  insurer_rating_minimum: string | null;
}

export const TENANT_TEMPLATES: TenantTemplate[] = [
  {
    id: 'office',
    name: 'Office',
    description: 'Standard office, professional services, coworking',
    general_liability_per_occurrence: 1000000,
    general_liability_aggregate: 2000000,
    auto_liability: null,
    workers_comp_required: true,
    employers_liability: 500000,
    umbrella_liability: null,
    property_insurance_required: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    liquor_liability: null,
    waiver_of_subrogation_required: true,
    insurer_rating_minimum: 'A.M. Best A VII',
  },
  {
    id: 'retail',
    name: 'Retail',
    description: 'Retail stores, shops, showrooms, salons',
    general_liability_per_occurrence: 1000000,
    general_liability_aggregate: 2000000,
    auto_liability: 1000000,
    workers_comp_required: true,
    employers_liability: 500000,
    umbrella_liability: 2000000,
    property_insurance_required: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    liquor_liability: null,
    waiver_of_subrogation_required: true,
    insurer_rating_minimum: 'A.M. Best A VII',
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Restaurants, bars, cafes, breweries',
    general_liability_per_occurrence: 1000000,
    general_liability_aggregate: 2000000,
    auto_liability: 1000000,
    workers_comp_required: true,
    employers_liability: 1000000,
    umbrella_liability: 2000000,
    property_insurance_required: true,
    business_interruption_required: true,
    business_interruption_minimum: 'annual_rent',
    liquor_liability: 1000000,
    waiver_of_subrogation_required: true,
    insurer_rating_minimum: 'A.M. Best A VIII',
  },
];

/** Coverage limit dropdown options (in dollars) */
export const COVERAGE_AMOUNT_OPTIONS = [
  500000, 1000000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000,
];

/** Cancellation notice days dropdown options */
export const CANCELLATION_NOTICE_OPTIONS = [10, 15, 30, 60, 90];

/** Format a template's key coverages as a summary string */
export function templateCoverageSummary(t: TenantTemplate): string {
  const parts: string[] = [];
  if (t.general_liability_per_occurrence) {
    parts.push(
      `GL: $${(t.general_liability_per_occurrence / 1000000).toFixed(0)}M/$${(t.general_liability_aggregate! / 1000000).toFixed(0)}M`
    );
  }
  if (t.workers_comp_required) parts.push('WC: Statutory');
  if (t.umbrella_liability)
    parts.push(`Umbrella: $${(t.umbrella_liability / 1000000).toFixed(0)}M`);
  if (t.auto_liability)
    parts.push(`Auto: $${(t.auto_liability / 1000000).toFixed(0)}M`);
  if (t.liquor_liability)
    parts.push(`Liquor: $${(t.liquor_liability / 1000000).toFixed(0)}M`);
  return parts.join(' · ');
}
