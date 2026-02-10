-- Fix get_top_movers baseline logic for short windows (e.g. 1h).
--
-- Previous version used "last trade before window" as baseline and fell back to last_price.
-- If the first trade for an athlete is inside the window, there is no "before" trade, so
-- baseline == last_price => pct_change == 0.00% even though the price moved.
--
-- New logic:
-- - If there is a trade before the window, use its price_after as base_price.
-- - Else if there is a first trade inside the window, infer the price immediately *before*
--   that trade from (supply_before, curve a/b/c) stored in athlete_tokens.
-- - Else fall back to last_price (no movement possible without trades).

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
  token_prices as (
    select
      at.athlete_id,
      at.a,
      at.b,
      at.c,
      at.supply,
      (at.a * at.supply * at.supply) + (at.b * at.supply) + at.c as current_price
    from public.athlete_tokens at
  ),
  latest as (
    select distinct on (t.athlete_id)
      t.athlete_id,
      t.price_after::numeric as last_price,
      t.created_at as last_trade_at
    from public.trades t
    order by t.athlete_id, t.created_at desc
  ),
  baseline_trade as (
    select distinct on (t.athlete_id)
      t.athlete_id,
      t.price_after::numeric as base_price
    from public.trades t
    cross join bounds b
    where t.created_at < b.t0
    order by t.athlete_id, t.created_at desc
  ),
  first_in_window as (
    select distinct on (t.athlete_id)
      t.athlete_id,
      t.side,
      t.qty,
      t.supply_after,
      t.created_at
    from public.trades t
    cross join bounds b
    where t.created_at >= b.t0
      and t.created_at <= b.t1
    order by t.athlete_id, t.created_at asc
  ),
  inferred_baseline as (
    select
      fiw.athlete_id,
      -- Infer supply immediately before the first trade in-window.
      case
        when upper(fiw.side::text) = 'BUY' then greatest(fiw.supply_after - fiw.qty, 0)
        else fiw.supply_after + fiw.qty
      end as supply_before
    from first_in_window fiw
  ),
  inferred_base_price as (
    select
      ib.athlete_id,
      ((tp.a * ib.supply_before * ib.supply_before) + (tp.b * ib.supply_before) + tp.c)::numeric as base_price
    from inferred_baseline ib
    join token_prices tp on tp.athlete_id = ib.athlete_id
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
  ),
  combined as (
    select
      tp.athlete_id,
      coalesce(lt.last_price, tp.current_price)::numeric as last_price,
      coalesce(bt.base_price, ibp.base_price, coalesce(lt.last_price, tp.current_price))::numeric as base_price,
      coalesce(w.notional, 0)::numeric as notional,
      coalesce(w.qty, 0)::numeric as qty
    from token_prices tp
    left join latest lt on lt.athlete_id = tp.athlete_id
    left join baseline_trade bt on bt.athlete_id = tp.athlete_id
    left join inferred_base_price ibp on ibp.athlete_id = tp.athlete_id
    left join window_trades w on w.athlete_id = tp.athlete_id
    where tp.supply > 0
  )
select
  c.athlete_id,
  c.last_price,
  c.base_price,
  case
    when c.base_price <= 0 then 0
    else ((c.last_price - c.base_price) / c.base_price) * 100
  end::numeric as pct_change,
  c.notional,
  c.qty
from combined c
order by abs(
  case
    when c.base_price <= 0 then 0
    else ((c.last_price - c.base_price) / c.base_price) * 100
  end
) desc
limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

comment on function public.get_top_movers(interval, int) is 'Compute movers over a window using last trade before window or inferred pre-window price as baseline and latest price as last';

grant execute on function public.get_top_movers(interval, int) to anon, authenticated;

