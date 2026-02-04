-- Rate limits table for persistent rate limiting across edge function instances
-- This prevents attackers from bypassing limits by waiting for cold starts

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint for upsert
  CONSTRAINT rate_limits_key_unique UNIQUE (key)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- Index for cleanup of old entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_in INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Try to get existing record
  SELECT * INTO v_record FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF v_record IS NULL THEN
    -- No existing record, create one
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_now)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < v_window_start THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < v_window_start THEN v_now
        ELSE rate_limits.window_start
      END;

    RETURN QUERY SELECT TRUE, p_max_requests - 1, p_window_seconds;

  ELSIF v_record.window_start < v_window_start THEN
    -- Window expired, reset
    UPDATE rate_limits SET count = 1, window_start = v_now WHERE key = p_key;
    RETURN QUERY SELECT TRUE, p_max_requests - 1, p_window_seconds;

  ELSIF v_record.count >= p_max_requests THEN
    -- Rate limit exceeded
    RETURN QUERY SELECT
      FALSE,
      0,
      EXTRACT(EPOCH FROM (v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INTEGER;

  ELSE
    -- Increment counter
    UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
    RETURN QUERY SELECT TRUE, p_max_requests - v_record.count - 1,
      EXTRACT(EPOCH FROM (v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INTEGER;
  END IF;
END;
$$;

-- Cleanup function to remove old entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- Grant execute on functions to authenticated and anon users
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits TO service_role;

-- Grant table access to service_role for edge functions
GRANT ALL ON rate_limits TO service_role;

COMMENT ON TABLE rate_limits IS 'Persistent rate limiting for edge functions';
COMMENT ON FUNCTION check_rate_limit IS 'Check and update rate limit for a given key. Returns allowed status, remaining requests, and seconds until reset.';
