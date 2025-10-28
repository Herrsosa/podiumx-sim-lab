-- Create materialized view aggregating daily athlete prices with carry-forward
DROP MATERIALIZED VIEW IF EXISTS public.prices_daily_mv;

CREATE MATERIALIZED VIEW public.prices_daily_mv AS
WITH trade_days AS (
  SELECT
    athlete_id,
    date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day_utc,
    price_after,
    gross_amount,
    created_at
  FROM public.trades
),
spine AS (
  SELECT
    athlete_id,
    generate_series(
      MIN(day_utc),
      date_trunc('day', NOW() AT TIME ZONE 'UTC')::date,
      '1 day'::interval
    )::date AS day_utc
  FROM trade_days
  GROUP BY athlete_id
),
daily AS (
  SELECT
    athlete_id,
    day_utc,
    SUM(gross_amount)::numeric AS volume,
    (ARRAY_AGG(price_after ORDER BY created_at DESC))[1] AS close
  FROM trade_days
  GROUP BY athlete_id, day_utc
),
combined AS (
  SELECT
    s.athlete_id,
    s.day_utc,
    d.close,
    d.volume,
    d.close IS NULL AS carried
  FROM spine s
  LEFT JOIN daily d
    ON s.athlete_id = d.athlete_id
   AND s.day_utc = d.day_utc
),
filled AS (
  SELECT
    athlete_id,
    day_utc,
    close,
    COALESCE(volume, 0) AS volume,
    carried,
    SUM(CASE WHEN close IS NOT NULL THEN 1 ELSE 0 END)
      OVER (PARTITION BY athlete_id ORDER BY day_utc) AS seq_group
  FROM combined
),
forward_filled AS (
  SELECT
    athlete_id,
    day_utc,
    carried,
    volume,
    CASE
      WHEN seq_group = 0 THEN close
      ELSE MAX(close) FILTER (WHERE close IS NOT NULL)
           OVER (PARTITION BY athlete_id, seq_group)
    END AS filled_close
  FROM filled
)
SELECT
  athlete_id,
  (day_utc)::timestamptz AT TIME ZONE 'UTC' AS day_utc,
  filled_close AS close,
  (carried OR filled_close IS NULL) AS carried,
  CASE WHEN filled_close IS NULL THEN 0 ELSE volume END AS volume
FROM forward_filled
ORDER BY athlete_id, day_utc;

CREATE UNIQUE INDEX prices_daily_mv_pk ON public.prices_daily_mv (athlete_id, day_utc);

GRANT SELECT ON public.prices_daily_mv TO authenticated, anon, service_role;

REFRESH MATERIALIZED VIEW public.prices_daily_mv;
