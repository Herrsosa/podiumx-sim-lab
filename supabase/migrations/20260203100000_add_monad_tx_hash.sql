-- Add Monad transaction hash to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS monad_tx_hash TEXT;

-- Create an index for quick lookups by tx hash
CREATE INDEX IF NOT EXISTS idx_posts_monad_tx_hash ON public.posts(monad_tx_hash);
