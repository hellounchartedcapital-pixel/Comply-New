import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreditCard, Mail } from 'lucide-react';

export default async function BillingPage() {
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

  const { data: org } = await supabase
    .from('organizations')
    .select('plan, trial_ends_at')
    .eq('id', profile.organization_id)
    .single();

  const plan = org?.plan ?? 'trial';
  const planDisplayName = plan === 'trial' ? 'Free Trial' : plan.charAt(0).toUpperCase() + plan.slice(1);
  const trialEndsAt = org?.trial_ends_at
    ? new Date(org.trial_ends_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const isExpired = org?.trial_ends_at
    ? new Date() >= new Date(org.trial_ends_at)
    : false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Billing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <CreditCard className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">
              Current Plan
            </h2>
            <p className="mt-1 text-lg font-bold text-foreground">
              {planDisplayName}
            </p>
            {trialEndsAt && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isExpired ? 'Expired on' : 'Trial ends on'}{' '}
                <span className="font-medium text-foreground">
                  {trialEndsAt}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Coming soon message */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Mail className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Billing and plan management coming soon
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your data is safe &mdash; reach out to{' '}
              <a
                href="mailto:support@smartcoi.io"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                support@smartcoi.io
              </a>{' '}
              with any questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
