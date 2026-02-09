-- Fix resolve_prediction_market to:
-- - validate winning outcome belongs to the market
-- - prevent double-resolve
-- - correctly compute per-user results even when a user bet on multiple outcomes
-- - optionally restrict resolution to the service_role

-- Also harden place_prediction_bet to prevent placing bets on behalf of another user.
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
  v_bet_id UUID;
BEGIN
  -- Validate stake
  IF p_stake <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stake must be positive');
  END IF;

  -- Prevent impersonation (service_role is allowed for agents/server)
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
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
    UPDATE prediction_markets
    SET status = 'closed',
        updated_at = now()
    WHERE id = p_market_id;
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

  IF v_total_shares <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market outcomes not initialized');
  END IF;

  -- Calculate shares to receive (simplified CPMM)
  v_shares_received := p_stake::REAL * v_total_shares::REAL / GREATEST(v_outcome.shares, 1)::REAL;

  -- Deduct credits
  UPDATE prediction_credits
  SET balance = balance - p_stake,
      total_wagered = total_wagered + p_stake,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Add shares to outcome (market_outcomes.shares is currently an integer column)
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

CREATE OR REPLACE FUNCTION resolve_prediction_market(
  p_market_id UUID,
  p_winning_outcome_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_market prediction_markets%ROWTYPE;
  v_total_winning_shares REAL;
  v_user RECORD;
  v_payout INTEGER;
BEGIN
  -- Only allow server-side resolution.
  -- The edge function / scripts call this with the service role key.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Lock market
  SELECT * INTO v_market FROM prediction_markets
  WHERE id = p_market_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.status = 'resolved' THEN
    RAISE EXCEPTION 'Market already resolved';
  END IF;

  -- Ensure the winning outcome is part of this market
  PERFORM 1
  FROM market_outcomes
  WHERE id = p_winning_outcome_id
    AND market_id = p_market_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winning outcome not found for this market';
  END IF;

  -- Mark market resolved
  UPDATE prediction_markets
  SET status = 'resolved',
      resolved_at = now(),
      winning_outcome_id = p_winning_outcome_id,
      updated_at = now()
  WHERE id = p_market_id;

  -- Total winning shares (used to prorate payouts)
  SELECT COALESCE(SUM(shares_received), 0) INTO v_total_winning_shares
  FROM market_bets
  WHERE market_id = p_market_id
    AND outcome_id = p_winning_outcome_id;

  -- Compute results per user (one row per user per market)
  FOR v_user IN
    WITH per_outcome AS (
      SELECT
        user_id,
        outcome_id,
        SUM(stake) AS stake_sum
      FROM market_bets
      WHERE market_id = p_market_id
      GROUP BY user_id, outcome_id
    ),
    primary_outcome AS (
      -- Pick the outcome the user staked the most on (for display when they lose)
      SELECT DISTINCT ON (user_id)
        user_id,
        outcome_id AS primary_outcome_id
      FROM per_outcome
      ORDER BY user_id, stake_sum DESC, outcome_id
    ),
    per_user AS (
      SELECT
        mb.user_id,
        SUM(mb.stake)::INTEGER AS total_stake,
        COALESCE(SUM(CASE WHEN mb.outcome_id = p_winning_outcome_id THEN mb.shares_received ELSE 0 END), 0)::REAL AS winning_shares,
        po.primary_outcome_id
      FROM market_bets mb
      JOIN primary_outcome po ON po.user_id = mb.user_id
      WHERE mb.market_id = p_market_id
      GROUP BY mb.user_id, po.primary_outcome_id
    )
    SELECT * FROM per_user
  LOOP
    IF v_user.winning_shares > 0 AND v_total_winning_shares > 0 THEN
      v_payout := FLOOR((v_user.winning_shares / v_total_winning_shares) * v_market.total_pool)::INTEGER;

      -- Credit winnings (create credits row if missing)
      INSERT INTO prediction_credits (user_id, balance, total_earned, total_wagered)
      VALUES (v_user.user_id, v_payout, v_payout, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET
        balance = prediction_credits.balance + EXCLUDED.balance,
        total_earned = prediction_credits.total_earned + EXCLUDED.total_earned,
        updated_at = now();

      INSERT INTO prediction_results (user_id, market_id, outcome_id, was_correct, total_stake, payout, resolved_at)
      VALUES (v_user.user_id, p_market_id, p_winning_outcome_id, true, v_user.total_stake, v_payout, now())
      ON CONFLICT (user_id, market_id)
      DO UPDATE SET
        outcome_id = EXCLUDED.outcome_id,
        was_correct = EXCLUDED.was_correct,
        total_stake = EXCLUDED.total_stake,
        payout = EXCLUDED.payout,
        resolved_at = EXCLUDED.resolved_at;
    ELSE
      INSERT INTO prediction_results (user_id, market_id, outcome_id, was_correct, total_stake, payout, resolved_at)
      VALUES (v_user.user_id, p_market_id, v_user.primary_outcome_id, false, v_user.total_stake, 0, now())
      ON CONFLICT (user_id, market_id)
      DO UPDATE SET
        outcome_id = EXCLUDED.outcome_id,
        was_correct = EXCLUDED.was_correct,
        total_stake = EXCLUDED.total_stake,
        payout = EXCLUDED.payout,
        resolved_at = EXCLUDED.resolved_at;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'market_id', p_market_id,
    'winning_outcome_id', p_winning_outcome_id,
    'total_pool', v_market.total_pool
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
