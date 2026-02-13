import type {
  ExtractedCoverage,
  ExtractedEndorsement,
  ComplianceField,
  ComplianceResult,
  RequirementTemplate,
  Property,
} from '@/types';
import { formatCurrency } from '@/lib/utils';

/** Fuzzy entity name matching — strips punctuation, normalizes whitespace, case-insensitive */
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

export interface ComplianceCheckOptions {
  endorsements?: ExtractedEndorsement[];
  property?: Pick<Property, 'additional_insured_entities' | 'certificate_holder_name' | 'loss_payee_entities'> | null;
}

export function compareCoverageToRequirements(
  coverages: ExtractedCoverage[],
  template: RequirementTemplate | null,
  options?: ComplianceCheckOptions
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

  const trackExpiration = (cov: ExtractedCoverage | undefined) => {
    if (cov?.expiration_date) {
      const expDate = new Date(cov.expiration_date);
      if (expDate < now) expiredCount++;
      else if (expDate < thirtyDaysFromNow) expiringCount++;
    }
  };

  // General Liability — check if required via toggle or legacy presence of limit
  const glRequired = template.coverages.general_liability_required
    ?? (!!template.coverages.general_liability_occurrence);
  if (glRequired && template.coverages.general_liability_occurrence) {
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
    trackExpiration(cov);
  }

  if (glRequired && template.coverages.general_liability_aggregate) {
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
  const autoRequired = template.coverages.automobile_liability_required
    ?? (!!template.coverages.automobile_liability_csl);
  if (autoRequired && template.coverages.automobile_liability_csl) {
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
    trackExpiration(cov);
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
    trackExpiration(cov);
  }

  // Employers' Liability
  const elRequired = template.coverages.employers_liability_required
    ?? (!!template.coverages.workers_comp_employers_liability);
  if (elRequired && template.coverages.workers_comp_employers_liability) {
    const cov = findCoverage('employer');
    const actual = cov?.occurrence_limit ?? cov?.combined_single_limit ?? null;
    const required = template.coverages.workers_comp_employers_liability;
    const met = actual !== null && actual >= required;
    fields.push({
      field_name: "Employers' Liability",
      required_value: required,
      actual_value: actual,
      status: met ? 'compliant' : 'non-compliant',
      expiration_date: cov?.expiration_date,
    });
    trackExpiration(cov);
  }

  // Umbrella / Excess
  const umbrellaRequired = template.coverages.umbrella_required
    ?? (!!template.coverages.umbrella_limit);
  if (umbrellaRequired && template.coverages.umbrella_limit) {
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
    trackExpiration(cov);
  }

  // Professional Liability / E&O
  const profRequired = template.coverages.professional_liability_required
    ?? (!!template.coverages.professional_liability_limit);
  if (profRequired && template.coverages.professional_liability_limit) {
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

  // ---- Endorsement checks ----
  const endorsements = options?.endorsements ?? [];
  const property = options?.property;

  // Additional Insured
  if (template.endorsements.require_additional_insured) {
    const aiEndorsement = endorsements.find(
      (e) => e.type.toLowerCase().includes('additional insured')
    );
    const present = aiEndorsement?.present ?? false;
    fields.push({
      field_name: 'Additional Insured',
      required_value: 'Required',
      actual_value: present ? 'Present' : null,
      status: present ? 'compliant' : 'non-compliant',
    });

    // Check specific entity names if property provides them
    if (present && property?.additional_insured_entities?.length) {
      for (const reqEntity of property.additional_insured_entities) {
        if (!reqEntity) continue;
        // We check if the endorsement details mention the entity (if details available)
        const detailText = aiEndorsement?.details ?? '';
        const found = detailText && entityNameMatches(reqEntity, detailText);
        fields.push({
          field_name: `AI Entity: ${reqEntity}`,
          required_value: 'Named',
          actual_value: found ? 'Found' : 'Not verified',
          status: found ? 'compliant' : 'non-compliant',
        });
      }
    }
  }

  // Waiver of Subrogation
  if (template.endorsements.require_waiver_of_subrogation) {
    const wosEndorsement = endorsements.find(
      (e) => e.type.toLowerCase().includes('waiver') || e.type.toLowerCase().includes('subrogation')
    );
    const present = wosEndorsement?.present ?? false;
    fields.push({
      field_name: 'Waiver of Subrogation',
      required_value: 'Required',
      actual_value: present ? 'Present' : null,
      status: present ? 'compliant' : 'non-compliant',
    });
  }

  // Certificate Holder name check
  if (template.endorsements.certificate_holder_name || property?.certificate_holder_name) {
    const requiredName = template.endorsements.certificate_holder_name || property?.certificate_holder_name || '';
    if (requiredName) {
      // This would need COI certificate holder field — mark as informational for now
      fields.push({
        field_name: 'Certificate Holder',
        required_value: requiredName,
        actual_value: null,
        status: 'non-compliant',
      });
    }
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

/**
 * Generate a plain-language compliance insight string from a ComplianceResult.
 * Used in vendor/tenant detail pages, the portal, and automated emails.
 */
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

  // Non-compliant fields
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

  // Expiring fields
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
