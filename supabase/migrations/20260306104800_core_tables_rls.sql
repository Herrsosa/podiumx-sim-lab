-- Enable RLS for core financial tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Wallets: Users can only select their own wallet
CREATE POLICY "Users can view own wallet"
  ON public.wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Athlete tokens: Publicly readable (everyone needs to see supply, price, etc.)
CREATE POLICY "Athlete tokens are readable by everyone"
  ON public.athlete_tokens
  FOR SELECT
  USING (true);

-- Trades: Publicly readable (market activity is public)
CREATE POLICY "Trades are readable by everyone"
  ON public.trades
  FOR SELECT
  USING (true);
