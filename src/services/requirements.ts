import { supabase } from '@/lib/supabase';
import type { RequirementTemplate } from '@/types';

export async function fetchRequirementTemplates(): Promise<RequirementTemplate[]> {
  const { data, error } = await supabase
    .from('requirement_templates')
    .select('*')
    .order('name');

  if (error) {
    // Table might not exist yet - return empty array
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data as RequirementTemplate[]) ?? [];
}

export async function createRequirementTemplate(
  template: Omit<RequirementTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<RequirementTemplate> {
  // Only send columns that exist on the DB table. property_id may not exist
  // yet, so we always store it inside the endorsements JSONB as _property_id.
  const propertyId = (template as any).property_id;
  const payload = {
    name: template.name,
    entity_type: template.entity_type,
    description: template.description,
    coverages: template.coverages ?? {},
    endorsements: {
      ...(template.endorsements ?? {}),
      ...(propertyId ? { _property_id: propertyId } : {}),
    },
  };

  const { data, error } = await supabase
    .from('requirement_templates')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return { ...data, property_id: propertyId } as RequirementTemplate;
}

export async function updateRequirementTemplate(
  id: string,
  updates: Partial<RequirementTemplate>
): Promise<RequirementTemplate> {
  const { data, error } = await supabase
    .from('requirement_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as RequirementTemplate;
}

export async function deleteRequirementTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('requirement_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTemplateByProperty(
  propertyId: string,
  entityType: 'vendor' | 'tenant'
): Promise<RequirementTemplate | null> {
  // Try the property_id column first (if migration was applied)
  const { data, error } = await supabase
    .from('requirement_templates')
    .select('*')
    .eq('property_id', propertyId)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (!error && data) {
    return data as RequirementTemplate;
  }

  // Fallback: column may not exist yet. Fetch all templates for this entity
  // type and filter by the _property_id stored inside endorsements JSONB.
  const { data: all, error: allError } = await supabase
    .from('requirement_templates')
    .select('*')
    .eq('entity_type', entityType);

  if (allError) {
    if (allError.code === '42P01' || allError.message?.includes('does not exist')) {
      return null;
    }
    throw allError;
  }

  const match = (all ?? []).find(
    (t: any) =>
      t.property_id === propertyId ||
      t.endorsements?._property_id === propertyId
  );

  return (match as RequirementTemplate) ?? null;
}
