-- RPC to compute top movers over arbitrary short windows (1h/6h/etc) directly from trades.
--
-- Why: the marketplace uses `athlete_metrics_24h`, but agents may ask for `1h` movers.
-- `prices_daily_mv` is day-granularity and may be stale. This function computes a baseline
-- using the last trade before the window and the latest trade at/within the window.

create or replace function public.get_top_movers(
  p_window interval default interval '24 hours',
  p_limit int default 10
)
returns table (
  athlete_id uuid,
  last_price numeric,
  base_price numeric,
  pct_change numeric,
  notional numeric,
  qty numeric
)
language sql
stable
security definer
set search_path = public
as $$
with
  bounds as (
    select now() - p_window as t0, now() as t1
  ),
  -- Latest trade overall (for last_price).
  latest as (
    select distinct on (t.athlete_id)
      t.athlete_id,
      t.price_after as last_price
    from public.trades t
    order by t.athlete_id, t.created_at desc
  ),
  -- Baseline: last trade strictly before the window start.
  baseline as (
    select distinct on (t.athlete_id)
      t.athlete_id,
      t.price_after as base_price
    from public.trades t
    cross join bounds b
    where t.created_at < b.t0
    order by t.athlete_id, t.created_at desc
  ),
  window_trades as (
    select
      t.athlete_id,
      sum(abs(t.net_amount))::numeric as notional,
      sum(t.qty)::numeric            as qty
    from public.trades t
    cross join bounds b
    where t.created_at >= b.t0
      and t.created_at <= b.t1
    group by t.athlete_id
  )
select
  l.athlete_id,
  l.last_price::numeric as last_price,
  coalesce(bl.base_price, l.last_price)::numeric as base_price,
  case
    when coalesce(bl.base_price, l.last_price) <= 0 then 0
    else ((l.last_price - coalesce(bl.base_price, l.last_price)) / coalesce(bl.base_price, l.last_price)) * 100
  end::numeric as pct_change,
  coalesce(w.notional, 0)::numeric as notional,
  coalesce(w.qty, 0)::numeric as qty
from latest l
left join baseline bl on bl.athlete_id = l.athlete_id
left join window_trades w on w.athlete_id = l.athlete_id
order by abs(
  case
    when coalesce(bl.base_price, l.last_price) <= 0 then 0
    else ((l.last_price - coalesce(bl.base_price, l.last_price)) / coalesce(bl.base_price, l.last_price)) * 100
  end
) desc
limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

comment on function public.get_top_movers(interval, int) is 'Compute movers over a window using last trade before window as baseline and latest trade as last price';

grant execute on function public.get_top_movers(interval, int) to anon, authenticated;

