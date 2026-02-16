import { supabase } from '@/lib/supabase';
import type { Property, VendorRequirements } from '@/types';

// ============================================
// PROPERTIES
// ============================================

export async function fetchProperties(): Promise<Property[]> {
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .order('name');

  if (propError) throw propError;

  // Fetch all vendors and tenants to compute live counts
  const { data: vendors } = await supabase
    .from('vendors')
    .select('property_id, status');

  const { data: tenants } = await supabase
    .from('tenants')
    .select('property_id, status, insurance_status');

  return (properties ?? []).map((p) => {
    const propVendors = (vendors ?? []).filter((v) => v.property_id === p.id);
    const propTenants = (tenants ?? []).filter((t) => t.property_id === p.id);
    const total = propVendors.length + propTenants.length;

    // Count compliant entities — handle both new 'status' and legacy 'insurance_status'
    const compliantVendors = propVendors.filter((v) => v.status === 'compliant').length;
    const compliantTenants = propTenants.filter(
      (t) => t.status === 'compliant' || t.insurance_status === 'compliant'
    ).length;
    const compliant = compliantVendors + compliantTenants;

    return {
      ...p,
      additional_insured_entities: p.additional_insured_entities ?? [],
      loss_payee_entities: p.loss_payee_entities ?? [],
      vendor_count: propVendors.length,
      tenant_count: propTenants.length,
      compliance_percentage: total > 0 ? Math.round((compliant / total) * 100) : 0,
    };
  }) as Property[];
}

export async function fetchProperty(id: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    ...data,
    additional_insured_entities: data.additional_insured_entities ?? [],
    loss_payee_entities: data.loss_payee_entities ?? [],
  } as Property;
}

export async function createProperty(property: {
  name: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  additional_insured_entities?: string[];
  certificate_holder_name?: string;
  certificate_holder_address_line1?: string;
  certificate_holder_address_line2?: string;
  certificate_holder_city?: string;
  certificate_holder_state?: string;
  certificate_holder_zip?: string;
  loss_payee_entities?: string[];
}): Promise<Property> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Build address string for legacy 'address' column
  const addressStr = [property.address_street, property.address_city, property.address_state, property.address_zip]
    .filter(Boolean)
    .join(', ') || null;

  // Base payload with columns guaranteed to exist
  const basePayload: Record<string, unknown> = {
    user_id: user.id,
    name: property.name,
    address: addressStr,
  };

  // Full payload with new columns from the migration
  const fullPayload: Record<string, unknown> = {
    ...basePayload,
    address_street: property.address_street || null,
    address_city: property.address_city || null,
    address_state: property.address_state || null,
    address_zip: property.address_zip || null,
    additional_insured_entities: property.additional_insured_entities?.filter(Boolean) ?? [],
    certificate_holder_name: property.certificate_holder_name || null,
    certificate_holder_address_line1: property.certificate_holder_address_line1 || null,
    certificate_holder_address_line2: property.certificate_holder_address_line2 || null,
    certificate_holder_city: property.certificate_holder_city || null,
    certificate_holder_state: property.certificate_holder_state || null,
    certificate_holder_zip: property.certificate_holder_zip || null,
    loss_payee_entities: property.loss_payee_entities?.filter(Boolean) ?? [],
  };

  // First attempt: include new columns
  let { data, error } = await supabase
    .from('properties')
    .insert(fullPayload)
    .select()
    .single();

  // If it fails because of missing columns, retry with only the base columns
  if (error && (error.message?.includes('column') || error.code === '42703')) {
    ({ data, error } = await supabase
      .from('properties')
      .insert(basePayload)
      .select()
      .single());
  }

  if (error) throw error;
  return data as Property;
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Property;
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

// ============================================
// VENDOR REQUIREMENTS (per property)
// ============================================

export async function fetchVendorRequirements(
  propertyId: string
): Promise<VendorRequirements | null> {
  const { data, error } = await supabase
    .from('vendor_requirements')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle();

  // Table may not exist if migration hasn't been applied
  if (error && (error.code === '42P01' || error.message?.includes('relation'))) {
    return null;
  }
  if (error) throw error;
  return data as VendorRequirements | null;
}

export async function upsertVendorRequirements(
  propertyId: string,
  requirements: Partial<VendorRequirements>
): Promise<VendorRequirements> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vendor_requirements')
    .upsert(
      {
        property_id: propertyId,
        user_id: user.id,
        ...requirements,
      },
      { onConflict: 'property_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as VendorRequirements;
}

// ============================================
// LEGACY: Building Defaults (kept for backward compat)
// ============================================

export async function fetchBuildingDefaults(
  buildingId: string,
  entityType: string
): Promise<unknown> {
  const { data, error } = await supabase
    .from('building_defaults')
    .select('*')
    .eq('building_id', buildingId)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function upsertBuildingDefaults(
  defaults: Record<string, unknown>
): Promise<unknown> {
  const { data, error } = await supabase
    .from('building_defaults')
    .upsert(defaults, { onConflict: 'building_id,entity_type' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
