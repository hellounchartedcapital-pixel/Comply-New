import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotificationsClient } from '@/components/notifications/notifications-client';
import type { Notification } from '@/types';

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) redirect('/login');
  const orgId = profile.organization_id;

  // Fetch all notifications for this org (most recent first)
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', orgId)
    .order('scheduled_date', { ascending: false })
    .limit(200);

  const notifications = (notifs ?? []) as Notification[];

  // Fetch entity names in bulk for display
  const vendorIds = [...new Set(notifications.filter((n) => n.vendor_id).map((n) => n.vendor_id!))];
  const tenantIds = [...new Set(notifications.filter((n) => n.tenant_id).map((n) => n.tenant_id!))];

  const entityNameMap: Record<string, string> = {};

  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, company_name')
      .in('id', vendorIds);
    for (const v of vendors ?? []) {
      entityNameMap[v.id] = v.company_name;
    }
  }

  if (tenantIds.length > 0) {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, company_name')
      .in('id', tenantIds);
    for (const t of tenants ?? []) {
      entityNameMap[t.id] = t.company_name;
    }
  }

  return (
    <NotificationsClient
      notifications={notifications}
      entityNameMap={entityNameMap}
    />
  );
}
