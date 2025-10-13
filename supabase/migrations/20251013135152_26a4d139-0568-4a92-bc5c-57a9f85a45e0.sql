-- Create balances table
CREATE TABLE public.balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  test_fiat_cents BIGINT NOT NULL DEFAULT 0,
  test_usdc BIGINT NOT NULL DEFAULT 0,
  test_usdt BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for balances
CREATE POLICY "Users can read own balances"
  ON public.balances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balances"
  ON public.balances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balances"
  ON public.balances
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create deposit_intents table
CREATE TABLE public.deposit_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('fiat', 'stablecoin')),
  asset TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'test_credited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposit_intents ENABLE ROW LEVEL SECURITY;

-- RLS policies for deposit_intents
CREATE POLICY "Users can read own deposit intents"
  ON public.deposit_intents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deposit intents"
  ON public.deposit_intents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_deposit_intents_user_id ON public.deposit_intents(user_id, created_at DESC);
CREATE INDEX idx_balances_user_id ON public.balances(user_id);