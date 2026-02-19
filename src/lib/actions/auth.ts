'use server';

import { createServiceClient } from '@/lib/supabase/service';
import { sendNotificationEmail } from '@/lib/notifications/email-sender';
import { welcomeEmail } from '@/lib/notifications/email-templates';

/**
 * Creates an organization and user profile after Supabase Auth signup.
 *
 * Uses the service role client to bypass RLS — this is necessary because
 * the user's session may not be established yet (e.g., when email
 * confirmation is required, signUp() creates the auth user but does NOT
 * return a session, so auth.uid() is null and the old RPC approach fails).
 *
 * Security: validates that the userId exists in auth.users before creating
 * anything, and is idempotent (returns existing org if profile already exists).
 */
export async function createOrgAfterSignup(
  userId: string,
  email: string,
  fullName: string
): Promise<{ orgId: string }> {
  const supabase = createServiceClient();

  // Validate the auth user exists (prevents abuse — can't create profiles for
  // arbitrary UUIDs that don't correspond to real auth accounts)
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) {
    throw new Error('Invalid user account');
  }

  // Idempotent: if the user profile already exists, return the existing org
  const { data: existing } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single();

  if (existing?.organization_id) {
    return { orgId: existing.organization_id };
  }

  // Create organization with 14-day trial
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: `${fullName}'s Organization`,
      plan: 'trial',
      trial_ends_at: trialEndsAt,
    })
    .select('id')
    .single();

  if (orgError) {
    throw new Error(`Failed to create organization: ${orgError.message}`);
  }

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: userId,
      organization_id: org.id,
      email,
      full_name: fullName,
      role: 'manager',
    });

  if (profileError) {
    throw new Error(`Failed to create user profile: ${profileError.message}`);
  }

  // Send welcome email (fire-and-forget — don't block signup on email delivery)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://smartcoi.io';
  const template = welcomeEmail({ user_name: fullName, setup_link: `${appUrl}/setup` });
  sendNotificationEmail(email, template.subject, template.html).catch((err) =>
    console.error('Welcome email failed:', err)
  );

  return { orgId: org.id };
}

/**
 * Mark onboarding as completed for an organization.
 *
 * Uses the service role client to bypass RLS — the client-side UPDATE on the
 * organizations table can be silently blocked by RLS (returns no error but
 * 0 rows affected), causing the onboarding_completed flag to never be set
 * and a redirect loop between /dashboard and /setup.
 */
export async function completeOnboarding(orgId: string): Promise<void> {
  const supabase = createServiceClient();

  // Read current settings
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();

  const currentSettings = (org?.settings as Record<string, unknown>) || {};

  // Write onboarding_completed: true (boolean)
  const { error } = await supabase
    .from('organizations')
    .update({
      settings: { ...currentSettings, onboarding_completed: true },
    })
    .eq('id', orgId);

  if (error) {
    throw new Error(`Failed to complete onboarding: ${error.message}`);
  }
}
