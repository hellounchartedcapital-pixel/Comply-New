import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client using the service role key.
 * This bypasses RLS and should ONLY be used in server-side code
 * for operations that don't have an authenticated user (e.g., portal uploads).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
