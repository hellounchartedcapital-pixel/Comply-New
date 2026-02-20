'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getActivePlanStatus, PLAN_INACTIVE_PREFIX } from '@/lib/plan-status';

/**
 * Guard for server actions — throws if the caller's org does not have an
 * active plan.  Returns the org ID on success so the caller doesn't need to
 * re-fetch it.
 *
 * @param actionLabel – human-readable phrase appended to the error, e.g.
 *   "Subscribe to add vendors and tenants."
 */
export async function requireActivePlan(
  actionLabel: string,
): Promise<{ userId: string; orgId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = createServiceClient();
  const { data: profile } = await service
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) throw new Error('No organization found');

  const { data: org } = await service
    .from('organizations')
    .select('plan, trial_ends_at')
    .eq('id', profile.organization_id)
    .single();

  if (!org) throw new Error('Organization not found');

  const status = getActivePlanStatus(org);
  if (!status.isActive) {
    throw new Error(`${PLAN_INACTIVE_PREFIX} ${actionLabel}`);
  }

  return { userId: user.id, orgId: profile.organization_id };
}
