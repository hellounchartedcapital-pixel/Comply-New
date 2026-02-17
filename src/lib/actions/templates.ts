'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  TemplateCategory,
  RiskLevel,
  CoverageType,
  LimitType,
} from '@/types';

async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) throw new Error('No organization');
  return profile.organization_id;
}

// ---------------------------------------------------------------------------
// Create template
// ---------------------------------------------------------------------------

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  risk_level: RiskLevel;
}

export async function createTemplate(input: CreateTemplateInput) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('requirement_templates')
    .insert({
      organization_id: orgId,
      name: input.name,
      description: input.description || null,
      category: input.category,
      risk_level: input.risk_level,
      is_system_default: false,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/templates');
  return { id: data.id };
}

// ---------------------------------------------------------------------------
// Update template + coverage requirements (with cascade recalc)
// ---------------------------------------------------------------------------

export interface CoverageRequirementInput {
  coverage_type: CoverageType;
  is_required: boolean;
  minimum_limit: number | null;
  limit_type: LimitType | null;
  requires_additional_insured: boolean;
  requires_waiver_of_subrogation: boolean;
}

export interface UpdateTemplateInput {
  name: string;
  description?: string;
  risk_level: RiskLevel;
  requirements: CoverageRequirementInput[];
}

export async function updateTemplate(
  templateId: string,
  input: UpdateTemplateInput
) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  // Verify org owns template and it's not a system default
  const { data: tpl, error: tplError } = await supabase
    .from('requirement_templates')
    .select('id, is_system_default, organization_id')
    .eq('id', templateId)
    .single();

  if (tplError || !tpl) throw new Error('Template not found');
  if (tpl.is_system_default) throw new Error('Cannot edit system default templates');
  if (tpl.organization_id !== orgId) throw new Error('Not authorized');

  // Update template metadata
  const { error: updateError } = await supabase
    .from('requirement_templates')
    .update({
      name: input.name,
      description: input.description || null,
      risk_level: input.risk_level,
    })
    .eq('id', templateId);

  if (updateError) throw new Error(updateError.message);

  // Replace coverage requirements
  await supabase
    .from('template_coverage_requirements')
    .delete()
    .eq('template_id', templateId);

  if (input.requirements.length > 0) {
    const rows = input.requirements.map((r) => ({
      template_id: templateId,
      coverage_type: r.coverage_type,
      is_required: r.is_required,
      minimum_limit: r.minimum_limit,
      limit_type: r.limit_type,
      requires_additional_insured: r.requires_additional_insured,
      requires_waiver_of_subrogation: r.requires_waiver_of_subrogation,
    }));

    const { error: reqError } = await supabase
      .from('template_coverage_requirements')
      .insert(rows);
    if (reqError) throw new Error(reqError.message);
  }

  // Cascade: recalculate compliance for assigned vendors/tenants
  await recalculateComplianceForTemplate(orgId, templateId);

  revalidatePath('/dashboard/templates');
  revalidatePath(`/dashboard/templates/${templateId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Cascade compliance recalculation
// ---------------------------------------------------------------------------

async function recalculateComplianceForTemplate(
  orgId: string,
  templateId: string
) {
  const supabase = await createClient();

  // Fetch the new requirements
  const { data: newReqs } = await supabase
    .from('template_coverage_requirements')
    .select('*')
    .eq('template_id', templateId);

  const requirements = newReqs ?? [];

  // Find all vendors using this template
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id')
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  // Find all tenants using this template
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id')
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const entityIds = [
    ...(vendors ?? []).map((v) => ({ id: v.id, type: 'vendor' as const })),
    ...(tenants ?? []).map((t) => ({ id: t.id, type: 'tenant' as const })),
  ];

  for (const entity of entityIds) {
    // Get most recent confirmed certificate
    const certFilter =
      entity.type === 'vendor'
        ? { vendor_id: entity.id }
        : { tenant_id: entity.id };

    const { data: cert } = await supabase
      .from('certificates')
      .select('id')
      .match(certFilter)
      .eq('processing_status', 'review_confirmed')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (!cert) {
      // No confirmed cert — set to pending
      const table = entity.type === 'vendor' ? 'vendors' : 'tenants';
      await supabase
        .from(table)
        .update({ compliance_status: 'pending' })
        .eq('id', entity.id);
      continue;
    }

    // Fetch extracted coverages
    const { data: coverages } = await supabase
      .from('extracted_coverages')
      .select('*')
      .eq('certificate_id', cert.id);

    const extracted = coverages ?? [];

    // Clear old compliance results for this cert
    await supabase
      .from('compliance_results')
      .delete()
      .eq('certificate_id', cert.id);

    // Compare each requirement against extracted coverages
    let allMet = true;
    const results: {
      certificate_id: string;
      coverage_requirement_id: string;
      extracted_coverage_id: string | null;
      status: string;
      gap_description: string | null;
    }[] = [];

    for (const req of requirements) {
      // Find matching extracted coverage
      const match = extracted.find(
        (e) =>
          e.coverage_type === req.coverage_type &&
          e.limit_type === req.limit_type
      );

      let status = 'missing';
      let gapDescription: string | null = null;

      if (match) {
        const limitOk =
          req.limit_type === 'statutory' ||
          req.minimum_limit === null ||
          (match.limit_amount !== null &&
            match.limit_amount >= req.minimum_limit);

        const aiOk =
          !req.requires_additional_insured || match.additional_insured_listed;
        const wosOk =
          !req.requires_waiver_of_subrogation || match.waiver_of_subrogation;

        if (limitOk && aiOk && wosOk) {
          status = 'met';
        } else {
          status = 'not_met';
          const gaps: string[] = [];
          if (!limitOk)
            gaps.push(
              `Limit is $${match.limit_amount?.toLocaleString() ?? '0'} but requirement is $${req.minimum_limit?.toLocaleString()}`
            );
          if (!aiOk) gaps.push('Additional Insured not listed');
          if (!wosOk) gaps.push('Waiver of Subrogation not found');
          gapDescription = gaps.join('; ');
        }
      }

      if (req.is_required && status !== 'met') {
        allMet = false;
      }

      results.push({
        certificate_id: cert.id,
        coverage_requirement_id: req.id,
        extracted_coverage_id: match?.id ?? null,
        status,
        gap_description: gapDescription,
      });
    }

    // Insert new compliance results
    if (results.length > 0) {
      await supabase.from('compliance_results').insert(results);
    }

    // Update entity compliance status
    const table = entity.type === 'vendor' ? 'vendors' : 'tenants';
    await supabase
      .from(table)
      .update({
        compliance_status: allMet ? 'compliant' : 'non_compliant',
      })
      .eq('id', entity.id);
  }
}

// ---------------------------------------------------------------------------
// Get affected entity count for cascade warning
// ---------------------------------------------------------------------------

export async function getTemplateUsageCount(templateId: string) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  const { count: vendorCount } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const { count: tenantCount } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  // Count distinct properties
  const { data: vendorProps } = await supabase
    .from('vendors')
    .select('property_id')
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const { data: tenantProps } = await supabase
    .from('tenants')
    .select('property_id')
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const propertyIds = new Set([
    ...(vendorProps ?? []).map((v) => v.property_id).filter(Boolean),
    ...(tenantProps ?? []).map((t) => t.property_id).filter(Boolean),
  ]);

  return {
    vendors: vendorCount ?? 0,
    tenants: tenantCount ?? 0,
    totalEntities: (vendorCount ?? 0) + (tenantCount ?? 0),
    properties: propertyIds.size,
  };
}

// ---------------------------------------------------------------------------
// Duplicate system template
// ---------------------------------------------------------------------------

export async function duplicateTemplate(sourceTemplateId: string) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  // Fetch source template
  const { data: source, error: srcError } = await supabase
    .from('requirement_templates')
    .select('*, coverage_requirements:template_coverage_requirements(*)')
    .eq('id', sourceTemplateId)
    .single();

  if (srcError || !source) throw new Error('Template not found');

  // Create duplicate
  const { data: newTemplate, error: createError } = await supabase
    .from('requirement_templates')
    .insert({
      organization_id: orgId,
      name: `${source.name} (Custom)`,
      description: source.description,
      category: source.category,
      risk_level: source.risk_level,
      is_system_default: false,
    })
    .select('id')
    .single();

  if (createError) throw new Error(createError.message);

  // Copy coverage requirements
  const reqs = source.coverage_requirements ?? [];
  if (reqs.length > 0) {
    const rows = reqs.map(
      (r: {
        coverage_type: string;
        is_required: boolean;
        minimum_limit: number | null;
        limit_type: string | null;
        requires_additional_insured: boolean;
        requires_waiver_of_subrogation: boolean;
      }) => ({
        template_id: newTemplate.id,
        coverage_type: r.coverage_type,
        is_required: r.is_required,
        minimum_limit: r.minimum_limit,
        limit_type: r.limit_type,
        requires_additional_insured: r.requires_additional_insured,
        requires_waiver_of_subrogation: r.requires_waiver_of_subrogation,
      })
    );

    await supabase.from('template_coverage_requirements').insert(rows);
  }

  revalidatePath('/dashboard/templates');
  return { id: newTemplate.id };
}

// ---------------------------------------------------------------------------
// Delete template (org-owned only)
// ---------------------------------------------------------------------------

export async function deleteTemplate(templateId: string) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  // Verify ownership
  const { data: tpl } = await supabase
    .from('requirement_templates')
    .select('id, is_system_default, organization_id')
    .eq('id', templateId)
    .single();

  if (!tpl) throw new Error('Template not found');
  if (tpl.is_system_default) throw new Error('Cannot delete system default templates');
  if (tpl.organization_id !== orgId) throw new Error('Not authorized');

  // Check if template is assigned
  const { count: vendorCount } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const { count: tenantCount } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const total = (vendorCount ?? 0) + (tenantCount ?? 0);
  if (total > 0) {
    throw new Error(
      `This template is assigned to ${total} ${total === 1 ? 'entity' : 'entities'}. Reassign them to another template before deleting.`
    );
  }

  // Delete requirements first, then template
  await supabase
    .from('template_coverage_requirements')
    .delete()
    .eq('template_id', templateId);

  const { error } = await supabase
    .from('requirement_templates')
    .delete()
    .eq('id', templateId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/templates');
  return { success: true };
}
