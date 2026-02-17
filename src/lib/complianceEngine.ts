// ============================================================================
// SmartCOI — Compliance Engine
// Core compliance checking logic. Compares extracted coverage data against
// template requirements and property entity requirements.
//
// NOTE: This engine uses its own input/output types (ComplianceCheckInput,
// ComplianceCheckOutput) which are distinct from the database row types
// in src/types/index.ts. Application code maps between the two.
// ============================================================================

import { formatCurrency } from './utils';

// ============================================================================
// ENGINE TYPES (distinct from DB row types in @/types)
// ============================================================================

export interface ComplianceCheckInput {
  coi: {
    general_liability_per_occurrence: number | null;
    general_liability_aggregate: number | null;
    auto_liability: number | null;
    workers_comp_found: boolean;
    employers_liability: number | null;
    umbrella_per_occurrence: number | null;
    umbrella_aggregate: number | null;
    property_insurance: number | null;
    additional_insured_names: string[];
    certificate_holder_name: string | null;
    policies: { coverage_type: string; expiration_date: string }[];
  };

  requirements: {
    general_liability_per_occurrence: number | null;
    general_liability_aggregate: number | null;
    auto_liability: number | null;
    workers_comp_required: boolean;
    employers_liability: number | null;
    umbrella_liability: number | null;
    property_insurance_required?: boolean;
    waiver_of_subrogation_required?: boolean;
    cancellation_notice_days?: number | null;
    liquor_liability?: number | null;
    business_interruption_required?: boolean;
    additional_insured_entities?: string[];
  };

  property: {
    additional_insured_entities: string[];
    certificate_holder_name: string | null;
    certificate_holder_address?: string | null;
  };
}

export interface ComplianceCheckItem {
  field: string;
  display_name: string;
  required: string;
  actual: string | null;
  status: 'pass' | 'fail' | 'not_found' | 'expired' | 'expiring';
  reason: string | null;
}

export interface ComplianceCheckOutput {
  overall_status: 'compliant' | 'non_compliant' | 'expired';
  earliest_expiration: string | null;
  items: ComplianceCheckItem[];
}

// ============================================================================
// FUZZY MATCHING UTILITIES
// ============================================================================

function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,;:'"!?()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bl\.?l\.?c\.?\b/g, 'llc')
    .replace(/\blimited liability company\b/g, 'llc')
    .replace(/\binc\.?\b/g, 'inc')
    .replace(/\bincorporated\b/g, 'inc')
    .replace(/\bcorp\.?\b/g, 'corp')
    .replace(/\bcorporation\b/g, 'corp')
    .trim();
}

function entityNameMatches(required: string, actual: string): boolean {
  const r = normalizeEntityName(required);
  const a = normalizeEntityName(actual);
  if (r === a) return true;
  if (a.includes(r) || r.includes(a)) return true;
  return false;
}

function fuzzyMatchInList(name: string, list: string[]): boolean {
  return list.some((item) => entityNameMatches(name, item));
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function fmtLimit(val: number | null | undefined): string {
  if (val == null) return 'Not found';
  return formatCurrency(val);
}

// ============================================================================
// MAIN COMPLIANCE CHECK
// ============================================================================

export function checkCompliance(input: ComplianceCheckInput): ComplianceCheckOutput {
  const { coi, requirements, property } = input;
  const items: ComplianceCheckItem[] = [];
  let earliestExp: string | null = null;

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  function checkExpiration(expDate: string | undefined): 'pass' | 'expired' | 'expiring' {
    if (!expDate) return 'pass';
    const d = new Date(expDate);
    if (d < now) return 'expired';
    if (d < thirtyDays) return 'expiring';
    return 'pass';
  }

  function updateEarliestExpiration(expDate: string | undefined) {
    if (!expDate) return;
    if (!earliestExp || new Date(expDate) < new Date(earliestExp)) {
      earliestExp = expDate;
    }
  }

  function findPolicyExpiration(coverageType: string): string | undefined {
    const policy = coi.policies.find(
      (p) => p.coverage_type.toLowerCase().includes(coverageType.toLowerCase())
    );
    return policy?.expiration_date;
  }

  // ---- General Liability (Per Occurrence) ----
  if (requirements.general_liability_per_occurrence != null) {
    const actual = coi.general_liability_per_occurrence;
    const required = requirements.general_liability_per_occurrence;
    const expDate = findPolicyExpiration('general liability');
    const expStatus = checkExpiration(expDate);
    updateEarliestExpiration(expDate);

    let status: ComplianceCheckItem['status'];
    if (actual == null) status = 'not_found';
    else if (expStatus === 'expired') status = 'expired';
    else if (actual < required) status = 'fail';
    else if (expStatus === 'expiring') status = 'expiring';
    else status = 'pass';

    items.push({
      field: 'gl_per_occurrence',
      display_name: 'General Liability (Per Occurrence)',
      required: fmtLimit(required),
      actual: fmtLimit(actual),
      status,
      reason:
        actual == null
          ? 'No General Liability coverage found on COI'
          : status === 'expired'
            ? 'Coverage has expired'
            : actual < required
              ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
              : status === 'expiring'
                ? 'Coverage expiring within 30 days'
                : 'Meets or exceeds requirement',
    });
  }

  // ---- General Liability (Aggregate) ----
  if (requirements.general_liability_aggregate != null) {
    const actual = coi.general_liability_aggregate;
    const required = requirements.general_liability_aggregate;

    let status: ComplianceCheckItem['status'];
    if (actual == null) status = 'not_found';
    else if (actual < required) status = 'fail';
    else status = 'pass';

    items.push({
      field: 'gl_aggregate',
      display_name: 'General Liability (Aggregate)',
      required: fmtLimit(required),
      actual: fmtLimit(actual),
      status,
      reason:
        actual == null
          ? 'No aggregate limit found'
          : actual < required
            ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
            : 'Meets or exceeds requirement',
    });
  }

  // ---- Auto Liability ----
  if (requirements.auto_liability != null) {
    const actual = coi.auto_liability;
    const required = requirements.auto_liability;
    const expDate = findPolicyExpiration('auto');
    const expStatus = checkExpiration(expDate);
    updateEarliestExpiration(expDate);

    let status: ComplianceCheckItem['status'];
    if (actual == null) status = 'not_found';
    else if (expStatus === 'expired') status = 'expired';
    else if (actual < required) status = 'fail';
    else if (expStatus === 'expiring') status = 'expiring';
    else status = 'pass';

    items.push({
      field: 'auto_liability',
      display_name: 'Automobile Liability',
      required: fmtLimit(required),
      actual: fmtLimit(actual),
      status,
      reason:
        actual == null
          ? 'No Auto Liability coverage found on COI'
          : status === 'expired'
            ? 'Coverage has expired'
            : actual < required
              ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
              : status === 'expiring'
                ? 'Coverage expiring within 30 days'
                : 'Meets or exceeds requirement',
    });
  }

  // ---- Workers' Compensation ----
  if (requirements.workers_comp_required) {
    const found = coi.workers_comp_found;
    const expDate = findPolicyExpiration('workers');
    const expStatus = checkExpiration(expDate);
    updateEarliestExpiration(expDate);

    let status: ComplianceCheckItem['status'];
    if (!found) status = 'not_found';
    else if (expStatus === 'expired') status = 'expired';
    else if (expStatus === 'expiring') status = 'expiring';
    else status = 'pass';

    items.push({
      field: 'workers_comp',
      display_name: "Workers' Compensation",
      required: 'Statutory',
      actual: found ? 'Statutory' : null,
      status,
      reason: !found
        ? "No Workers' Compensation coverage found on COI"
        : status === 'expired'
          ? 'Coverage has expired'
          : status === 'expiring'
            ? 'Coverage expiring within 30 days'
            : 'Statutory coverage confirmed',
    });
  }

  // ---- Employers' Liability ----
  if (requirements.employers_liability != null) {
    const actual = coi.employers_liability;
    const required = requirements.employers_liability;
    const expDate = findPolicyExpiration('employer');
    const expStatus = checkExpiration(expDate);
    updateEarliestExpiration(expDate);

    let status: ComplianceCheckItem['status'];
    if (actual == null) status = 'not_found';
    else if (expStatus === 'expired') status = 'expired';
    else if (actual < required) status = 'fail';
    else if (expStatus === 'expiring') status = 'expiring';
    else status = 'pass';

    items.push({
      field: 'employers_liability',
      display_name: "Employers' Liability",
      required: fmtLimit(required),
      actual: fmtLimit(actual),
      status,
      reason:
        actual == null
          ? "No Employers' Liability found"
          : status === 'expired'
            ? 'Coverage has expired'
            : actual < required
              ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
              : status === 'expiring'
                ? 'Coverage expiring within 30 days'
                : 'Meets or exceeds requirement',
    });
  }

  // ---- Umbrella / Excess ----
  if (requirements.umbrella_liability != null) {
    const actual = coi.umbrella_per_occurrence ?? coi.umbrella_aggregate;
    const required = requirements.umbrella_liability;
    const expDate = findPolicyExpiration('umbrella') ?? findPolicyExpiration('excess');
    const expStatus = checkExpiration(expDate);
    updateEarliestExpiration(expDate);

    let status: ComplianceCheckItem['status'];
    if (actual == null) status = 'not_found';
    else if (expStatus === 'expired') status = 'expired';
    else if (actual < required) status = 'fail';
    else if (expStatus === 'expiring') status = 'expiring';
    else status = 'pass';

    items.push({
      field: 'umbrella',
      display_name: 'Umbrella / Excess Liability',
      required: fmtLimit(required),
      actual: fmtLimit(actual),
      status,
      reason:
        actual == null
          ? 'No Umbrella/Excess coverage found on COI'
          : status === 'expired'
            ? 'Coverage has expired'
            : actual < required
              ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
              : status === 'expiring'
                ? 'Coverage expiring within 30 days'
                : 'Meets or exceeds requirement',
    });
  }

  // ---- Property Insurance (tenant only) ----
  if (requirements.property_insurance_required) {
    const actual = coi.property_insurance;

    items.push({
      field: 'property_insurance',
      display_name: 'Property Insurance',
      required: 'Required',
      actual: actual != null ? fmtLimit(actual) : null,
      status: actual != null ? 'pass' : 'not_found',
      reason: actual != null ? 'Property insurance found' : 'No property insurance found on COI',
    });
  }

  // ---- Liquor Liability (tenant — restaurant) ----
  if (requirements.liquor_liability != null) {
    items.push({
      field: 'liquor_liability',
      display_name: 'Liquor Liability',
      required: fmtLimit(requirements.liquor_liability),
      actual: null,
      status: 'not_found',
      reason: 'Liquor liability check requires manual verification',
    });
  }

  // ============================================
  // ENDORSEMENT CHECKS
  // ============================================

  // ---- Additional Insured ----
  const allAIEntities: string[] = [];
  if (property.additional_insured_entities?.length) {
    allAIEntities.push(...property.additional_insured_entities);
  }
  if (requirements.additional_insured_entities?.length) {
    for (const e of requirements.additional_insured_entities) {
      if (!allAIEntities.some((existing) => normalizeEntityName(existing) === normalizeEntityName(e))) {
        allAIEntities.push(e);
      }
    }
  }

  for (const entity of allAIEntities) {
    if (!entity) continue;
    const found = fuzzyMatchInList(entity, coi.additional_insured_names);
    const source = property.additional_insured_entities?.includes(entity) ? 'Property' : 'Template';

    items.push({
      field: `additional_insured_${normalizeEntityName(entity).replace(/\s+/g, '_')}`,
      display_name: `Additional Insured: ${entity}`,
      required: 'Named',
      actual: found ? 'Found' : 'Missing',
      status: found ? 'pass' : 'fail',
      reason: found
        ? `"${entity}" found as Additional Insured (source: ${source})`
        : `"${entity}" not found as Additional Insured (source: ${source})`,
    });
  }

  // ---- Certificate Holder ----
  if (property.certificate_holder_name) {
    const required = property.certificate_holder_name;
    const actual = coi.certificate_holder_name;
    const matched = actual != null && entityNameMatches(required, actual);

    items.push({
      field: 'certificate_holder',
      display_name: 'Certificate Holder',
      required: required,
      actual: actual ?? 'Not found',
      status: matched ? 'pass' : actual ? 'fail' : 'not_found',
      reason: matched
        ? 'Certificate holder matches required entity'
        : actual
          ? `Certificate holder "${actual}" does not match "${required}"`
          : 'Certificate holder not found on COI',
    });
  }

  // ---- Waiver of Subrogation ----
  if (requirements.waiver_of_subrogation_required) {
    items.push({
      field: 'waiver_of_subrogation',
      display_name: 'Waiver of Subrogation',
      required: 'Required',
      actual: 'See COI',
      status: 'pass',
      reason: 'Waiver of subrogation requirement noted — verify on COI document',
    });
  }

  // ============================================
  // DETERMINE OVERALL STATUS
  // ============================================

  for (const policy of coi.policies) {
    updateEarliestExpiration(policy.expiration_date);
  }

  const hasExpired = items.some((i) => i.status === 'expired');
  const hasFail = items.some((i) => i.status === 'fail' || i.status === 'not_found');

  let overall_status: ComplianceCheckOutput['overall_status'];
  if (hasExpired) {
    overall_status = 'expired';
  } else if (hasFail) {
    overall_status = 'non_compliant';
  } else {
    overall_status = 'compliant';
  }

  return {
    overall_status,
    earliest_expiration: earliestExp,
    items,
  };
}

// ============================================================================
// HELPER: Get plain-English compliance gaps
// ============================================================================

export function getComplianceGaps(result: ComplianceCheckOutput): string[] {
  return result.items
    .filter((i) => i.status !== 'pass' && i.status !== 'expiring')
    .map((i) => {
      if (i.status === 'not_found') return `${i.display_name}: Not found on certificate`;
      if (i.status === 'expired') return `${i.display_name}: Coverage has expired`;
      if (i.status === 'fail') return `${i.display_name}: ${i.reason}`;
      return `${i.display_name}: ${i.reason}`;
    });
}
