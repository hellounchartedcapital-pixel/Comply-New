import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TemplatesListClient } from '@/components/templates/templates-list-client';
import type { RequirementTemplate, TemplateCoverageRequirement } from '@/types';

interface TemplateWithUsage extends RequirementTemplate {
  coverage_requirements: TemplateCoverageRequirement[];
  vendor_count: number;
  tenant_count: number;
}

export default async function TemplatesPage() {
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

  // Fetch all templates: system defaults + org's custom
  const { data: templates } = await supabase
    .from('requirement_templates')
    .select('*, coverage_requirements:template_coverage_requirements(*)')
    .or(`is_system_default.eq.true,organization_id.eq.${orgId}`)
    .order('is_system_default', { ascending: false })
    .order('name');

  const rawTemplates = (templates ?? []) as (RequirementTemplate & {
    coverage_requirements: TemplateCoverageRequirement[];
  })[];

  // Deduplicate: if the org has its own copy of a system default, hide the default.
  // Match by category + risk_level to detect which system defaults have been adopted.
  const orgTemplateKeys = new Set(
    rawTemplates
      .filter((t) => !t.is_system_default && t.organization_id === orgId)
      .map((t) => `${t.category}:${t.risk_level}`)
  );
  const allTemplates = rawTemplates.filter((t) => {
    if (t.is_system_default) {
      return !orgTemplateKeys.has(`${t.category}:${t.risk_level}`);
    }
    return true;
  });

  // Fetch vendor/tenant usage counts per template
  const templateIds = allTemplates.map((t) => t.id);

  const { data: vendors } = await supabase
    .from('vendors')
    .select('template_id')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .in('template_id', templateIds.length > 0 ? templateIds : ['__none__']);

  const { data: tenants } = await supabase
    .from('tenants')
    .select('template_id')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .in('template_id', templateIds.length > 0 ? templateIds : ['__none__']);

  // Count per template
  const vendorCounts: Record<string, number> = {};
  const tenantCounts: Record<string, number> = {};

  for (const v of vendors ?? []) {
    if (v.template_id) vendorCounts[v.template_id] = (vendorCounts[v.template_id] ?? 0) + 1;
  }
  for (const t of tenants ?? []) {
    if (t.template_id) tenantCounts[t.template_id] = (tenantCounts[t.template_id] ?? 0) + 1;
  }

  const enriched: TemplateWithUsage[] = allTemplates.map((t) => ({
    ...t,
    vendor_count: vendorCounts[t.id] ?? 0,
    tenant_count: tenantCounts[t.id] ?? 0,
  }));

  const vendorTemplates = enriched.filter((t) => t.category === 'vendor');
  const tenantTemplates = enriched.filter((t) => t.category === 'tenant');
  const hasCustomTemplates = enriched.some((t) => !t.is_system_default);

  return (
    <TemplatesListClient
      vendorTemplates={vendorTemplates}
      tenantTemplates={tenantTemplates}
      hasCustomTemplates={hasCustomTemplates}
    />
  );
}
