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
