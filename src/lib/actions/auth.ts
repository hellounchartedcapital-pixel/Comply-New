'use server';

import { createServiceClient } from '@/lib/supabase/service';

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

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: `${fullName}'s Organization` })
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

  return { orgId: org.id };
}
