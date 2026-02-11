/**
 * Tenant COI compliance utilities
 * Compares extracted COI data against a tenant's requirement profile
 */

import { getDaysUntil, formatCurrency } from './complianceUtils';

/**
 * Compare a tenant's COI data against their requirement profile
 * Returns field-by-field compliance status and overall status
 */
export function compareTenantCOI(tenant, requirementProfile, expiringThresholdDays = 30) {
  const fields = [];
  const issues = [];

  if (!requirementProfile) {
    return {
      overallStatus: 'pending',
      fields: [],
      issues: [{ type: 'warning', message: 'No requirement profile set for this tenant' }],
    };
  }

  const coiCoverage = tenant.coi_coverage || {};

  // Helper to check a numeric coverage limit
  const checkLimit = (fieldName, label, required, actual, expirationDate) => {
    if (!required || required <= 0) {
      if (actual) {
        fields.push({
          fieldName,
          label,
          required: null,
          actual,
          status: 'not_required',
          expirationDate,
        });
      }
      return;
    }

    const field = {
      fieldName,
      label,
      required,
      actual: actual || 0,
      status: 'compliant',
      expirationDate,
    };

    // Check expiration first
    if (expirationDate) {
      const days = getDaysUntil(expirationDate);
      if (days !== null && days < 0) {
        field.status = 'expired';
        issues.push({ type: 'critical', message: `${label} policy expired` });
        fields.push(field);
        return;
      } else if (days !== null && days <= expiringThresholdDays) {
        field.status = 'expiring_soon';
        issues.push({ type: 'warning', message: `${label} expiring in ${days} days` });
      }
    }

    if (!actual || actual <= 0) {
      field.status = 'non_compliant';
      issues.push({ type: 'error', message: `${label} not found on COI (required ${formatCurrency(required)})` });
    } else if (actual < required) {
      field.status = 'non_compliant';
      issues.push({ type: 'error', message: `${label} ${formatCurrency(actual)} below required ${formatCurrency(required)}` });
    }

    fields.push(field);
  };

  // Helper to check boolean requirements
  const checkBoolean = (fieldName, label, required, actual) => {
    if (!required) return;

    const field = {
      fieldName,
      label,
      required: true,
      actual: !!actual,
      status: actual ? 'compliant' : 'non_compliant',
    };

    if (!actual) {
      issues.push({ type: 'error', message: `${label} required but not found on COI` });
    }

    fields.push(field);
  };

  // General Liability
  checkLimit(
    'gl_occurrence',
    'General Liability (Per Occurrence)',
    requirementProfile.gl_occurrence_limit,
    coiCoverage.generalLiability?.amount,
    coiCoverage.generalLiability?.expirationDate
  );

  checkLimit(
    'gl_aggregate',
    'General Liability (Aggregate)',
    requirementProfile.gl_aggregate_limit,
    coiCoverage.generalLiability?.aggregate,
    coiCoverage.generalLiability?.expirationDate
  );

  // Property / Contents
  checkLimit(
    'property_contents',
    'Property / Contents Insurance',
    requirementProfile.property_contents_limit,
    coiCoverage.propertyContents?.amount,
    coiCoverage.propertyContents?.expirationDate
  );

  // Umbrella / Excess
  checkLimit(
    'umbrella',
    'Umbrella / Excess Liability',
    requirementProfile.umbrella_limit,
    coiCoverage.umbrella?.amount,
    coiCoverage.umbrella?.expirationDate
  );

  // Workers Comp
  if (requirementProfile.workers_comp_statutory) {
    const wcCoverage = coiCoverage.workersComp;
    const hasWC = wcCoverage && (wcCoverage.amount === 'Statutory' || wcCoverage.amount > 0);
    const field = {
      fieldName: 'workers_comp',
      label: 'Workers Compensation',
      required: 'Statutory',
      actual: hasWC ? (wcCoverage.amount || 'None') : 'None',
      status: hasWC ? 'compliant' : 'non_compliant',
      expirationDate: wcCoverage?.expirationDate,
    };

    if (wcCoverage?.expirationDate) {
      const days = getDaysUntil(wcCoverage.expirationDate);
      if (days !== null && days < 0) {
        field.status = 'expired';
        issues.push({ type: 'critical', message: 'Workers Compensation policy expired' });
      } else if (days !== null && days <= expiringThresholdDays) {
        field.status = 'expiring_soon';
        issues.push({ type: 'warning', message: `Workers Compensation expiring in ${days} days` });
      }
    }

    if (!hasWC) {
      issues.push({ type: 'error', message: 'Workers Compensation required but not found on COI' });
    }

    fields.push(field);
  }

  // Employers Liability
  checkLimit(
    'employers_liability',
    'Employers Liability',
    requirementProfile.workers_comp_employers_liability_limit,
    coiCoverage.employersLiability?.amount,
    coiCoverage.employersLiability?.expirationDate
  );

  // Commercial Auto
  checkLimit(
    'commercial_auto',
    'Commercial Auto (CSL)',
    requirementProfile.commercial_auto_csl,
    coiCoverage.autoLiability?.amount,
    coiCoverage.autoLiability?.expirationDate
  );

  // Professional Liability / E&O
  checkLimit(
    'professional_liability',
    'Professional Liability / E&O',
    requirementProfile.professional_liability_limit,
    coiCoverage.professionalLiability?.amount,
    coiCoverage.professionalLiability?.expirationDate
  );

  // Additional Insured
  checkBoolean(
    'additional_insured',
    'Additional Insured Endorsement',
    requirementProfile.additional_insured_entities?.length > 0,
    tenant.coi_has_additional_insured
  );

  // Waiver of Subrogation
  checkBoolean(
    'waiver_of_subrogation',
    'Waiver of Subrogation',
    requirementProfile.waiver_of_subrogation_required,
    tenant.coi_has_waiver_of_subrogation
  );

  // Custom coverages from requirement profile
  if (requirementProfile.custom_coverages?.length > 0) {
    const coiAdditional = tenant.coi_additional_coverages || [];

    requirementProfile.custom_coverages.forEach(reqCov => {
      const found = coiAdditional.find(coi =>
        coi.type && reqCov.name &&
        coi.type.toLowerCase().includes(reqCov.name.toLowerCase())
      );

      checkLimit(
        `custom_${reqCov.name}`,
        reqCov.name,
        reqCov.limit,
        found?.amount,
        found?.expirationDate
      );
    });
  }

  // Determine overall status
  let overallStatus = 'compliant';

  const hasExpired = fields.some(f => f.status === 'expired');
  const hasNonCompliant = fields.some(f => f.status === 'non_compliant');
  const hasExpiring = fields.some(f => f.status === 'expiring_soon');

  // Also check overall COI expiration
  if (tenant.coi_expiration_date) {
    const overallDays = getDaysUntil(tenant.coi_expiration_date);
    if (overallDays !== null && overallDays < 0) {
      overallStatus = 'expired';
    } else if (overallDays !== null && overallDays <= expiringThresholdDays) {
      if (!hasExpired && !hasNonCompliant) {
        overallStatus = 'expiring';
      }
    }
  }

  if (hasExpired) overallStatus = 'expired';
  else if (hasNonCompliant) overallStatus = 'non-compliant';
  else if (hasExpiring) overallStatus = 'expiring';
  else if (!tenant.coi_document_path && !tenant.coi_uploaded_at) overallStatus = 'pending';

  return {
    overallStatus,
    fields,
    issues,
  };
}

/**
 * Get the confidence level category for a given score
 */
export function getConfidenceLevel(confidence) {
  if (confidence >= 85) return 'high';
  if (confidence >= 60) return 'medium';
  return 'low';
}

/**
 * Get CSS classes for confidence display
 */
export function getConfidenceClasses(confidence) {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'medium':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'low':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

/**
 * Get display info for a requirement source
 */
export function getSourceInfo(source) {
  switch (source) {
    case 'building_default':
      return { label: 'Building Default', color: 'text-blue-600', bg: 'bg-blue-50' };
    case 'lease_extracted':
      return { label: 'Lease Extracted', color: 'text-purple-600', bg: 'bg-purple-50' };
    case 'manual':
      return { label: 'Manual', color: 'text-gray-600', bg: 'bg-gray-50' };
    default:
      return { label: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-50' };
  }
}

/**
 * Get display info for compliance field status
 */
export function getComplianceFieldStatusInfo(status) {
  switch (status) {
    case 'compliant':
      return { label: 'Compliant', icon: 'CheckCircle', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'non_compliant':
      return { label: 'Non-Compliant', icon: 'XCircle', color: 'text-red-600', bg: 'bg-red-50' };
    case 'expiring_soon':
      return { label: 'Expiring Soon', icon: 'AlertCircle', color: 'text-amber-600', bg: 'bg-amber-50' };
    case 'expired':
      return { label: 'Expired', icon: 'XCircle', color: 'text-red-700', bg: 'bg-red-100' };
    case 'not_required':
      return { label: 'Not Required', icon: 'Minus', color: 'text-gray-400', bg: 'bg-gray-50' };
    default:
      return { label: 'Unknown', icon: 'HelpCircle', color: 'text-gray-400', bg: 'bg-gray-50' };
  }
}
