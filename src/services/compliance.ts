import type {
  ExtractedCoverage,
  ComplianceField,
  ComplianceResult,
  RequirementTemplate,
} from '@/types';
import { formatCurrency } from '@/lib/utils';

export function compareCoverageToRequirements(
  coverages: ExtractedCoverage[],
  template: RequirementTemplate | null
): ComplianceResult {
  if (!template) {
    return {
      overall_status: 'non-compliant',
      compliance_percentage: 0,
      fields: [],
      expiring_within_30_days: 0,
      expired_count: 0,
    };
  }

  const fields: ComplianceField[] = [];
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let expiringCount = 0;
  let expiredCount = 0;

  // Helper to find coverage by type
  const findCoverage = (type: string) =>
    coverages.find(
      (c) => c.type.toLowerCase().includes(type.toLowerCase())
    );

  // General Liability
  if (template.coverages.general_liability_occurrence) {
    const cov = findCoverage('general liability');
    const actual = cov?.occurrence_limit ?? null;
    const required = template.coverages.general_liability_occurrence;
    const met = actual !== null && actual >= required;
    fields.push({
      field_name: 'General Liability (Occurrence)',
      required_value: required,
      actual_value: actual,
      status: met ? 'compliant' : 'non-compliant',
      expiration_date: cov?.expiration_date,
    });

    if (cov?.expiration_date) {
      const expDate = new Date(cov.expiration_date);
      if (expDate < now) expiredCount++;
      else if (expDate < thirtyDaysFromNow) expiringCount++;
    }
  }

  if (template.coverages.general_liability_aggregate) {
    const cov = findCoverage('general liability');
    const actual = cov?.aggregate_limit ?? null;
    const required = template.coverages.general_liability_aggregate;
    const met = actual !== null && actual >= required;
    fields.push({
      field_name: 'General Liability (Aggregate)',
      required_value: required,
      actual_value: actual,
      status: met ? 'compliant' : 'non-compliant',
    });
  }

  // Automobile Liability
  if (template.coverages.automobile_liability_csl) {
    const cov = findCoverage('auto');
    const actual = cov?.combined_single_limit ?? cov?.occurrence_limit ?? null;
    const required = template.coverages.automobile_liability_csl;
    const met = actual !== null && actual >= required;
    fields.push({
      field_name: 'Automobile Liability (CSL)',
      required_value: required,
      actual_value: actual,
      status: met ? 'compliant' : 'non-compliant',
      expiration_date: cov?.expiration_date,
    });

    if (cov?.expiration_date) {
      const expDate = new Date(cov.expiration_date);
      if (expDate < now) expiredCount++;
      else if (expDate < thirtyDaysFromNow) expiringCount++;
    }
  }

  // Workers' Compensation
  if (template.coverages.workers_comp_statutory) {
    const cov = findCoverage('workers');
    const actual = cov?.is_statutory ?? null;
    fields.push({
      field_name: "Workers' Compensation",
      required_value: 'Statutory',
      actual_value: actual ? 'Statutory' : actual === null ? null : 'Not Statutory',
      status: actual ? 'compliant' : 'non-compliant',
      expiration_date: cov?.expiration_date,
    });

    if (cov?.expiration_date) {
      const expDate = new Date(cov.expiration_date);
      if (expDate < now) expiredCount++;
      else if (expDate < thirtyDaysFromNow) expiringCount++;
    }
  }

  // Umbrella
  if (template.coverages.umbrella_limit) {
    const cov = findCoverage('umbrella') ?? findCoverage('excess');
    const actual = cov?.occurrence_limit ?? cov?.aggregate_limit ?? null;
    const required = template.coverages.umbrella_limit;
    const met = actual !== null && actual >= required;
    fields.push({
      field_name: 'Umbrella / Excess Liability',
      required_value: required,
      actual_value: actual,
      status: met ? 'compliant' : 'non-compliant',
      expiration_date: cov?.expiration_date,
    });

    if (cov?.expiration_date) {
      const expDate = new Date(cov.expiration_date);
      if (expDate < now) expiredCount++;
      else if (expDate < thirtyDaysFromNow) expiringCount++;
    }
  }

  // Professional Liability
  if (template.coverages.professional_liability_limit) {
    const cov = findCoverage('professional') ?? findCoverage('e&o');
    const actual = cov?.occurrence_limit ?? cov?.aggregate_limit ?? null;
    const required = template.coverages.professional_liability_limit;
    const met = actual !== null && actual >= required;
    fields.push({
      field_name: 'Professional Liability / E&O',
      required_value: required,
      actual_value: actual,
      status: met ? 'compliant' : 'non-compliant',
      expiration_date: cov?.expiration_date,
    });
  }

  // Property Insurance (tenant)
  if (template.coverages.property_insurance_limit) {
    const cov = findCoverage('property');
    const actual = cov?.occurrence_limit ?? cov?.aggregate_limit ?? null;
    const required = template.coverages.property_insurance_limit;
    const met = actual !== null && actual >= required;
    fields.push({
      field_name: 'Property Insurance',
      required_value: required,
      actual_value: actual,
      status: met ? 'compliant' : 'non-compliant',
    });
  }

  // Calculate overall
  const totalFields = fields.length;
  const compliantFields = fields.filter((f) => f.status === 'compliant').length;
  const compliancePercentage = totalFields > 0 ? Math.round((compliantFields / totalFields) * 100) : 0;

  let overallStatus: ComplianceResult['overall_status'] = 'compliant';
  if (expiredCount > 0) overallStatus = 'expired';
  else if (compliantFields < totalFields) overallStatus = 'non-compliant';
  else if (expiringCount > 0) overallStatus = 'expiring';

  return {
    overall_status: overallStatus,
    compliance_percentage: compliancePercentage,
    fields,
    expiring_within_30_days: expiringCount,
    expired_count: expiredCount,
  };
}

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
