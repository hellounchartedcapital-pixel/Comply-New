import { supabase } from '@/lib/supabase';
import type { Property, BuildingDefaults, EntityType } from '@/types';

export async function fetchProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data as Property[]) ?? [];
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
