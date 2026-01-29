-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to trigger the auto follow-up edge function
CREATE OR REPLACE FUNCTION trigger_auto_follow_up()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get the Supabase URL from environment
  -- Note: You'll need to set these as database secrets
  SELECT current_setting('app.supabase_url', true) INTO supabase_url;
  SELECT current_setting('app.service_role_key', true) INTO service_role_key;

  -- If settings aren't configured, log and return
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE NOTICE 'Auto follow-up skipped: Supabase URL or service role key not configured';
    RETURN;
  END IF;

  -- Call the edge function using pg_net
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/auto-follow-up',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RAISE NOTICE 'Auto follow-up triggered with request ID: %', request_id;
END;
$$;

-- Schedule the cron job to run daily at 9 AM UTC
-- You can adjust the schedule as needed
-- Cron format: minute hour day month weekday
SELECT cron.schedule(
  'auto-follow-up-daily',  -- job name
  '0 9 * * *',             -- 9:00 AM UTC every day
  $$SELECT trigger_auto_follow_up()$$
);

-- Create a log table for cron job runs (optional but helpful for debugging)
CREATE TABLE IF NOT EXISTS cron_job_runs (
  id SERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  details JSONB,
  error TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_job_name ON cron_job_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_started_at ON cron_job_runs(started_at DESC);

-- Comment explaining how to configure
COMMENT ON FUNCTION trigger_auto_follow_up() IS
'Triggers the auto follow-up edge function.
To configure, run:
  ALTER DATABASE postgres SET app.supabase_url = ''your-supabase-url'';
  ALTER DATABASE postgres SET app.service_role_key = ''your-service-role-key'';
';

-- Note: To view scheduled jobs, run: SELECT * FROM cron.job;
-- To unschedule, run: SELECT cron.unschedule('auto-follow-up-daily');
