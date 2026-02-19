-- Allow all authenticated users to read holdings (needed for holder counts in marketplace)
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- Users can read all holdings (public data for marketplace holder counts)
CREATE POLICY "holdings_select_all" ON public.holdings
  FOR SELECT
  USING (true);

-- Users can only modify their own holdings (via RPC/edge functions, not direct)
CREATE POLICY "holdings_insert_own" ON public.holdings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "holdings_update_own" ON public.holdings
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "holdings_delete_own" ON public.holdings
  FOR DELETE
  USING (user_id = auth.uid());

-- Also allow service role full access (for edge functions)
CREATE POLICY "holdings_service_role" ON public.holdings
  FOR ALL
  USING (auth.role() = 'service_role');
