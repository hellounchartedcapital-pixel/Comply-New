import { supabase } from '@/lib/supabase';
import type { Certificate, COIExtractedData } from '@/types';
import type { ComplianceResult } from '@/lib/complianceEngine';

// ============================================
// CERTIFICATE CRUD
// ============================================

export async function fetchCertificates(
  entityType: string,
  entityId: string
): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Certificate[];
}

export async function fetchLatestCertificate(
  entityType: string,
  entityId: string
): Promise<Certificate | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Certificate | null;
}

export async function createCertificate(cert: {
  entity_type: string;
  entity_id: string;
  property_id?: string;
  file_path?: string;
  file_name?: string;
  extracted_data?: COIExtractedData;
  compliance_result?: ComplianceResult;
  overall_status?: string;
  earliest_expiration?: string;
  uploaded_by: string;
}): Promise<Certificate> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('certificates')
    .insert({
      user_id: user.id,
      entity_type: cert.entity_type,
      entity_id: cert.entity_id,
      property_id: cert.property_id || null,
      file_path: cert.file_path || null,
      file_name: cert.file_name || null,
      extracted_data: cert.extracted_data || null,
      compliance_result: cert.compliance_result || null,
      overall_status: cert.overall_status || 'pending',
      earliest_expiration: cert.earliest_expiration || null,
      uploaded_by: cert.uploaded_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Certificate;
}

// ============================================
// FILE UPLOAD TO SUPABASE STORAGE
// ============================================

export async function uploadCOIFile(
  entityType: string,
  entityId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${entityType}/${entityId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage.from('coi-documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;
  return path;
}

// ============================================
// EMAIL LOG
// ============================================

export async function fetchEmailLog(
  entityType: string,
  entityId: string
): Promise<Array<{ id: string; email_type: string; recipient_email: string; sent_at: string; follow_up_count: number }>> {
  const { data, error } = await supabase
    .from('email_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('sent_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
