// ============================================================================
// SmartCOI — Compliance Calculation Engine
//
// Takes extracted coverages/entities + template requirements + property entities
// and produces compliance_results, entity_compliance_results, and an overall
// compliance status. Used both for real-time preview and for final persistence.
// ============================================================================

import { formatCurrency } from '@/lib/utils';
import type {
  CoverageType,
  LimitType,
  ComplianceStatus,
  ComplianceResultStatus,
  EntityComplianceStatus,
} from '@/types';

// ============================================================================
// Input / output types
// ============================================================================

export interface CoverageInput {
  id?: string; // existing extracted_coverage id (if saved)
  coverage_type: CoverageType;
  carrier_name: string | null;
  policy_number: string | null;
  limit_amount: number | null;
  limit_type: LimitType | null;
  effective_date: string | null;
  expiration_date: string | null;
  additional_insured_listed: boolean;
  waiver_of_subrogation: boolean;
}

export interface EntityInput {
  id?: string;
  entity_name: string;
  entity_address: string | null;
  entity_type: 'certificate_holder' | 'additional_insured';
}

export interface RequirementInput {
  id: string; // template_coverage_requirements.id
  coverage_type: CoverageType;
  is_required: boolean;
  minimum_limit: number | null;
  limit_type: LimitType | null;
  requires_additional_insured: boolean;
  requires_waiver_of_subrogation: boolean;
}

export interface PropertyEntityInput {
  id: string; // property_entities.id
  entity_name: string;
  entity_address: string | null;
  entity_type: 'certificate_holder' | 'additional_insured';
}

export interface CoverageResultRow {
  coverage_requirement_id: string;
  extracted_coverage_id: string | null;
  status: ComplianceResultStatus;
  gap_description: string | null;
}

export interface EntityResultRow {
  property_entity_id: string;
  extracted_entity_id: string | null;
  status: EntityComplianceStatus;
  match_details: string | null;
}

export interface ComplianceCalculationResult {
  coverageResults: CoverageResultRow[];
  entityResults: EntityResultRow[];
  overallStatus: ComplianceStatus;
}

// ============================================================================
// Display helpers
// ============================================================================

const COVERAGE_LABELS: Record<CoverageType, string> = {
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

const LIMIT_TYPE_LABELS: Record<LimitType, string> = {
  per_occurrence: 'Per Occurrence',
  aggregate: 'Aggregate',
  combined_single_limit: 'Combined Single Limit',
  statutory: 'Statutory',
  per_person: 'Per Person',
  per_accident: 'Per Accident',
};

export { COVERAGE_LABELS, LIMIT_TYPE_LABELS };

function fmtCov(type: CoverageType, limitType: LimitType | null): string {
  const base = COVERAGE_LABELS[type] ?? type;
  if (limitType && limitType !== 'statutory') {
    return `${base} (${LIMIT_TYPE_LABELS[limitType] ?? limitType})`;
  }
  return base;
}

function fmtLimit(amount: number | null): string {
  if (amount == null) return 'N/A';
  return formatCurrency(amount);
}

// ============================================================================
// Entity name fuzzy matching
// ============================================================================

function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,;:'"!?()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bl\.?l\.?c\.?\b/g, '')
    .replace(/\blimited liability company\b/g, '')
    .replace(/\binc\.?\b/g, '')
    .replace(/\bincorporated\b/g, '')
    .replace(/\bcorp\.?\b/g, '')
    .replace(/\bcorporation\b/g, '')
    .replace(/\blimited\b/g, '')
    .replace(/\bco\b/g, '')
    .replace(/\bcompany\b/g, '')
    .replace(/\bl\.?p\.?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Improved entity matching: handles cases where a COI lists multiple entities
 * together in one certificate holder block (e.g., "ABC Management, Alturas
 * Stanford LLC, 123 Main St, Boise ID"). Checks substring containment in
 * both directions after normalization, with a word-boundary fallback using
 * the significant words from the required entity name.
 */
function entityNameMatches(
  required: string,
  actual: string
): { matched: boolean; exact: boolean } {
  // 1. Exact case-insensitive match
  if (required.toLowerCase().trim() === actual.toLowerCase().trim()) {
    return { matched: true, exact: true };
  }

  const rNorm = normalizeEntityName(required);
  const aNorm = normalizeEntityName(actual);

  // 2. Normalized exact match
  if (rNorm === aNorm) {
    return { matched: true, exact: false };
  }

  // 3. Substring containment in both directions
  if (aNorm.includes(rNorm) || rNorm.includes(aNorm)) {
    return { matched: true, exact: false };
  }

  // 4. Word-based containment: check if all significant words from the
  //    required entity appear in the actual text (handles multi-entity blocks)
  const rWords = rNorm.split(' ').filter((w) => w.length > 1);
  if (rWords.length >= 2) {
    const allWordsFound = rWords.every((w) => aNorm.includes(w));
    if (allWordsFound) {
      return { matched: true, exact: false };
    }
  }

  return { matched: false, exact: false };
}

// ============================================================================
// Main calculation
// ============================================================================

export function calculateCompliance(
  coverages: CoverageInput[],
  entities: EntityInput[],
  requirements: RequirementInput[],
  propertyEntities: PropertyEntityInput[],
  expirationThresholdDays = 30
): ComplianceCalculationResult {
  const coverageResults: CoverageResultRow[] = [];
  const entityResults: EntityResultRow[] = [];

  const now = new Date();
  const thresholdDate = new Date(
    now.getTime() + expirationThresholdDays * 24 * 60 * 60 * 1000
  );

  let hasExpired = false;
  let hasExpiringSoon = false;
  let hasGap = false;

  // ---- Coverage requirements ----
  for (const req of requirements) {
    // Find matching extracted coverage by type AND limit_type
    const match = coverages.find(
      (c) =>
        c.coverage_type === req.coverage_type &&
        (req.limit_type == null || c.limit_type === req.limit_type)
    );

    if (!match) {
      if (req.is_required) {
        coverageResults.push({
          coverage_requirement_id: req.id,
          extracted_coverage_id: null,
          status: 'missing',
          gap_description: `${fmtCov(req.coverage_type, req.limit_type)} is required but not found on certificate`,
        });
        hasGap = true;
      } else {
        coverageResults.push({
          coverage_requirement_id: req.id,
          extracted_coverage_id: null,
          status: 'not_required',
          gap_description: null,
        });
      }
      continue;
    }

    // Check limit
    let limitMet = true;
    let gapDesc: string | null = null;

    if (req.limit_type === 'statutory') {
      // Statutory — just needs to exist
      limitMet = true;
    } else if (req.minimum_limit != null && match.limit_amount != null) {
      if (match.limit_amount < req.minimum_limit) {
        limitMet = false;
        gapDesc = `${fmtCov(req.coverage_type, req.limit_type)} limit is ${fmtLimit(match.limit_amount)} but requirement is ${fmtLimit(req.minimum_limit)}`;
      }
    } else if (req.minimum_limit != null && match.limit_amount == null) {
      limitMet = false;
      gapDesc = `${fmtCov(req.coverage_type, req.limit_type)} limit could not be determined`;
    }

    // Check endorsements
    if (limitMet && req.requires_additional_insured && !match.additional_insured_listed) {
      limitMet = false;
      gapDesc = `${fmtCov(req.coverage_type, req.limit_type)} requires Additional Insured endorsement but it is not listed`;
    }
    if (limitMet && req.requires_waiver_of_subrogation && !match.waiver_of_subrogation) {
      limitMet = false;
      gapDesc = `${fmtCov(req.coverage_type, req.limit_type)} requires Waiver of Subrogation but it is not listed`;
    }

    // Check expiration
    if (match.expiration_date) {
      const expDate = new Date(match.expiration_date + 'T00:00:00');
      if (expDate < now) {
        hasExpired = true;
      } else if (expDate < thresholdDate) {
        hasExpiringSoon = true;
      }
    }

    if (limitMet) {
      coverageResults.push({
        coverage_requirement_id: req.id,
        extracted_coverage_id: match.id ?? null,
        status: 'met',
        gap_description: null,
      });
    } else {
      coverageResults.push({
        coverage_requirement_id: req.id,
        extracted_coverage_id: match.id ?? null,
        status: 'not_met',
        gap_description: gapDesc,
      });
      if (req.is_required) hasGap = true;
    }
  }

  // ---- Entity requirements ----
  for (const pe of propertyEntities) {
    // Find best matching extracted entity of the same type
    const candidates = entities.filter((e) => e.entity_type === pe.entity_type);
    let bestMatch: { entity: EntityInput; exact: boolean } | null = null;

    for (const candidate of candidates) {
      const result = entityNameMatches(pe.entity_name, candidate.entity_name);
      if (result.matched) {
        bestMatch = { entity: candidate, exact: result.exact };
        if (result.exact) break; // prefer exact match
      }
    }

    if (!bestMatch) {
      entityResults.push({
        property_entity_id: pe.id,
        extracted_entity_id: null,
        status: 'missing',
        match_details: null,
      });
      hasGap = true;
    } else if (bestMatch.exact) {
      entityResults.push({
        property_entity_id: pe.id,
        extracted_entity_id: bestMatch.entity.id ?? null,
        status: 'found',
        match_details: null,
      });
    } else {
      // Fuzzy match — found but with variation
      entityResults.push({
        property_entity_id: pe.id,
        extracted_entity_id: bestMatch.entity.id ?? null,
        status: 'found',
        match_details: `Matched "${bestMatch.entity.entity_name}" (name variation)`,
      });
    }
  }

  // ---- Derive overall status ----
  let overallStatus: ComplianceStatus;
  if (hasGap) {
    overallStatus = 'non_compliant';
  } else if (hasExpired) {
    overallStatus = 'expired';
  } else if (hasExpiringSoon) {
    overallStatus = 'expiring_soon';
  } else {
    overallStatus = 'compliant';
  }

  return { coverageResults, entityResults, overallStatus };
}
