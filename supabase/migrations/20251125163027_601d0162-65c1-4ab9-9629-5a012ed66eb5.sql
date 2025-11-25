-- Enable RLS on athlete_prices table
ALTER TABLE athlete_prices ENABLE ROW LEVEL SECURITY;

-- Allow all users to read price data (public market data)
CREATE POLICY "athlete_prices_select_all" 
ON athlete_prices FOR SELECT 
USING (true);

-- Only edge functions can insert price data (no public writes)
-- This is enforced by RLS - only service role can insert