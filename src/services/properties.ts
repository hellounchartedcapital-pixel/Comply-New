import { supabase } from '@/lib/supabase';
import type { Property, BuildingDefaults, EntityType } from '@/types';

export async function fetchProperties(): Promise<Property[]> {
  // Fetch properties
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .order('name');

  if (propError) throw propError;

  // Fetch all vendors and tenants to compute live counts
  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('property_id, status');

  if (vendorError) throw vendorError;

  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('property_id, insurance_status');

  if (tenantError) throw tenantError;

  // Compute counts and compliance per property
  return (properties ?? []).map((p) => {
    const propVendors = (vendors ?? []).filter((v) => v.property_id === p.id);
    const propTenants = (tenants ?? []).filter((t) => t.property_id === p.id);
    const total = propVendors.length + propTenants.length;
    const compliant =
      propVendors.filter((v) => v.status === 'compliant').length +
      propTenants.filter((t) => t.insurance_status === 'compliant').length;

    return {
      ...p,
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
  return data as Property;
}

export async function createProperty(property: { name: string; address?: string }): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single();

  if (error) throw error;
  return data as Property;
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
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

export async function fetchBuildingDefaults(
  buildingId: string,
  entityType: EntityType
): Promise<BuildingDefaults | null> {
  const { data, error } = await supabase
    .from('building_defaults')
    .select('*')
    .eq('building_id', buildingId)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (error) throw error;
  return data as BuildingDefaults | null;
}

export async function upsertBuildingDefaults(
  defaults: Partial<BuildingDefaults> & { building_id: string; entity_type: EntityType }
): Promise<BuildingDefaults> {
  const { data, error } = await supabase
    .from('building_defaults')
    .upsert(defaults, { onConflict: 'building_id,entity_type' })
    .select()
    .single();

  if (error) throw error;
  return data as BuildingDefaults;
}
