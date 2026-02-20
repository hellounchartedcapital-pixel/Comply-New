'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getActivePlanStatus, PLAN_INACTIVE_TAG } from '@/lib/plan-status';

/**
 * Guard for server actions — throws if the caller's org does not have an
 * active plan.  Returns the authenticated user ID and org ID on success so
 * the caller doesn't need to re-fetch them.
 *
 * Uses the **service role** client for all DB lookups so that RLS policies
 * can never silently block the org/plan query (which would surface as
 * "Organization not found" instead of the correct plan-gated error).
 *
 * @param actionLabel – human-readable phrase appended to the error, e.g.
 *   "Subscribe to add vendors and tenants."
 */
export async function requireActivePlan(
  actionLabel: string,
): Promise<{ userId: string; orgId: string }> {
  /* ---- authenticate via the cookie-based (anon) client ---- */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  /* ---- all DB reads go through the service role client ---- */
  const service = createServiceClient();

  const { data: profile, error: profileError } = await service
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    console.error('[requireActivePlan] profile lookup failed:', profileError);
    throw new Error('No organization found');
  }

  const { data: org, error: orgError } = await service
    .from('organizations')
    .select('plan, trial_ends_at')
    .eq('id', profile.organization_id)
    .single();

  if (orgError || !org) {
    console.error('[requireActivePlan] org lookup failed:', orgError);
    throw new Error('Organization not found');
  }

  const status = getActivePlanStatus(org);
  if (!status.isActive) {
    throw new Error(`${PLAN_INACTIVE_TAG} ${actionLabel}`);
  }

  return { userId: user.id, orgId: profile.organization_id };
}
