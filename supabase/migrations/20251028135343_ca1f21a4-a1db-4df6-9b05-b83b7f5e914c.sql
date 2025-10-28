-- Create materialized view for daily price aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS prices_daily_mv AS
WITH daily_agg AS (
  SELECT 
    athlete_id,
    DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') AS day_utc,
    MAX(created_at) AS last_ts,
    SUM(gross_amount) AS volume
  FROM athlete_prices
  GROUP BY athlete_id, DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')
)
SELECT 
  da.athlete_id,
  da.day_utc::date AS day_utc,
  ap.price AS close,
  FALSE AS carried,
  da.volume
FROM daily_agg da
JOIN athlete_prices ap ON 
  ap.athlete_id = da.athlete_id 
  AND ap.created_at = da.last_ts
ORDER BY da.athlete_id, da.day_utc;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_prices_daily_mv_athlete_day 
ON prices_daily_mv(athlete_id, day_utc);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_prices_daily_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY prices_daily_mv;
END;
$$;

-- Grant access to authenticated users
GRANT SELECT ON prices_daily_mv TO authenticated;

-- Note: This view should be refreshed periodically (e.g., via cron job or trigger)
-- For now, it will need manual refresh via: SELECT refresh_prices_daily_mv();