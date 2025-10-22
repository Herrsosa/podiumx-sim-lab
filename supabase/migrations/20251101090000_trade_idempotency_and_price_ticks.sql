-- Add client_request_id column for idempotent trade handling
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_client_request_unique UNIQUE (client_request_id);

-- Recreate execute_trade_transaction to accept idempotency key and record price ticks
DROP FUNCTION IF EXISTS execute_trade_transaction;

CREATE OR REPLACE FUNCTION execute_trade_transaction(
  p_user_id UUID,
  p_athlete_id UUID,
  p_side trade_side,
  p_qty INTEGER,
  p_gross_amount NUMERIC,
  p_net_amount NUMERIC,
  p_fee NUMERIC,
  p_new_supply INTEGER,
  p_new_price NUMERIC,
  p_new_treasury NUMERIC,
  p_new_athlete_earnings NUMERIC,
  p_idempotency_key UUID,
  p_curve_a NUMERIC,
  p_curve_b NUMERIC,
  p_curve_c NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_wallet_balance NUMERIC;
  v_holding_qty INTEGER;
  v_avg_cost NUMERIC;
BEGIN
  -- Update athlete token
  UPDATE athlete_tokens
  SET
    supply = p_new_supply,
    treasury_balance = p_new_treasury,
    athlete_earnings = p_new_athlete_earnings,
    updated_at = now()
  WHERE athlete_id = p_athlete_id;

  -- Update wallet balance
  IF p_side = 'BUY' THEN
    UPDATE wallets
    SET balance = balance - p_net_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE wallets
    SET balance = balance + p_net_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Update or create holding
  SELECT qty, avg_cost INTO v_holding_qty, v_avg_cost
  FROM holdings
  WHERE user_id = p_user_id AND athlete_id = p_athlete_id;

  IF FOUND THEN
    IF p_side = 'BUY' THEN
      UPDATE holdings
      SET
        qty = qty + p_qty,
        avg_cost = (avg_cost * qty + p_gross_amount) / (qty + p_qty),
        updated_at = now()
      WHERE user_id = p_user_id AND athlete_id = p_athlete_id;
    ELSE
      IF v_holding_qty - p_qty = 0 THEN
        DELETE FROM holdings
        WHERE user_id = p_user_id AND athlete_id = p_athlete_id;
      ELSE
        UPDATE holdings
        SET
          qty = qty - p_qty,
          updated_at = now()
        WHERE user_id = p_user_id AND athlete_id = p_athlete_id;
      END IF;
    END IF;
  ELSE
    IF p_side = 'BUY' THEN
      INSERT INTO holdings (user_id, athlete_id, qty, avg_cost)
      VALUES (p_user_id, p_athlete_id, p_qty, p_gross_amount / p_qty);
    END IF;
  END IF;

  -- Create trade record
  INSERT INTO trades (
    user_id,
    athlete_id,
    side,
    qty,
    gross_amount,
    net_amount,
    fee,
    price_after,
    supply_after,
    client_request_id
  )
  VALUES (
    p_user_id,
    p_athlete_id,
    p_side,
    p_qty,
    p_gross_amount,
    p_net_amount,
    p_fee,
    p_new_price,
    p_new_supply,
    p_idempotency_key
  );

  -- Record price tick for realtime consumers
  INSERT INTO athlete_prices (
    athlete_id,
    price,
    supply,
    treasury_balance,
    athlete_earnings,
    gross_amount,
    side,
    curve_a,
    curve_b,
    curve_c,
    client_request_id
  )
  VALUES (
    p_athlete_id,
    p_new_price,
    p_new_supply,
    p_new_treasury,
    p_new_athlete_earnings,
    p_gross_amount,
    p_side,
    p_curve_a,
    p_curve_b,
    p_curve_c,
    p_idempotency_key
  );
END;
$$;

-- Create athlete_prices table if it does not exist
CREATE TABLE IF NOT EXISTS public.athlete_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athlete_tokens(athlete_id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  supply INTEGER NOT NULL,
  treasury_balance NUMERIC NOT NULL,
  athlete_earnings NUMERIC NOT NULL,
  gross_amount NUMERIC NOT NULL,
  side trade_side NOT NULL,
  curve_a NUMERIC,
  curve_b NUMERIC,
  curve_c NUMERIC,
  client_request_id UUID REFERENCES public.trades(client_request_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS athlete_prices_athlete_created_idx
  ON public.athlete_prices (athlete_id, created_at DESC);
