import { supabase } from '@/lib/supabase';
import type { COIExtractionResult, LeaseExtractionResult } from '@/types';

export async function extractCOI(file: File): Promise<COIExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication required');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/extract-coi`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`COI extraction failed: ${errorText}`);
  }

  return response.json() as Promise<COIExtractionResult>;
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
