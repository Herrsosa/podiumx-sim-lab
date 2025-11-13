\# AGENTS.md — Codex Repo Memory



\## 1) What this project is (Context)

\- \*\*Athlyst\*\*: a web app where athletes mint tokens, share “Proof-of-Sweat” posts (workouts/media), and fans trade those tokens on a bonding-curve marketplace.

\- Core flows: auth → create/view athlete profiles → post workouts (manual + Strava/Garmin sync) → marketplace buy/sell → token-gated chat/content.

\- Non-goals: not a generic DEX or wallet app; crypto UX should stay “under the hood” and simple.



\## 2) Tech \& conventions (Stack)

\- \*\*Frontend\*\*: React 18 + Vite + TypeScript, state via lightweight hooks; UI: Tailwind.

\- \*\*Backend/data\*\*: Supabase (Postgres, Auth, Storage, RLS, Edge Functions).

\- \*\*Blockchain\*\*: moving to \*\*Base Sepolia\*\* first, then Base mainnet; USDC spending with gas abstracted by app later.

\- \*\*Pkg manager\*\*: `pnpm` (preferred) or `npm`.

\- Node: `<vXX>` (use `.nvmrc` if present).

\- Code style: Prettier + ESLint (strict TS). Small PRs (<300 LOC).



\## 3) How to run locally (Commands)

\- Install: `pnpm install`

\- Dev server: `pnpm dev`

\- Build: `pnpm build`

\- Lint: `pnpm lint`

\- Tests: `pnpm test` (add/maintain tests for any change)

\- Typecheck: `pnpm typecheck`



\## 4) Environment \& secrets

\- \*\*Do NOT commit real secrets.\*\*

\- Keep `.env` ignored; maintain a \*\*`.env.example`\*\* with placeholders.

\- Typical vars (adjust to repo):
VITE_SUPABASE_URL=<paste>
VITE_SUPABASE_ANON_KEY=<paste>
STRAVA_CLIENT_ID=<placeholder>
STRAVA_CLIENT_SECRET=<placeholder>
GARMIN_CONNECT_<...>=<placeholder>
BASE_RPC_URL=<placeholder>
WALLET_SERVICE_KEY=<placeholder>
- If a change needs a secret, add the key to `.env.example` and document usage in the PR.

## 5) Data model (high-level, keep in sync)
- `profiles (id pk, username, avatar, role)`
- `athletes (id pk -> profiles.id, bio, sport, socials)`
- `wallets (user_id pk -> profiles.id, address, usdc_balance, ... )`
- `athlete_tokens (id pk, athlete_id fk, symbol, supply, params)`
- `trades (id pk, buyer_id fk, athlete_token_id fk, side, qty, price, ts)`
- `posts (id pk, athlete_id fk, date, type, metrics, rpe, notes, token_holders_only bool)`
- `media (id pk, post_id fk, path)`
- Edge functions (e.g., `execute-trade`) must stay atomic and respect RLS.

## 6) Guardrails (“don’t break”)
- **RLS**: never loosen RLS without explicit instruction; add tests if changing.
- **Edge functions**: keep `execute-trade` transactional; update its tests if touching.
- **Migrations**: always include forward + (when reasonable) backward notes.
- **Rate limits / 3rd-party APIs**: Strava auth domain must match config; handle 401/429.

## 7) Acceptance criteria template (paste in PRs)
- **What changed:** …
- **Why:** …
- **How tested:** exact commands (`pnpm dev`, `pnpm test`), screenshots/video for UI.
- **Risk & rollback:** what could break + how to revert (migration down note, feature flag, or revert PR).
- **Follow-ups:** tickets/issues if scope intentionally cut.

## 8) Branching & PR
- Create branches like `codex/<feature>` (e.g., `codex/base-integration`, `codex/strava-callback`).
- Keep PRs small; link Issues. Request review from maintainers.
- CI must pass (`lint`, `typecheck`, `test`) before merge.

## 9) Testing expectations
- Add unit tests for utils/hooks; component tests for critical UI; minimal integration test for Edge functions (mock Supabase if needed).
- If you change RLS or Edge logic → include a test proving access behavior.

## 10) Feature notes (for predictable behavior)
- **Proof-of-Sweat posts**: allow manual entry; support media to Supabase Storage; token-only posts should blur/lock for non-holders with an unlock CTA.
- **Strava/Garmin**: first-class “Connect account” flow; background sync task; respect API quotas; errors surfaced in UI.
- **Marketplace**: bonding-curve quotes must be monotonic; show fee breakdown; PnL = realized + unrealized from last trade prices.
- **Token-gated chat**: read access requires holding ≥ 1 token (configurable); fall back to public preview.
- **Performance**: pages should time-to-interactive < 2s locally; avoid N+1 queries; memoize expensive hooks.

## 11) Base (L2) integration (phase plan)
- Phase 0: abstract wallet ops behind a service; mock signer in dev.
- Phase 1: add Base Sepolia RPC + test USDC; gas sponsor (meta-tx) stubbed in code.
- Phase 2: replace mocks with real contracts; add on-chain events → Supabase sync.

## 12) Ready-to-start tasks for Codex
- Create `.env.example` from `.env` (no secrets), wire into README.
- Fix any failing `pnpm typecheck`/`pnpm lint`.
- Add tests for `execute-trade` happy path + RLS read/write rules.
- Implement Strava callback domain check and friendly error messages.
- Add “Athlete Earnings” panel (1.5% fee of all historical trades, correct calc).




