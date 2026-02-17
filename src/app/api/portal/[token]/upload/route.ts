import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF
const MAX_UPLOADS_PER_HOUR = 5;

interface TokenData {
  id: string;
  vendor_id: string | null;
  tenant_id: string | null;
  token: string;
  expires_at: string;
  is_active: boolean;
}

async function validateToken(
  supabase: ReturnType<typeof createServiceClient>,
  token: string
): Promise<{ valid: false; error: string; status: number } | { valid: true; data: TokenData }> {
  const { data, error } = await supabase
    .from('upload_portal_tokens')
    .select('id, vendor_id, tenant_id, token, expires_at, is_active')
    .eq('token', token)
    .single();

  if (error || !data) {
    return { valid: false, error: 'This upload link is no longer active.', status: 404 };
  }

  if (!data.is_active) {
    return { valid: false, error: 'This upload link is no longer active.', status: 410 };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'This upload link has expired.', status: 410 };
  }

  return { valid: true, data };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createServiceClient();

    // Validate token
    const tokenResult = await validateToken(supabase, token);
    if (!tokenResult.valid) {
      return NextResponse.json(
        { error: tokenResult.error },
        { status: tokenResult.status }
      );
    }
    const tokenData = tokenResult.data;

    const entityType = tokenData.vendor_id ? 'vendor' : 'tenant';
    const entityId = (tokenData.vendor_id ?? tokenData.tenant_id)!;

    // Rate limit: max 5 uploads per hour for this entity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const rateQuery = supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq(entityType === 'vendor' ? 'vendor_id' : 'tenant_id', entityId)
      .gte('uploaded_at', oneHourAgo);

    const { count: recentUploads } = await rateQuery;
    if ((recentUploads ?? 0) >= MAX_UPLOADS_PER_HOUR) {
      return NextResponse.json(
        { error: "You've reached the upload limit. Please try again later." },
        { status: 429 }
      );
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 10 MB.' },
        { status: 400 }
      );
    }

    // Read file bytes for validation and hashing
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Validate PDF magic bytes
    const isPdf = PDF_MAGIC_BYTES.every((b, i) => uint8[i] === b);
    if (!isPdf) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF files are accepted.' },
        { status: 400 }
      );
    }

    // Compute file hash
    const fileHash = crypto
      .createHash('sha256')
      .update(Buffer.from(arrayBuffer))
      .digest('hex');

    // Check for duplicate upload
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq(entityType === 'vendor' ? 'vendor_id' : 'tenant_id', entityId)
      .eq('file_hash', fileHash)
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This certificate has already been uploaded.' },
        { status: 409 }
      );
    }

    // Get organization_id from the vendor/tenant
    const { data: entityData, error: entityError } = await supabase
      .from(entityType === 'vendor' ? 'vendors' : 'tenants')
      .select('organization_id')
      .eq('id', entityId)
      .single();

    if (entityError || !entityData) {
      return NextResponse.json(
        { error: 'Unable to process your upload. Please contact your property manager.' },
        { status: 500 }
      );
    }

    const organizationId = entityData.organization_id;

    // Upload file to Supabase Storage
    const filePath = `${entityType}/${entityId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('coi-documents')
      .upload(filePath, Buffer.from(arrayBuffer), {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload file. Please try again.' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('coi-documents')
      .getPublicUrl(filePath);

    // Create certificate record
    const certRecord: Record<string, unknown> = {
      organization_id: organizationId,
      file_path: urlData.publicUrl,
      file_hash: fileHash,
      upload_source: 'portal_upload',
      processing_status: 'processing',
    };
    if (entityType === 'vendor') {
      certRecord.vendor_id = entityId;
    } else {
      certRecord.tenant_id = entityId;
    }

    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .insert(certRecord)
      .select('id')
      .single();

    if (certError || !certificate) {
      return NextResponse.json(
        { error: 'Failed to create certificate record. Please try again.' },
        { status: 500 }
      );
    }

    // Update vendor/tenant compliance status to under_review
    await supabase
      .from(entityType === 'vendor' ? 'vendors' : 'tenants')
      .update({ compliance_status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', entityId);

    // Log activity
    const entityField = entityType === 'vendor' ? 'vendor_id' : 'tenant_id';
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      [entityField]: entityId,
      certificate_id: certificate.id,
      action: 'portal_upload_received',
      description: `New COI uploaded via self-service portal`,
    });

    return NextResponse.json({
      certificate_id: certificate.id,
      message: 'File uploaded successfully.',
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
