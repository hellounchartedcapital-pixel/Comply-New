import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from '@/components/settings/settings-client';
import type { OrganizationDefaultEntity, OrganizationSettings } from '@/types';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, full_name, email')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) redirect('/login');

  const orgId = profile.organization_id;

  // Fetch org info
  const { data: org } = await supabase
    .from('organizations')
    .select('name, settings')
    .eq('id', orgId)
    .single();

  // Fetch default entities
  const { data: defaultEntities } = await supabase
    .from('organization_default_entities')
    .select('*')
    .eq('organization_id', orgId)
    .order('entity_type')
    .order('created_at');

  return (
    <SettingsClient
      orgName={org?.name ?? ''}
      orgSettings={(org?.settings ?? {}) as OrganizationSettings}
      pmName={profile.full_name ?? ''}
      pmEmail={profile.email}
      defaultEntities={(defaultEntities ?? []) as OrganizationDefaultEntity[]}
    />
  );
}
