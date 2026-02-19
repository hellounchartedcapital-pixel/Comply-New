'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkVendorTenantLimit } from '@/lib/plan-limits';
import type { PropertyType, EntityType } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Property CRUD
// ---------------------------------------------------------------------------

export interface CreatePropertyInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type: PropertyType;
  entities: {
    entity_name: string;
    entity_address?: string;
    entity_type: EntityType;
  }[];
}

export async function createProperty(input: CreatePropertyInput) {
  const { supabase, userId, orgId } = await getAuthContext();

  const { data: property, error: propError } = await supabase
    .from('properties')
    .insert({
      organization_id: orgId,
      name: input.name,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      property_type: input.property_type,
    })
    .select('id')
    .single();

  if (propError) throw new Error(propError.message);

  if (input.entities.length > 0) {
    const entityRows = input.entities
      .filter((e) => e.entity_name.trim())
      .map((e) => ({
        property_id: property.id,
        entity_name: e.entity_name,
        entity_address: e.entity_address || null,
        entity_type: e.entity_type,
      }));

    if (entityRows.length > 0) {
      const { error: entError } = await supabase
        .from('property_entities')
        .insert(entityRows);
      if (entError) throw new Error(entError.message);
    }
  }

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    property_id: property.id,
    action: 'status_changed',
    description: `Property "${input.name}" created`,
    performed_by: userId,
  });

  revalidatePath('/dashboard/properties');
  return { id: property.id };
}

export async function updateProperty(
  propertyId: string,
  input: CreatePropertyInput
) {
  const { supabase, userId, orgId } = await getAuthContext();

  const { error: propError } = await supabase
    .from('properties')
    .update({
      name: input.name,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      property_type: input.property_type,
    })
    .eq('id', propertyId)
    .eq('organization_id', orgId);

  if (propError) throw new Error(propError.message);

  // Replace entities: delete existing, insert new
  await supabase
    .from('property_entities')
    .delete()
    .eq('property_id', propertyId);

  if (input.entities.length > 0) {
    const entityRows = input.entities
      .filter((e) => e.entity_name.trim())
      .map((e) => ({
        property_id: propertyId,
        entity_name: e.entity_name,
        entity_address: e.entity_address || null,
        entity_type: e.entity_type,
      }));

    if (entityRows.length > 0) {
      await supabase.from('property_entities').insert(entityRows);
    }
  }

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    property_id: propertyId,
    action: 'status_changed',
    description: `Property "${input.name}" updated`,
    performed_by: userId,
  });

  revalidatePath('/dashboard/properties');
  revalidatePath(`/dashboard/properties/${propertyId}`);
  return { id: propertyId };
}

export async function deleteProperty(propertyId: string) {
  const { supabase, userId, orgId } = await getAuthContext();

  // Check for active vendors / tenants
  const { count: vendorCount } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const { count: tenantCount } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  if ((vendorCount ?? 0) > 0 || (tenantCount ?? 0) > 0) {
    throw new Error(
      'Cannot delete a property with active vendors or tenants. Remove them first.'
    );
  }

  // Get property name for log before deleting
  const { data: prop } = await supabase
    .from('properties')
    .select('name')
    .eq('id', propertyId)
    .single();

  // Delete entities first, then the property
  await supabase.from('property_entities').delete().eq('property_id', propertyId);

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    action: 'status_changed',
    description: `Property "${prop?.name ?? propertyId}" deleted`,
    performed_by: userId,
  });

  revalidatePath('/dashboard/properties');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Vendor CRUD
// ---------------------------------------------------------------------------

export interface CreateVendorInput {
  property_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  vendor_type?: string;
  template_id?: string;
}

export async function createVendor(input: CreateVendorInput) {
  const { supabase, userId, orgId } = await getAuthContext();

  // Enforce plan limits
  const limitCheck = await checkVendorTenantLimit(orgId);
  if (!limitCheck.allowed) throw new Error(limitCheck.error);

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      organization_id: orgId,
      property_id: input.property_id,
      company_name: input.company_name,
      contact_name: input.contact_name || null,
      contact_email: input.contact_email || null,
      contact_phone: input.contact_phone || null,
      vendor_type: input.vendor_type || null,
      template_id: input.template_id || null,
      compliance_status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    property_id: input.property_id,
    vendor_id: data.id,
    action: 'vendor_created',
    description: `Vendor "${input.company_name}" added`,
    performed_by: userId,
  });

  revalidatePath(`/dashboard/properties/${input.property_id}`);
  return { id: data.id };
}

export async function softDeleteVendor(vendorId: string, propertyId: string) {
  const { supabase, userId, orgId } = await getAuthContext();

  const { data: vendor } = await supabase
    .from('vendors')
    .select('company_name')
    .eq('id', vendorId)
    .single();

  const { error } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', vendorId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    property_id: propertyId,
    vendor_id: vendorId,
    action: 'status_changed',
    description: `Vendor "${vendor?.company_name ?? vendorId}" removed`,
    performed_by: userId,
  });

  revalidatePath(`/dashboard/properties/${propertyId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Tenant CRUD
// ---------------------------------------------------------------------------

export interface CreateTenantInput {
  property_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  unit_suite?: string;
  tenant_type?: string;
  template_id?: string;
}

export async function createTenant(input: CreateTenantInput) {
  const { supabase, userId, orgId } = await getAuthContext();

  // Enforce plan limits
  const limitCheck = await checkVendorTenantLimit(orgId);
  if (!limitCheck.allowed) throw new Error(limitCheck.error);

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      organization_id: orgId,
      property_id: input.property_id,
      company_name: input.company_name,
      contact_name: input.contact_name || null,
      contact_email: input.contact_email || null,
      contact_phone: input.contact_phone || null,
      unit_suite: input.unit_suite || null,
      tenant_type: input.tenant_type || null,
      template_id: input.template_id || null,
      compliance_status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    property_id: input.property_id,
    tenant_id: data.id,
    action: 'tenant_created',
    description: `Tenant "${input.company_name}" added`,
    performed_by: userId,
  });

  revalidatePath(`/dashboard/properties/${input.property_id}`);
  return { id: data.id };
}

export async function softDeleteTenant(tenantId: string, propertyId: string) {
  const { supabase, userId, orgId } = await getAuthContext();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('company_name')
    .eq('id', tenantId)
    .single();

  const { error } = await supabase
    .from('tenants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', tenantId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    property_id: propertyId,
    tenant_id: tenantId,
    action: 'status_changed',
    description: `Tenant "${tenant?.company_name ?? tenantId}" removed`,
    performed_by: userId,
  });

  revalidatePath(`/dashboard/properties/${propertyId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Vendor update (edit + notifications toggle)
// ---------------------------------------------------------------------------

export interface UpdateVendorInput {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  vendor_type?: string;
  template_id?: string;
}

export async function updateVendor(vendorId: string, input: UpdateVendorInput) {
  const { supabase, userId, orgId } = await getAuthContext();

  const { error } = await supabase
    .from('vendors')
    .update({
      company_name: input.company_name,
      contact_name: input.contact_name || null,
      contact_email: input.contact_email || null,
      contact_phone: input.contact_phone || null,
      vendor_type: input.vendor_type || null,
      template_id: input.template_id || null,
    })
    .eq('id', vendorId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    vendor_id: vendorId,
    action: 'status_changed',
    description: `Vendor "${input.company_name}" updated`,
    performed_by: userId,
  });

  revalidatePath(`/dashboard/vendors/${vendorId}`);
  return { success: true };
}

export async function toggleVendorNotifications(vendorId: string, paused: boolean) {
  const { supabase, userId, orgId } = await getAuthContext();

  const { error } = await supabase
    .from('vendors')
    .update({ notifications_paused: paused })
    .eq('id', vendorId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    vendor_id: vendorId,
    action: 'status_changed',
    description: `Vendor notifications ${paused ? 'paused' : 'resumed'}`,
    performed_by: userId,
  });

  revalidatePath(`/dashboard/vendors/${vendorId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Tenant update (edit + notifications toggle)
// ---------------------------------------------------------------------------

export interface UpdateTenantInput {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  unit_suite?: string;
  tenant_type?: string;
  template_id?: string;
}

export async function updateTenant(tenantId: string, input: UpdateTenantInput) {
  const { supabase, userId, orgId } = await getAuthContext();

  const { error } = await supabase
    .from('tenants')
    .update({
      company_name: input.company_name,
      contact_name: input.contact_name || null,
      contact_email: input.contact_email || null,
      contact_phone: input.contact_phone || null,
      unit_suite: input.unit_suite || null,
      tenant_type: input.tenant_type || null,
      template_id: input.template_id || null,
    })
    .eq('id', tenantId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    tenant_id: tenantId,
    action: 'status_changed',
    description: `Tenant "${input.company_name}" updated`,
    performed_by: userId,
  });

  revalidatePath(`/dashboard/tenants/${tenantId}`);
  return { success: true };
}

export async function toggleTenantNotifications(tenantId: string, paused: boolean) {
  const { supabase, userId, orgId } = await getAuthContext();

  const { error } = await supabase
    .from('tenants')
    .update({ notifications_paused: paused })
    .eq('id', tenantId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    tenant_id: tenantId,
    action: 'status_changed',
    description: `Tenant notifications ${paused ? 'paused' : 'resumed'}`,
    performed_by: userId,
  });

  revalidatePath(`/dashboard/tenants/${tenantId}`);
  return { success: true };
}
