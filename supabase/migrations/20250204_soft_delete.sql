-- Add soft delete support to vendors and tenants tables
-- Instead of hard deleting records, we set deleted_at timestamp

-- Add deleted_at column to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for efficient querying of non-deleted records
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at ON vendors(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to only show non-deleted records
-- Note: The application-level filtering handles this, but we add it here for extra safety

-- Drop existing vendor select policy and recreate with soft delete filter
DROP POLICY IF EXISTS "Users can view own vendors" ON vendors;
CREATE POLICY "Users can view own vendors" ON vendors
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Create policy for viewing deleted vendors (for potential admin/restore functionality)
DROP POLICY IF EXISTS "Users can view own deleted vendors" ON vendors;
CREATE POLICY "Users can view own deleted vendors" ON vendors
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Drop existing tenant select policy and recreate with soft delete filter
DROP POLICY IF EXISTS "Users can view own tenants" ON tenants;
CREATE POLICY "Users can view own tenants" ON tenants
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Create policy for viewing deleted tenants
DROP POLICY IF EXISTS "Users can view own deleted tenants" ON tenants;
CREATE POLICY "Users can view own deleted tenants" ON tenants
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Comments for documentation
COMMENT ON COLUMN vendors.deleted_at IS 'Soft delete timestamp - NULL means not deleted, timestamp means deleted at that time';
COMMENT ON COLUMN tenants.deleted_at IS 'Soft delete timestamp - NULL means not deleted, timestamp means deleted at that time';
