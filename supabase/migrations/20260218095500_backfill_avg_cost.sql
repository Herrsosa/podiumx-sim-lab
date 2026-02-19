-- Fix stale avg_cost = 0 in holdings table.
--
-- When a holding was first created by an older version of execute_trade_transaction
-- (before avg_cost was properly calculated), avg_cost was left at 0.
--
-- This migration backfills avg_cost from the earliest BUY trade for each holding
-- where avg_cost is currently 0 and qty > 0.

UPDATE public.holdings h
SET avg_cost = (
  SELECT COALESCE(t.gross_amount / NULLIF(t.qty, 0), 0)
  FROM public.trades t
  WHERE t.user_id = h.user_id
    AND t.athlete_id = h.athlete_id
    AND t.side = 'BUY'
    AND t.gross_amount > 0
  ORDER BY t.created_at ASC
  LIMIT 1
)
WHERE h.avg_cost = 0
  AND h.qty > 0;
