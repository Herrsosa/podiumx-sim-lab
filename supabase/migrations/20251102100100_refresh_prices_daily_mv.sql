-- Trigger to refresh daily price materialized view when trades change
CREATE OR REPLACE FUNCTION public.refresh_prices_daily_mv()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.prices_daily_mv;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_prices_daily_mv_trigger ON public.trades;
CREATE TRIGGER refresh_prices_daily_mv_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.trades
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_prices_daily_mv();
