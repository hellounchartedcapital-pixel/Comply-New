import { supabase } from '@/lib/supabase';
import type { COIExtractionResult, LeaseExtractionResult, ExtractedCoverage, ExtractedEndorsement, CoverageRequirement } from '@/types';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g., "data:application/pdf;base64,")
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

  const pdfBase64 = await fileToBase64(file);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
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
      endorsements: [],
      confidence_score: 0,
      error: result.error ?? 'Extraction failed',
    };
  }

  // Map the raw AI extraction to our COIExtractionResult format
  const raw = result.data;
  return mapRawToCOIResult(raw);
}

function mapRawToCOIResult(raw: any): COIExtractionResult {
  const coverages: ExtractedCoverage[] = [];

  // General Liability
  if (raw.generalLiability && raw.generalLiability.amount != null) {
    coverages.push({
      type: 'General Liability',
      occurrence_limit: raw.generalLiability.amount,
      aggregate_limit: raw.generalLiability.aggregate ?? undefined,
      expiration_date: raw.generalLiability.expirationDate ?? undefined,
      confidence_score: 90,
    });
  }

  // Auto Liability
  if (raw.autoLiability && raw.autoLiability.amount != null) {
    coverages.push({
      type: 'Automobile Liability',
      combined_single_limit: raw.autoLiability.amount,
      expiration_date: raw.autoLiability.expirationDate ?? undefined,
      confidence_score: 90,
    });
  }

  // Workers' Compensation
  if (raw.workersComp) {
    coverages.push({
      type: "Workers' Compensation",
      is_statutory: true,
      expiration_date: raw.workersComp.expirationDate ?? undefined,
      confidence_score: 90,
    });
  }

  // Employers Liability
  if (raw.employersLiability && raw.employersLiability.amount != null) {
    coverages.push({
      type: "Employers' Liability",
      occurrence_limit: raw.employersLiability.amount,
      expiration_date: raw.employersLiability.expirationDate ?? undefined,
      confidence_score: 85,
    });
  }

  // Additional coverages (umbrella, professional, cyber, etc.)
  if (raw.additionalCoverages && Array.isArray(raw.additionalCoverages)) {
    for (const cov of raw.additionalCoverages) {
      if (cov.type) {
        coverages.push({
          type: cov.type,
          occurrence_limit: cov.amount ?? undefined,
          aggregate_limit: cov.aggregate ?? undefined,
          expiration_date: cov.expirationDate ?? undefined,
          confidence_score: 80,
        });
      }
    }
  }

  // Endorsements
  const endorsements: ExtractedEndorsement[] = [];
  if (raw.additionalInsured) {
    endorsements.push({
      type: 'Additional Insured',
      present: (raw.additionalInsured || '').toLowerCase() === 'yes',
      confidence_score: 85,
    });
  }
  if (raw.waiverOfSubrogation) {
    endorsements.push({
      type: 'Waiver of Subrogation',
      present: (raw.waiverOfSubrogation || '').toLowerCase() === 'yes',
      confidence_score: 85,
    });
  }

  return {
    success: true,
    carrier: raw.insuranceCompany ?? undefined,
    named_insured: raw.companyName ?? undefined,
    expiration_date: raw.expirationDate ?? undefined,
    coverages,
    endorsements,
    confidence_score: 85,
  };
}

export async function extractLeaseRequirements(file: File): Promise<LeaseExtractionResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication required');

  const pdfBase64 = await fileToBase64(file);

  // Check if payload might be too large for edge function (approx 6MB limit for Supabase)
  const payloadSizeMB = (pdfBase64.length * 0.75) / (1024 * 1024);
  if (payloadSizeMB > 5) {
    throw new Error(
      'This file is too large to process. Try uploading just the insurance exhibit or requirements section instead of the full lease.'
    );
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
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
      requirements: {},
      error: result.error ?? 'Extraction failed',
    };
  }

  return mapRawToLeaseResult(result.data);
}

function mapRawToLeaseResult(raw: any): LeaseExtractionResult {
  // The new universal schema uses snake_case flat fields
  // Each field is { value, confidence, lease_ref }
  const f = (key: string) => raw[key] ?? undefined;

  // Build the extracted fields map (universal schema)
  const extracted: LeaseExtractionResult['extracted'] = {
    general_liability_per_occurrence: f('general_liability_per_occurrence'),
    general_liability_aggregate: f('general_liability_aggregate'),
    general_liability_must_be_occurrence_basis: f('general_liability_must_be_occurrence_basis'),
    auto_liability: f('auto_liability'),
    auto_liability_includes_hired_non_owned: f('auto_liability_includes_hired_non_owned'),
    workers_comp_required: f('workers_comp_required'),
    employers_liability: f('employers_liability'),
    umbrella_liability: f('umbrella_liability'),
    property_insurance_required: f('property_insurance_required'),
    property_insurance_type: f('property_insurance_type'),
    property_insurance_amount: f('property_insurance_amount'),
    property_coverage_includes_tenant_improvements: f('property_coverage_includes_tenant_improvements'),
    business_interruption_required: f('business_interruption_required'),
    business_interruption_minimum: f('business_interruption_minimum'),
    professional_liability: f('professional_liability'),
    liquor_liability: f('liquor_liability'),
    pollution_liability: f('pollution_liability'),
    cyber_liability: f('cyber_liability'),
    product_liability: f('product_liability'),
    additional_insured_required: f('additional_insured_required'),
    additional_insured_entities: f('additional_insured_entities'),
    waiver_of_subrogation_required: f('waiver_of_subrogation_required'),
    loss_payee_required: f('loss_payee_required'),
    loss_payee_entities: f('loss_payee_entities'),
    certificate_holder_name: f('certificate_holder_name'),
    certificate_holder_address: f('certificate_holder_address'),
    insurer_rating_minimum: f('insurer_rating_minimum'),
    cancellation_notice_days: f('cancellation_notice_days'),
    renewal_proof_days_before_expiry: f('renewal_proof_days_before_expiry'),
  };

  // Also build a legacy RequirementProfile for backwards compat with the review form
  const reqs: LeaseExtractionResult['requirements'] = {};

  function covReq(
    occ: { value?: number | null; confidence?: number; lease_ref?: string } | undefined,
    agg: { value?: number | null; confidence?: number; lease_ref?: string } | undefined,
    opts?: { is_statutory?: boolean }
  ): CoverageRequirement | undefined {
    if (!occ?.value && !agg?.value && !opts?.is_statutory) return undefined;
    return {
      occurrence_limit: occ?.value ?? undefined,
      aggregate_limit: agg?.value ?? undefined,
      is_statutory: opts?.is_statutory,
      required: true,
      source: 'lease_extracted',
      confidence_score: occ?.confidence ?? agg?.confidence ?? 0,
      source_reference: occ?.lease_ref ?? agg?.lease_ref,
    };
  }

  const gl = covReq(raw.general_liability_per_occurrence, raw.general_liability_aggregate);
  if (gl) reqs.general_liability = gl;

  const auto = covReq(raw.auto_liability, undefined);
  if (auto) reqs.automobile_liability = auto;

  const wcStatutory = raw.workers_comp_required?.value === true;
  const wc = covReq(raw.employers_liability, undefined, { is_statutory: wcStatutory });
  if (wc || wcStatutory) {
    reqs.workers_compensation = wc ?? {
      required: true,
      is_statutory: true,
      source: 'lease_extracted',
      confidence_score: raw.workers_comp_required?.confidence ?? 0,
      source_reference: raw.workers_comp_required?.lease_ref,
    };
  }

  const umbrella = covReq(raw.umbrella_liability, undefined);
  if (umbrella) reqs.umbrella_excess = umbrella;

  const prof = covReq(raw.professional_liability, undefined);
  if (prof) reqs.professional_liability = prof;

  const prop = covReq(raw.property_insurance_amount, undefined);
  if (prop || raw.property_insurance_required?.value === true) {
    reqs.property_insurance = prop ?? {
      required: true,
      source: 'lease_extracted',
      confidence_score: raw.property_insurance_required?.confidence ?? 0,
      source_reference: raw.property_insurance_required?.lease_ref,
    };
  }

  if (raw.business_interruption_required?.value === true) {
    reqs.business_interruption = {
      required: true,
      source: 'lease_extracted',
      confidence_score: raw.business_interruption_required?.confidence ?? 0,
      source_reference: raw.business_interruption_required?.lease_ref,
    };
  }

  // Endorsements
  if (raw.additional_insured_required?.value === true) {
    reqs.additional_insured = {
      required: true,
      entities: raw.additional_insured_entities?.value ?? [],
      source: 'lease_extracted',
      confidence_score: raw.additional_insured_required?.confidence ?? 0,
      source_reference: raw.additional_insured_required?.lease_ref,
    };
  }

  if (raw.waiver_of_subrogation_required?.value === true) {
    reqs.waiver_of_subrogation = {
      required: true,
      source: 'lease_extracted',
      confidence_score: raw.waiver_of_subrogation_required?.confidence ?? 0,
      source_reference: raw.waiver_of_subrogation_required?.lease_ref,
    };
  }

  if (raw.loss_payee_required?.value === true) {
    reqs.loss_payee = {
      required: true,
      entities: raw.loss_payee_entities?.value ?? [],
      source: 'lease_extracted',
      confidence_score: raw.loss_payee_required?.confidence ?? 0,
      source_reference: raw.loss_payee_required?.lease_ref,
    };
  }

  if (raw.certificate_holder_name?.value) {
    reqs.certificate_holder = {
      required: true,
      name: raw.certificate_holder_name.value,
      address: raw.certificate_holder_address?.value,
      source: 'lease_extracted',
      confidence_score: raw.certificate_holder_name?.confidence ?? 0,
      source_reference: raw.certificate_holder_name?.lease_ref,
    };
  }

  if (raw.cancellation_notice_days?.value) {
    reqs.notice_of_cancellation_days = {
      value: raw.cancellation_notice_days.value,
      source: 'lease_extracted',
      confidence_score: raw.cancellation_notice_days?.confidence ?? 0,
      source_reference: raw.cancellation_notice_days?.lease_ref,
    };
  }

  return {
    success: true,
    document_type: raw.document_type,
    document_type_confidence: raw.document_type_confidence,
    tenant_name: raw.tenant_name?.value ?? undefined,
    property_address: raw.property_address?.value ?? undefined,
    premises_description: raw.premises_description?.value ?? undefined,
    lease_start: raw.lease_start_date?.value ?? undefined,
    lease_end: raw.lease_end_date?.value ?? undefined,
    extracted,
    requirements: reqs,
    extraction_notes: raw.extraction_notes,
    references_external_docs: raw.references_external_documents,
    external_doc_references: raw.external_document_references,
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
