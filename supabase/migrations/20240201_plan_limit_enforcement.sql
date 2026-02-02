-- Plan limit enforcement at the database level
-- This ensures users cannot exceed their subscription limits even if frontend checks are bypassed

-- Create a function to get the vendor limit for a user based on their subscription
CREATE OR REPLACE FUNCTION get_user_vendor_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_plan TEXT;
  vendor_limit INTEGER;
BEGIN
  -- Get the user's current plan from subscriptions table
  SELECT COALESCE(plan, 'free') INTO user_plan
  FROM subscriptions
  WHERE user_id = user_uuid
  AND status = 'active';

  -- If no active subscription found, default to free plan
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  -- Return the vendor limit based on plan
  CASE user_plan
    WHEN 'enterprise' THEN vendor_limit := 500;
    WHEN 'professional' THEN vendor_limit := 100;
    WHEN 'starter' THEN vendor_limit := 25;
    ELSE vendor_limit := 10; -- free plan default
  END CASE;

  RETURN vendor_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the property limit for a user based on their subscription
CREATE OR REPLACE FUNCTION get_user_property_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_plan TEXT;
  property_limit INTEGER;
BEGIN
  -- Get the user's current plan from subscriptions table
  SELECT COALESCE(plan, 'free') INTO user_plan
  FROM subscriptions
  WHERE user_id = user_uuid
  AND status = 'active';

  -- If no active subscription found, default to free plan
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;

  -- Return the property limit based on plan
  CASE user_plan
    WHEN 'enterprise' THEN property_limit := 999999; -- Effectively unlimited
    WHEN 'professional' THEN property_limit := 10;
    WHEN 'starter' THEN property_limit := 3;
    ELSE property_limit := 1; -- free plan default
  END CASE;

  RETURN property_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to enforce vendor limits
CREATE OR REPLACE FUNCTION enforce_vendor_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current vendor count for this user
  SELECT COUNT(*) INTO current_count
  FROM vendors
  WHERE user_id = NEW.user_id;

  -- Get the user's vendor limit
  max_allowed := get_user_vendor_limit(NEW.user_id);

  -- Check if adding this vendor would exceed the limit
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Vendor limit reached. Your plan allows % vendors. Please upgrade to add more.', max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to enforce property limits
CREATE OR REPLACE FUNCTION enforce_property_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current property count for this user
  SELECT COUNT(*) INTO current_count
  FROM properties
  WHERE user_id = NEW.user_id;

  -- Get the user's property limit
  max_allowed := get_user_property_limit(NEW.user_id);

  -- Check if adding this property would exceed the limit
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Property limit reached. Your plan allows % properties. Please upgrade to add more.', max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to enforce tenant limits (same as vendor limits)
CREATE OR REPLACE FUNCTION enforce_tenant_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current tenant count for this user
  SELECT COUNT(*) INTO current_count
  FROM tenants
  WHERE user_id = NEW.user_id;

  -- Get the user's vendor limit (tenants share the same limit as vendors)
  max_allowed := get_user_vendor_limit(NEW.user_id);

  -- Check if adding this tenant would exceed the limit
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Tenant limit reached. Your plan allows % tenants. Please upgrade to add more.', max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist (to allow re-running this migration)
DROP TRIGGER IF EXISTS check_vendor_limit ON vendors;
DROP TRIGGER IF EXISTS check_property_limit ON properties;
DROP TRIGGER IF EXISTS check_tenant_limit ON tenants;

-- Create triggers on the tables
CREATE TRIGGER check_vendor_limit
  BEFORE INSERT ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION enforce_vendor_limit();

CREATE TRIGGER check_property_limit
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION enforce_property_limit();

CREATE TRIGGER check_tenant_limit
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION enforce_tenant_limit();

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_user_vendor_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_property_limit(UUID) TO authenticated;
