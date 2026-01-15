-- Team collaboration tables and policies

-- Create organizations/teams table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(name, created_by)
);

-- Create team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
  UNIQUE(organization_id, user_id)
);

-- Create team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW() + INTERVAL '7 days'),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  UNIQUE(organization_id, email)
);

-- Add organization_id to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_org ON settings(organization_id);

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they are members of"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organizations.id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organizations.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

CREATE POLICY "Admins can delete their organizations"
  ON organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organizations.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

-- Team members policies
CREATE POLICY "Team members can view other members in their organization"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.organization_id = team_members.organization_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Admins can add team members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_members.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

CREATE POLICY "Admins can update team members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.organization_id = team_members.organization_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Admins can remove team members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.organization_id = team_members.organization_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
      AND tm.status = 'active'
    )
  );

-- Team invitations policies
CREATE POLICY "Team members can view invitations in their organization"
  ON team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_invitations.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

CREATE POLICY "Admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_invitations.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

CREATE POLICY "Admins can update invitations"
  ON team_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_invitations.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON team_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = team_invitations.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

-- Update vendors RLS policies to support organization-based access
DROP POLICY IF EXISTS "Users can view their own vendors" ON vendors;
CREATE POLICY "Users can view vendors in their organizations"
  ON vendors FOR SELECT
  USING (
    -- Personal vendors (backward compatibility)
    user_id = auth.uid()
    OR
    -- Organization vendors
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = vendors.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own vendors" ON vendors;
CREATE POLICY "Users can insert vendors"
  ON vendors FOR INSERT
  WITH CHECK (
    -- Personal vendors
    user_id = auth.uid()
    OR
    -- Organization vendors (must be member)
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = vendors.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
      AND team_members.role IN ('admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Users can update their own vendors" ON vendors;
CREATE POLICY "Users can update vendors"
  ON vendors FOR UPDATE
  USING (
    -- Personal vendors
    user_id = auth.uid()
    OR
    -- Organization vendors (must be admin or member)
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = vendors.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
      AND team_members.role IN ('admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Users can delete their own vendors" ON vendors;
CREATE POLICY "Users can delete vendors"
  ON vendors FOR DELETE
  USING (
    -- Personal vendors
    user_id = auth.uid()
    OR
    -- Organization vendors (must be admin or member)
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = vendors.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
      AND team_members.role IN ('admin', 'member')
    )
  );

-- Update settings RLS policies for organization support
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
CREATE POLICY "Users can view settings"
  ON settings FOR SELECT
  USING (
    -- Personal settings
    user_id = auth.uid()
    OR
    -- Organization settings
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = settings.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
CREATE POLICY "Users can insert settings"
  ON settings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
CREATE POLICY "Users can update settings"
  ON settings FOR UPDATE
  USING (
    -- Personal settings
    user_id = auth.uid()
    OR
    -- Organization settings (admins only)
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = settings.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
      AND team_members.role = 'admin'
    )
  );

-- Function to automatically create organization and admin membership for new users
CREATE OR REPLACE FUNCTION create_default_organization()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Create a default organization for the new user
  INSERT INTO organizations (name, created_by)
  VALUES (NEW.email || '''s Organization', NEW.id)
  RETURNING id INTO org_id;

  -- Add the user as admin of their organization
  INSERT INTO team_members (organization_id, user_id, role, status, joined_at)
  VALUES (org_id, NEW.id, 'admin', 'active', NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default organization on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_organization();
