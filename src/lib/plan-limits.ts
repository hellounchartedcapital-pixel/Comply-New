import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Plan limits
// ---------------------------------------------------------------------------

export interface PlanLimits {
  maxVendorsTenants: number;
  maxExtractionsPerMonth: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  trial: { maxVendorsTenants: 50, maxExtractionsPerMonth: 50 },
  starter: { maxVendorsTenants: 50, maxExtractionsPerMonth: 50 },
  professional: { maxVendorsTenants: 250, maxExtractionsPerMonth: 200 },
  canceled: { maxVendorsTenants: 0, maxExtractionsPerMonth: 0 },
};

/** Get the limits for a plan. Unknown plans get starter limits. */
export function getOrgLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
}

// ---------------------------------------------------------------------------
// Enforcement helpers — call these before creating vendors/tenants or
// extracting COIs. They return { allowed: true } or { allowed: false, error }.
// ---------------------------------------------------------------------------

export async function checkVendorTenantLimit(
  orgId: string,
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single();

  const plan = org?.plan ?? 'trial';
  const limits = getOrgLimits(plan);

  if (plan === 'canceled') {
    return {
      allowed: false,
      error: 'Your subscription has been canceled. Please resubscribe to add vendors or tenants.',
    };
  }

  // Count active (non-deleted) vendors + tenants
  const { count: vendorCount } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const { count: tenantCount } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('deleted_at', null);

  const total = (vendorCount ?? 0) + (tenantCount ?? 0);

  if (total >= limits.maxVendorsTenants) {
    const upgrade =
      plan === 'starter' || plan === 'trial'
        ? ' Upgrade to Professional for up to 250 vendors & tenants.'
        : '';
    return {
      allowed: false,
      error: `You've reached the vendor/tenant limit for your plan (${limits.maxVendorsTenants}).${upgrade}`,
    };
  }

  return { allowed: true };
}

export async function checkExtractionLimit(
  orgId: string,
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single();

  const plan = org?.plan ?? 'trial';
  const limits = getOrgLimits(plan);

  if (plan === 'canceled') {
    return {
      allowed: false,
      error: 'Your subscription has been canceled. Please resubscribe to extract COIs.',
    };
  }

  // Count extractions this calendar month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from('certificates')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .neq('processing_status', 'failed')
    .gte('uploaded_at', startOfMonth);

  if ((count ?? 0) >= limits.maxExtractionsPerMonth) {
    const upgrade =
      plan === 'starter' || plan === 'trial'
        ? ' Upgrade to Professional for 200 extractions per month.'
        : '';
    return {
      allowed: false,
      error: `You've reached the monthly extraction limit for your plan (${limits.maxExtractionsPerMonth}).${upgrade}`,
    };
  }

  return { allowed: true };
}
