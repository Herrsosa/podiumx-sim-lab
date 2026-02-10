-- Add on-chain trade tracking fields to trades table
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS is_on_chain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS block_number BIGINT,
  ADD COLUMN IF NOT EXISTS chain_id BIGINT; -- e.g. 10143

-- Add index and uniqueness constraint for tx_hash to prevent double-indexing
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_tx_hash ON public.trades(tx_hash) WHERE tx_hash IS NOT NULL;
