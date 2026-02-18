'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { EntityType, OrganizationSettings } from '@/types';

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
// Update organization name
// ============================================================================

export async function updateOrgName(name: string) {
  if (!name.trim()) throw new Error('Organization name is required');
  const { supabase, orgId } = await getAuthContext();

  const { error } = await supabase
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', orgId);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// Update PM contact info
// ============================================================================

export async function updateContactInfo(fullName: string, email: string) {
  const { supabase, userId } = await getAuthContext();

  const { error } = await supabase
    .from('users')
    .update({
      full_name: fullName.trim() || null,
      email: email.trim(),
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// Update default entities
// ============================================================================

export interface DefaultEntityInput {
  entity_name: string;
  entity_address: string;
  entity_type: EntityType;
}

export async function updateDefaultEntities(entities: DefaultEntityInput[]) {
  const { supabase, orgId } = await getAuthContext();

  // Delete existing defaults
  await supabase
    .from('organization_default_entities')
    .delete()
    .eq('organization_id', orgId);

  // Insert new ones
  const rows = entities
    .filter((e) => e.entity_name.trim())
    .map((e) => ({
      organization_id: orgId,
      entity_name: e.entity_name.trim(),
      entity_address: e.entity_address.trim() || null,
      entity_type: e.entity_type,
    }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('organization_default_entities')
      .insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

// ============================================================================
// Update notification preferences
// ============================================================================

export interface NotificationPreferencesInput {
  expiration_warning_days: number[];
  auto_follow_up_enabled: boolean;
  follow_up_frequency_days: number;
}

export async function updateNotificationPreferences(
  prefs: NotificationPreferencesInput
) {
  const { supabase, orgId } = await getAuthContext();

  // Get current settings to merge
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();

  const currentSettings: OrganizationSettings = org?.settings ?? {};
  const updated: OrganizationSettings = {
    ...currentSettings,
    notification_preferences: {
      expiration_warning_days: prefs.expiration_warning_days,
      auto_follow_up_enabled: prefs.auto_follow_up_enabled,
      follow_up_frequency_days: prefs.follow_up_frequency_days,
    },
    expiration_warning_threshold_days: Math.min(...prefs.expiration_warning_days),
  };

  const { error } = await supabase
    .from('organizations')
    .update({ settings: updated })
    .eq('id', orgId);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/settings');
  return { success: true };
}
