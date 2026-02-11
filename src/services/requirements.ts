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
  const { data, error } = await supabase
    .from('requirement_templates')
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data as RequirementTemplate;
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
