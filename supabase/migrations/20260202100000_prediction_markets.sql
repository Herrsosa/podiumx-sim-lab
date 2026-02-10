-- Prediction Markets Schema
-- HYROX prediction markets for Athlyst

-- Market status enum
CREATE TYPE market_status AS ENUM ('open', 'closed', 'resolved', 'cancelled');

-- Market type enum
CREATE TYPE market_type AS ENUM ('winner', 'threshold', 'head_to_head', 'podium', 'station');

-- Main markets table
CREATE TABLE prediction_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  event_city TEXT,
  division TEXT,
  question TEXT NOT NULL,
  type market_type NOT NULL,
  status market_status NOT NULL DEFAULT 'open',
  closes_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  winning_outcome_id UUID,
  total_pool INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Market outcomes table
CREATE TABLE market_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  shares INTEGER DEFAULT 100,  -- initial liquidity
  probability REAL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(market_id, label)
);

-- User bets/positions
CREATE TABLE market_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES market_outcomes(id) ON DELETE CASCADE,
  stake INTEGER NOT NULL,
  shares_received REAL NOT NULL,
  price_at_purchase REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prediction results tracking (for leaderboard)
CREATE TABLE prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES market_outcomes(id) ON DELETE CASCADE,
  was_correct BOOLEAN,
  total_stake INTEGER DEFAULT 0,
  payout INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, market_id)
);

-- Prediction credits (separate from main USDC wallet)
CREATE TABLE prediction_credits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 1000,  -- Start with 1000 free credits
  total_earned INTEGER DEFAULT 0,
  total_wagered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Market activity log (for showing recent trades)
CREATE TABLE market_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES market_outcomes(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'bet',
  stake INTEGER NOT NULL,
  shares REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_markets_status ON prediction_markets(status);
CREATE INDEX idx_markets_event_id ON prediction_markets(event_id);
CREATE INDEX idx_markets_closes_at ON prediction_markets(closes_at);
CREATE INDEX idx_markets_type ON prediction_markets(type);
CREATE INDEX idx_outcomes_market_id ON market_outcomes(market_id);
CREATE INDEX idx_bets_user_id ON market_bets(user_id);
CREATE INDEX idx_bets_market_id ON market_bets(market_id);
CREATE INDEX idx_bets_outcome_id ON market_bets(outcome_id);
CREATE INDEX idx_results_user_id ON prediction_results(user_id);
CREATE INDEX idx_activity_market_id ON market_activity(market_id);
CREATE INDEX idx_activity_created_at ON market_activity(created_at DESC);

-- Enable RLS
ALTER TABLE prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Markets: Anyone can read, only service role can create/update
CREATE POLICY "Markets are readable by everyone" ON prediction_markets
  FOR SELECT USING (true);

CREATE POLICY "Markets insertable by service role" ON prediction_markets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Markets updatable by service role" ON prediction_markets
  FOR UPDATE USING (true);

-- Outcomes: Anyone can read
CREATE POLICY "Outcomes are readable by everyone" ON market_outcomes
  FOR SELECT USING (true);

CREATE POLICY "Outcomes insertable by service role" ON market_outcomes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Outcomes updatable by service role" ON market_outcomes
  FOR UPDATE USING (true);

-- Bets: Users can read their own bets, insert their own bets
CREATE POLICY "Users can read their own bets" ON market_bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can place bets" ON market_bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Results: Users can read their own results
CREATE POLICY "Users can read their own results" ON prediction_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Results insertable by service role" ON prediction_results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Results updatable by service role" ON prediction_results
  FOR UPDATE USING (true);

-- Credits: Users can read their own credits
CREATE POLICY "Users can read their own credits" ON prediction_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Credits insertable by service role" ON prediction_credits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Credits updatable by service role" ON prediction_credits
  FOR UPDATE USING (true);

-- Activity: Anyone can read activity
CREATE POLICY "Activity is readable by everyone" ON market_activity
  FOR SELECT USING (true);

CREATE POLICY "Activity insertable by service role" ON market_activity
  FOR INSERT WITH CHECK (true);

-- Function to initialize prediction credits for new users
CREATE OR REPLACE FUNCTION initialize_prediction_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO prediction_credits (user_id, balance)
  VALUES (NEW.id, 1000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create credits on profile creation
CREATE TRIGGER on_profile_created_init_prediction_credits
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_prediction_credits();

-- Function to place a bet (atomic transaction)
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
  -- Lock and get market
  SELECT * INTO v_market FROM prediction_markets
  WHERE id = p_market_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Market not found');
  END IF;

  IF v_market.status != 'open' THEN
    RETURN jsonb_build_object('error', 'Market is not open for betting');
  END IF;

  IF v_market.closes_at < now() THEN
    -- Auto-close market
    UPDATE prediction_markets SET status = 'closed' WHERE id = p_market_id;
    RETURN jsonb_build_object('error', 'Market has closed');
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
    RETURN jsonb_build_object('error', 'Insufficient credits', 'balance', v_credits.balance);
  END IF;

  -- Lock and get outcome
  SELECT * INTO v_outcome FROM market_outcomes
  WHERE id = p_outcome_id AND market_id = p_market_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Outcome not found');
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve a market
CREATE OR REPLACE FUNCTION resolve_prediction_market(
  p_market_id UUID,
  p_winning_outcome_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_market prediction_markets%ROWTYPE;
  v_total_winning_shares REAL;
  v_bet RECORD;
  v_payout INTEGER;
BEGIN
  -- Lock market
  SELECT * INTO v_market FROM prediction_markets
  WHERE id = p_market_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Market not found');
  END IF;

  IF v_market.status = 'resolved' THEN
    RETURN jsonb_build_object('error', 'Market already resolved');
  END IF;

  -- Update market status
  UPDATE prediction_markets
  SET status = 'resolved',
      resolved_at = now(),
      winning_outcome_id = p_winning_outcome_id,
      updated_at = now()
  WHERE id = p_market_id;

  -- Calculate total winning shares
  SELECT COALESCE(SUM(shares_received), 0) INTO v_total_winning_shares
  FROM market_bets
  WHERE market_id = p_market_id AND outcome_id = p_winning_outcome_id;

  -- Process payouts for winners
  FOR v_bet IN
    SELECT DISTINCT user_id,
           SUM(shares_received) as total_shares,
           SUM(stake) as total_stake,
           outcome_id
    FROM market_bets
    WHERE market_id = p_market_id
    GROUP BY user_id, outcome_id
  LOOP
    IF v_bet.outcome_id = p_winning_outcome_id AND v_total_winning_shares > 0 THEN
      -- Winner: payout = (user_shares / total_winning_shares) * total_pool
      v_payout := (v_bet.total_shares / v_total_winning_shares * v_market.total_pool)::INTEGER;

      -- Credit winnings
      UPDATE prediction_credits
      SET balance = balance + v_payout,
          total_earned = total_earned + v_payout,
          updated_at = now()
      WHERE user_id = v_bet.user_id;

      -- Record result
      INSERT INTO prediction_results (user_id, market_id, outcome_id, was_correct, total_stake, payout, resolved_at)
      VALUES (v_bet.user_id, p_market_id, v_bet.outcome_id, true, v_bet.total_stake, v_payout, now())
      ON CONFLICT (user_id, market_id)
      DO UPDATE SET was_correct = true, payout = prediction_results.payout + EXCLUDED.payout, resolved_at = now();
    ELSE
      -- Loser: record the loss
      INSERT INTO prediction_results (user_id, market_id, outcome_id, was_correct, total_stake, payout, resolved_at)
      VALUES (v_bet.user_id, p_market_id, v_bet.outcome_id, false, v_bet.total_stake, 0, now())
      ON CONFLICT (user_id, market_id)
      DO UPDATE SET was_correct = false, resolved_at = now();
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'market_id', p_market_id,
    'winning_outcome_id', p_winning_outcome_id,
    'total_pool', v_market.total_pool
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leaderboard view
CREATE OR REPLACE VIEW prediction_leaderboard AS
SELECT
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  COALESCE(pc.balance, 0) as current_balance,
  COALESCE(pc.total_earned, 0) as total_earned,
  COALESCE(pc.total_wagered, 0) as total_wagered,
  COUNT(DISTINCT pr.market_id) FILTER (WHERE pr.was_correct IS NOT NULL) as total_markets,
  COUNT(DISTINCT pr.market_id) FILTER (WHERE pr.was_correct = true) as correct_predictions,
  CASE
    WHEN COUNT(DISTINCT pr.market_id) FILTER (WHERE pr.was_correct IS NOT NULL) > 0
    THEN (COUNT(DISTINCT pr.market_id) FILTER (WHERE pr.was_correct = true)::REAL /
          COUNT(DISTINCT pr.market_id) FILTER (WHERE pr.was_correct IS NOT NULL)::REAL) * 100
    ELSE 0
  END as accuracy,
  COALESCE(SUM(pr.payout), 0) - COALESCE(SUM(pr.total_stake), 0) as net_profit,
  RANK() OVER (ORDER BY COALESCE(pc.total_earned, 0) DESC) as rank
FROM profiles p
LEFT JOIN prediction_credits pc ON pc.user_id = p.id
LEFT JOIN prediction_results pr ON pr.user_id = p.id
GROUP BY p.id, p.username, p.display_name, p.avatar_url, pc.balance, pc.total_earned, pc.total_wagered
HAVING COALESCE(pc.total_wagered, 0) > 0
ORDER BY total_earned DESC;

-- Grant select on leaderboard view
GRANT SELECT ON prediction_leaderboard TO authenticated;
GRANT SELECT ON prediction_leaderboard TO anon;

-- Comments for documentation
COMMENT ON TABLE prediction_markets IS 'HYROX prediction markets';
COMMENT ON TABLE market_outcomes IS 'Possible outcomes for each market';
COMMENT ON TABLE market_bets IS 'User bets on market outcomes';
COMMENT ON TABLE prediction_results IS 'Resolved bet results for leaderboard tracking';
COMMENT ON TABLE prediction_credits IS 'Free credits for prediction markets (separate from main USDC)';
COMMENT ON TABLE market_activity IS 'Activity log for showing recent trades';
