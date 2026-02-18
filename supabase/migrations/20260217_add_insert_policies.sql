-- ============================================================================
-- Add missing INSERT policies for organizations and users tables
-- Without these, signup and onboarding cannot create org/user profiles
-- ============================================================================

-- Organizations: allow authenticated users to create organizations (for signup/onboarding)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users: allow authenticated users to create their own profile row
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- SECURITY DEFINER function to create org + user profile (bypasses RLS)
-- Used by signup and onboarding flows
-- ============================================================================
CREATE OR REPLACE FUNCTION create_org_and_profile(
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
