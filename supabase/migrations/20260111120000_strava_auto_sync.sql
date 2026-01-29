-- Migration: Set up pg_cron job for hourly Strava auto-sync
-- This requires the pg_cron and pg_net extensions to be enabled in Supabase

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the Strava sync Edge Function to run every hour
-- Note: This uses pg_net to call the Edge Function via HTTP
SELECT cron.schedule(
  'strava-auto-sync-hourly', -- unique job name
  '0 * * * *',               -- every hour at minute 0 (cron syntax)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-all-strava',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for Strava auto-sync';

-- To check job status, query: SELECT * FROM cron.job;
-- To check job history, query: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To manually trigger the sync (for testing), run:
-- SELECT net.http_post(
--   url := 'https://ssnehmposgsczoadycms.functions.supabase.co/sync-all-strava',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer <service_role_key>"}'::jsonb,
--   body := '{}'::jsonb
-- );
