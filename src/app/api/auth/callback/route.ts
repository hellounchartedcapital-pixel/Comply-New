import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Auth callback: code exchange failed', error.message);
    return NextResponse.redirect(`${origin}/login`);
  }

  // Session is now established — determine where to send the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Use service client to check/create profile (avoids RLS chicken-and-egg)
  const service = createServiceClient();

  // Check if user profile exists
  const { data: profile } = await service
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    // Profile doesn't exist yet — create org + profile now
    // (handles the case where signup created the auth user but org/profile
    // creation was deferred because email confirmation was required)
    try {
      // Re-check to guard against race conditions (e.g., user double-clicks
      // confirmation link, triggering two concurrent callbacks)
      const { data: recheck } = await service
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (recheck?.organization_id) {
        // Another callback already created the profile — skip to redirect
        return NextResponse.redirect(`${origin}/setup`);
      }

      const rawName = String(user.user_metadata?.full_name ?? '');
      // Sanitize: strip HTML tags and truncate to 100 characters
      const fullName = rawName.replace(/<[^>]*>/g, '').trim().slice(0, 100);
      const email = user.email ?? '';

      const { data: org, error: orgError } = await service
        .from('organizations')
        .insert({ name: `${fullName}'s Organization` })
        .select('id')
        .single();

      if (orgError) throw orgError;

      const { error: profileError } = await service
        .from('users')
        .insert({
          id: user.id,
          organization_id: org.id,
          email,
          full_name: fullName,
          role: 'manager',
        });

      // If profile insert fails due to unique constraint (race condition),
      // another callback already created the profile — that's OK
      if (profileError && !profileError.message?.includes('duplicate key')) {
        throw profileError;
      }

      // Send welcome email only if we actually created the profile
      if (!profileError) {
        sendWelcomeEmail(email, fullName).catch((err) =>
          console.error('Welcome email failed:', err)
        );
      }
    } catch (err) {
      console.error('Auth callback: org/profile creation failed', err);
      // Still redirect to setup — it will retry org creation
    }

    return NextResponse.redirect(`${origin}/setup`);
  }

  // Profile exists — check if onboarding is completed
  const { data: org } = await service
    .from('organizations')
    .select('settings')
    .eq('id', profile.organization_id)
    .single();

  const onboardingCompleted = org?.settings?.onboarding_completed === true;

  return NextResponse.redirect(
    `${origin}${onboardingCompleted ? '/dashboard' : '/setup'}`
  );
}

/**
 * Send welcome email via the existing email sender.
 * Imported dynamically to keep the route handler lean.
 */
async function sendWelcomeEmail(email: string, fullName: string) {
  const { sendNotificationEmail } = await import('@/lib/notifications/email-sender');
  const { welcomeEmail } = await import('@/lib/notifications/email-templates');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://smartcoi.io';
  const template = welcomeEmail({ user_name: fullName, setup_link: `${appUrl}/setup` });

  await sendNotificationEmail(email, template.subject, template.html);
}
