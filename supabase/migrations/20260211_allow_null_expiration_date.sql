-- Allow null expiration_date on vendors table
-- New vendors don't have a COI yet, so expiration_date should be nullable
ALTER TABLE vendors ALTER COLUMN expiration_date DROP NOT NULL;
