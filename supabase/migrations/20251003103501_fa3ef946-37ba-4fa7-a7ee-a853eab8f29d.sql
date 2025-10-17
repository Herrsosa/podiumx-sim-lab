-- Create function for atomic trade execution
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_side') THEN
      CREATE TYPE trade_side AS ENUM ('BUY', 'SELL');
    END IF;
  END;
  $$;



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
  p_new_athlete_earnings NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_wallet_balance NUMERIC;
  v_holding_qty INTEGER;
  v_avg_cost NUMERIC;
BEGIN
  -- Start transaction
  -- Update athlete token
  UPDATE athlete_tokens
  SET 
    supply = p_new_supply,
    treasury_balance = p_new_treasury,
    athlete_earnings = p_new_athlete_earnings
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
    -- Create new holding (for buy only)
    IF p_side = 'BUY' THEN
      INSERT INTO holdings (user_id, athlete_id, qty, avg_cost)
      VALUES (p_user_id, p_athlete_id, p_qty, p_gross_amount / p_qty);
    END IF;
  END IF;

  -- Create trade record
  INSERT INTO trades (
    user_id, athlete_id, side, qty, 
    gross_amount, net_amount, fee,
    price_after, supply_after
  )
  VALUES (
    p_user_id, p_athlete_id, p_side, p_qty,
    p_gross_amount, p_net_amount, p_fee,
    p_new_price, p_new_supply
  );
END;
$$;