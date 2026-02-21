import { supabase } from '@/lib/supabase';
import type {
  COIExtractionResult,
  RawExtractedCoverage,
  RawExtractedEntity,
  LeaseExtractionResult,
  LeaseExtractedData,
  LeaseExtractedCoverage,
  LeaseExtractedEntityRequirement,
  CoverageType,
  LimitType,
} from '@/types';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function extractCOI(file: File): Promise<COIExtractionResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication required');

  // Validate session against the server (getSession reads from local storage
  // which can be tampered; getUser verifies the JWT with the Supabase server)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Authentication required');

  const pdfBase64 = await fileToBase64(file);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/extract-coi`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pdfBase64, rawOnly: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`COI extraction failed: ${errorText}`);
  }

  const result = await response.json();

  if (!result.success) {
    return {
      success: false,
      coverages: [],
      entities: [],
      confidence_score: 0,
      error: result.error ?? 'Extraction failed',
    };
  }

  return mapRawToCOIResult(result.data);
}

// Maps raw edge-function AI output into our v2 COIExtractionResult format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRawToCOIResult(raw: Record<string, any>): COIExtractionResult {
  const coverages: RawExtractedCoverage[] = [];
  const entities: RawExtractedEntity[] = [];

  // General Liability
  if (raw.generalLiability?.amount != null) {
    coverages.push({
      coverage_type: 'general_liability',
      carrier_name: raw.insuranceCompany ?? null,
      policy_number: null,
      limit_amount: raw.generalLiability.amount,
      limit_type: 'per_occurrence',
      effective_date: null,
      expiration_date: raw.generalLiability.expirationDate ?? null,
      additional_insured_listed: false,
      additional_insured_entities: [],
      waiver_of_subrogation: false,
      raw_text: null,
    });
    if (raw.generalLiability.aggregate != null) {
      coverages.push({
        coverage_type: 'general_liability',
        carrier_name: raw.insuranceCompany ?? null,
        policy_number: null,
        limit_amount: raw.generalLiability.aggregate,
        limit_type: 'aggregate',
        effective_date: null,
        expiration_date: raw.generalLiability.expirationDate ?? null,
        additional_insured_listed: false,
        additional_insured_entities: [],
        waiver_of_subrogation: false,
        raw_text: null,
      });
    }
  }

  // Auto Liability
  if (raw.autoLiability?.amount != null) {
    coverages.push({
      coverage_type: 'automobile_liability',
      carrier_name: raw.insuranceCompany ?? null,
      policy_number: null,
      limit_amount: raw.autoLiability.amount,
      limit_type: 'combined_single_limit',
      effective_date: null,
      expiration_date: raw.autoLiability.expirationDate ?? null,
      additional_insured_listed: false,
      additional_insured_entities: [],
      waiver_of_subrogation: false,
      raw_text: null,
    });
  }

  // Workers' Compensation
  if (raw.workersComp) {
    coverages.push({
      coverage_type: 'workers_compensation',
      carrier_name: raw.insuranceCompany ?? null,
      policy_number: null,
      limit_amount: null,
      limit_type: 'statutory',
      effective_date: null,
      expiration_date: raw.workersComp.expirationDate ?? null,
      additional_insured_listed: false,
      additional_insured_entities: [],
      waiver_of_subrogation: false,
      raw_text: null,
    });
  }

  // Employers Liability
  if (raw.employersLiability?.amount != null) {
    coverages.push({
      coverage_type: 'employers_liability',
      carrier_name: raw.insuranceCompany ?? null,
      policy_number: null,
      limit_amount: raw.employersLiability.amount,
      limit_type: 'per_accident',
      effective_date: null,
      expiration_date: raw.employersLiability.expirationDate ?? null,
      additional_insured_listed: false,
      additional_insured_entities: [],
      waiver_of_subrogation: false,
      raw_text: null,
    });
  }

  // Additional coverages (umbrella, professional, cyber, etc.)
  if (raw.additionalCoverages && Array.isArray(raw.additionalCoverages)) {
    for (const cov of raw.additionalCoverages) {
      if (cov.type) {
        const mappedType = mapCoverageTypeName(cov.type);
        if (mappedType) {
          coverages.push({
            coverage_type: mappedType,
            carrier_name: raw.insuranceCompany ?? null,
            policy_number: null,
            limit_amount: cov.amount ?? null,
            limit_type: 'per_occurrence',
            effective_date: null,
            expiration_date: cov.expirationDate ?? null,
            additional_insured_listed: false,
            additional_insured_entities: [],
            waiver_of_subrogation: false,
            raw_text: null,
          });
        }
      }
    }
  }

  // Certificate holder entity
  if (raw.certificateHolder) {
    entities.push({
      entity_name: raw.certificateHolder,
      entity_address: null,
      entity_type: 'certificate_holder',
    });
  }

  // Additional insured entities
  if (raw.additionalInsuredNames && Array.isArray(raw.additionalInsuredNames)) {
    for (const name of raw.additionalInsuredNames) {
      entities.push({
        entity_name: name,
        entity_address: null,
        entity_type: 'additional_insured',
      });
    }
  }

  return {
    success: true,
    coverages,
    entities,
    confidence_score: 85,
  };
}

function mapCoverageTypeName(name: string): CoverageType | null {
  const lower = name.toLowerCase();
  if (lower.includes('umbrella') || lower.includes('excess')) return 'umbrella_excess_liability';
  if (lower.includes('professional') || lower.includes('e&o')) return 'professional_liability_eo';
  if (lower.includes('cyber')) return 'cyber_liability';
  if (lower.includes('pollution')) return 'pollution_liability';
  if (lower.includes('liquor')) return 'liquor_liability';
  if (lower.includes('property') || lower.includes('inland marine')) return 'property_inland_marine';
  return null;
}

export async function extractLeaseRequirements(file: File): Promise<LeaseExtractionResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication required');

  // Validate session against the server
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Authentication required');

  const pdfBase64 = await fileToBase64(file);

  const payloadSizeMB = (pdfBase64.length * 0.75) / (1024 * 1024);
  if (payloadSizeMB > 5) {
    throw new Error(
      'This file is too large to process. Try uploading just the insurance exhibit or requirements section instead of the full lease.'
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/extract-lease-requirements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pdfBase64 }),
  });

  if (!response.ok) {
    let errorDetail: string;
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || errJson.message || response.statusText;
    } catch {
      errorDetail = await response.text().catch(() => response.statusText);
    }
    throw new Error(errorDetail);
  }

  const result = await response.json();

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? 'Extraction failed',
    };
  }

  return mapRawToLeaseResult(result.data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRawToLeaseResult(raw: Record<string, any>): LeaseExtractionResult {
  const v = (key: string) => raw[key]?.value ?? null;
  const conf = (key: string): number => raw[key]?.confidence ?? 0;
  const ref = (key: string): string | null => raw[key]?.lease_ref ?? null;

  const coverageRequirements: LeaseExtractedCoverage[] = [];
  const entityRequirements: LeaseExtractedEntityRequirement[] = [];

  // Map flat extracted fields to coverage requirements
  if (v('general_liability_per_occurrence') != null) {
    coverageRequirements.push({
      coverage_type: 'general_liability',
      is_required: true,
      minimum_limit: v('general_liability_per_occurrence'),
      limit_type: 'per_occurrence' as LimitType,
      requires_additional_insured: v('additional_insured_entities')?.length > 0,
      requires_waiver_of_subrogation: v('waiver_of_subrogation_required') === true,
      confidence: conf('general_liability_per_occurrence'),
      lease_reference: ref('general_liability_per_occurrence'),
    });
  }

  if (v('general_liability_aggregate') != null) {
    coverageRequirements.push({
      coverage_type: 'general_liability',
      is_required: true,
      minimum_limit: v('general_liability_aggregate'),
      limit_type: 'aggregate' as LimitType,
      requires_additional_insured: false,
      requires_waiver_of_subrogation: false,
      confidence: conf('general_liability_aggregate'),
      lease_reference: ref('general_liability_aggregate'),
    });
  }

  if (v('auto_liability') != null) {
    coverageRequirements.push({
      coverage_type: 'automobile_liability',
      is_required: true,
      minimum_limit: v('auto_liability'),
      limit_type: 'combined_single_limit' as LimitType,
      requires_additional_insured: false,
      requires_waiver_of_subrogation: false,
      confidence: conf('auto_liability'),
      lease_reference: ref('auto_liability'),
    });
  }

  if (v('workers_comp_required') === true) {
    coverageRequirements.push({
      coverage_type: 'workers_compensation',
      is_required: true,
      minimum_limit: null,
      limit_type: 'statutory' as LimitType,
      requires_additional_insured: false,
      requires_waiver_of_subrogation: false,
      confidence: conf('workers_comp_required'),
      lease_reference: ref('workers_comp_required'),
    });
  }

  if (v('employers_liability') != null) {
    coverageRequirements.push({
      coverage_type: 'employers_liability',
      is_required: true,
      minimum_limit: v('employers_liability'),
      limit_type: 'per_accident' as LimitType,
      requires_additional_insured: false,
      requires_waiver_of_subrogation: false,
      confidence: conf('employers_liability'),
      lease_reference: ref('employers_liability'),
    });
  }

  if (v('umbrella_liability') != null) {
    coverageRequirements.push({
      coverage_type: 'umbrella_excess_liability',
      is_required: true,
      minimum_limit: v('umbrella_liability'),
      limit_type: 'per_occurrence' as LimitType,
      requires_additional_insured: false,
      requires_waiver_of_subrogation: false,
      confidence: conf('umbrella_liability'),
      lease_reference: ref('umbrella_liability'),
    });
  }

  if (v('liquor_liability') != null) {
    coverageRequirements.push({
      coverage_type: 'liquor_liability',
      is_required: true,
      minimum_limit: v('liquor_liability'),
      limit_type: 'per_occurrence' as LimitType,
      requires_additional_insured: false,
      requires_waiver_of_subrogation: false,
      confidence: conf('liquor_liability'),
      lease_reference: ref('liquor_liability'),
    });
  }

  // Map additional insured entities
  const aiEntities: string[] = raw.additional_insured_entities?.value ?? [];
  for (const name of aiEntities) {
    entityRequirements.push({
      entity_name: name,
      entity_type: 'additional_insured',
      confidence: conf('additional_insured_entities'),
      lease_reference: ref('additional_insured_entities'),
    });
  }

  const data: LeaseExtractedData = {
    tenant_name: raw.tenant_name?.value ?? null,
    premises_description: raw.premises_description?.value ?? null,
    lease_start_date: raw.lease_start_date?.value ?? null,
    lease_end_date: raw.lease_end_date?.value ?? null,
    coverage_requirements: coverageRequirements,
    entity_requirements: entityRequirements,
  };

  return {
    success: true,
    data,
  };
}

export async function uploadCOIFile(
  file: File,
  entityType: 'vendor' | 'tenant',
  entityId: string
): Promise<string> {
  const fileName = `${entityType}/${entityId}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from('coi-documents')
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('coi-documents')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
