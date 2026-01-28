-- Add properties table for multi-property support
-- Each user can have multiple properties, each with its own vendors and requirements

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  -- Property-specific insurance requirements (overrides global settings)
  general_liability INTEGER DEFAULT 1000000,
  gl_aggregate INTEGER DEFAULT 2000000,
  auto_liability INTEGER DEFAULT 1000000,
  auto_liability_required BOOLEAN DEFAULT false,
  workers_comp_required BOOLEAN DEFAULT true,
  employers_liability INTEGER DEFAULT 500000,
  company_name TEXT, -- Additional insured name for this property
  require_additional_insured BOOLEAN DEFAULT true,
  require_waiver_of_subrogation BOOLEAN DEFAULT false,
  custom_coverages JSONB DEFAULT '[]'::jsonb,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view own properties" ON properties;
CREATE POLICY "Users can view own properties"
  ON properties FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own properties" ON properties;
CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own properties" ON properties;
CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add property_id to vendors table (nullable for backwards compatibility)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- Create index for property_id
CREATE INDEX IF NOT EXISTS idx_vendors_property_id ON vendors(property_id);

-- Add company_name to settings table if not exists (for global/default company name)
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for properties updated_at
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant service role access
GRANT ALL ON properties TO service_role;
