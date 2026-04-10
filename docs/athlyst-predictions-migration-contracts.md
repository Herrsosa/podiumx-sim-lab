# Athlyst Predictions Schema Migration + RPC Contracts

## Purpose
This document turns the predictions v1 plan into a concrete backend migration and service contract spec.

It is still planning only.

This document assumes:
- the current prediction implementation is being replaced
- the current offchain wallet token label remains `SOL`
- predictions will share the same wallet system as athlete card purchases
- predictions will be binary forecasting markets, not pseudo-trading

Related docs:
- [athlyst-predictions-v1-plan.md](/mnt/c/Users/nilsh/Desktop/Athlyst/docs/athlyst-predictions-v1-plan.md)
- [athlyst-predictions-wallet-schema-spec.md](/mnt/c/Users/nilsh/Desktop/Athlyst/docs/athlyst-predictions-wallet-schema-spec.md)

## 1. Decision summary

### Keep
- `prediction_markets`
- `market_outcomes`
- current offchain `wallets` table as the available spendable balance
- HYROX result ingestion logic where useful

### Add
- `prediction_entries`
- `prediction_wallet_locks`
- `prediction_market_resolutions`
- prediction-focused entries in `wallet_ledger`

### Retire as source of truth
- `prediction_credits`
- `market_bets`
- `prediction_results`
- `market_activity`
- `prediction_leaderboard`
- `place_prediction_bet(...)`
- `resolve_prediction_market(...)`

### Important migration stance
- Reuse table names where it reduces churn
- Do not preserve the legacy free-credit/share model in production behavior
- Do not implement a hybrid system

## 2. Migration strategy

### Stage 1: Add v2 schema without cutover
- Add v2 columns to `prediction_markets`
- Add v2 columns to `market_outcomes`
- Add new tables:
  - `prediction_entries`
  - `prediction_wallet_locks`
  - `prediction_market_resolutions`
  - `wallet_ledger` if it does not already exist
- Leave legacy prediction tables and RPCs intact
- Do not wire new frontend paths yet

### Stage 2: Build v2 write path
- Add new RPCs:
  - `place_prediction_entry_v2`
  - `resolve_prediction_market_v2`
  - `cancel_prediction_market_v2`
- Build admin and internal tooling against v2 only
- Manually create fresh HYROX markets in v2-compatible format

### Stage 3: Build v2 read path
- Build `/predictions` UI
- Read from v2-compatible `prediction_markets`, `market_outcomes`, and `prediction_entries`
- Expose wallet `available` and `locked` balances

### Stage 4: Cut over
- Route user traffic from `/markets` to `/predictions`
- Stop all writes to legacy prediction tables/functions
- Hide or archive legacy prediction UI

### Stage 5: Cleanup
- Remove legacy hooks/components/functions
- Remove or archive legacy tables/views after validation
- Regenerate Supabase types

## 3. Recommended SQL object changes

## 3.1 Alter `prediction_markets`

### Keep existing columns for compatibility during migration
- `id`
- `event_id`
- `event_name`
- `event_date`
- `event_city`
- `question`
- `status`
- `closes_at`
- `resolved_at`
- `winning_outcome_id`
- `metadata`

### Add new columns
- `market_scope text not null default 'hyrox'`
- `creator_user_id uuid references profiles(id)`
- `athlete_id uuid references profiles(id)`
- `official_source text`
- `template_key text`
- `title text`
- `description text`
- `opens_at timestamptz`
- `locks_at timestamptz`
- `settlement_rule_text text`
- `cancellation_reason text`
- `legacy_model text not null default 'share_credits'`

### Value rules
- `market_scope` allowed values:
  - `hyrox`
  - `athlete`
- `status` should migrate to:
  - `draft`
  - `open`
  - `locked`
  - `resolving`
  - `resolved`
  - `cancelled`
- `legacy_model` values:
  - `share_credits`
  - `binary_wallet`

### Backfill rules
- `title = coalesce(title, question)`
- `opens_at = coalesce(opens_at, created_at)`
- `locks_at = coalesce(locks_at, closes_at)`
- `official_source = 'hyroxresults'` for HYROX rows
- Existing legacy markets should default to `legacy_model = 'share_credits'`
- All new markets must use `legacy_model = 'binary_wallet'`

## 3.2 Alter `market_outcomes`

### Keep existing columns during transition
- `id`
- `market_id`
- `label`
- `description`
- `shares`
- `probability`
- `metadata`

### Add new columns
- `outcome_key text`
- `total_stake numeric not null default 0`
- `sort_order integer not null default 0`

### Value rules
- For binary markets:
  - `outcome_key = 'yes'`
  - `outcome_key = 'no'`
- `shares` and `probability` remain only for legacy compatibility until cleanup

## 3.3 Create `prediction_entries`

Purpose:
- immutable record of each prediction entry

Columns:
- `id uuid primary key default gen_random_uuid()`
- `market_id uuid not null references prediction_markets(id) on delete cascade`
- `user_id uuid not null references profiles(id) on delete cascade`
- `outcome_id uuid not null references market_outcomes(id) on delete cascade`
- `stake_amount numeric not null check (stake_amount > 0)`
- `client_request_id uuid not null`
- `created_at timestamptz not null default now()`

Constraints:
- unique `(client_request_id)`

Indexes:
- `(market_id, created_at desc)`
- `(user_id, created_at desc)`
- `(market_id, user_id)`

## 3.4 Create `prediction_wallet_locks`

Purpose:
- represent wallet value removed from available balance and reserved to a prediction

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id) on delete cascade`
- `market_id uuid not null references prediction_markets(id) on delete cascade`
- `entry_id uuid not null references prediction_entries(id) on delete cascade`
- `amount numeric not null check (amount > 0)`
- `status text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Allowed status values:
- `locked`
- `paid_out`
- `released`
- `refunded`

Indexes:
- `(user_id, status)`
- `(market_id, status)`
- `(entry_id)`

## 3.5 Create `prediction_market_resolutions`

Purpose:
- immutable resolution audit record

Columns:
- `id uuid primary key default gen_random_uuid()`
- `market_id uuid not null references prediction_markets(id) on delete cascade`
- `resolution_mode text not null`
- `result_status text not null`
- `source_url text`
- `source_snapshot jsonb not null default '{}'::jsonb`
- `winning_outcome_id uuid references market_outcomes(id)`
- `decided_by_user_id uuid references profiles(id)`
- `notes text`
- `created_at timestamptz not null default now()`

Allowed `resolution_mode` values:
- `automatic`
- `manual`

Allowed `result_status` values:
- `resolved`
- `cancelled`

Indexes:
- `(market_id, created_at desc)`

## 3.6 Create or extend `wallet_ledger`

Purpose:
- append-only audit trail for wallet-affecting actions

If `wallet_ledger` does not already exist, create it.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id) on delete cascade`
- `entry_type text not null`
- `amount numeric not null`
- `reference_type text not null`
- `reference_id uuid`
- `balance_after numeric not null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Prediction entry types:
- `prediction_lock`
- `prediction_payout`
- `prediction_refund`

Indexes:
- `(user_id, created_at desc)`
- `(reference_type, reference_id)`

## 4. RLS and write model

### Read rules
- `prediction_markets`: readable by authenticated users, likely public in practice
- `market_outcomes`: readable by authenticated users, likely public in practice
- `prediction_entries`: users can read their own entries; optional public aggregate access via views
- `prediction_wallet_locks`: users can read their own rows
- `prediction_market_resolutions`: readable by authenticated users
- `wallet_ledger`: users can read their own rows

### Write rules
- Do not allow direct client inserts for prediction financial tables
- Writes should happen only through RPCs or service-role edge functions

Recommended write restriction:
- `prediction_entries`: service role only
- `prediction_wallet_locks`: service role only
- `prediction_market_resolutions`: service role only
- `wallet_ledger`: service role only

## 5. RPC contracts

## 5.1 `place_prediction_entry_v2`

### Purpose
- atomically place a prediction entry

### Invocation path
- preferred: Edge Function using service role internally
- acceptable: `security definer` RPC with strict auth checks

### Inputs
```json
{
  "market_id": "uuid",
  "outcome_id": "uuid",
  "stake_amount": 50,
  "client_request_id": "uuid"
}
```

### Required checks
- caller is authenticated
- `auth.uid()` matches acting user
- market exists
- market is `open`
- `now() < locks_at`
- market uses `legacy_model = 'binary_wallet'`
- outcome belongs to market
- wallet exists
- `wallets.balance >= stake_amount`

### Transaction behavior
- lock market row `for update`
- lock selected outcome row `for update`
- lock wallet row `for update`
- decrement `wallets.balance`
- insert `prediction_entries`
- insert `prediction_wallet_locks`
- insert `wallet_ledger`
- increment `market_outcomes.total_stake`

### Response
```json
{
  "success": true,
  "entry_id": "uuid",
  "market_id": "uuid",
  "outcome_id": "uuid",
  "stake_amount": 50,
  "wallet": {
    "available_balance": 950,
    "locked_prediction_balance": 50,
    "total_balance": 1000
  }
}
```

### Error response
```json
{
  "success": false,
  "error_code": "INSUFFICIENT_BALANCE",
  "message": "Insufficient SOL balance"
}
```

Recommended error codes:
- `UNAUTHORIZED`
- `MARKET_NOT_FOUND`
- `MARKET_NOT_OPEN`
- `MARKET_LOCKED`
- `INVALID_OUTCOME`
- `INSUFFICIENT_BALANCE`
- `IDEMPOTENCY_CONFLICT`
- `LEGACY_MARKET_MODEL`

## 5.2 `resolve_prediction_market_v2`

### Purpose
- resolve a market and pay winners

### Inputs
```json
{
  "market_id": "uuid",
  "winning_outcome_id": "uuid",
  "resolution_mode": "automatic",
  "source_url": "https://...",
  "source_snapshot": {},
  "notes": "optional"
}
```

### Required checks
- caller is service role or authorized admin path
- market exists
- market status is `locked` or `resolving`
- market uses `legacy_model = 'binary_wallet'`
- winning outcome belongs to market
- no existing final resolution already recorded

### Transaction behavior
- lock market row
- compute total pool from `prediction_entries`
- compute winning side total stake
- create `prediction_market_resolutions` row
- for each winning entry:
  - compute payout share
  - increment `wallets.balance`
  - mark corresponding lock row `paid_out`
  - insert `wallet_ledger` payout row
- for each losing entry:
  - mark corresponding lock row `released`
- update `prediction_markets` to `resolved`

### Response
```json
{
  "success": true,
  "market_id": "uuid",
  "status": "resolved",
  "winning_outcome_id": "uuid",
  "total_pool": 1000,
  "winning_pool": 300
}
```

## 5.3 `cancel_prediction_market_v2`

### Purpose
- cancel a market and refund all locked stakes

### Inputs
```json
{
  "market_id": "uuid",
  "source_url": "https://...",
  "notes": "official result unavailable"
}
```

### Required checks
- caller is service role or authorized admin path
- market exists
- market not already resolved/cancelled
- market uses `legacy_model = 'binary_wallet'`

### Transaction behavior
- lock market row
- create `prediction_market_resolutions` row with `result_status = 'cancelled'`
- for each active lock:
  - increment `wallets.balance`
  - mark lock row `refunded`
  - insert `wallet_ledger` refund row
- update `prediction_markets` to `cancelled`

### Response
```json
{
  "success": true,
  "market_id": "uuid",
  "status": "cancelled",
  "refunded_entries": 24
}
```

## 6. Payout math contract

### V1 settlement rule
- binary parimutuel pool
- winners split total pool in proportion to their stake on the winning side

### Formula
- `total_pool = sum(all stake_amount)`
- `winning_pool = sum(stake_amount where outcome_id = winning_outcome_id)`
- `entry_payout = (entry_stake / winning_pool) * total_pool`

### Rounding rule recommendation
- calculate using high-precision numeric
- floor payouts to 2 decimal places if wallet uses decimals
- assign remainder to the largest winning stake or treasury bucket, but choose one rule and keep it deterministic

## 7. Edge function recommendations

### `place-prediction-entry-v2`
- validate auth token
- pass user id and request data to RPC
- support `X-Idempotency-Key`
- return normalized API envelope

### `resolve-prediction-market-v2`
- admin/internal only
- may fetch result source first
- call RPC with explicit source payload

### `cancel-prediction-market-v2`
- admin/internal only
- call RPC for refund path

## 8. Frontend cutover contract

### New route structure
- `/predictions`
- `/predictions/hyrox`
- `/predictions/athletes`
- `/predictions/:marketId`

### `/markets` handling
- recommended: redirect `/markets` to `/predictions` after cutover
- do not leave the old pseudo-trading markets page public once v2 is live

### Wallet UI requirements
Expose:
- `available SOL`
- `locked in predictions`

Do not expose only one wallet number on the predictions surface.

### Client mutation behavior
- do not use optimistic balance deduction at first
- server-confirm then invalidate/refetch:
  - `wallet`
  - `prediction market`
  - `my predictions`

## 9. Legacy replacement map

## Legacy frontend to replace
- `src/pages/Markets.tsx`
- `src/pages/MarketDetail.tsx`
- `src/hooks/useMarkets.ts`
- `src/hooks/usePredictionCredits.ts`
- `src/hooks/usePredictionLeaderboard.ts`
- `src/hooks/useMarketActivity.ts`
- `src/components/markets/MarketTradePanel.tsx`
- `src/components/markets/PredictionLeaderboard.tsx`

## Legacy backend to replace
- `supabase/functions/resolve-market/index.ts`
- `supabase/functions/generate-markets/index.ts`
- `supabase/functions/agent-place-bet/index.ts`
- `supabase/functions/agent-prediction-credits/index.ts`
- `place_prediction_bet(...)`
- `resolve_prediction_market(...)`

## Legacy objects to archive or drop later
- `prediction_credits`
- `market_bets`
- `prediction_results`
- `market_activity`
- `prediction_leaderboard`

## 10. Engineering task list

### Schema migration tasks
- [ ] Add new v2 columns to `prediction_markets`
- [ ] Add new v2 columns to `market_outcomes`
- [ ] Create `prediction_entries`
- [ ] Create `prediction_wallet_locks`
- [ ] Create `prediction_market_resolutions`
- [ ] Create or extend `wallet_ledger`
- [ ] Add indexes and constraints
- [ ] Add RLS policies

### RPC tasks
- [ ] Define SQL function signatures
- [ ] Implement `place_prediction_entry_v2`
- [ ] Implement `resolve_prediction_market_v2`
- [ ] Implement `cancel_prediction_market_v2`
- [ ] Add idempotency handling
- [ ] Add deterministic payout rounding

### Edge function tasks
- [ ] Create `place-prediction-entry-v2`
- [ ] Create `resolve-prediction-market-v2`
- [ ] Create `cancel-prediction-market-v2`
- [ ] Restrict admin/internal resolution paths

### Frontend tasks
- [ ] Create `/predictions` route
- [ ] Build v2 market list/detail reads
- [ ] Build wallet available/locked display
- [ ] Replace credits-based stake panel
- [ ] Remove share/probability/trade copy

### Migration tasks
- [ ] Seed fresh v2-compatible HYROX markets
- [ ] Hide legacy markets UI
- [ ] Stop calling legacy prediction RPCs/functions
- [ ] Regenerate Supabase types
- [ ] Remove dead hooks/components after cutover

## 11. Acceptance criteria
- Prediction placement cannot spend more than available wallet balance
- Athlete card buys cannot spend funds locked in predictions
- Retried prediction placement with same idempotency key is safe
- Cancelled markets fully refund users
- Resolved markets pay winners deterministically
- Legacy `prediction_credits` are no longer used in active product behavior

## 12. First build step
Write the actual SQL migration spec and function signatures before writing any UI code.
