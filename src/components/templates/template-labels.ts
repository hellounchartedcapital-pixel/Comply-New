import type { CoverageType, LimitType, RiskLevel } from '@/types';

export const COVERAGE_LABELS: Record<CoverageType, string> = {
  general_liability: 'General Liability',
  automobile_liability: 'Automobile Liability',
  workers_compensation: "Workers' Compensation",
  employers_liability: "Employers' Liability",
  umbrella_excess_liability: 'Umbrella / Excess Liability',
  professional_liability_eo: 'Professional Liability (E&O)',
  property_inland_marine: 'Property / Inland Marine',
  pollution_liability: 'Pollution Liability',
  liquor_liability: 'Liquor Liability',
  cyber_liability: 'Cyber Liability',
};

export const COVERAGE_SHORT_LABELS: Record<CoverageType, string> = {
  general_liability: 'GL',
  automobile_liability: 'Auto',
  workers_compensation: 'WC',
  employers_liability: 'EL',
  umbrella_excess_liability: 'Umbrella',
  professional_liability_eo: 'E&O',
  property_inland_marine: 'Property',
  pollution_liability: 'Pollution',
  liquor_liability: 'Liquor',
  cyber_liability: 'Cyber',
};

export const LIMIT_TYPE_LABELS: Record<LimitType, string> = {
  per_occurrence: 'Per Occurrence',
  aggregate: 'Aggregate',
  combined_single_limit: 'Combined Single Limit',
  statutory: 'Statutory',
  per_person: 'Per Person',
  per_accident: 'Per Accident',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  standard: 'Standard',
  high_risk: 'High Risk',
  professional_services: 'Professional Services',
  restaurant: 'Restaurant',
  industrial: 'Industrial',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  standard: 'bg-emerald-100 text-emerald-800',
  high_risk: 'bg-red-100 text-red-800',
  professional_services: 'bg-blue-100 text-blue-800',
  restaurant: 'bg-amber-100 text-amber-800',
  industrial: 'bg-orange-100 text-orange-800',
};

export const ALL_COVERAGE_TYPES: CoverageType[] = [
  'general_liability',
  'automobile_liability',
  'workers_compensation',
  'employers_liability',
  'umbrella_excess_liability',
  'professional_liability_eo',
  'property_inland_marine',
  'pollution_liability',
  'liquor_liability',
  'cyber_liability',
];

export const ALL_LIMIT_TYPES: LimitType[] = [
  'per_occurrence',
  'aggregate',
  'combined_single_limit',
  'statutory',
  'per_person',
  'per_accident',
];

export const ALL_RISK_LEVELS: RiskLevel[] = [
  'standard',
  'high_risk',
  'professional_services',
  'restaurant',
  'industrial',
];

export function formatLimit(amount: number | null, limitType: LimitType | null): string {
  if (limitType === 'statutory') return 'Statutory';
  if (amount == null) return '—';
  if (amount >= 1_000_000) return `$${amount / 1_000_000}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}
