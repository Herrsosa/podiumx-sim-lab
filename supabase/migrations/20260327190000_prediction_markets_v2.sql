-- Predictions v2: replace free-credit/share-based prediction behavior with
-- binary wallet-backed staking while keeping the current frontend untouched.

-- Extend the existing market status enum for the new lifecycle.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'market_status') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'market_status'::regtype
        AND enumlabel = 'draft'
    ) THEN
      ALTER TYPE public.market_status ADD VALUE 'draft';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'market_status'::regtype
        AND enumlabel = 'locked'
    ) THEN
      ALTER TYPE public.market_status ADD VALUE 'locked';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'market_status'::regtype
        AND enumlabel = 'resolving'
    ) THEN
      ALTER TYPE public.market_status ADD VALUE 'resolving';
    END IF;
  END IF;
END
$$;

-- Extend market_type for the new binary forecasting model.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'market_type') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'market_type'::regtype
        AND enumlabel = 'binary'
    ) THEN
      ALTER TYPE public.market_type ADD VALUE 'binary';
    END IF;
  END IF;
END
$$;

-- Prediction market table: keep legacy columns for compatibility, add v2 fields.
ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS market_scope TEXT NOT NULL DEFAULT 'hyrox',
  ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS official_source TEXT,
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locks_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settlement_rule_text TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS legacy_model TEXT NOT NULL DEFAULT 'share_credits';

ALTER TABLE public.prediction_markets
  ALTER COLUMN total_pool TYPE NUMERIC(20, 2)
  USING COALESCE(total_pool, 0)::NUMERIC(20, 2);

ALTER TABLE public.prediction_markets
  ALTER COLUMN total_pool SET DEFAULT 0;

UPDATE public.prediction_markets
SET
  title = COALESCE(title, question),
  opens_at = COALESCE(opens_at, created_at),
  locks_at = COALESCE(locks_at, closes_at),
  official_source = COALESCE(official_source, 'hyroxresults')
WHERE true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prediction_markets_market_scope_check'
  ) THEN
    ALTER TABLE public.prediction_markets
      ADD CONSTRAINT prediction_markets_market_scope_check
      CHECK (market_scope IN ('hyrox', 'athlete'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prediction_markets_legacy_model_check'
  ) THEN
    ALTER TABLE public.prediction_markets
      ADD CONSTRAINT prediction_markets_legacy_model_check
      CHECK (legacy_model IN ('share_credits', 'binary_wallet'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_prediction_markets_scope_status
  ON public.prediction_markets (market_scope, status, locks_at);

CREATE INDEX IF NOT EXISTS idx_prediction_markets_legacy_model
  ON public.prediction_markets (legacy_model);

CREATE INDEX IF NOT EXISTS idx_prediction_markets_creator
  ON public.prediction_markets (creator_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_markets_athlete
  ON public.prediction_markets (athlete_id, created_at DESC);

-- Outcome table: add v2 stake fields while keeping legacy share/probability fields.
ALTER TABLE public.market_outcomes
  ADD COLUMN IF NOT EXISTS outcome_key TEXT,
  ADD COLUMN IF NOT EXISTS total_stake NUMERIC(20, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_outcomes_market_outcome_key
  ON public.market_outcomes (market_id, outcome_key)
  WHERE outcome_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_market_outcomes_market_sort
  ON public.market_outcomes (market_id, sort_order);

-- Prediction entries: immutable v2 forecast records.
CREATE TABLE IF NOT EXISTS public.prediction_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES public.market_outcomes(id) ON DELETE CASCADE,
  stake_amount NUMERIC(20, 2) NOT NULL CHECK (stake_amount > 0),
  client_request_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_request_id)
);

CREATE INDEX IF NOT EXISTS idx_prediction_entries_market_created
  ON public.prediction_entries (market_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_entries_user_created
  ON public.prediction_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_entries_market_user
  ON public.prediction_entries (market_id, user_id);

-- Funds reserved for active predictions.
CREATE TABLE IF NOT EXISTS public.prediction_wallet_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.prediction_entries(id) ON DELETE CASCADE,
  amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prediction_wallet_locks_status_check'
  ) THEN
    ALTER TABLE public.prediction_wallet_locks
      ADD CONSTRAINT prediction_wallet_locks_status_check
      CHECK (status IN ('locked', 'paid_out', 'released', 'refunded'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_prediction_wallet_locks_user_status
  ON public.prediction_wallet_locks (user_id, status);

CREATE INDEX IF NOT EXISTS idx_prediction_wallet_locks_market_status
  ON public.prediction_wallet_locks (market_id, status);

CREATE INDEX IF NOT EXISTS idx_prediction_wallet_locks_entry
  ON public.prediction_wallet_locks (entry_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prediction_wallet_locks_entry_unique
  ON public.prediction_wallet_locks (entry_id);

-- Immutable resolution audit trail.
CREATE TABLE IF NOT EXISTS public.prediction_market_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  resolution_mode TEXT NOT NULL,
  result_status TEXT NOT NULL,
  source_url TEXT,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  winning_outcome_id UUID REFERENCES public.market_outcomes(id) ON DELETE SET NULL,
  decided_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prediction_market_resolutions_mode_check'
  ) THEN
    ALTER TABLE public.prediction_market_resolutions
      ADD CONSTRAINT prediction_market_resolutions_mode_check
      CHECK (resolution_mode IN ('automatic', 'manual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prediction_market_resolutions_status_check'
  ) THEN
    ALTER TABLE public.prediction_market_resolutions
      ADD CONSTRAINT prediction_market_resolutions_status_check
      CHECK (result_status IN ('resolved', 'cancelled'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_prediction_market_resolutions_market_created
  ON public.prediction_market_resolutions (market_id, created_at DESC);

-- Wallet ledger for prediction-side auditability. Keep additive so the trade path
-- can migrate later without blocking predictions.
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  amount NUMERIC(20, 2) NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  balance_after NUMERIC(20, 2) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created
  ON public.wallet_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_reference
  ON public.wallet_ledger (reference_type, reference_id);

-- Enable RLS on new tables.
ALTER TABLE public.prediction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_wallet_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_market_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prediction_entries'
      AND policyname = 'Users can view own prediction entries'
  ) THEN
    CREATE POLICY "Users can view own prediction entries"
      ON public.prediction_entries
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prediction_wallet_locks'
      AND policyname = 'Users can view own prediction locks'
  ) THEN
    CREATE POLICY "Users can view own prediction locks"
      ON public.prediction_wallet_locks
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prediction_market_resolutions'
      AND policyname = 'Prediction resolutions are readable by everyone'
  ) THEN
    CREATE POLICY "Prediction resolutions are readable by everyone"
      ON public.prediction_market_resolutions
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wallet_ledger'
      AND policyname = 'Users can view own wallet ledger'
  ) THEN
    CREATE POLICY "Users can view own wallet ledger"
      ON public.wallet_ledger
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Helper to compute how much balance is currently locked in active predictions.
CREATE OR REPLACE FUNCTION public.get_prediction_locked_balance(
  p_user_id UUID DEFAULT auth.uid()
) RETURNS NUMERIC(20, 2)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::NUMERIC(20, 2)
  FROM public.prediction_wallet_locks
  WHERE user_id = p_user_id
    AND status = 'locked';
$$;

GRANT EXECUTE ON FUNCTION public.get_prediction_locked_balance(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_prediction_wallet_summary(
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(20, 2);
  v_locked NUMERIC(20, 2);
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'available_balance', 0,
      'locked_prediction_balance', 0,
      'total_balance', 0
    );
  END IF;

  SELECT COALESCE(balance, 0)::NUMERIC(20, 2)
  INTO v_balance
  FROM public.wallets
  WHERE user_id = p_user_id;

  v_locked := public.get_prediction_locked_balance(p_user_id);

  RETURN jsonb_build_object(
    'available_balance', COALESCE(v_balance, 0),
    'locked_prediction_balance', COALESCE(v_locked, 0),
    'total_balance', COALESCE(v_balance, 0) + COALESCE(v_locked, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prediction_wallet_summary(UUID) TO authenticated;

-- Atomic entry placement for wallet-backed binary prediction markets.
CREATE OR REPLACE FUNCTION public.place_prediction_entry_v2(
  p_market_id UUID,
  p_outcome_id UUID,
  p_stake_amount NUMERIC,
  p_client_request_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_market public.prediction_markets%ROWTYPE;
  v_outcome public.market_outcomes%ROWTYPE;
  v_entry public.prediction_entries%ROWTYPE;
  v_wallet_balance NUMERIC(20, 2);
  v_stake_amount NUMERIC(20, 2);
  v_balance_after NUMERIC(20, 2);
  v_locks_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Authentication required'
    );
  END IF;

  IF p_client_request_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_REQUEST',
      'message', 'client_request_id is required'
    );
  END IF;

  v_stake_amount := ROUND(COALESCE(p_stake_amount, 0)::NUMERIC, 2);

  IF v_stake_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STAKE',
      'message', 'Stake amount must be positive'
    );
  END IF;

  SELECT *
  INTO v_entry
  FROM public.prediction_entries
  WHERE client_request_id = p_client_request_id;

  IF FOUND THEN
    IF v_entry.user_id <> v_user_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'IDEMPOTENCY_CONFLICT',
        'message', 'client_request_id already used by another entry'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'replayed', true,
      'entry_id', v_entry.id,
      'market_id', v_entry.market_id,
      'outcome_id', v_entry.outcome_id,
      'stake_amount', v_entry.stake_amount,
      'wallet', public.get_prediction_wallet_summary(v_user_id)
    );
  END IF;

  SELECT *
  INTO v_market
  FROM public.prediction_markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MARKET_NOT_FOUND',
      'message', 'Market not found'
    );
  END IF;

  IF v_market.legacy_model IS DISTINCT FROM 'binary_wallet' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'LEGACY_MARKET_MODEL',
      'message', 'Market is not enabled for wallet-backed predictions'
    );
  END IF;

  IF v_market.status IS DISTINCT FROM 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MARKET_NOT_OPEN',
      'message', 'Market is not open'
    );
  END IF;

  v_locks_at := COALESCE(v_market.locks_at, v_market.closes_at);

  IF v_locks_at IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_MARKET',
      'message', 'Market lock time is missing'
    );
  END IF;

  IF v_locks_at <= now() THEN
    UPDATE public.prediction_markets
    SET status = 'locked',
        updated_at = now()
    WHERE id = p_market_id
      AND status = 'open';

    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MARKET_LOCKED',
      'message', 'Market is locked'
    );
  END IF;

  SELECT *
  INTO v_outcome
  FROM public.market_outcomes
  WHERE id = p_outcome_id
    AND market_id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_OUTCOME',
      'message', 'Outcome not found for this market'
    );
  END IF;

  SELECT COALESCE(balance, 0)::NUMERIC(20, 2)
  INTO v_wallet_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WALLET_NOT_FOUND',
      'message', 'Wallet not found'
    );
  END IF;

  IF v_wallet_balance < v_stake_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_BALANCE',
      'message', 'Insufficient SOL balance',
      'wallet', public.get_prediction_wallet_summary(v_user_id)
    );
  END IF;

  UPDATE public.wallets
  SET balance = balance - v_stake_amount,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING balance::NUMERIC(20, 2) INTO v_balance_after;

  INSERT INTO public.prediction_entries (
    market_id,
    user_id,
    outcome_id,
    stake_amount,
    client_request_id
  )
  VALUES (
    p_market_id,
    v_user_id,
    p_outcome_id,
    v_stake_amount,
    p_client_request_id
  )
  RETURNING * INTO v_entry;

  INSERT INTO public.prediction_wallet_locks (
    user_id,
    market_id,
    entry_id,
    amount,
    status
  )
  VALUES (
    v_user_id,
    p_market_id,
    v_entry.id,
    v_stake_amount,
    'locked'
  );

  UPDATE public.market_outcomes
  SET total_stake = COALESCE(total_stake, 0) + v_stake_amount
  WHERE id = p_outcome_id;

  UPDATE public.prediction_markets
  SET total_pool = COALESCE(total_pool, 0) + v_stake_amount,
      total_trades = COALESCE(total_trades, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  INSERT INTO public.wallet_ledger (
    user_id,
    entry_type,
    amount,
    reference_type,
    reference_id,
    balance_after,
    metadata
  )
  VALUES (
    v_user_id,
    'prediction_lock',
    -v_stake_amount,
    'prediction_entry',
    v_entry.id,
    v_balance_after,
    jsonb_build_object(
      'market_id', p_market_id,
      'outcome_id', p_outcome_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'entry_id', v_entry.id,
    'market_id', v_entry.market_id,
    'outcome_id', v_entry.outcome_id,
    'stake_amount', v_entry.stake_amount,
    'wallet', public.get_prediction_wallet_summary(v_user_id)
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT *
    INTO v_entry
    FROM public.prediction_entries
    WHERE client_request_id = p_client_request_id;

    IF FOUND AND v_entry.user_id = v_user_id THEN
      RETURN jsonb_build_object(
        'success', true,
        'replayed', true,
        'entry_id', v_entry.id,
        'market_id', v_entry.market_id,
        'outcome_id', v_entry.outcome_id,
        'stake_amount', v_entry.stake_amount,
        'wallet', public.get_prediction_wallet_summary(v_user_id)
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'IDEMPOTENCY_CONFLICT',
      'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_prediction_entry_v2(UUID, UUID, NUMERIC, UUID) TO authenticated;

-- Resolve a wallet-backed binary market and pay winners.
CREATE OR REPLACE FUNCTION public.resolve_prediction_market_v2(
  p_market_id UUID,
  p_winning_outcome_id UUID,
  p_resolution_mode TEXT DEFAULT 'manual',
  p_source_url TEXT DEFAULT NULL,
  p_source_snapshot JSONB DEFAULT '{}'::JSONB,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_total_pool NUMERIC(20, 2);
  v_winning_pool NUMERIC(20, 2);
  v_total_distributed NUMERIC(20, 2) := 0;
  v_remainder NUMERIC(20, 2) := 0;
  v_balance_after NUMERIC(20, 2);
  v_resolution_id UUID;
  v_winner_count INTEGER := 0;
  v_loser_count INTEGER := 0;
  v_payout RECORD;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_resolution_mode NOT IN ('automatic', 'manual') THEN
    RAISE EXCEPTION 'Invalid resolution mode';
  END IF;

  SELECT *
  INTO v_market
  FROM public.prediction_markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.legacy_model IS DISTINCT FROM 'binary_wallet' THEN
    RAISE EXCEPTION 'Legacy share-credit markets must use the old resolver';
  END IF;

  IF v_market.status IN ('resolved', 'cancelled') THEN
    RAISE EXCEPTION 'Market already finalized';
  END IF;

  PERFORM 1
  FROM public.market_outcomes
  WHERE id = p_winning_outcome_id
    AND market_id = p_market_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winning outcome not found for this market';
  END IF;

  SELECT COALESCE(SUM(stake_amount), 0)::NUMERIC(20, 2)
  INTO v_total_pool
  FROM public.prediction_entries
  WHERE market_id = p_market_id;

  SELECT COALESCE(SUM(stake_amount), 0)::NUMERIC(20, 2)
  INTO v_winning_pool
  FROM public.prediction_entries
  WHERE market_id = p_market_id
    AND outcome_id = p_winning_outcome_id;

  IF v_total_pool <= 0 THEN
    RAISE EXCEPTION 'Market has no entries';
  END IF;

  IF v_winning_pool <= 0 THEN
    RAISE EXCEPTION 'No stake exists on the winning outcome; cancel the market instead';
  END IF;

  UPDATE public.prediction_markets
  SET status = 'resolving',
      updated_at = now()
  WHERE id = p_market_id;

  INSERT INTO public.prediction_market_resolutions (
    market_id,
    resolution_mode,
    result_status,
    source_url,
    source_snapshot,
    winning_outcome_id,
    notes
  )
  VALUES (
    p_market_id,
    p_resolution_mode,
    'resolved',
    p_source_url,
    COALESCE(p_source_snapshot, '{}'::JSONB),
    p_winning_outcome_id,
    p_notes
  )
  RETURNING id INTO v_resolution_id;

  WITH base_payouts AS (
    SELECT
      pe.id AS entry_id,
      pe.user_id,
      pe.stake_amount,
      TRUNC((pe.stake_amount / v_winning_pool) * v_total_pool, 2) AS payout_amount,
      ROW_NUMBER() OVER (
        ORDER BY pe.stake_amount DESC, pe.created_at ASC, pe.id ASC
      ) AS payout_rank
    FROM public.prediction_entries pe
    WHERE pe.market_id = p_market_id
      AND pe.outcome_id = p_winning_outcome_id
  )
  SELECT COALESCE(SUM(payout_amount), 0)::NUMERIC(20, 2)
  INTO v_total_distributed
  FROM base_payouts;

  v_remainder := ROUND(v_total_pool - v_total_distributed, 2);

  FOR v_payout IN
    WITH base_payouts AS (
      SELECT
        pe.id AS entry_id,
        pe.user_id,
        pe.stake_amount,
        TRUNC((pe.stake_amount / v_winning_pool) * v_total_pool, 2) AS payout_amount,
        ROW_NUMBER() OVER (
          ORDER BY pe.stake_amount DESC, pe.created_at ASC, pe.id ASC
        ) AS payout_rank
      FROM public.prediction_entries pe
      WHERE pe.market_id = p_market_id
        AND pe.outcome_id = p_winning_outcome_id
    )
    SELECT
      entry_id,
      user_id,
      CASE
        WHEN payout_rank = 1 THEN payout_amount + v_remainder
        ELSE payout_amount
      END AS final_payout
    FROM base_payouts
    ORDER BY payout_rank
  LOOP
    UPDATE public.wallets
    SET balance = balance + v_payout.final_payout,
        updated_at = now()
    WHERE user_id = v_payout.user_id
    RETURNING balance::NUMERIC(20, 2) INTO v_balance_after;

    UPDATE public.prediction_wallet_locks
    SET status = 'paid_out',
        updated_at = now()
    WHERE entry_id = v_payout.entry_id
      AND status = 'locked';

    INSERT INTO public.wallet_ledger (
      user_id,
      entry_type,
      amount,
      reference_type,
      reference_id,
      balance_after,
      metadata
    )
    VALUES (
      v_payout.user_id,
      'prediction_payout',
      v_payout.final_payout,
      'prediction_resolution',
      v_resolution_id,
      v_balance_after,
      jsonb_build_object(
        'market_id', p_market_id,
        'winning_outcome_id', p_winning_outcome_id
      )
    );

    v_winner_count := v_winner_count + 1;
  END LOOP;

  UPDATE public.prediction_wallet_locks
  SET status = 'released',
      updated_at = now()
  WHERE market_id = p_market_id
    AND status = 'locked';

  GET DIAGNOSTICS v_loser_count = ROW_COUNT;

  UPDATE public.prediction_markets
  SET status = 'resolved',
      resolved_at = now(),
      winning_outcome_id = p_winning_outcome_id,
      updated_at = now()
  WHERE id = p_market_id;

  RETURN jsonb_build_object(
    'success', true,
    'market_id', p_market_id,
    'status', 'resolved',
    'winning_outcome_id', p_winning_outcome_id,
    'total_pool', v_total_pool,
    'winning_pool', v_winning_pool,
    'winner_count', v_winner_count,
    'loser_count', v_loser_count
  );
END;
$$;

-- Cancel a wallet-backed market and refund every active lock.
CREATE OR REPLACE FUNCTION public.cancel_prediction_market_v2(
  p_market_id UUID,
  p_source_url TEXT DEFAULT NULL,
  p_source_snapshot JSONB DEFAULT '{}'::JSONB,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_balance_after NUMERIC(20, 2);
  v_resolution_id UUID;
  v_refund_count INTEGER := 0;
  v_lock RECORD;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO v_market
  FROM public.prediction_markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.legacy_model IS DISTINCT FROM 'binary_wallet' THEN
    RAISE EXCEPTION 'Legacy share-credit markets must use the old cancellation path';
  END IF;

  IF v_market.status IN ('resolved', 'cancelled') THEN
    RAISE EXCEPTION 'Market already finalized';
  END IF;

  INSERT INTO public.prediction_market_resolutions (
    market_id,
    resolution_mode,
    result_status,
    source_url,
    source_snapshot,
    notes
  )
  VALUES (
    p_market_id,
    'manual',
    'cancelled',
    p_source_url,
    COALESCE(p_source_snapshot, '{}'::JSONB),
    p_notes
  )
  RETURNING id INTO v_resolution_id;

  FOR v_lock IN
    SELECT
      pwl.id,
      pwl.user_id,
      pwl.amount
    FROM public.prediction_wallet_locks pwl
    WHERE pwl.market_id = p_market_id
      AND pwl.status = 'locked'
    ORDER BY pwl.created_at ASC, pwl.id ASC
  LOOP
    UPDATE public.wallets
    SET balance = balance + v_lock.amount,
        updated_at = now()
    WHERE user_id = v_lock.user_id
    RETURNING balance::NUMERIC(20, 2) INTO v_balance_after;

    UPDATE public.prediction_wallet_locks
    SET status = 'refunded',
        updated_at = now()
    WHERE id = v_lock.id;

    INSERT INTO public.wallet_ledger (
      user_id,
      entry_type,
      amount,
      reference_type,
      reference_id,
      balance_after,
      metadata
    )
    VALUES (
      v_lock.user_id,
      'prediction_refund',
      v_lock.amount,
      'prediction_resolution',
      v_resolution_id,
      v_balance_after,
      jsonb_build_object('market_id', p_market_id)
    );

    v_refund_count := v_refund_count + 1;
  END LOOP;

  UPDATE public.prediction_markets
  SET status = 'cancelled',
      resolved_at = now(),
      cancellation_reason = COALESCE(p_notes, cancellation_reason),
      updated_at = now()
  WHERE id = p_market_id;

  RETURN jsonb_build_object(
    'success', true,
    'market_id', p_market_id,
    'status', 'cancelled',
    'refunded_entries', v_refund_count
  );
END;
$$;
