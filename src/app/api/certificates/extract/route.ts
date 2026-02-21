import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { extractCOIFromPDF } from '@/lib/ai/extraction';
import { checkExtractionLimit } from '@/lib/plan-limits';
import { getActivePlanStatus, PLAN_INACTIVE_TAG } from '@/lib/plan-status';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Create a Supabase client using the request cookies (for auth).
 */
async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignored in route handlers
          }
        },
      },
    }
  );
}

/**
 * POST /api/certificates/extract
 *
 * Body: { certificateId: string }
 *
 * 1. Authenticates the user
 * 2. Fetches the certificate record
 * 3. Downloads the PDF from Supabase Storage using the service role
 * 4. Sends the PDF to Claude for extraction
 * 5. Stores extracted_coverages and extracted_entities rows
 * 6. Logs activity
 */
export async function POST(req: NextRequest) {
  try {
    // ---- Auth ----
    const authClient = await createAuthClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }
    const orgId = profile.organization_id;

    // ---- Active plan check (service client to bypass RLS) ----
    const serviceForPlan = createServiceClient();
    const { data: orgForPlan, error: orgPlanError } = await serviceForPlan
      .from('organizations')
      .select('plan, trial_ends_at')
      .eq('id', orgId)
      .single();
    if (orgPlanError || !orgForPlan) {
      console.error('[extract] org plan lookup failed:', orgPlanError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 403 });
    }
    const planStatus = getActivePlanStatus(orgForPlan);
    if (!planStatus.isActive) {
      return NextResponse.json(
        { error: `${PLAN_INACTIVE_TAG} Subscribe to upload certificates.` },
        { status: 403 }
      );
    }

    // ---- Plan limit check ----
    const limitCheck = await checkExtractionLimit(orgId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: 403 });
    }

    // ---- Parse body ----
    const { certificateId } = await req.json();
    if (!certificateId) {
      return NextResponse.json({ error: 'certificateId is required' }, { status: 400 });
    }

    // ---- Fetch certificate record ----
    const serviceClient = createServiceClient();

    const { data: cert, error: certError } = await serviceClient
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .eq('organization_id', orgId)
      .single();

    if (certError || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    if (!cert.file_path) {
      return NextResponse.json({ error: 'Certificate has no file attached' }, { status: 400 });
    }

    // ---- Download PDF from storage ----
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('coi-documents')
      .download(cert.file_path);

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError);
      await serviceClient
        .from('certificates')
        .update({ processing_status: 'failed' })
        .eq('id', certificateId);
      return NextResponse.json({ error: 'Failed to download PDF from storage' }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const pdfBase64 = buffer.toString('base64');

    // ---- AI extraction ----
    const result = await extractCOIFromPDF(pdfBase64);

    if (!result.success) {
      await serviceClient
        .from('certificates')
        .update({ processing_status: 'failed' })
        .eq('id', certificateId);

      // Log failure (raw error for debugging)
      await serviceClient.from('activity_log').insert({
        organization_id: orgId,
        certificate_id: certificateId,
        vendor_id: cert.vendor_id,
        tenant_id: cert.tenant_id,
        action: 'coi_processed',
        description: `COI extraction failed: ${result.error}`,
        performed_by: user.id,
      });

      // Return user-friendly message to the client
      return NextResponse.json(
        { error: result.userMessage ?? result.error },
        { status: 422 }
      );
    }

    // ---- Store extraction results ----
    // Insert extracted_coverages (explicitly pick known fields — never spread AI output)
    if (result.coverages.length > 0) {
      const coverageRows = result.coverages.map((c) => ({
        certificate_id: certificateId,
        coverage_type: c.coverage_type,
        carrier_name: c.carrier_name,
        policy_number: c.policy_number,
        limit_amount: c.limit_amount,
        limit_type: c.limit_type,
        effective_date: c.effective_date,
        expiration_date: c.expiration_date,
        additional_insured_listed: c.additional_insured_listed,
        additional_insured_entities: c.additional_insured_entities,
        waiver_of_subrogation: c.waiver_of_subrogation,
        confidence_flag: c.confidence_flag,
        raw_extracted_text: c.raw_extracted_text,
      }));
      const { error: covError } = await serviceClient
        .from('extracted_coverages')
        .insert(coverageRows);
      if (covError) {
        console.error('Failed to insert extracted_coverages:', covError);
      }
    }

    // Insert extracted_entities (explicitly pick known fields)
    if (result.entities.length > 0) {
      const entityRows = result.entities.map((e) => ({
        certificate_id: certificateId,
        entity_name: e.entity_name,
        entity_address: e.entity_address,
        entity_type: e.entity_type,
        confidence_flag: e.confidence_flag,
      }));
      const { error: entError } = await serviceClient
        .from('extracted_entities')
        .insert(entityRows);
      if (entError) {
        console.error('Failed to insert extracted_entities:', entError);
      }
    }

    // Update certificate status and store insured name for vendor name matching
    await serviceClient
      .from('certificates')
      .update({
        processing_status: 'extracted',
        ...(result.insuredName ? { insured_name: result.insuredName } : {}),
      })
      .eq('id', certificateId);

    // ---- Log activity ----
    await serviceClient.from('activity_log').insert({
      organization_id: orgId,
      certificate_id: certificateId,
      vendor_id: cert.vendor_id,
      tenant_id: cert.tenant_id,
      action: 'coi_processed',
      description: `COI processed successfully — ${result.coverages.length} coverage(s) and ${result.entities.length} entity/entities extracted.`,
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      certificateId,
      coverages: result.coverages.length,
      entities: result.entities.length,
    });
  } catch (err) {
    console.error('Certificate extraction error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
