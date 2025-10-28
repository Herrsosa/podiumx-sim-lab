-- Optional helper to refresh the daily price MV without synchronous triggers
DROP TRIGGER IF EXISTS refresh_prices_daily_mv_trigger ON public.trades;

DROP FUNCTION IF EXISTS public.refresh_prices_daily_mv();

CREATE OR REPLACE FUNCTION public.refresh_prices_daily_mv()
RETURNS void
LANGUAGE sql
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.prices_daily_mv;
$$;
