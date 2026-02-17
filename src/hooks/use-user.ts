'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string;
  role: string;
}

export function useUser() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAuthUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setAuthUser(user);

      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, organization_id, role')
        .eq('id', user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        // Re-fetch profile on auth state change
        supabase
          .from('users')
          .select('id, email, full_name, organization_id, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setAuthUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user: authUser,
    profile,
    loading,
    isAuthenticated: !!authUser,
  };
}
