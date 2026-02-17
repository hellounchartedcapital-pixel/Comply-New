import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile from the users table
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, role, organization_id')
    .eq('id', user.id)
    .single();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icon.svg"
          alt="SmartCOI"
          className="mx-auto h-12 w-12"
        />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name ?? user.email}
        </p>
        <div className="rounded-lg border bg-card p-4 text-left text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            {profile?.role && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium capitalize">{profile.role}</span>
              </div>
            )}
          </div>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}
