// ---------------------------------------------------------------------------
// Plan status helpers — shared between server actions and client components
// ---------------------------------------------------------------------------

export type PlanReason = 'active' | 'trial_expired' | 'canceled';

export interface PlanStatus {
  isActive: boolean;
  reason: PlanReason;
}

/**
 * Determine whether an org has an active (usable) plan.
 *
 * Active if:
 *   - plan is starter, professional, or enterprise
 *   - plan is trial AND trial_ends_at is in the future
 *
 * Inactive if:
 *   - plan is trial AND trial_ends_at is in the past or null
 *   - plan is canceled
 */
export function getActivePlanStatus(org: {
  plan: string;
  trial_ends_at: string | null;
}): PlanStatus {
  const { plan, trial_ends_at } = org;

  if (plan === 'canceled') {
    return { isActive: false, reason: 'canceled' };
  }

  if (plan === 'trial') {
    const isValid =
      trial_ends_at != null && new Date(trial_ends_at) > new Date();
    return isValid
      ? { isActive: true, reason: 'active' }
      : { isActive: false, reason: 'trial_expired' };
  }

  // starter, professional, enterprise, or any paid plan
  return { isActive: true, reason: 'active' };
}

/** Prefix used by server actions so the client can detect plan-gated errors */
export const PLAN_INACTIVE_PREFIX = 'Your free trial has expired.';

/** Check whether an error message is a plan-gated error (for client-side use) */
export function isPlanInactiveError(message: string): boolean {
  return message.startsWith(PLAN_INACTIVE_PREFIX);
}
