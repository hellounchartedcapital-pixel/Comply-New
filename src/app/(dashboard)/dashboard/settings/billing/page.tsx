import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BillingClient } from './billing-client';

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
    .select('plan, trial_ends_at, stripe_subscription_id, payment_failed')
    .eq('id', profile.organization_id)
    .single();

  return (
    <BillingClient
      plan={org?.plan ?? 'trial'}
      trialEndsAt={org?.trial_ends_at ?? null}
      hasSubscription={!!org?.stripe_subscription_id}
      paymentFailed={org?.payment_failed ?? false}
    />
  );
}
