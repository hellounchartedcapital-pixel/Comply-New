import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * DEBUG endpoint — dumps all organizations with full data.
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * Usage: GET /api/debug/orgs?secret=<CRON_SECRET>
 *
 * Also auto-fixes stale orgs: sets onboarding_completed = true for any org
 * that has properties but is missing the flag.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 1. Fetch ALL organizations — every column
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*');

  if (orgsError) {
    return NextResponse.json({ error: orgsError.message }, { status: 500 });
  }

  // 2. Fetch ALL users (profiles)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, role, organization_id');

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // 3. Count properties per org
  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('id, organization_id, name');

  if (propsError) {
    return NextResponse.json({ error: propsError.message }, { status: 500 });
  }

  // 4. Count vendors per org
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('id, organization_id, name');

  if (vendorsError) {
    return NextResponse.json({ error: vendorsError.message }, { status: 500 });
  }

  // Build per-org summary
  const orgSummaries = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    plan: org.plan,
    trial_ends_at: org.trial_ends_at,
    settings: org.settings,
    settings_type: typeof org.settings,
    onboarding_completed: org.settings?.onboarding_completed ?? 'NOT SET',
    onboarding_completed_type: typeof org.settings?.onboarding_completed,
    created_at: org.created_at,
    updated_at: org.updated_at,
    users: users.filter((u) => u.organization_id === org.id),
    property_count: properties.filter((p) => p.organization_id === org.id).length,
    properties: properties.filter((p) => p.organization_id === org.id).map((p) => p.name),
    vendor_count: vendors.filter((v) => v.organization_id === org.id).length,
  }));

  // 5. Auto-fix: find orgs that have properties/vendors but missing onboarding_completed
  const staleOrgs = orgSummaries.filter((org) => {
    const raw = org.settings?.onboarding_completed;
    const isCompleted = raw === true || raw === 'true';
    return !isCompleted && (org.property_count > 0 || org.vendor_count > 0);
  });

  const fixes: { orgId: string; orgName: string; before: unknown; after: unknown }[] = [];

  if (searchParams.get('fix') === 'true') {
    for (const staleOrg of staleOrgs) {
      const currentSettings =
        (staleOrg.settings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings, onboarding_completed: true };

      const { error: fixError } = await supabase
        .from('organizations')
        .update({ settings: newSettings })
        .eq('id', staleOrg.id);

      if (!fixError) {
        fixes.push({
          orgId: staleOrg.id,
          orgName: staleOrg.name,
          before: staleOrg.settings,
          after: newSettings,
        });
      }
    }
  }

  return NextResponse.json({
    total_orgs: orgs.length,
    orgs: orgSummaries,
    stale_orgs_needing_fix: staleOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      settings: o.settings,
      property_count: o.property_count,
      vendor_count: o.vendor_count,
    })),
    fixes_applied: fixes,
    fix_instructions:
      staleOrgs.length > 0 && fixes.length === 0
        ? 'Add ?fix=true to the URL to auto-fix stale orgs'
        : null,
  });
}
