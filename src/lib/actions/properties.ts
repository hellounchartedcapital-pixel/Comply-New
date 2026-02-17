'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { PropertyType, EntityType } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const orgId = await getOrgId();
  const supabase = await createClient();

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

  revalidatePath('/dashboard/properties');
  return { id: property.id };
}

export async function updateProperty(
  propertyId: string,
  input: CreatePropertyInput
) {
  const orgId = await getOrgId();
  const supabase = await createClient();

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

  revalidatePath('/dashboard/properties');
  revalidatePath(`/dashboard/properties/${propertyId}`);
  return { id: propertyId };
}

export async function deleteProperty(propertyId: string) {
  const orgId = await getOrgId();
  const supabase = await createClient();

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

  // Delete entities first, then the property
  await supabase.from('property_entities').delete().eq('property_id', propertyId);

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

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
  const orgId = await getOrgId();
  const supabase = await createClient();

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

  revalidatePath(`/dashboard/properties/${input.property_id}`);
  return { id: data.id };
}

export async function softDeleteVendor(vendorId: string, propertyId: string) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', vendorId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

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
  const orgId = await getOrgId();
  const supabase = await createClient();

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

  revalidatePath(`/dashboard/properties/${input.property_id}`);
  return { id: data.id };
}

export async function softDeleteTenant(tenantId: string, propertyId: string) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('tenants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', tenantId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

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
  const orgId = await getOrgId();
  const supabase = await createClient();

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

  revalidatePath(`/dashboard/vendors/${vendorId}`);
  return { success: true };
}

export async function toggleVendorNotifications(vendorId: string, paused: boolean) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendors')
    .update({ notifications_paused: paused })
    .eq('id', vendorId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

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
  const orgId = await getOrgId();
  const supabase = await createClient();

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

  revalidatePath(`/dashboard/tenants/${tenantId}`);
  return { success: true };
}

export async function toggleTenantNotifications(tenantId: string, paused: boolean) {
  const orgId = await getOrgId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('tenants')
    .update({ notifications_paused: paused })
    .eq('id', tenantId)
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/tenants/${tenantId}`);
  return { success: true };
}
