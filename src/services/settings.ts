import { supabase } from '@/lib/supabase';
import type { OrganizationSettings } from '@/types';

export async function fetchOrganizationSettings(): Promise<OrganizationSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    // Table might not exist yet
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return null;
    }
    throw error;
  }

  return data as OrganizationSettings | null;
}

export async function upsertOrganizationSettings(
  settings: Partial<OrganizationSettings>
): Promise<OrganizationSettings> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  const { data, error } = await supabase
    .from('settings')
    .upsert(
      { ...settings, user_id: user.id },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as OrganizationSettings;
}

export async function sendCOIRequest(params: {
  entityType: 'vendor' | 'tenant';
  entityId: string;
  entityName: string;
  entityEmail: string;
  complianceGaps: string[];
  propertyName?: string;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication required');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/send-coi-request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send COI request: ${errorText}`);
  }
}
