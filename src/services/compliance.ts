import type {
  ExtractedCoverage,
  ExtractedEndorsement,
  ComplianceField,
  ComplianceResult,
  RequirementTemplate,
  Property,
} from '@/types';
import { formatCurrency } from '@/lib/utils';

// ============================================
// FUZZY MATCHING UTILITIES
// ============================================

function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,;:'"!?()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function entityNameMatches(required: string, actual: string): boolean {
  const r = normalizeEntityName(required);
  const a = normalizeEntityName(actual);
  return a.includes(r) || r.includes(a);
}

// ============================================
// UNIFIED COMPLIANCE ENGINE (Part 8)
// ============================================

export interface ComplianceCheckInput {
  /** Extracted coverages from the COI */
  coverages: ExtractedCoverage[];
  /** Extracted endorsements from the COI */
  endorsements?: ExtractedEndorsement[];
  /** The requirement template to check against */
  template: RequirementTemplate | null;
  /** Property data for entity name / cert holder checks */
  property?: Pick<
    Property,
    | 'additional_insured_entities'
    | 'certificate_holder_name'
    | 'certificate_holder_address_line1'
    | 'certificate_holder_city'
    | 'certificate_holder_state'
    | 'certificate_holder_zip'
    | 'loss_payee_entities'
  > | null;
  /** Named insured from the COI (for cert-holder matching) */
  certificateHolder?: string;
}

export type LineItemStatus = 'pass' | 'fail' | 'missing' | 'expiring' | 'expired';

export interface ComplianceLineItem {
  field: string;
  display_name: string;
  required_value: string;
  actual_value: string;
  status: LineItemStatus;
  reason: string;
  source: string;
  expiration_date?: string;
}

export interface UnifiedComplianceResult {
  overall_status: 'compliant' | 'non-compliant' | 'expiring' | 'expired';
  compliance_percentage: number;
  line_items: ComplianceLineItem[];
  expiring_within_30_days: number;
  expired_count: number;
  summary: string;
}

function fmtLimit(val: number | null | undefined): string {
  if (val == null) return 'Missing';
  return formatCurrency(val);
}

function getExpirationStatus(
  expDate: string | undefined,
  now: Date,
  thirtyDaysFromNow: Date
): { isExpired: boolean; isExpiring: boolean } {
  if (!expDate) return { isExpired: false, isExpiring: false };
  const d = new Date(expDate);
  return {
    isExpired: d < now,
    isExpiring: d >= now && d < thirtyDaysFromNow,
  };
}

/**
 * The new unified compliance check.
 * Takes a ComplianceCheckInput and returns a full ComplianceLineItem breakdown.
 */
export function runComplianceCheck(input: ComplianceCheckInput): UnifiedComplianceResult {
  const { coverages, endorsements = [], template, property } = input;

  if (!template) {
    return {
      overall_status: 'non-compliant',
      compliance_percentage: 0,
      line_items: [],
      expiring_within_30_days: 0,
      expired_count: 0,
      summary: 'No requirement template configured.',
    };
  }

  const items: ComplianceLineItem[] = [];
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let expiringCount = 0;
  let expiredCount = 0;

  const findCoverage = (type: string) =>
    coverages.find((c) => c.type.toLowerCase().includes(type.toLowerCase()));

  const trackExp = (cov: ExtractedCoverage | undefined) => {
    if (!cov?.expiration_date) return;
    const { isExpired, isExpiring } = getExpirationStatus(cov.expiration_date, now, thirtyDaysFromNow);
    if (isExpired) expiredCount++;
    else if (isExpiring) expiringCount++;
  };

  // ------ GENERAL LIABILITY (Occurrence) ------
  const glRequired = template.coverages.general_liability_required ?? !!template.coverages.general_liability_occurrence;
  if (glRequired && template.coverages.general_liability_occurrence) {
    const cov = findCoverage('general liability');
    const actual = cov?.occurrence_limit ?? null;
    const required = template.coverages.general_liability_occurrence;
    const met = actual !== null && actual >= required;
    const { isExpired, isExpiring } = getExpirationStatus(cov?.expiration_date, now, thirtyDaysFromNow);

    items.push({
      field: 'gl_occurrence',
      display_name: 'General Liability (Per Occurrence)',
      required_value: fmtLimit(required),
      actual_value: fmtLimit(actual),
      status: isExpired ? 'expired' : !met ? (actual === null ? 'missing' : 'fail') : isExpiring ? 'expiring' : 'pass',
      reason: actual === null
        ? 'No General Liability coverage found on COI'
        : !met
          ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
          : isExpired
            ? 'Coverage has expired'
            : isExpiring
              ? 'Coverage expiring within 30 days'
              : 'Meets or exceeds requirement',
      source: 'COI extraction',
      expiration_date: cov?.expiration_date,
    });
    trackExp(cov);
  }

  // ------ GENERAL LIABILITY (Aggregate) ------
  if (glRequired && template.coverages.general_liability_aggregate) {
    const cov = findCoverage('general liability');
    const actual = cov?.aggregate_limit ?? null;
    const required = template.coverages.general_liability_aggregate;
    const met = actual !== null && actual >= required;

    items.push({
      field: 'gl_aggregate',
      display_name: 'General Liability (Aggregate)',
      required_value: fmtLimit(required),
      actual_value: fmtLimit(actual),
      status: !met ? (actual === null ? 'missing' : 'fail') : 'pass',
      reason: actual === null
        ? 'No aggregate limit found'
        : !met
          ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
          : 'Meets or exceeds requirement',
      source: 'COI extraction',
    });
  }

  // ------ AUTOMOBILE LIABILITY ------
  const autoRequired = template.coverages.automobile_liability_required ?? !!template.coverages.automobile_liability_csl;
  if (autoRequired && template.coverages.automobile_liability_csl) {
    const cov = findCoverage('auto');
    const actual = cov?.combined_single_limit ?? cov?.occurrence_limit ?? null;
    const required = template.coverages.automobile_liability_csl;
    const met = actual !== null && actual >= required;
    const { isExpired, isExpiring } = getExpirationStatus(cov?.expiration_date, now, thirtyDaysFromNow);

    items.push({
      field: 'auto_liability',
      display_name: 'Automobile Liability (CSL)',
      required_value: fmtLimit(required),
      actual_value: fmtLimit(actual),
      status: isExpired ? 'expired' : !met ? (actual === null ? 'missing' : 'fail') : isExpiring ? 'expiring' : 'pass',
      reason: actual === null
        ? 'No Auto Liability coverage found on COI'
        : !met
          ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
          : isExpired ? 'Coverage has expired' : isExpiring ? 'Coverage expiring within 30 days' : 'Meets or exceeds requirement',
      source: 'COI extraction',
      expiration_date: cov?.expiration_date,
    });
    trackExp(cov);
  }

  // ------ WORKERS' COMPENSATION ------
  if (template.coverages.workers_comp_statutory) {
    const cov = findCoverage('workers');
    const actual = cov?.is_statutory ?? null;
    const { isExpired, isExpiring } = getExpirationStatus(cov?.expiration_date, now, thirtyDaysFromNow);

    items.push({
      field: 'workers_comp',
      display_name: "Workers' Compensation",
      required_value: 'Statutory',
      actual_value: actual ? 'Statutory' : actual === null ? 'Missing' : 'Not Statutory',
      status: isExpired ? 'expired' : !actual ? (actual === null ? 'missing' : 'fail') : isExpiring ? 'expiring' : 'pass',
      reason: actual === null
        ? "No Workers' Comp coverage found on COI"
        : !actual
          ? 'Coverage is not statutory'
          : isExpired ? 'Coverage has expired' : isExpiring ? 'Coverage expiring within 30 days' : 'Statutory coverage confirmed',
      source: 'COI extraction',
      expiration_date: cov?.expiration_date,
    });
    trackExp(cov);
  }

  // ------ EMPLOYERS' LIABILITY ------
  const elRequired = template.coverages.employers_liability_required ?? !!template.coverages.workers_comp_employers_liability;
  if (elRequired && template.coverages.workers_comp_employers_liability) {
    const cov = findCoverage('employer');
    const actual = cov?.occurrence_limit ?? cov?.combined_single_limit ?? null;
    const required = template.coverages.workers_comp_employers_liability;
    const met = actual !== null && actual >= required;
    const { isExpired, isExpiring } = getExpirationStatus(cov?.expiration_date, now, thirtyDaysFromNow);

    items.push({
      field: 'employers_liability',
      display_name: "Employers' Liability",
      required_value: fmtLimit(required),
      actual_value: fmtLimit(actual),
      status: isExpired ? 'expired' : !met ? (actual === null ? 'missing' : 'fail') : isExpiring ? 'expiring' : 'pass',
      reason: actual === null
        ? "No Employers' Liability coverage found"
        : !met
          ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
          : isExpired ? 'Coverage has expired' : isExpiring ? 'Coverage expiring within 30 days' : 'Meets or exceeds requirement',
      source: 'COI extraction',
      expiration_date: cov?.expiration_date,
    });
    trackExp(cov);
  }

  // ------ UMBRELLA / EXCESS ------
  const umbrellaRequired = template.coverages.umbrella_required ?? !!template.coverages.umbrella_limit;
  if (umbrellaRequired && template.coverages.umbrella_limit) {
    const cov = findCoverage('umbrella') ?? findCoverage('excess');
    const actual = cov?.occurrence_limit ?? cov?.aggregate_limit ?? null;
    const required = template.coverages.umbrella_limit;
    const met = actual !== null && actual >= required;
    const { isExpired, isExpiring } = getExpirationStatus(cov?.expiration_date, now, thirtyDaysFromNow);

    items.push({
      field: 'umbrella',
      display_name: 'Umbrella / Excess Liability',
      required_value: fmtLimit(required),
      actual_value: fmtLimit(actual),
      status: isExpired ? 'expired' : !met ? (actual === null ? 'missing' : 'fail') : isExpiring ? 'expiring' : 'pass',
      reason: actual === null
        ? 'No Umbrella/Excess coverage found on COI'
        : !met
          ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
          : isExpired ? 'Coverage has expired' : isExpiring ? 'Coverage expiring within 30 days' : 'Meets or exceeds requirement',
      source: 'COI extraction',
      expiration_date: cov?.expiration_date,
    });
    trackExp(cov);
  }

  // ------ PROFESSIONAL LIABILITY / E&O ------
  const profRequired = template.coverages.professional_liability_required ?? !!template.coverages.professional_liability_limit;
  if (profRequired && template.coverages.professional_liability_limit) {
    const cov = findCoverage('professional') ?? findCoverage('e&o');
    const actual = cov?.occurrence_limit ?? cov?.aggregate_limit ?? null;
    const required = template.coverages.professional_liability_limit;
    const met = actual !== null && actual >= required;

    items.push({
      field: 'professional_liability',
      display_name: 'Professional Liability / E&O',
      required_value: fmtLimit(required),
      actual_value: fmtLimit(actual),
      status: !met ? (actual === null ? 'missing' : 'fail') : 'pass',
      reason: actual === null
        ? 'No Professional Liability coverage found'
        : !met
          ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
          : 'Meets or exceeds requirement',
      source: 'COI extraction',
      expiration_date: cov?.expiration_date,
    });
  }

  // ------ PROPERTY INSURANCE (tenant) ------
  if (template.coverages.property_insurance_limit) {
    const cov = findCoverage('property');
    const actual = cov?.occurrence_limit ?? cov?.aggregate_limit ?? null;
    const required = template.coverages.property_insurance_limit;
    const met = actual !== null && actual >= required;

    items.push({
      field: 'property_insurance',
      display_name: 'Property Insurance',
      required_value: fmtLimit(required),
      actual_value: fmtLimit(actual),
      status: !met ? (actual === null ? 'missing' : 'fail') : 'pass',
      reason: actual === null
        ? 'No Property Insurance coverage found'
        : !met
          ? `Limit ${fmtLimit(actual)} is below required ${fmtLimit(required)}`
          : 'Meets or exceeds requirement',
      source: 'COI extraction',
    });
  }

  // ============================================
  // ENDORSEMENT CHECKS
  // ============================================

  // ------ ADDITIONAL INSURED ------
  if (template.endorsements.require_additional_insured) {
    const aiEndorsement = endorsements.find(
      (e) => e.type.toLowerCase().includes('additional insured')
    );
    const present = aiEndorsement?.present ?? false;

    items.push({
      field: 'additional_insured',
      display_name: 'Additional Insured',
      required_value: 'Required',
      actual_value: present ? 'Present' : 'Missing',
      status: present ? 'pass' : 'missing',
      reason: present
        ? 'Additional insured endorsement found on COI'
        : 'Additional insured endorsement not found on COI',
      source: 'COI extraction',
    });

    // Check specific entity names from property
    // On ACORD 25 forms, the Additional Insured entity name commonly
    // appears in the Certificate Holder section at the bottom of the form,
    // not just in the endorsement details. Check both locations.
    if (present && property?.additional_insured_entities?.length) {
      const certHolderText = input.certificateHolder ?? '';
      for (const reqEntity of property.additional_insured_entities) {
        if (!reqEntity) continue;
        const detailText = aiEndorsement?.details ?? '';

        // Check endorsement details AND certificate holder text
        const foundInEndorsement = detailText && entityNameMatches(reqEntity, detailText);
        const foundInCertHolder = certHolderText && entityNameMatches(reqEntity, certHolderText);
        const found = foundInEndorsement || foundInCertHolder;

        const location = foundInEndorsement
          ? 'endorsement details'
          : foundInCertHolder
            ? 'certificate holder section'
            : '';

        items.push({
          field: `ai_entity_${reqEntity.replace(/\s+/g, '_').toLowerCase()}`,
          display_name: `AI Entity: ${reqEntity}`,
          required_value: 'Named',
          actual_value: found ? 'Found' : 'Not verified',
          status: found ? 'pass' : 'fail',
          reason: found
            ? `"${reqEntity}" found in ${location}`
            : `Could not verify "${reqEntity}" in COI endorsement or certificate holder text`,
          source: 'Property config',
        });
      }
    }
  }

  // ------ WAIVER OF SUBROGATION ------
  if (template.endorsements.require_waiver_of_subrogation) {
    const wosEndorsement = endorsements.find(
      (e) => e.type.toLowerCase().includes('waiver') || e.type.toLowerCase().includes('subrogation')
    );
    const present = wosEndorsement?.present ?? false;

    items.push({
      field: 'waiver_of_subrogation',
      display_name: 'Waiver of Subrogation',
      required_value: 'Required',
      actual_value: present ? 'Present' : 'Missing',
      status: present ? 'pass' : 'missing',
      reason: present
        ? 'Waiver of subrogation endorsement found'
        : 'Waiver of subrogation endorsement not found on COI',
      source: 'COI extraction',
    });
  }

  // ------ CERTIFICATE HOLDER ------
  if (template.endorsements.certificate_holder_name || property?.certificate_holder_name) {
    const requiredName = template.endorsements.certificate_holder_name || property?.certificate_holder_name || '';
    if (requiredName) {
      const certHolder = input.certificateHolder ?? '';
      const matched = certHolder && entityNameMatches(requiredName, certHolder);

      items.push({
        field: 'certificate_holder',
        display_name: 'Certificate Holder',
        required_value: requiredName,
        actual_value: certHolder || 'Not verified',
        status: matched ? 'pass' : 'fail',
        reason: matched
          ? 'Certificate holder matches required entity'
          : certHolder
            ? `Certificate holder "${certHolder}" does not match "${requiredName}"`
            : 'Certificate holder could not be verified from COI',
        source: 'Property config',
      });
    }
  }

  // ============================================
  // CALCULATE OVERALL
  // ============================================
  const totalItems = items.length;
  const passItems = items.filter((i) => i.status === 'pass' || i.status === 'expiring').length;
  const compliancePercentage = totalItems > 0 ? Math.round((passItems / totalItems) * 100) : 0;

  let overallStatus: UnifiedComplianceResult['overall_status'] = 'compliant';
  if (expiredCount > 0) overallStatus = 'expired';
  else if (items.some((i) => i.status === 'fail' || i.status === 'missing')) overallStatus = 'non-compliant';
  else if (expiringCount > 0) overallStatus = 'expiring';

  // Generate summary
  const failItems = items.filter((i) => i.status === 'fail' || i.status === 'missing');
  let summary: string;
  if (overallStatus === 'compliant') {
    summary = 'All coverages meet or exceed required minimums.';
  } else if (overallStatus === 'expired') {
    summary = `${expiredCount} coverage${expiredCount > 1 ? 's have' : ' has'} expired. ${failItems.length > 0 ? `${failItems.length} additional item${failItems.length > 1 ? 's' : ''} non-compliant.` : ''}`.trim();
  } else if (overallStatus === 'expiring') {
    summary = `All requirements met, but ${expiringCount} coverage${expiringCount > 1 ? 's are' : ' is'} expiring within 30 days.`;
  } else {
    const missingItems = items.filter((i) => i.status === 'missing');
    const belowItems = items.filter((i) => i.status === 'fail');
    const parts: string[] = [];
    if (missingItems.length > 0) parts.push(`${missingItems.length} missing`);
    if (belowItems.length > 0) parts.push(`${belowItems.length} below requirement`);
    summary = `Non-compliant: ${parts.join(', ')}.`;
  }

  return {
    overall_status: overallStatus,
    compliance_percentage: compliancePercentage,
    line_items: items,
    expiring_within_30_days: expiringCount,
    expired_count: expiredCount,
    summary,
  };
}

// ============================================
// LEGACY COMPATIBILITY LAYER
// Keeps existing call sites working without changes
// ============================================

export interface ComplianceCheckOptions {
  endorsements?: ExtractedEndorsement[];
  property?: Pick<Property, 'additional_insured_entities' | 'certificate_holder_name' | 'loss_payee_entities'> | null;
  /** Certificate holder text extracted from the COI for entity name verification */
  certificateHolder?: string;
}

/**
 * Legacy API — wraps the new unified engine and converts back to the old ComplianceResult shape.
 * All existing call sites (AddVendor, AddTenant, EntityDetailModal, BulkImport) continue to work.
 */
export function compareCoverageToRequirements(
  coverages: ExtractedCoverage[],
  template: RequirementTemplate | null,
  options?: ComplianceCheckOptions
): ComplianceResult {
  const unified = runComplianceCheck({
    coverages,
    endorsements: options?.endorsements,
    template,
    certificateHolder: options?.certificateHolder,
    property: options?.property,
  });

  // Convert line items to legacy ComplianceField format
  const fields: ComplianceField[] = unified.line_items.map((item) => {
    const statusMap: Record<LineItemStatus, ComplianceField['status']> = {
      pass: 'compliant',
      fail: 'non-compliant',
      missing: 'non-compliant',
      expiring: 'expiring',
      expired: 'expired',
    };

    // Parse values back to numeric where possible
    const parseVal = (s: string): number | string | null => {
      if (s === 'Missing') return null;
      const stripped = s.replace(/[$,]/g, '');
      const num = Number(stripped);
      return !isNaN(num) && stripped.length > 0 ? num : s;
    };

    return {
      field_name: item.display_name,
      required_value: parseVal(item.required_value),
      actual_value: parseVal(item.actual_value),
      status: statusMap[item.status],
      expiration_date: item.expiration_date,
    };
  });

  return {
    overall_status: unified.overall_status,
    compliance_percentage: unified.compliance_percentage,
    fields,
    expiring_within_30_days: unified.expiring_within_30_days,
    expired_count: unified.expired_count,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getComplianceGaps(fields: ComplianceField[]): string[] {
  return fields
    .filter((f) => f.status !== 'compliant' && f.status !== 'not-required')
    .map((f) => {
      const required =
        typeof f.required_value === 'number'
          ? formatCurrency(f.required_value)
          : String(f.required_value ?? 'Required');
      const actual =
        f.actual_value === null
          ? 'Missing'
          : typeof f.actual_value === 'number'
            ? formatCurrency(f.actual_value)
            : String(f.actual_value);
      return `${f.field_name}: Required ${required}, Found ${actual}`;
    });
}

export function getComplianceGapsFromLineItems(items: ComplianceLineItem[]): string[] {
  return items
    .filter((i) => i.status !== 'pass')
    .map((i) => `${i.display_name}: Required ${i.required_value}, Found ${i.actual_value}`);
}

export function generateComplianceInsight(result: ComplianceResult): string {
  if (result.fields.length === 0) {
    return 'No requirements have been configured yet. Set up requirements on the Requirements page to enable compliance checking.';
  }

  const { overall_status, fields, expired_count, expiring_within_30_days } = result;

  if (overall_status === 'compliant') {
    return 'This entity is fully compliant. All coverages meet or exceed the required minimums.';
  }

  const parts: string[] = [];

  if (overall_status === 'expired') {
    parts.push(`${expired_count} coverage${expired_count > 1 ? 's have' : ' has'} expired`);
  }

  const nonCompliant = fields.filter((f) => f.status === 'non-compliant');
  for (const f of nonCompliant) {
    if (f.actual_value === null) {
      parts.push(`${f.field_name} coverage is missing entirely`);
    } else {
      const actual = typeof f.actual_value === 'number' ? formatCurrency(f.actual_value) : String(f.actual_value);
      const required = typeof f.required_value === 'number' ? formatCurrency(f.required_value) : String(f.required_value);
      parts.push(`${f.field_name} limit (${actual}) is below the required minimum (${required})`);
    }
  }

  if (overall_status === 'expiring' && expiring_within_30_days > 0) {
    const expiringFields = fields.filter((f) => f.expiration_date).filter((f) => {
      const d = new Date(f.expiration_date!);
      const now = new Date();
      return d > now && d < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    });
    for (const f of expiringFields) {
      const dateStr = new Date(f.expiration_date!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      parts.push(`${f.field_name} expires ${dateStr}`);
    }
  }

  if (parts.length === 0) {
    return 'Compliance check completed — review the details below.';
  }

  const statusLabel =
    overall_status === 'expired' ? 'has expired coverage' :
    overall_status === 'expiring' ? 'has coverage expiring soon' :
    'is non-compliant';

  return `This entity ${statusLabel}: ${parts.join('. ')}.`;
}
