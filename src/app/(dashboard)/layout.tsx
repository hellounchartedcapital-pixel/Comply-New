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

  // Fetch the user's profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, organization_id')
    .eq('id', user.id)
    .single();

  // If no profile or org exists, redirect to onboarding
  if (!profile?.organization_id) {
    redirect('/onboarding');
  }

  // Fetch the organization name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DashboardShell
        userName={profile.full_name}
        userEmail={profile.email ?? user.email ?? ''}
        orgName={org?.name ?? 'My Organization'}
      >
        {children}
      </DashboardShell>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
