-- ============================================================================
-- Supabase Security Advisor Fixes
-- 1. Fix "Function Search Path Mutable" on three functions
-- 2. Fix "RLS Policy Always True" on organizations INSERT
-- 3. Note on pg_net extension schema (low priority)
-- ============================================================================

-- ============================================================================
-- 1. FIX: Function Search Path Mutable
-- Pin search_path to prevent search-path-based privilege escalation.
-- See: https://supabase.com/docs/guides/database/database-advisors
-- ============================================================================

-- 1a. update_updated_at_column — trigger function for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1b. get_user_organization_id — RLS helper (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 1c. create_org_and_profile — signup helper (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_org_and_profile(
  org_name TEXT,
  user_email TEXT,
  user_full_name TEXT
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO public.organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  -- Create user profile
  INSERT INTO public.users (id, organization_id, email, full_name, role)
  VALUES (auth.uid(), new_org_id, user_email, user_full_name, 'manager');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 2. FIX: RLS Policy Always True on organizations
--
-- The old INSERT policy used WITH CHECK (true), allowing any authenticated
-- user to insert any organization. This is overly permissive.
--
-- The create_org_and_profile() function runs as SECURITY DEFINER (bypasses
-- RLS entirely), so the normal signup flow is not affected by INSERT policy
-- restrictions. We can safely tighten the INSERT policy.
--
-- For SELECT and UPDATE, the existing policies already use
-- get_user_organization_id() and are correct.
-- ============================================================================

-- Drop the overly permissive INSERT policy (may exist from fresh_setup or add_insert_policies)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Replace with a scoped policy: users can only insert an org row with their
-- own org ID. In practice, org creation during signup goes through the
-- SECURITY DEFINER function (create_org_and_profile) which bypasses RLS,
-- so this policy mainly guards against direct INSERT abuse.
-- We allow INSERT only if the id matches the user's current org (for edge
-- cases like settings updates that upsert), or via SECURITY DEFINER functions.
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow if this is a new org being created via the SECURITY DEFINER function
    -- (which bypasses RLS), or if the user already belongs to this org.
    -- Since create_org_and_profile bypasses RLS, this policy only applies to
    -- direct inserts, which we restrict to the user's own organization.
    id = get_user_organization_id()
  );


-- ============================================================================
-- 3. NOTE: pg_net Extension Schema
--
-- The Supabase Advisor recommends moving pg_net from public to an extensions
-- schema. However, this project does not have a dedicated extensions schema
-- set up, and pg_net is a Supabase-managed extension that may be
-- auto-provisioned in the public schema on hosted Supabase instances.
--
-- On Supabase-hosted projects, the extensions schema is typically managed
-- by the platform. Moving pg_net requires:
--   1. DROP EXTENSION IF EXISTS pg_net;
--   2. CREATE EXTENSION pg_net SCHEMA extensions;
-- But this can break pg_net if the extensions schema doesn't exist or if
-- existing references (like net.http_post calls) expect it in public.
--
-- This is a LOW PRIORITY item. If you are on a hosted Supabase project,
-- the platform may handle this automatically. If you want to fix it manually:
--
--   CREATE SCHEMA IF NOT EXISTS extensions;
--   DROP EXTENSION IF EXISTS pg_net;
--   CREATE EXTENSION pg_net SCHEMA extensions;
--
-- Then update any references from net.http_post to extensions.net.http_post.
-- ============================================================================
