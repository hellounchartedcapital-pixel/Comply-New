import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PropertyDetailClient } from '@/components/properties/property-detail-client';
import { formatDate } from '@/lib/utils';
import type { Vendor, Tenant, RequirementTemplate } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

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

  // Fetch property
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (propError || !property) notFound();

  // Fetch entities
  const { data: entities } = await supabase
    .from('property_entities')
    .select('*')
    .eq('property_id', id)
    .order('entity_type')
    .order('entity_name');

  // Fetch vendors (not soft-deleted) with their templates
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*, template:requirement_templates(id, name)')
    .eq('property_id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('company_name');

  // Fetch tenants (not soft-deleted) with their templates
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, template:requirement_templates(id, name)')
    .eq('property_id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('company_name');

  // Fetch latest COI date per vendor
  const vendorList = (vendors ?? []) as (Vendor & {
    template?: RequirementTemplate | null;
    latest_coi_date?: string | null;
  })[];

  for (const v of vendorList) {
    const { data: latestCert } = await supabase
      .from('certificates')
      .select('uploaded_at')
      .eq('vendor_id', v.id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    v.latest_coi_date = latestCert?.uploaded_at
      ? formatDate(latestCert.uploaded_at.split('T')[0])
      : null;
  }

  // Fetch latest COI date per tenant
  const tenantList = (tenants ?? []) as (Tenant & {
    template?: RequirementTemplate | null;
    latest_coi_date?: string | null;
  })[];

  for (const t of tenantList) {
    const { data: latestCert } = await supabase
      .from('certificates')
      .select('uploaded_at')
      .eq('tenant_id', t.id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    t.latest_coi_date = latestCert?.uploaded_at
      ? formatDate(latestCert.uploaded_at.split('T')[0])
      : null;
  }

  // Fetch org's requirement templates for the add vendor/tenant dialogs
  const { data: templates } = await supabase
    .from('requirement_templates')
    .select('*')
    .eq('organization_id', orgId)
    .order('category')
    .order('name');

  return (
    <PropertyDetailClient
      property={property}
      entities={entities ?? []}
      vendors={vendorList}
      tenants={tenantList}
      templates={(templates ?? []) as RequirementTemplate[]}
    />
  );
}
