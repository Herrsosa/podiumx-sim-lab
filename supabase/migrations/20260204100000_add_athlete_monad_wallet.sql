-- Add monad_wallet_address to athlete_tokens for on-chain integration
ALTER TABLE public.athlete_tokens
ADD COLUMN IF NOT EXISTS monad_wallet_address TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_athlete_tokens_monad_wallet 
ON public.athlete_tokens(monad_wallet_address);

COMMENT ON COLUMN public.athlete_tokens.monad_wallet_address IS 'Wallet address for this athlete on Monad blockchain';
