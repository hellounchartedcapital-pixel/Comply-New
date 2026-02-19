-- Add Stripe billing columns to the organizations table
-- These store the Stripe customer/subscription IDs and payment status

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_failed BOOLEAN NOT NULL DEFAULT false;

-- Index for webhook lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id
  ON organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
