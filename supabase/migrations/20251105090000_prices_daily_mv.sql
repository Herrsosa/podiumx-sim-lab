-- Rebuild daily price materialized view with carry-forward spine
DROP MATERIALIZED VIEW IF EXISTS public.prices_daily_mv;

CREATE MATERIALIZED VIEW public.prices_daily_mv AS
WITH bounds AS (
  SELECT
    t.athlete_id,
    MIN((t.created_at AT TIME ZONE 'utc')::date) AS start_day,
    CURRENT_DATE AS end_day
  FROM public.trades t
  GROUP BY t.athlete_id
),
spine AS (
  SELECT
    b.athlete_id,
    gs::date AS day_utc
  FROM bounds b,
       generate_series(b.start_day, b.end_day, interval '1 day') AS gs
),
daily AS (
  SELECT
    t.athlete_id,
    (t.created_at AT TIME ZONE 'utc')::date AS day_utc,
    COALESCE(SUM(ABS(t.qty)), 0)::numeric AS volume
  FROM public.trades t
  GROUP BY t.athlete_id, (t.created_at AT TIME ZONE 'utc')::date
),
daily_with_close AS (
  SELECT
    d.athlete_id,
    d.day_utc,
    d.volume,
    (
      SELECT t.price_after
      FROM public.trades t
      WHERE t.athlete_id = d.athlete_id
        AND (t.created_at AT TIME ZONE 'utc')::date = d.day_utc
      ORDER BY t.created_at DESC
      LIMIT 1
    ) AS close
  FROM daily d
),
joined AS (
  SELECT
    s.athlete_id,
    s.day_utc,
    dwc.close,
    COALESCE(dwc.volume, 0) AS volume
  FROM spine s
  LEFT JOIN daily_with_close dwc
    ON dwc.athlete_id = s.athlete_id
   AND dwc.day_utc = s.day_utc
)
SELECT
  j.athlete_id,
  j.day_utc,
  last_value(j.close) IGNORE NULLS OVER (
    PARTITION BY j.athlete_id
    ORDER BY j.day_utc
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS close,
  (j.close IS NULL) AS carried,
  j.volume
FROM joined j
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_prices_daily_mv_aid_day
  ON public.prices_daily_mv (athlete_id, day_utc);

GRANT SELECT ON public.prices_daily_mv TO authenticated, anon, service_role;
