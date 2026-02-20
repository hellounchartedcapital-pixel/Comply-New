import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CertificateReviewClient } from '@/components/compliance/certificate-review-client';
import type {
  Certificate,
  ExtractedCoverage,
  ExtractedEntity,
  TemplateCoverageRequirement,
  PropertyEntity,
  Property,
  Vendor,
  Tenant,
  User,
} from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CertificateReviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) redirect('/login');
  const orgId = profile.organization_id;

  // Fetch certificate
  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (certError || !cert) notFound();
  const certificate = cert as Certificate;

  // Fetch extracted data
  const { data: coverages } = await supabase
    .from('extracted_coverages')
    .select('*')
    .eq('certificate_id', id)
    .order('coverage_type');
  const extractedCoverages = (coverages ?? []) as ExtractedCoverage[];

  const { data: ents } = await supabase
    .from('extracted_entities')
    .select('*')
    .eq('certificate_id', id)
    .order('entity_type')
    .order('entity_name');
  const extractedEntities = (ents ?? []) as ExtractedEntity[];

  // Determine vendor or tenant
  const entityType = certificate.vendor_id ? 'vendor' : 'tenant';
  const entityId = certificate.vendor_id ?? certificate.tenant_id;

  let entityName = '';
  let propertyId: string | null = null;
  let templateId: string | null = null;

  if (entityType === 'vendor' && entityId) {
    const { data: v } = await supabase
      .from('vendors')
      .select('company_name, property_id, template_id')
      .eq('id', entityId)
      .single();
    if (v) {
      entityName = (v as Vendor).company_name;
      propertyId = v.property_id;
      templateId = v.template_id;
    }
  } else if (entityType === 'tenant' && entityId) {
    const { data: t } = await supabase
      .from('tenants')
      .select('company_name, property_id, template_id')
      .eq('id', entityId)
      .single();
    if (t) {
      entityName = (t as Tenant).company_name;
      propertyId = t.property_id;
      templateId = t.template_id;
    }
  }

  // Fetch property
  let property: Property | null = null;
  if (propertyId) {
    const { data: p } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();
    property = p as Property | null;
  }

  // Fetch template requirements
  let templateRequirements: TemplateCoverageRequirement[] = [];
  if (templateId) {
    const { data: reqs } = await supabase
      .from('template_coverage_requirements')
      .select('*')
      .eq('template_id', templateId)
      .order('coverage_type');
    templateRequirements = (reqs ?? []) as TemplateCoverageRequirement[];
  }

  // Fetch property entities
  let propertyEntities: PropertyEntity[] = [];
  if (propertyId) {
    const { data: pes } = await supabase
      .from('property_entities')
      .select('*')
      .eq('property_id', propertyId)
      .order('entity_type')
      .order('entity_name');
    propertyEntities = (pes ?? []) as PropertyEntity[];
  }

  // Fetch reviewer name if already confirmed
  let reviewerName: string | null = null;
  if (certificate.reviewed_by) {
    const { data: reviewer } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', certificate.reviewed_by)
      .single();
    if (reviewer) {
      reviewerName = (reviewer as User).full_name ?? (reviewer as User).email;
    }
  }

  // Fetch org settings for expiration threshold
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();
  const expirationThresholdDays = org?.settings?.expiration_warning_threshold_days ?? 30;

  // Generate signed URL for PDF preview
  let pdfUrl: string | null = null;
  if (certificate.file_path) {
    try {
      const { createServiceClient } = await import('@/lib/supabase/service');
      const serviceClient = createServiceClient();

      // Normalize: strip public URL prefix if stored as full URL
      let storagePath = certificate.file_path;
      const publicUrlPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/coi-documents/`;
      if (storagePath.startsWith(publicUrlPrefix)) {
        storagePath = storagePath.slice(publicUrlPrefix.length);
      } else if (storagePath.startsWith('http')) {
        const idx = storagePath.indexOf('/coi-documents/');
        if (idx !== -1) {
          storagePath = storagePath.slice(idx + '/coi-documents/'.length);
        }
      }

      const { data: signedData, error: signError } = await serviceClient.storage
        .from('coi-documents')
        .createSignedUrl(storagePath, 3600);

      if (!signError && signedData?.signedUrl) {
        pdfUrl = signedData.signedUrl;
      } else {
        console.error('[review/page] Failed to generate PDF signed URL:', signError);
      }
    } catch (err) {
      console.error('[review/page] Error generating PDF signed URL:', err);
    }
  }

  return (
    <CertificateReviewClient
      certificate={certificate}
      extractedCoverages={extractedCoverages}
      extractedEntities={extractedEntities}
      templateRequirements={templateRequirements}
      propertyEntities={propertyEntities}
      entityType={entityType}
      entityId={entityId ?? ''}
      entityName={entityName}
      insuredName={certificate.insured_name ?? null}
      pdfUrl={pdfUrl}
      propertyName={property?.name ?? null}
      reviewerName={reviewerName}
      expirationThresholdDays={expirationThresholdDays}
    />
  );
}
