-- Allow null coverage on vendors table
-- New vendors don't have coverage data until a COI is processed,
-- so the coverage column must be nullable.
ALTER TABLE vendors ALTER COLUMN coverage DROP NOT NULL;
