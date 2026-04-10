# Athlyst Predictions V1 Implementation Plan

## Status
- Planning artifact only
- Scope: offchain MVP
- This plan replaces the current prediction markets implementation

## Replacement Decision
The current prediction markets implementation in Athlyst should not be extended as the long-term base for v1.

Current implementation characteristics:
- Uses free `prediction_credits`
- Uses pseudo-trading semantics with `shares`, `probability`, and pool math
- Is currently HYROX-focused in UI and schema
- Lives across:
  - `src/pages/Markets.tsx`
  - `src/pages/MarketDetail.tsx`
  - `src/hooks/useMarkets.ts`
  - `src/hooks/usePredictionCredits.ts`
  - `src/hooks/usePredictionLeaderboard.ts`
  - `src/components/markets/*`
  - `supabase/migrations/20260202100000_prediction_markets.sql`
  - `supabase/migrations/20260209110000_fix_prediction_market_resolution.sql`
  - `supabase/functions/resolve-market`
  - `scripts/sync-hyrox-markets.cjs`

Why it should be replaced:
- It is built around free credits, not the product wallet token
- It behaves like pseudo-trading, which is too complex for the intended v1
- It creates avoidable UX and accounting complexity
- It does not cleanly model shared wallet usage with athlete card purchases

Replacement direction:
- Keep the idea of a predictions hub and HYROX event ingestion
- Replace the free-credit/share model with direct offchain wallet-backed staking using current `SOL` naming
- Replace pseudo-trading with simple binary forecasting markets
- Rebuild the market lifecycle and accounting around `available` vs `locked` balance semantics

## 1. Product framing

### What this feature is
- A social sports forecasting feature inside Athlyst
- Users use the existing offchain wallet token balance, currently labeled `SOL`
- Users stake tokens on sports outcomes and receive payouts when markets resolve
- The feature is engagement-focused, not real-money betting

### What this feature is not
- Not gambling
- Not a real-money sportsbook
- Not a live trading exchange
- Not a reputation system in v1
- Not an open-ended market creation tool for all users

### Best v1 scope
- Offchain only
- Binary markets only
- Two sections in one hub:
  - `HYROX`
  - `Athlete Markets`
- HYROX markets manually curated by founder/admin
- Athlete Markets created only by athlete-profile owners and founder/admin
- No self-reported or training-goal markets in first release

### HYROX curated markets vs Athlete Markets

#### HYROX
- High-visibility, curated, event-driven
- Created by founder/admin only
- Resolved only against `hyroxresults`
- Used to attract traffic and create recurring engagement around known events

#### Athlete Markets
- Created around an athlete's own official race outcome
- Limited to athlete owners and founder/admin
- Template-based only
- Must point to an official event and official result source
- Used to deepen support around an athlete journey, not to create a general public market layer

## 2. Key product decisions

### Market format
- Recommendation: start with `binary` only

Examples:
- Will athlete X finish HYROX Vienna?
- Will athlete X run sub-3:30 at race Y?
- Will athlete X finish top 10 in division Y?

Do not include in v1:
- Multiple choice winner boards
- Ranges
- Open-text custom markets

### Forecasting model
- Recommendation: `forecasting only`
- Users pick one side and stake tokens
- Users can add more stake before lock
- No selling out
- No switching sides after entry
- No order book
- No dynamic share pricing model

### Token mechanics
- Recommendation: direct use of existing offchain wallet balance, currently labeled `SOL`
- Funds are not burned
- Funds are locked while a market is open
- Payouts and refunds return to the same wallet system

### Market creation model
- Recommendation: `template-based`

Allowed v1 templates:
- Finish / not finish official event
- Go under / over a fixed threshold at official event
- Finish top N in official category

Disallowed in v1:
- Custom question text with no structured template
- Subjective outcomes
- Training promises
- Self-attested goals

### Who can create markets in v1
- HYROX: founder/admin only
- Athlete Markets: athlete-profile owners and founder/admin only
- Everyone else: no market creation access

## 3. Core constraints and risks

### Abuse, spam, and ambiguity
- If athletes can freely type custom questions, ambiguous markets will appear immediately
- Duplicate markets around the same race will fragment participation
- Third-party creator access would create moderation load and consent issues

Mitigation:
- Template-only creation
- Restricted creator roles
- One active athlete market at a time per athlete in v1
- Rate limit creation
- No edits after first stake

### Resolution disputes
- Even simple event markets break on DNS, DNF, DSQ, missing result records, and course changes
- If settlement rules are not explicit, disputes will be manual and expensive

Mitigation:
- Every template must store exact settlement rule text
- Official source must be attached at creation time
- Add explicit `cancel + refund` path
- Manual review only for exceptions

### Low participation and thin engagement
- Too many markets will make the feature look dead
- Empty markets reduce trust and make the app feel unfinished

Mitigation:
- Keep live market count low
- Feature curated HYROX first
- Cap athlete market creation
- Prioritize quality over breadth

### UX complexity
- The current share/probability pseudo-trading model is more complex than needed
- Users already manage wallet balance and athlete cards elsewhere in the app
- A second economic mental model will cause drop-off

Mitigation:
- Replace with pick + stake + lock + resolve
- Show simple crowd distribution, not synthetic trading metrics

### Wallet interaction with athlete card purchases
- Athlete card purchases already use the offchain wallet balance
- Predictions must not cause accidental overspend or confusing balance failures

Mitigation:
- Introduce explicit wallet accounting:
  - available balance
  - locked prediction balance
- Card purchases only spend available balance
- Prediction placement atomically moves value from available to locked

### Future migration if token later becomes ATL or moves onchain
- Naming will likely change later
- Onchain migration will be painful if v1 uses ad hoc mutable balances with weak ledgering

Mitigation:
- Keep a ledger-based accounting model now
- Keep token label abstracted in code where possible
- Store immutable settlement records and evidence trails

## 4. Recommended system architecture

### Frontend
- `PredictionsHubPage`
- `PredictionsSectionTabs`
- `PredictionMarketCard`
- `PredictionMarketDetailPage`
- `PredictionStakePanel`
- `MyPredictionsPage`
- `PredictionBalanceCard`
- `CreateAthleteMarketModal`
- `AdminPredictionsQueue`

Recommended information architecture:
- `/predictions`
- `/predictions/hyrox`
- `/predictions/athletes`
- `/predictions/:marketId`

Note:
- The existing `/markets` prediction UX should be migrated into the new Predictions surface or renamed into it
- The current pseudo-trading UI should not remain the user-facing mental model

### Backend services
- Market read service
- Market creation service
- Stake placement service
- Market lock scheduler
- Resolution worker
- HYROX result fetcher
- Admin moderation service
- Analytics event tracking

### Database entities
- `prediction_markets`
- `prediction_outcomes`
- `prediction_entries`
- `prediction_market_templates`
- `prediction_market_resolutions`
- `prediction_market_evidence`
- `prediction_market_reports`
- `wallet_ledger`
- `prediction_wallet_locks`

### Recommended v1 data model

#### prediction_markets
- id
- market_scope: `hyrox` | `athlete`
- creator_user_id
- athlete_id nullable
- sport
- event_name
- event_external_id
- official_source: `hyroxresults`
- template_key
- title
- description
- status: `draft` | `open` | `locked` | `resolving` | `resolved` | `cancelled`
- opens_at
- locks_at
- resolved_at
- winning_outcome_id nullable
- cancellation_reason nullable
- settlement_rule_text
- metadata

#### prediction_outcomes
- id
- market_id
- key: `yes` | `no`
- label
- total_stake

#### prediction_entries
- id
- market_id
- user_id
- outcome_id
- stake_amount
- created_at

#### wallet_ledger
- id
- user_id
- entry_type
- amount
- reference_type
- reference_id
- balance_after
- created_at

#### prediction_wallet_locks
- id
- user_id
- market_id
- entry_id
- amount
- status: `locked` | `released` | `paid_out` | `refunded`
- created_at
- updated_at

#### prediction_market_resolutions
- id
- market_id
- resolution_mode: `automatic` | `manual`
- source_url
- source_snapshot
- decided_by_user_id nullable
- winning_outcome_id nullable
- result_status: `resolved` | `cancelled`
- notes
- created_at

### Market lifecycle
- `draft`
- `open`
- `locked`
- `resolving`
- `resolved`
- `cancelled`

### Lock and resolution flow
- Market created with explicit source and lock time
- User stakes from available wallet balance
- Stake amount becomes locked
- At lock time, market becomes `locked`
- Resolution worker fetches official source
- If source is clean, auto-resolve
- If source is unclear, move to manual review
- On resolve:
  - winners paid out
  - losers remain spent
- On cancel:
  - all locked funds refunded

### Admin and moderation tooling
- Create HYROX markets
- View athlete-created markets
- Cancel market
- Resolve market manually
- Attach evidence link
- Refund market
- View audit log

## 5. Resolution engine design

### HYROX markets
- Authority: `hyroxresults`
- Founder/admin creates the markets manually
- System resolves automatically against official result page or stored event mapping

Can automate:
- Finish / not finish
- Threshold result
- Top-N placement

Needs manual review:
- Missing result
- Name mismatch
- DSQ/DNF ambiguity
- Source outage

### Official race result markets
- Only support markets tied to an official event result page
- In v1, Athlete Markets should only use official event templates

Can automate if:
- event mapping exists
- official result can be matched reliably
- settlement rule is template-compatible

Needs manual review if:
- official result is missing
- athlete is not clearly matchable
- event structure changed

### Self-reported athlete markets
- Out of first release
- Do not build this into v1

## 6. Token mechanics

### Current product reality
- The current offchain wallet uses `SOL` naming in app code and UI
- Athlete card purchases already spend from that wallet
- The product intent may later rename or remap this token to `ATL`

### V1 recommendation
- Keep `SOL` in the product for now
- Use direct wallet-backed staking
- Add explicit lock accounting instead of creating a second fake currency

### Required accounting model
- `available balance`
- `locked prediction balance`
- `total wallet balance`

Rules:
- Athlete card purchases use available balance only
- Prediction placement reduces available balance and increases locked prediction balance
- Resolution or cancellation releases or redistributes locked balance through ledger entries

### Why not keep prediction credits
- Free credits disconnect predictions from the actual product economy
- They create a second balance users do not care about
- They are already the wrong abstraction for the intended feature

## 7. MVP rollout

### Phase 1
In:
- Predictions hub
- HYROX binary markets
- Founder/admin-created markets only
- Direct wallet-backed staking with lock accounting
- Official HYROX result resolution
- My Predictions
- Basic leaderboard if useful

Out:
- Athlete-created markets
- Self-reported markets
- Multiple choice
- Range markets
- Comments/dispute workflow

### Phase 2
In:
- Athlete Markets
- Creator access for athlete owners and founder/admin
- Template-based official-event markets only
- Profile integration

Out:
- Free-form custom markets
- Self-reported or training goals
- General user creation

### Phase 3
In:
- Better moderation tooling
- Better analytics
- More event templates
- Optional creator quality controls

Out:
- Onchain settlement
- Pseudo-trading

## 8. Build order

### 1. Product and domain alignment
- Confirm predictions replace current implementation
- Confirm `SOL` naming stays in v1
- Confirm v1 routes and IA

### 2. Wallet accounting design
- Define available vs locked semantics
- Define ledger entry types
- Define payout and refund rules
- Define idempotency and concurrency requirements

### 3. Schema refactor
- Add new prediction lifecycle fields
- Add ledger + lock tables
- Add resolution records
- Remove dependency on free-credit/share model as source of truth

### 4. Service layer
- Create stake placement function
- Create lock job
- Create resolution worker
- Create cancel/refund flow

### 5. HYROX market admin flow
- Manual market creation UI or admin script
- Event mapping to `hyroxresults`
- Validation of templates and lock times

### 6. Read models and queries
- List markets
- Market detail
- My predictions
- Wallet balance summary with locked amount

### 7. Frontend
- Predictions hub
- Market card/list
- Market detail
- Stake panel
- Balance display

### 8. Athlete Markets
- Creator gate
- Create market flow
- Athlete profile integration

### 9. Admin tools
- Resolve manually
- Cancel market
- Refund market
- Evidence and audit trail

### 10. Analytics
- View market
- Place stake
- Market locked
- Market resolved
- Payout/refund issued

## 9. Open founder decisions
- Do you want a leaderboard in v1, or is it unnecessary noise?
- Should athlete creators be limited to one live market at a time in v1? Recommended: yes
- Should athlete markets auto-publish or require a founder check? Current assumption: auto-publish for allowed creators
- Should `/markets` be fully renamed to `/predictions` in v1? Recommended: yes

## Engineering Task List

## Epic 1: Replace current prediction core
- [ ] Freeze the current prediction credits/share model as legacy
- [ ] Decide whether to hard-delete or soft-deprecate legacy tables and UI
- [ ] Mark current prediction routes/hooks/components as replacement targets
- [ ] Create migration plan for old prediction data handling

## Epic 2: Wallet accounting
- [ ] Design wallet ledger entry types for prediction lock, release, payout, refund
- [ ] Add locked-balance support without breaking athlete card purchase flow
- [ ] Add atomic transaction path for stake placement
- [ ] Add idempotency for prediction stake requests
- [ ] Add safeguards so card buys cannot spend locked funds

## Epic 3: Schema and backend
- [ ] Refactor prediction schema away from free credits
- [ ] Replace pseudo-trading fields as source of truth
- [ ] Add market resolution record table
- [ ] Add market evidence/source storage
- [ ] Add creator permissions model

## Epic 4: HYROX v1
- [ ] Create manual HYROX market creation flow
- [ ] Store `hyroxresults` source mapping per market
- [ ] Build lock scheduler
- [ ] Build automatic resolution worker for supported templates
- [ ] Build manual exception handling path

## Epic 5: Frontend predictions hub
- [ ] Create `/predictions` hub
- [ ] Create HYROX section landing
- [ ] Replace current market cards and detail UX with binary forecast UX
- [ ] Add wallet summary with available and locked balances
- [ ] Add My Predictions surface

## Epic 6: Athlete Markets
- [ ] Add creator gate for athlete owners and founder/admin
- [ ] Build template-based creation flow
- [ ] Enforce structured official-event input
- [ ] Add athlete profile entry point
- [ ] Add live-market cap and rate limits

## Epic 7: Admin and moderation
- [ ] Build admin market list and detail
- [ ] Build cancel + refund action
- [ ] Build manual resolve action
- [ ] Build evidence attachment and audit log
- [ ] Build creator disable/override controls

## Epic 8: Migration and cleanup
- [ ] Remove or rewrite `usePredictionCredits`
- [ ] Remove or rewrite share/probability-based placement logic
- [ ] Remove or rewrite current market leaderboard assumptions
- [ ] Rename or migrate `/markets` experience into Predictions
- [ ] Retire legacy scripts/functions that no longer match product behavior

## Immediate First Tasks
- [ ] Finalize wallet accounting spec for available vs locked balance
- [ ] Write the replacement schema plan for current prediction tables
- [ ] Define binary market templates and settlement rules
- [ ] Decide route migration from `/markets` to `/predictions`

## Recommended V1
- Replace the current free-credit pseudo-trading predictions implementation
- Launch a simple binary forecasting product backed by the existing offchain wallet token, still labeled `SOL`
- Start with manually curated HYROX markets
- Then expand to athlete-owner-created official-event markets

## Biggest Risk To Avoid
- Reusing the current wallet balance without introducing explicit locked-balance accounting

## First Engineering Task
- Design and approve the offchain wallet accounting model for predictions before touching UI
