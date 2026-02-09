-- Migration: Add non-custodial agent trading support
-- This migration adds columns for:
-- 1. Agent identification and wallet addresses on profiles
-- 2. On-chain trade tracking on trades table

-- ============================================
-- PROFILES: Agent wallet support
-- ============================================

-- Add is_agent flag (may already exist as 'type' column, but this is explicit)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT false;

-- Add monad wallet address for agents
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monad_wallet_address TEXT;

-- ============================================
-- TRADES: On-chain tracking
-- ============================================

-- Flag to distinguish on-chain vs off-chain trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS is_on_chain BOOLEAN DEFAULT false;

-- Transaction hash from Monad
ALTER TABLE trades ADD COLUMN IF NOT EXISTS tx_hash TEXT;

-- Block number for indexing
ALTER TABLE trades ADD COLUMN IF NOT EXISTS block_number BIGINT;

-- Chain ID (10143 for Monad testnet)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS chain_id INTEGER;

-- ============================================
-- INDEXES
-- ============================================

-- Fast lookup by tx_hash for confirmation endpoint
CREATE INDEX IF NOT EXISTS idx_trades_tx_hash ON trades(tx_hash) WHERE tx_hash IS NOT NULL;

-- Fast lookup by wallet address
CREATE INDEX IF NOT EXISTS idx_profiles_monad_wallet ON profiles(monad_wallet_address) WHERE monad_wallet_address IS NOT NULL;

-- ============================================
-- UPDATE EXISTING AGENTS
-- ============================================

-- Mark existing agent profiles
UPDATE profiles SET is_agent = true WHERE type = 'agent';
