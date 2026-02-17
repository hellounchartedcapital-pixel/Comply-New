import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VendorDetailClient } from '@/components/compliance/vendor-detail-client';
import type {
  Vendor,
  Property,
  RequirementTemplate,
  TemplateCoverageRequirement,
  ExtractedCoverage,
  ComplianceResult,
  EntityComplianceResult,
  PropertyEntity,
  Certificate,
  Notification,
} from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VendorDetailPage({ params }: Props) {
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

  // Fetch vendor
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .single();

  if (vendorError || !vendor) notFound();
  const v = vendor as Vendor;

  // Fetch property
  let property: Property | null = null;
  if (v.property_id) {
    const { data: prop } = await supabase
      .from('properties')
      .select('*')
      .eq('id', v.property_id)
      .single();
    property = prop as Property | null;
  }

  // Fetch assigned template with coverage requirements
  let template: RequirementTemplate | null = null;
  let templateRequirements: TemplateCoverageRequirement[] = [];
  if (v.template_id) {
    const { data: tpl } = await supabase
      .from('requirement_templates')
      .select('*')
      .eq('id', v.template_id)
      .single();
    template = tpl as RequirementTemplate | null;

    if (template) {
      const { data: reqs } = await supabase
        .from('template_coverage_requirements')
        .select('*')
        .eq('template_id', template.id)
        .order('coverage_type');
      templateRequirements = (reqs ?? []) as TemplateCoverageRequirement[];
    }
  }

  // Fetch most recent confirmed certificate
  let extractedCoverages: ExtractedCoverage[] = [];
  let complianceResults: ComplianceResult[] = [];
  let entityResults: EntityComplianceResult[] = [];
  let hasCertificate = false;

  const { data: latestCert } = await supabase
    .from('certificates')
    .select('id')
    .eq('vendor_id', v.id)
    .eq('processing_status', 'review_confirmed')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  if (latestCert) {
    hasCertificate = true;

    const { data: coverages } = await supabase
      .from('extracted_coverages')
      .select('*')
      .eq('certificate_id', latestCert.id);
    extractedCoverages = (coverages ?? []) as ExtractedCoverage[];

    const { data: results } = await supabase
      .from('compliance_results')
      .select('*')
      .eq('certificate_id', latestCert.id);
    complianceResults = (results ?? []) as ComplianceResult[];

    const { data: entResults } = await supabase
      .from('entity_compliance_results')
      .select('*')
      .eq('certificate_id', latestCert.id);
    entityResults = (entResults ?? []) as EntityComplianceResult[];
  }

  // If no confirmed cert, check if any cert exists at all
  if (!hasCertificate) {
    const { count } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', v.id);
    if ((count ?? 0) > 0) hasCertificate = true;
  }

  // Fetch property entities
  let propertyEntities: PropertyEntity[] = [];
  if (v.property_id) {
    const { data: entities } = await supabase
      .from('property_entities')
      .select('*')
      .eq('property_id', v.property_id)
      .order('entity_type')
      .order('entity_name');
    propertyEntities = (entities ?? []) as PropertyEntity[];
  }

  // Fetch all certificates for this vendor
  const { data: allCerts } = await supabase
    .from('certificates')
    .select('*, compliance_results(*)')
    .eq('vendor_id', v.id)
    .order('uploaded_at', { ascending: false });
  const certificates = (allCerts ?? []) as (Certificate & { compliance_results?: ComplianceResult[] })[];

  // Fetch notifications
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('vendor_id', v.id)
    .eq('organization_id', orgId)
    .order('scheduled_date', { ascending: false });
  const notifications = (notifs ?? []) as Notification[];

  // Fetch org templates for the edit dialog
  const { data: orgTemplates } = await supabase
    .from('requirement_templates')
    .select('*')
    .eq('organization_id', orgId)
    .order('category')
    .order('name');

  return (
    <VendorDetailClient
      vendor={v}
      property={property}
      template={template}
      templateRequirements={templateRequirements}
      extractedCoverages={extractedCoverages}
      complianceResults={complianceResults}
      entityResults={entityResults}
      propertyEntities={propertyEntities}
      certificates={certificates}
      notifications={notifications}
      orgTemplates={(orgTemplates ?? []) as RequirementTemplate[]}
      hasCertificate={hasCertificate}
    />
  );
}
