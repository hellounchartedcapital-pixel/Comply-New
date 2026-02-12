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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Only send columns that exist on the DB table. property_id may not exist
  // yet, so we always store it inside the endorsements JSONB as _property_id.
  const propertyId = (template as any).property_id;
  const payload = {
    user_id: user.id,
    name: template.name,
    entity_type: template.entity_type,
    description: template.description ?? null,
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

  if (error) throw new Error(error.message);
  return { ...data, property_id: propertyId } as RequirementTemplate;
}

export async function updateRequirementTemplate(
  id: string,
  updates: Partial<RequirementTemplate>
): Promise<RequirementTemplate> {
  // Only send columns the DB knows about
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.entity_type !== undefined) payload.entity_type = updates.entity_type;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.coverages !== undefined) payload.coverages = updates.coverages;
  if (updates.endorsements !== undefined) payload.endorsements = updates.endorsements;

  const { data, error } = await supabase
    .from('requirement_templates')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
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
