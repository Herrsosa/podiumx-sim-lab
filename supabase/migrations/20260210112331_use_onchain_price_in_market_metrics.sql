-- Prefer synced on-chain snapshots for "current price" wherever possible.
--
-- Without this, the marketplace/profile can show the off-chain curve price
-- (a*s^2 + b*s + c) even when the real on-chain contract parameters differ.
-- This also breaks agent-trade parity checks and causes charts to look wrong.

create or replace view public.athlete_metrics_24h as
with token_prices as (
  select
    at.athlete_id,
    at.a,
    at.b,
    at.c,
    at.supply,
    coalesce(nullif(at.onchain_price, 0), (at.a * at.supply * at.supply) + (at.b * at.supply) + at.c) as current_price
  from public.athlete_tokens at
),
latest_trade as (
  select distinct on (t.athlete_id)
    t.athlete_id,
    t.price_after,
    t.created_at
  from public.trades t
  where coalesce(t.is_on_chain, false) = true
  order by t.athlete_id, t.created_at desc
),
trade_before_24h as (
  select distinct on (t.athlete_id)
    t.athlete_id,
    t.price_after
  from public.trades t
  where coalesce(t.is_on_chain, false) = true
    and t.created_at < now() - interval '24 hours'
  order by t.athlete_id, t.created_at desc
),
trades_24h as (
  select
    t.athlete_id,
    sum(abs(t.net_amount))::numeric as notional_24h,
    sum(t.qty)::numeric            as qty_24h
  from public.trades t
  where coalesce(t.is_on_chain, false) = true
    and t.created_at >= now() - interval '24 hours'
  group by t.athlete_id
),
spark_base as (
  select
    tp.athlete_id,
    series.day_index,
    coalesce(
      (
        select tr.price_after
        from public.trades tr
        where coalesce(tr.is_on_chain, false) = true
          and tr.athlete_id = tp.athlete_id
          and tr.created_at < series.bucket_time
        order by tr.created_at desc
        limit 1
      ),
      tp.current_price
    ) as bucket_price
  from token_prices tp
  cross join lateral (
    select
      gs.day_index,
      date_trunc('day', now()) - interval '6 days' + make_interval(days => gs.day_index + 1) as bucket_time
    from generate_series(0, 6) as gs(day_index)
  ) as series
),
spark_points as (
  select
    athlete_id,
    array_agg(round(bucket_price * 100)::numeric order by day_index) as spark7d
  from spark_base
  group by athlete_id
)
select
  tp.athlete_id,
  coalesce(lt.price_after, tp.current_price)::numeric as last_price,
  case
    when base_price <= 0 then 0
    else ((coalesce(lt.price_after, tp.current_price) - base_price) / base_price) * 100
  end::numeric as pct_change_24h,
  coalesce(t24.notional_24h, 0)::numeric as notional_24h,
  coalesce(t24.qty_24h, 0)::numeric      as qty_24h,
  sp.spark7d
from token_prices tp
left join latest_trade lt on lt.athlete_id = tp.athlete_id
left join trade_before_24h tb on tb.athlete_id = tp.athlete_id
left join trades_24h t24 on t24.athlete_id = tp.athlete_id
left join spark_points sp on sp.athlete_id = tp.athlete_id
cross join lateral (
  select coalesce(tb.price_after, coalesce(lt.price_after, tp.current_price)) as base_price
) as baseline;

comment on view public.athlete_metrics_24h is 'Aggregated 24h metrics and 7d sparkline data for marketplace display (on-chain only)';

grant select on public.athlete_metrics_24h to anon, authenticated;

-- Keep movers RPC aligned with the same "current price" logic.
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
      coalesce(nullif(at.onchain_price, 0), (at.a * at.supply * at.supply) + (at.b * at.supply) + at.c) as current_price
    from public.athlete_tokens at
  ),
  latest as (
    select distinct on (t.athlete_id)
      t.athlete_id,
      t.price_after::numeric as last_price,
      t.created_at as last_trade_at
    from public.trades t
    where coalesce(t.is_on_chain, false) = true
    order by t.athlete_id, t.created_at desc
  ),
  baseline_trade as (
    select distinct on (t.athlete_id)
      t.athlete_id,
      t.price_after::numeric as base_price
    from public.trades t
    cross join bounds b
    where coalesce(t.is_on_chain, false) = true
      and t.created_at < b.t0
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
    where coalesce(t.is_on_chain, false) = true
      and t.created_at >= b.t0
      and t.created_at <= b.t1
    order by t.athlete_id, t.created_at asc
  ),
  inferred_baseline as (
    select
      fiw.athlete_id,
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
    where coalesce(t.is_on_chain, false) = true
      and t.created_at >= b.t0
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
limit p_limit;
$$;

comment on function public.get_top_movers(interval, int) is 'Return the top movers over a window using on-chain-only trades + on-chain snapshot prices.';

grant execute on function public.get_top_movers(interval, int) to anon, authenticated;

