import { supabase } from '@/lib/supabase';
import type { COIExtractionResult, LeaseExtractionResult, LeaseExtractedData, ExtractedCoverage, ExtractedEndorsement } from '@/types';

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
      endorsements: [],
      confidence_score: 0,
      error: result.error ?? 'Extraction failed',
    };
  }

  // Map the raw AI extraction to our COIExtractionResult format
  const raw = result.data;
  return mapRawToCOIResult(raw);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRawToCOIResult(raw: Record<string, any>): COIExtractionResult {
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
  const certHolderText = raw.certificateHolder ?? '';

  if (raw.additionalInsured) {
    endorsements.push({
      type: 'Additional Insured',
      present: (raw.additionalInsured || '').toLowerCase() === 'yes',
      // Store the certificate holder text as endorsement details so the
      // compliance engine can verify entity names against it. On ACORD 25
      // forms, the AI entity name typically appears in the Certificate
      // Holder section at the bottom of the form.
      details: certHolderText || undefined,
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
    certificate_holder: certHolderText || undefined,
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
  // Each AI-extracted field is { value, confidence, lease_ref }
  // We flatten to just the values for LeaseExtractedData
  const v = (key: string) => raw[key]?.value ?? null;

  const data: LeaseExtractedData = {
    tenant_name: raw.tenant_name?.value ?? null,
    premises_description: raw.premises_description?.value ?? null,
    lease_start_date: raw.lease_start_date?.value ?? null,
    lease_end_date: raw.lease_end_date?.value ?? null,
    general_liability_per_occurrence: v('general_liability_per_occurrence'),
    general_liability_aggregate: v('general_liability_aggregate'),
    auto_liability: v('auto_liability'),
    workers_comp_required: v('workers_comp_required') === true,
    employers_liability: v('employers_liability'),
    umbrella_liability: v('umbrella_liability'),
    property_insurance_required: v('property_insurance_required') === true,
    business_interruption_required: v('business_interruption_required') === true,
    business_interruption_minimum: v('business_interruption_minimum'),
    liquor_liability: v('liquor_liability'),
    additional_insured_entities: raw.additional_insured_entities?.value ?? [],
    waiver_of_subrogation_required: v('waiver_of_subrogation_required') === true,
    loss_payee_required: v('loss_payee_required') === true,
    insurer_rating_minimum: v('insurer_rating_minimum'),
    cancellation_notice_days: v('cancellation_notice_days'),
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
