import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isOrgOnboarded } from '@/lib/actions/auth';

export default async function OnboardingLayout({
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

  // If the user already completed onboarding, send them to the dashboard.
  // This server-side guard prevents a redirect loop between /dashboard and /setup
  // (dashboard layout redirects here if !onboardingCompleted, so this layout
  // must redirect back only when onboarding IS completed).
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (profile?.organization_id) {
    // Use the service-role-based check which also has a property/vendor fallback
    // and auto-fixes stale data. This bypasses any RLS issues with reading settings.
    const onboarded = await isOrgOnboarded(profile.organization_id);
    if (onboarded) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with logo */}
      <header className="flex items-center justify-center border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="SmartCOI" className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">SmartCOI</span>
        </div>
      </header>

      {/* Centered content */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
