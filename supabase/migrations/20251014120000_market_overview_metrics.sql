-- Create aggregated metrics view and RPC for marketplace
-- Types are stable (NUMERIC), so CREATE OR REPLACE won't fail.

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
first_trade_24h as (
  select distinct on (t.athlete_id)
    t.athlete_id,
    t.price_after
  from public.trades t
  where t.created_at >= now() - interval '24 hours'
  order by t.athlete_id, t.created_at asc
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
    -- KEEP TYPE AS NUMERIC[] (not integer[])
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
left join first_trade_24h ft on ft.athlete_id = tp.athlete_id
left join trades_24h t24 on t24.athlete_id = tp.athlete_id
left join spark_points sp on sp.athlete_id = tp.athlete_id
cross join lateral (
  select coalesce(ft.price_after, coalesce(lt.price_after, tp.current_price)) as base_price
) as baseline;

comment on view public.athlete_metrics_24h is 'Aggregated 24h metrics and 7d sparkline data for marketplace display';

grant select on public.athlete_metrics_24h to anon, authenticated;

-- RPC returns NUMERIC[] for spark7d to match the view
create or replace function public.get_market_overview(athlete_ids uuid[] default null)
returns table (
  athlete_id uuid,
  last_price numeric,
  pct_change_24h numeric,
  notional_24h numeric,
  qty_24h numeric,
  spark7d numeric[]
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  return query
  select
    m.athlete_id,
    m.last_price,
    m.pct_change_24h,
    m.notional_24h,
    m.qty_24h,
    m.spark7d
  from public.athlete_metrics_24h m
  where athlete_ids is null
     or array_length(athlete_ids, 1) is null
     or m.athlete_id = any (athlete_ids);
end;
$$;

comment on function public.get_market_overview(uuid[]) is 'Return pre-aggregated marketplace metrics for specified athletes';

grant execute on function public.get_market_overview(uuid[]) to anon, authenticated;
