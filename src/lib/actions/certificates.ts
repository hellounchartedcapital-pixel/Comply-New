'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireActivePlan } from '@/lib/require-active-plan';
import {
  calculateCompliance,
  type CoverageInput,
  type EntityInput,
  type RequirementInput,
  type PropertyEntityInput,
} from '@/lib/compliance/calculate';
import type { CoverageType, LimitType, EntityType } from '@/types';

// ============================================================================
// Helpers
// ============================================================================

async function getAuthContext() {
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

  return { supabase, userId: user.id, orgId: profile.organization_id };
}

// ============================================================================
// Save edited extraction data
// ============================================================================

export interface SavedCoverage {
  id?: string; // existing row id (omit for new rows)
  coverage_type: CoverageType;
  carrier_name: string | null;
  policy_number: string | null;
  limit_amount: number | null;
  limit_type: LimitType | null;
  effective_date: string | null;
  expiration_date: string | null;
  additional_insured_listed: boolean;
  waiver_of_subrogation: boolean;
  confidence_flag: boolean;
  raw_extracted_text: string | null;
  additional_insured_entities: string[];
}

export interface SavedEntity {
  id?: string;
  entity_name: string;
  entity_address: string | null;
  entity_type: EntityType;
  confidence_flag: boolean;
}

export async function saveExtractionEdits(
  certificateId: string,
  coverages: SavedCoverage[],
  entities: SavedEntity[]
) {
  await requireActivePlan('Subscribe to upload certificates.');
  const { supabase, orgId } = await getAuthContext();

  // Verify certificate belongs to this org
  const { data: cert, error: certErr } = await supabase
    .from('certificates')
    .select('id, organization_id')
    .eq('id', certificateId)
    .single();
  if (certErr || !cert || cert.organization_id !== orgId) {
    throw new Error('Certificate not found');
  }

  // Delete existing extracted data and re-insert (simpler than diffing)
  await supabase.from('extracted_coverages').delete().eq('certificate_id', certificateId);
  await supabase.from('extracted_entities').delete().eq('certificate_id', certificateId);

  // Insert coverages
  if (coverages.length > 0) {
    const rows = coverages.map((c) => ({
      certificate_id: certificateId,
      coverage_type: c.coverage_type,
      carrier_name: c.carrier_name,
      policy_number: c.policy_number,
      limit_amount: c.limit_amount,
      limit_type: c.limit_type,
      effective_date: c.effective_date,
      expiration_date: c.expiration_date,
      additional_insured_listed: c.additional_insured_listed,
      waiver_of_subrogation: c.waiver_of_subrogation,
      confidence_flag: c.confidence_flag,
      raw_extracted_text: c.raw_extracted_text,
      additional_insured_entities: c.additional_insured_entities,
    }));
    const { error } = await supabase.from('extracted_coverages').insert(rows);
    if (error) throw new Error(`Failed to save coverages: ${error.message}`);
  }

  // Insert entities
  if (entities.length > 0) {
    const rows = entities.map((e) => ({
      certificate_id: certificateId,
      entity_name: e.entity_name,
      entity_address: e.entity_address,
      entity_type: e.entity_type,
      confidence_flag: e.confidence_flag,
    }));
    const { error } = await supabase.from('extracted_entities').insert(rows);
    if (error) throw new Error(`Failed to save entities: ${error.message}`);
  }
}

// ============================================================================
// Confirm certificate — save edits, run compliance, update statuses
// ============================================================================

export async function confirmCertificate(
  certificateId: string,
  coverages: SavedCoverage[],
  entities: SavedEntity[]
) {
  await requireActivePlan('Subscribe to upload certificates.');
  const { supabase, userId, orgId } = await getAuthContext();

  // Verify certificate
  const { data: cert, error: certErr } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', certificateId)
    .eq('organization_id', orgId)
    .single();
  if (certErr || !cert) throw new Error('Certificate not found');

  // Save edited extraction data
  await saveExtractionEdits(certificateId, coverages, entities);

  // Re-fetch saved coverages/entities to get their new IDs
  const { data: savedCoverages } = await supabase
    .from('extracted_coverages')
    .select('*')
    .eq('certificate_id', certificateId);

  const { data: savedEntities } = await supabase
    .from('extracted_entities')
    .select('*')
    .eq('certificate_id', certificateId);

  // Determine entity type and fetch template + property entities
  const entityType = cert.vendor_id ? 'vendor' : 'tenant';
  const entityId = cert.vendor_id ?? cert.tenant_id;
  if (!entityId) throw new Error('Certificate has no vendor or tenant');

  const tableName = entityType === 'vendor' ? 'vendors' : 'tenants';
  const { data: entity } = await supabase
    .from(tableName)
    .select('template_id, property_id')
    .eq('id', entityId)
    .single();

  let requirements: RequirementInput[] = [];
  if (entity?.template_id) {
    const { data: reqs } = await supabase
      .from('template_coverage_requirements')
      .select('*')
      .eq('template_id', entity.template_id);
    requirements = (reqs ?? []) as RequirementInput[];
  }

  let propertyEntities: PropertyEntityInput[] = [];
  if (entity?.property_id) {
    const { data: pes } = await supabase
      .from('property_entities')
      .select('*')
      .eq('property_id', entity.property_id);
    propertyEntities = (pes ?? []) as PropertyEntityInput[];
  }

  // Map saved data to calculation inputs
  const covInputs: CoverageInput[] = (savedCoverages ?? []).map((c) => ({
    id: c.id,
    coverage_type: c.coverage_type,
    carrier_name: c.carrier_name,
    policy_number: c.policy_number,
    limit_amount: c.limit_amount,
    limit_type: c.limit_type,
    effective_date: c.effective_date,
    expiration_date: c.expiration_date,
    additional_insured_listed: c.additional_insured_listed,
    waiver_of_subrogation: c.waiver_of_subrogation,
  }));

  const entInputs: EntityInput[] = (savedEntities ?? []).map((e) => ({
    id: e.id,
    entity_name: e.entity_name,
    entity_address: e.entity_address,
    entity_type: e.entity_type,
  }));

  // Fetch org settings for expiration threshold
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();
  const thresholdDays = org?.settings?.expiration_warning_threshold_days ?? 30;

  // Run compliance calculation
  const result = calculateCompliance(
    covInputs,
    entInputs,
    requirements,
    propertyEntities,
    thresholdDays
  );

  // Clear old compliance results for this certificate
  await supabase.from('compliance_results').delete().eq('certificate_id', certificateId);
  await supabase.from('entity_compliance_results').delete().eq('certificate_id', certificateId);

  // Insert coverage compliance results
  if (result.coverageResults.length > 0) {
    const rows = result.coverageResults.map((r) => ({
      certificate_id: certificateId,
      coverage_requirement_id: r.coverage_requirement_id,
      extracted_coverage_id: r.extracted_coverage_id,
      status: r.status,
      gap_description: r.gap_description,
    }));
    await supabase.from('compliance_results').insert(rows);
  }

  // Insert entity compliance results
  if (result.entityResults.length > 0) {
    const rows = result.entityResults.map((r) => ({
      certificate_id: certificateId,
      property_entity_id: r.property_entity_id,
      extracted_entity_id: r.extracted_entity_id,
      status: r.status,
      match_details: r.match_details,
    }));
    await supabase.from('entity_compliance_results').insert(rows);
  }

  // Update certificate status
  await supabase
    .from('certificates')
    .update({
      processing_status: 'review_confirmed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq('id', certificateId);

  // Update vendor/tenant compliance_status
  await supabase
    .from(tableName)
    .update({ compliance_status: result.overallStatus })
    .eq('id', entityId);

  // Log activity
  await supabase.from('activity_log').insert([
    {
      organization_id: orgId,
      certificate_id: certificateId,
      vendor_id: cert.vendor_id,
      tenant_id: cert.tenant_id,
      action: 'coi_review_confirmed',
      description: `Certificate review confirmed`,
      performed_by: userId,
    },
    {
      organization_id: orgId,
      certificate_id: certificateId,
      vendor_id: cert.vendor_id,
      tenant_id: cert.tenant_id,
      action: 'compliance_checked',
      description: `Compliance calculated: ${result.overallStatus}`,
      performed_by: userId,
    },
  ]);

  // Revalidate relevant pages
  revalidatePath(`/dashboard/${entityType}s/${entityId}`);
  revalidatePath(`/dashboard/certificates/${certificateId}/review`);
  revalidatePath('/dashboard');

  return {
    overallStatus: result.overallStatus,
    entityType,
    entityId,
  };
}

// ============================================================================
// COI Document Signed URL
// ============================================================================

export async function getCOISignedUrl(
  certificateId: string
): Promise<{ url: string }> {
  const { supabase, orgId } = await getAuthContext();

  const { data: cert } = await supabase
    .from('certificates')
    .select('file_path')
    .eq('id', certificateId)
    .eq('organization_id', orgId)
    .single();

  if (!cert?.file_path) throw new Error('Certificate or file not found');

  const { data, error } = await supabase.storage
    .from('coi-documents')
    .createSignedUrl(cert.file_path, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    throw new Error('Failed to generate signed URL');
  }

  return { url: data.signedUrl };
}
