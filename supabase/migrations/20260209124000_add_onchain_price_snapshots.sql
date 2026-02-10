-- Store on-chain snapshot fields on athlete_tokens so UI can display correct prices
-- even when there are no indexed on-chain trades yet.

ALTER TABLE public.athlete_tokens
  ADD COLUMN IF NOT EXISTS onchain_initialized BOOLEAN,
  ADD COLUMN IF NOT EXISTS onchain_price NUMERIC,
  ADD COLUMN IF NOT EXISTS onchain_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.athlete_tokens.onchain_initialized IS 'Whether the athlete is initialized/registered on the on-chain bonding curve';
COMMENT ON COLUMN public.athlete_tokens.onchain_price IS 'Current on-chain price (MON) from getAthleteInfo.currentPrice formatted as ether';
COMMENT ON COLUMN public.athlete_tokens.onchain_updated_at IS 'When onchain_* fields were last synced';

