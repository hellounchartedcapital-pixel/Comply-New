-- Add support for vendors to be assigned to multiple properties
-- Adds property_ids array field while keeping property_id for backwards compatibility

-- Add property_ids array column to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS property_ids UUID[] DEFAULT '{}';

-- Migrate existing property_id values to property_ids array
UPDATE vendors
SET property_ids = ARRAY[property_id]
WHERE property_id IS NOT NULL AND (property_ids IS NULL OR property_ids = '{}');

-- Create index for array contains queries
CREATE INDEX IF NOT EXISTS idx_vendors_property_ids ON vendors USING GIN (property_ids);

-- Note: We keep property_id for backwards compatibility
-- The application will primarily use property_ids going forward
