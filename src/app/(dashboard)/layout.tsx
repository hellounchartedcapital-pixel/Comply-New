import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/sidebar';
import { Toaster } from '@/components/ui/sonner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's profile and org name — use fallbacks if missing
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, organization_id')
    .eq('id', user.id)
    .single();

  let orgName = 'My Organization';
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();
    if (org?.name) orgName = org.name;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DashboardShell
        userName={profile?.full_name ?? null}
        userEmail={profile?.email ?? user.email ?? ''}
        orgName={orgName}
      >
        {children}
      </DashboardShell>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
