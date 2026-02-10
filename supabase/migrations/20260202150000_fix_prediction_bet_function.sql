-- Fix place_prediction_bet function to always return success field
-- and handle edge cases better

CREATE OR REPLACE FUNCTION place_prediction_bet(
  p_user_id UUID,
  p_market_id UUID,
  p_outcome_id UUID,
  p_stake INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_market prediction_markets%ROWTYPE;
  v_outcome market_outcomes%ROWTYPE;
  v_credits prediction_credits%ROWTYPE;
  v_total_shares INTEGER;
  v_shares_received REAL;
  v_new_probability REAL;
  v_bet_id UUID;
BEGIN
  -- Validate stake
  IF p_stake <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stake must be positive');
  END IF;

  -- Lock and get market
  SELECT * INTO v_market FROM prediction_markets
  WHERE id = p_market_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;

  IF v_market.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not open for betting');
  END IF;

  IF v_market.closes_at < now() THEN
    -- Auto-close market
    UPDATE prediction_markets SET status = 'closed' WHERE id = p_market_id;
    RETURN jsonb_build_object('success', false, 'error', 'Market has closed');
  END IF;

  -- Lock and get user credits
  SELECT * INTO v_credits FROM prediction_credits
  WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- Create credits for user
    INSERT INTO prediction_credits (user_id, balance)
    VALUES (p_user_id, 1000)
    RETURNING * INTO v_credits;
  END IF;

  IF v_credits.balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_credits.balance);
  END IF;

  -- Lock and get outcome
  SELECT * INTO v_outcome FROM market_outcomes
  WHERE id = p_outcome_id AND market_id = p_market_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Outcome not found');
  END IF;

  -- Calculate total shares across all outcomes
  SELECT COALESCE(SUM(shares), 0) INTO v_total_shares
  FROM market_outcomes WHERE market_id = p_market_id;

  -- Calculate shares to receive (CPMM: shares = stake / price, where price = outcome_shares / total_shares)
  -- Simplified: shares = stake * total_shares / outcome_shares
  v_shares_received := p_stake::REAL * v_total_shares::REAL / GREATEST(v_outcome.shares, 1)::REAL;

  -- Deduct credits
  UPDATE prediction_credits
  SET balance = balance - p_stake,
      total_wagered = total_wagered + p_stake,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Add shares to outcome
  UPDATE market_outcomes
  SET shares = shares + v_shares_received::INTEGER
  WHERE id = p_outcome_id;

  -- Update market totals
  UPDATE prediction_markets
  SET total_pool = total_pool + p_stake,
      total_trades = total_trades + 1,
      updated_at = now()
  WHERE id = p_market_id;

  -- Create bet record
  INSERT INTO market_bets (user_id, market_id, outcome_id, stake, shares_received, price_at_purchase)
  VALUES (p_user_id, p_market_id, p_outcome_id, p_stake, v_shares_received, v_outcome.probability)
  RETURNING id INTO v_bet_id;

  -- Record activity
  INSERT INTO market_activity (market_id, user_id, outcome_id, action, stake, shares)
  VALUES (p_market_id, p_user_id, p_outcome_id, 'bet', p_stake, v_shares_received);

  -- Update probabilities for all outcomes in this market
  SELECT COALESCE(SUM(shares), 0) INTO v_total_shares
  FROM market_outcomes WHERE market_id = p_market_id;

  UPDATE market_outcomes
  SET probability = shares::REAL / GREATEST(v_total_shares, 1)::REAL
  WHERE market_id = p_market_id;

  -- Get updated outcome
  SELECT * INTO v_outcome FROM market_outcomes WHERE id = p_outcome_id;

  -- Get updated credits
  SELECT * INTO v_credits FROM prediction_credits WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'bet_id', v_bet_id,
    'shares_received', v_shares_received,
    'new_balance', v_credits.balance,
    'outcome_probability', v_outcome.probability
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION place_prediction_bet(UUID, UUID, UUID, INTEGER) TO authenticated;

-- Also fix RLS policies to allow the SECURITY DEFINER function to work properly
-- Drop existing policies and recreate with proper permissions

-- For market_bets: users should be able to read their own and the function inserts
DROP POLICY IF EXISTS "Users can read their own bets" ON market_bets;
DROP POLICY IF EXISTS "Users can place bets" ON market_bets;

CREATE POLICY "Users can read all bets" ON market_bets
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert bets" ON market_bets
  FOR INSERT WITH CHECK (true);

-- For market_activity: everyone can read, function inserts
DROP POLICY IF EXISTS "Activity is readable by everyone" ON market_activity;
DROP POLICY IF EXISTS "Activity insertable by service role" ON market_activity;

CREATE POLICY "Activity readable by all" ON market_activity
  FOR SELECT USING (true);

CREATE POLICY "Service can insert activity" ON market_activity
  FOR INSERT WITH CHECK (true);

-- For prediction_credits: users read own, function manages
DROP POLICY IF EXISTS "Users can read their own credits" ON prediction_credits;
DROP POLICY IF EXISTS "Credits insertable by service role" ON prediction_credits;
DROP POLICY IF EXISTS "Credits updatable by service role" ON prediction_credits;

CREATE POLICY "Users can read own credits" ON prediction_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert credits" ON prediction_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Credits updatable" ON prediction_credits
  FOR UPDATE USING (true);
