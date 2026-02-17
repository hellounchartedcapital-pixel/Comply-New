import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

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

    // Parse request body
    const { certificate_id } = await request.json();
    if (!certificate_id) {
      return NextResponse.json(
        { error: 'Missing certificate_id.' },
        { status: 400 }
      );
    }

    // Verify the certificate belongs to this entity
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .select('id, file_path, organization_id, vendor_id, tenant_id, processing_status')
      .eq('id', certificate_id)
      .single();

    if (certError || !cert) {
      return NextResponse.json(
        { error: 'Certificate not found.' },
        { status: 404 }
      );
    }

    // Verify the certificate belongs to the entity associated with this token
    const certEntityId = entityType === 'vendor' ? cert.vendor_id : cert.tenant_id;
    if (certEntityId !== entityId) {
      return NextResponse.json(
        { error: 'Certificate not found.' },
        { status: 404 }
      );
    }

    // Download the PDF from storage to get base64
    // Extract the storage path from the public URL
    const publicUrlPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/coi-documents/`;
    let storagePath = cert.file_path;
    if (storagePath.startsWith(publicUrlPrefix)) {
      storagePath = storagePath.slice(publicUrlPrefix.length);
    } else if (storagePath.startsWith('http')) {
      // Try to extract path after /coi-documents/
      const idx = storagePath.indexOf('/coi-documents/');
      if (idx !== -1) {
        storagePath = storagePath.slice(idx + '/coi-documents/'.length);
      }
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('coi-documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      // Update certificate status to failed
      await supabase
        .from('certificates')
        .update({ processing_status: 'failed' })
        .eq('id', certificate_id);

      return NextResponse.json(
        { error: 'Failed to process your document. Please try again.' },
        { status: 500 }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Call the extract-coi edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-coi`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_base64: base64,
        file_name: storagePath.split('/').pop() ?? 'certificate.pdf',
      }),
    });

    if (!extractResponse.ok) {
      await supabase
        .from('certificates')
        .update({ processing_status: 'failed' })
        .eq('id', certificate_id);

      return NextResponse.json(
        { error: 'Failed to process your document. Please try again.' },
        { status: 500 }
      );
    }

    const extractResult = await extractResponse.json();

    if (!extractResult.success) {
      await supabase
        .from('certificates')
        .update({ processing_status: 'failed' })
        .eq('id', certificate_id);

      return NextResponse.json(
        { error: 'Failed to process your document. Please try again.' },
        { status: 500 }
      );
    }

    const data = extractResult.data;

    // Store extracted coverages
    const coverages: Record<string, unknown>[] = [];

    if (data.general_liability_per_occurrence != null) {
      const policy = data.policies?.find((p: { coverage_type: string }) =>
        p.coverage_type?.toLowerCase().includes('general')
      );
      coverages.push({
        certificate_id,
        coverage_type: 'general_liability',
        carrier_name: policy?.carrier ?? null,
        policy_number: policy?.policy_number ?? null,
        limit_amount: data.general_liability_per_occurrence,
        limit_type: 'per_occurrence',
        effective_date: policy?.effective_date ?? null,
        expiration_date: policy?.expiration_date ?? null,
        additional_insured_listed: (data.additional_insured_names?.length ?? 0) > 0,
        additional_insured_entities: data.additional_insured_names ?? [],
        waiver_of_subrogation: false,
        confidence_flag: true,
      });
    }

    if (data.general_liability_aggregate != null) {
      const policy = data.policies?.find((p: { coverage_type: string }) =>
        p.coverage_type?.toLowerCase().includes('general')
      );
      coverages.push({
        certificate_id,
        coverage_type: 'general_liability',
        carrier_name: policy?.carrier ?? null,
        policy_number: policy?.policy_number ?? null,
        limit_amount: data.general_liability_aggregate,
        limit_type: 'aggregate',
        effective_date: policy?.effective_date ?? null,
        expiration_date: policy?.expiration_date ?? null,
        additional_insured_listed: false,
        additional_insured_entities: [],
        waiver_of_subrogation: false,
        confidence_flag: true,
      });
    }

    if (data.auto_liability != null) {
      const policy = data.policies?.find((p: { coverage_type: string }) =>
        p.coverage_type?.toLowerCase().includes('auto')
      );
      coverages.push({
        certificate_id,
        coverage_type: 'automobile_liability',
        carrier_name: policy?.carrier ?? null,
        policy_number: policy?.policy_number ?? null,
        limit_amount: data.auto_liability,
        limit_type: 'combined_single_limit',
        effective_date: policy?.effective_date ?? null,
        expiration_date: policy?.expiration_date ?? null,
        additional_insured_listed: false,
        additional_insured_entities: [],
        waiver_of_subrogation: false,
        confidence_flag: true,
      });
    }

    if (data.workers_comp_found) {
      const policy = data.policies?.find((p: { coverage_type: string }) =>
        p.coverage_type?.toLowerCase().includes('worker')
      );
      coverages.push({
        certificate_id,
        coverage_type: 'workers_compensation',
        carrier_name: policy?.carrier ?? null,
        policy_number: policy?.policy_number ?? null,
        limit_amount: null,
        limit_type: 'statutory',
        effective_date: policy?.effective_date ?? null,
        expiration_date: policy?.expiration_date ?? null,
        additional_insured_listed: false,
        additional_insured_entities: [],
        waiver_of_subrogation: false,
        confidence_flag: true,
      });
    }

    if (data.employers_liability != null) {
      const policy = data.policies?.find((p: { coverage_type: string }) =>
        p.coverage_type?.toLowerCase().includes('employer')
      );
      coverages.push({
        certificate_id,
        coverage_type: 'employers_liability',
        carrier_name: policy?.carrier ?? null,
        policy_number: policy?.policy_number ?? null,
        limit_amount: data.employers_liability,
        limit_type: 'per_accident',
        effective_date: policy?.effective_date ?? null,
        expiration_date: policy?.expiration_date ?? null,
        additional_insured_listed: false,
        additional_insured_entities: [],
        waiver_of_subrogation: false,
        confidence_flag: true,
      });
    }

    if (data.umbrella_per_occurrence != null || data.umbrella_aggregate != null) {
      const policy = data.policies?.find((p: { coverage_type: string }) =>
        p.coverage_type?.toLowerCase().includes('umbrella') ||
        p.coverage_type?.toLowerCase().includes('excess')
      );
      coverages.push({
        certificate_id,
        coverage_type: 'umbrella_excess_liability',
        carrier_name: policy?.carrier ?? null,
        policy_number: policy?.policy_number ?? null,
        limit_amount: data.umbrella_per_occurrence ?? data.umbrella_aggregate,
        limit_type: data.umbrella_per_occurrence ? 'per_occurrence' : 'aggregate',
        effective_date: policy?.effective_date ?? null,
        expiration_date: policy?.expiration_date ?? null,
        additional_insured_listed: false,
        additional_insured_entities: [],
        waiver_of_subrogation: false,
        confidence_flag: true,
      });
    }

    // Insert extracted coverages
    if (coverages.length > 0) {
      await supabase.from('extracted_coverages').insert(coverages);
    }

    // Store extracted entities
    const entities: Record<string, unknown>[] = [];

    if (data.certificate_holder_name) {
      entities.push({
        certificate_id,
        entity_name: data.certificate_holder_name,
        entity_address: data.certificate_holder_address ?? null,
        entity_type: 'certificate_holder',
        confidence_flag: true,
      });
    }

    if (data.additional_insured_names?.length) {
      for (const name of data.additional_insured_names) {
        entities.push({
          certificate_id,
          entity_name: name,
          entity_address: null,
          entity_type: 'additional_insured',
          confidence_flag: true,
        });
      }
    }

    if (entities.length > 0) {
      await supabase.from('extracted_entities').insert(entities);
    }

    // Update certificate status
    await supabase
      .from('certificates')
      .update({ processing_status: 'extracted' })
      .eq('id', certificate_id);

    // Log processing activity
    await supabase.from('activity_log').insert({
      organization_id: cert.organization_id,
      [entityType === 'vendor' ? 'vendor_id' : 'tenant_id']: entityId,
      certificate_id,
      action: 'coi_processed',
      description: 'COI processed via self-service portal',
    });

    // Notify the PM - get the organization's users
    const { data: entityInfo } = await supabase
      .from(entityType === 'vendor' ? 'vendors' : 'tenants')
      .select('company_name, organization_id, property_id')
      .eq('id', entityId)
      .single();

    if (entityInfo) {
      // Create a notification record for the PM
      const { data: orgUsers } = await supabase
        .from('users')
        .select('id, email')
        .eq('organization_id', entityInfo.organization_id)
        .limit(1);

      if (orgUsers && orgUsers.length > 0) {
        await supabase.from('notifications').insert({
          organization_id: entityInfo.organization_id,
          [entityType === 'vendor' ? 'vendor_id' : 'tenant_id']: entityId,
          type: 'gap_notification',
          scheduled_date: new Date().toISOString(),
          sent_date: new Date().toISOString(),
          status: 'sent',
          email_subject: `New COI uploaded by ${entityInfo.company_name} via self-service portal`,
          email_body: `${entityInfo.company_name} has uploaded a new Certificate of Insurance through the self-service portal. Please review it at your earliest convenience.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate processed successfully.',
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
