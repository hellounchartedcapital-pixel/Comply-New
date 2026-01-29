-- Add upload token expiration column
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS upload_token_expires_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_upload_token_expires
ON vendors(upload_token, upload_token_expires_at)
WHERE upload_token IS NOT NULL;

-- Comment explaining the column
COMMENT ON COLUMN vendors.upload_token_expires_at IS
'Expiration timestamp for the vendor upload token. Tokens are valid for 30 days by default.';

-- Update existing tokens to expire in 30 days from now
-- This gives existing vendors time to upload before their tokens expire
UPDATE vendors
SET upload_token_expires_at = NOW() + INTERVAL '30 days'
WHERE upload_token IS NOT NULL
  AND upload_token_expires_at IS NULL;
