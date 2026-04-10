# Athlyst Predictions Wallet + Schema Replacement Spec

## Purpose
This document defines the concrete wallet accounting model, schema direction, transaction rules, and migration approach for replacing the current Athlyst prediction market implementation.

This is not implementation code.

## Scope
- Offchain only
- Current wallet token label remains `SOL`
- Predictions replace the current free-credit/share-based system
- Athlete card purchases must continue working during and after the migration

## 1. Current system constraints

### Current wallet and trade path
The live offchain card purchase flow currently depends on:
- `wallets.balance` as the spendable user balance
- `execute-trade` edge function
- `execute_trade_transaction(...)` SQL function
- `trades` as trade history
- `holdings` as owned athlete card balances

Current code touchpoints:
- `src/services/wallet/index.ts`
- `src/hooks/useWallet.ts`
- `src/hooks/useTrade.ts`
- `src/hooks/optimisticTrade.ts`
- `supabase/functions/execute-trade/index.ts`
- `supabase/migrations/20251101090000_trade_idempotency_and_price_ticks.sql`

Important current behavior:
- Trade execution uses idempotency via `X-Idempotency-Key` and `client_request_id`
- The client applies optimistic wallet updates before server confirmation
- The UI exposes wallet balance as `wallet.sol`
- Onboarding creates a wallet with starting `SOL`

### Current predictions path
The existing prediction implementation is a separate system with its own fake balance.

Current prediction code touchpoints:
- `src/pages/Markets.tsx`
- `src/pages/MarketDetail.tsx`
- `src/hooks/useMarkets.ts`
- `src/hooks/usePredictionCredits.ts`
- `src/hooks/usePredictionLeaderboard.ts`
- `src/hooks/useMarketActivity.ts`
- `src/components/markets/MarketTradePanel.tsx`
- `src/components/markets/PredictionLeaderboard.tsx`
- `supabase/functions/resolve-market/index.ts`
- `supabase/functions/generate-markets/index.ts`
- `supabase/functions/agent-place-bet/index.ts`
- `supabase/functions/agent-prediction-credits/index.ts`
- `scripts/fetch-hyrox-feed.cjs`
- `scripts/sync-hyrox-markets.cjs`
- `scripts/resolve-markets-from-results.ts`

Current prediction tables and functions:
- `prediction_markets`
- `market_outcomes`
- `market_bets`
- `prediction_results`
- `prediction_credits`
- `market_activity`
- `prediction_leaderboard`
- `place_prediction_bet(...)`
- `resolve_prediction_market(...)`

Important current behavior:
- Users stake `prediction_credits`, not wallet balance
- Market pricing uses `shares` and `probability`
- Payouts depend on share math, not simple locked wallet staking
- Market activity is framed as trades, not predictions

## 2. Replacement rules

### Rule 1
Predictions must stop using `prediction_credits` as a user balance source.

### Rule 2
Predictions must use the same offchain wallet system as athlete card purchases, while preserving safe accounting.

### Rule 3
Predictions must not reuse the current share/probability pseudo-trading math as the source of truth.

### Rule 4
The wallet system must distinguish:
- available balance
- locked prediction balance

### Rule 5
The migration must not break:
- `execute-trade`
- optimistic trading UI
- existing athlete card balance reads

## 3. Recommended accounting model

## Canonical balance model

### Available balance
- Stored in `wallets.balance`
- This remains the spendable balance for athlete card purchases and new prediction entries

### Locked prediction balance
- Not stored as the primary spendable balance
- Derived from active lock rows in a dedicated lock table
- Displayed separately in prediction UI and optionally wallet UI

### Total balance
- Computed conceptually as:
  - `available balance + locked prediction balance`

## Why this model
This is the least disruptive option because:
- the current trade engine already assumes `wallets.balance` is spendable
- athlete card purchase logic does not need to be rewritten just to support predictions
- prediction locks can be added without redesigning the full wallet service first

## What happens on prediction entry
When a user places a prediction:
- validate market is still open
- validate user has enough `wallets.balance`
- decrement `wallets.balance`
- insert a lock row
- insert a prediction entry row
- update outcome stake totals

## What happens on resolution
When a market resolves:
- winning entries produce payout amounts
- payout amounts are added back to `wallets.balance`
- associated lock rows move from `locked` to `paid_out`
- losing lock rows move from `locked` to `released` with no refund

## What happens on cancel/refund
When a market is cancelled:
- all locked amounts return to `wallets.balance`
- all lock rows move from `locked` to `refunded`

## 4. Schema design

## Keep and refactor

### prediction_markets
Keep the table name, but refactor its meaning toward binary forecasting rather than pseudo-trading.

Required fields for v1:
- `id`
- `market_scope`
- `creator_user_id`
- `athlete_id`
- `event_name`
- `event_external_id`
- `official_source`
- `template_key`
- `title`
- `description`
- `status`
- `opens_at`
- `locks_at`
- `resolved_at`
- `winning_outcome_id`
- `settlement_rule_text`
- `metadata`

Recommended status enum:
- `draft`
- `open`
- `locked`
- `resolving`
- `resolved`
- `cancelled`

### prediction_outcomes
Use a simple outcomes table for binary markets.

Required fields:
- `id`
- `market_id`
- `outcome_key`
- `label`
- `total_stake`

For v1:
- exactly two rows for most markets
- `yes`
- `no`

## New tables

### prediction_entries
Append-only record of every user prediction entry.

Fields:
- `id`
- `market_id`
- `user_id`
- `outcome_id`
- `stake_amount`
- `client_request_id`
- `created_at`

Constraints:
- unique `client_request_id`
- indexed by `market_id`
- indexed by `user_id`

### prediction_wallet_locks
Tracks funds removed from available balance and reserved against a market.

Fields:
- `id`
- `user_id`
- `market_id`
- `entry_id`
- `amount`
- `status`
- `created_at`
- `updated_at`

Recommended status enum:
- `locked`
- `paid_out`
- `released`
- `refunded`

### prediction_market_resolutions
Immutable record of each resolution decision.

Fields:
- `id`
- `market_id`
- `resolution_mode`
- `result_status`
- `source_url`
- `source_snapshot`
- `winning_outcome_id`
- `decided_by_user_id`
- `notes`
- `created_at`

### wallet_ledger
Append-only wallet audit trail for prediction-related wallet changes.

Fields:
- `id`
- `user_id`
- `entry_type`
- `amount`
- `reference_type`
- `reference_id`
- `balance_after`
- `created_at`

Recommended prediction entry types:
- `prediction_lock`
- `prediction_payout`
- `prediction_refund`

Note:
- This ledger can begin as prediction-focused only
- It does not need to replace trade history immediately

## Tables to retire as source of truth

### prediction_credits
Retire entirely for active product behavior.

### market_outcomes.shares
Retire as source of truth.

### market_outcomes.probability
Retire as source of truth.

### market_bets.shares_received
Retire as source of truth.

### market_bets.price_at_purchase
Retire as source of truth.

### prediction_results
Retire or rebuild later if a leaderboard remains needed.

### market_activity
Retire or rebuild as simple prediction activity, not trade activity.

### prediction_leaderboard
Retire or rebuild after the new accounting model is stable.

## 5. RPC / service design

## New RPC or service methods

### place_prediction_entry_v2
Responsibilities:
- authenticate user
- check market state
- check available wallet balance
- lock market row
- lock relevant outcome row
- lock wallet row
- decrement `wallets.balance`
- insert `prediction_entries`
- insert `prediction_wallet_locks`
- insert `wallet_ledger`
- update outcome `total_stake`
- return updated available balance and locked summary

Inputs:
- `market_id`
- `outcome_id`
- `stake_amount`
- `client_request_id`

### resolve_prediction_market_v2
Responsibilities:
- verify market is resolvable
- create immutable resolution record
- compute payouts based on losing pool / winning pool rules
- credit winners back to `wallets.balance`
- update lock statuses
- write wallet ledger entries
- move market to `resolved`

### cancel_prediction_market_v2
Responsibilities:
- cancel market
- refund all locked amounts
- write wallet ledger entries
- mark lock rows as `refunded`

## 6. Payout model

### V1 recommendation
Use simple parimutuel-style pool settlement for binary markets.

Meaning:
- total stakes form the pool
- platform does not mint extra value
- winners split the total pool proportionally by stake on winning side

Why:
- simple to explain
- consistent with offchain virtual token economy
- avoids pseudo-trading mechanics

## Example
- Yes pool = 300
- No pool = 700
- Total pool = 1000
- Winning side = Yes
- User A staked 100 on Yes
- User B staked 200 on Yes
- User A payout = 333.33
- User B payout = 666.67

Implementation note:
- choose and document rounding rule early
- use deterministic rounding and leftover handling

## 7. Client behavior

## Predictions client
Do not copy the current trade optimistic model directly into predictions at first.

Recommendation:
- prediction placement should be server-confirmed first
- then refresh wallet and market queries

Reason:
- the trade path already has a mature optimistic flow
- predictions add locked-funds semantics
- optimistic handling is easier to get wrong here than to launch conservatively

## Wallet UI
Expose:
- available `SOL`
- locked in predictions

Do not show only one number if funds are locked, or users will think funds disappeared.

## 8. Idempotency and concurrency

## Required
Prediction placement must support idempotency, same as `execute-trade`.

Recommendation:
- add `client_request_id` to `prediction_entries`
- unique constraint on `client_request_id`
- edge function should accept `X-Idempotency-Key` or equivalent request value

## Required locking behavior
The placement transaction must lock:
- the market row
- the selected outcome row
- the user wallet row

This prevents:
- staking after lock time
- double-spend against the same balance
- duplicate writes under retries

## 9. Migration strategy

## Recommended migration approach
Do not mutate the legacy predictions system in place first.

Use staged replacement:

### Stage 1: Add v2 structures
- add new tables
- add new RPCs
- keep legacy predictions untouched

### Stage 2: Build new read/write path
- build new predictions UI on top of v2 services
- keep legacy UI hidden or internal

### Stage 3: Cut over
- route users to new Predictions product
- stop creating new rows in legacy `prediction_credits` path
- stop calling `place_prediction_bet`

### Stage 4: Cleanup
- remove legacy hooks and components
- remove legacy functions
- archive or drop legacy fields/tables once unused

## Why staged replacement
- safer than editing live pseudo-trading tables in place
- easier rollback
- easier validation against existing wallet behavior

## 10. Codebase-specific replacement map

## Replace
- `src/hooks/usePredictionCredits.ts`
- `src/hooks/usePredictionLeaderboard.ts`
- `src/hooks/useMarketActivity.ts`
- `src/components/markets/MarketTradePanel.tsx`
- `src/pages/Markets.tsx`
- `src/pages/MarketDetail.tsx`
- `supabase/functions/resolve-market/index.ts`
- `supabase/functions/agent-place-bet/index.ts`
- `supabase/functions/agent-prediction-credits/index.ts`
- current `place_prediction_bet(...)`
- current `resolve_prediction_market(...)`

## Reuse selectively
- HYROX result ingestion logic in:
  - `scripts/fetch-hyrox-feed.cjs`
  - `scripts/sync-hyrox-markets.cjs`
  - `scripts/resolve-markets-from-results.ts`
- general market browse/detail route structure
- existing Supabase integration patterns

## Keep untouched initially
- `execute-trade`
- `useTrade`
- `optimisticTrade`
- `wallets`
- `holdings`
- `trades`

These should remain stable while the new predictions path is built.

## 11. Concrete engineering task list

### Task group 1: wallet accounting
- [ ] Define exact semantics of available vs locked balance
- [ ] Decide whether locked total is derived or also cached
- [ ] Define wallet ledger entry types for predictions
- [ ] Define rounding rules for payout and refund

### Task group 2: schema
- [ ] Add `prediction_entries`
- [ ] Add `prediction_wallet_locks`
- [ ] Add `prediction_market_resolutions`
- [ ] Add `wallet_ledger`
- [ ] Refactor `prediction_markets` lifecycle fields
- [ ] Simplify `prediction_outcomes`

### Task group 3: transaction layer
- [ ] Specify `place_prediction_entry_v2`
- [ ] Specify `resolve_prediction_market_v2`
- [ ] Specify `cancel_prediction_market_v2`
- [ ] Add idempotency key support
- [ ] Add row-locking rules

### Task group 4: frontend cutover
- [ ] Replace credits-based stake panel
- [ ] Replace trade-style copy and labels
- [ ] Add available vs locked wallet display
- [ ] Add new Predictions route or route migration from `/markets`

### Task group 5: migration
- [ ] Freeze legacy prediction writes at cutover
- [ ] Remove legacy prediction hooks
- [ ] Remove legacy prediction edge functions
- [ ] Remove or archive legacy prediction tables/views after verification

## 12. Main risks to watch

### Risk 1
Accidentally letting `execute-trade` spend funds that should be locked for predictions.

### Risk 2
Showing a single wallet number and confusing users when prediction funds are locked.

### Risk 3
Trying to preserve too much of the legacy share/probability system and ending up with a hybrid that is harder to trust.

### Risk 4
Adding prediction optimistic updates too early and creating wallet desync bugs.

## 13. First implementation step
Write the schema migration plan for:
- `prediction_entries`
- `prediction_wallet_locks`
- `prediction_market_resolutions`
- `wallet_ledger`
- the updated `prediction_markets` lifecycle

Do that before implementing any new prediction UI.
