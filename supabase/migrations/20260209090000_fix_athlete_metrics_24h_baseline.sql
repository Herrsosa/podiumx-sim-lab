-- Fix 24h % change baseline for marketplace movers.
--
-- Previous logic used the first trade *inside* the last-24h window as baseline,
-- which makes pct_change_24h show 0.00% when there is only one trade in the window
-- (first == latest). Instead, use the last trade *before* the window as baseline.

create or replace view public.athlete_metrics_24h as
with token_prices as (
  select
    at.athlete_id,
    at.a,
    at.b,
    at.c,
    at.supply,
    (at.a * at.supply * at.supply) + (at.b * at.supply) + at.c as current_price
  from public.athlete_tokens at
),
latest_trade as (
  select distinct on (t.athlete_id)
    t.athlete_id,
    t.price_after,
    t.created_at
  from public.trades t
  order by t.athlete_id, t.created_at desc
),
trade_before_24h as (
  select distinct on (t.athlete_id)
    t.athlete_id,
    t.price_after
  from public.trades t
  where t.created_at < now() - interval '24 hours'
  order by t.athlete_id, t.created_at desc
),
trades_24h as (
  select
    t.athlete_id,
    sum(abs(t.net_amount))::numeric as notional_24h,
    sum(t.qty)::numeric            as qty_24h
  from public.trades t
  where t.created_at >= now() - interval '24 hours'
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
        where tr.athlete_id = tp.athlete_id
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

comment on view public.athlete_metrics_24h is 'Aggregated 24h metrics and 7d sparkline data for marketplace display';

grant select on public.athlete_metrics_24h to anon, authenticated;

