import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/sidebar';

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
  let onboardingCompleted = false;
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', profile.organization_id)
      .single();
    if (org?.name) orgName = org.name;
    onboardingCompleted = org?.settings?.onboarding_completed === true;
  }

  if (!onboardingCompleted) {
    console.log('[DashboardLayout] Redirecting to /setup — profile exists:', !!profile, 'orgId:', profile?.organization_id ?? 'none', 'onboardingCompleted:', onboardingCompleted);
    redirect('/setup');
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
    </div>
  );
}
