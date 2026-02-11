import { supabase } from '@/lib/supabase';
import type { COIExtractionResult, LeaseExtractionResult, ExtractedCoverage, ExtractedEndorsement } from '@/types';

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
  const formData = new FormData();
  formData.append('file', file);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication required');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/extract-lease-requirements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lease extraction failed: ${errorText}`);
  }

  return response.json() as Promise<LeaseExtractionResult>;
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
