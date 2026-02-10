# Bonding Curve V2 Migration Plan

## Problem Summary

The current on-chain `AthlystBondingCurve` contract at `0xA87F1E8EE6bC24D628f9C5d03e8736e5bF32c809` 
has a **critical integer division truncation bug**. The `priceAt()` function divides each term by `1e18` 
independently, which floors the `a` and `b` contributions to zero at any realistic supply level (<7 billion).

**Result**: On-chain price is always ~1 MON regardless of supply, while off-chain price correctly 
increases per the quadratic curve.

The contract is **not upgradeable** (no proxy), so a new deployment is required.

---

## Phase 1: Prepare V2 Contract (DONE ✅)

### Files already created:

| File | Purpose |
|------|---------|
| `contracts/AthlystBondingCurveV2.sol` | Fixed contract with correct math (no `/1e18` truncation) |
| `hardhat.config.cjs` | Hardhat configuration for Monad mainnet deployment |
| `scripts/deploy-v2.cjs` | Deployment script |

### The Fix (what changed in V2):

**V1 (broken):**
```solidity
function priceAt(uint256 s, uint256 a, uint256 b, uint256 c) returns (uint256) {
    return (a * s * s) / 1e18 + (b * s) / 1e18 + c;
    //     ^^^^^^^^^^^^^^^^       ^^^^^^^^^^^^^^
    //     2e14 * 1 / 1e18 = 0    2e16 * 1 / 1e18 = 0   → always returns just c (1 MON)
}
```

**V2 (fixed):**
```solidity
function priceAt(uint256 s, uint256 a, uint256 b, uint256 c) returns (uint256) {
    return (a * s * s) + (b * s) + c;
    //     ^^^^^^^^^^^   ^^^^^^^^
    //     2e14 * 1 = 2e14 ✓     2e16 * 1 = 2e16 ✓   → 1.0202 MON at supply 1
}
```

### V2 also adds:
- **Balance tracking**: `mapping(address => mapping(address => uint256)) balances` — V1 didn't track who owns tokens on-chain
- **ReentrancyGuard**: Prevents reentrancy attacks on buy/sell/claim
- **claimEarnings()**: Lets athletes withdraw accumulated fee earnings
- **Ownable + ReentrancyGuard inlined**: No OpenZeppelin dependency needed

---

## Phase 2: Compile & Deploy

### Step 2.1: Kill stuck terminal & reinstall dependencies
```powershell
# Kill the stuck Remove-Item process first (Ctrl+C or close terminal)
# Then:
pnpm install
```

### Step 2.2: Compile the contract
```powershell
npx hardhat compile
```
Expected: Compiles `AthlystBondingCurveV2.sol` successfully.

### Step 2.3: Deploy to Monad Mainnet
```powershell
# Ensure .env has PRIVATE_KEY set (deployer wallet with MON for gas)
npx hardhat run scripts/deploy-v2.cjs --network monad
```
Expected output:
```
AthlystBondingCurveV2 deployed to: 0x<NEW_ADDRESS>
```
**Save this address.** All subsequent steps use it.

---

## Phase 3: Update All References

### Step 3.1: Environment Variables

| Location | Action |
|----------|--------|
| `.env` | Update `MONAD_BONDING_CURVE_ADDRESS="0x<NEW_ADDRESS>"` |
| `.env.example` | Update `MONAD_BONDING_CURVE_ADDRESS="0x<NEW_ADDRESS>"` |
| **Supabase Secrets** | `supabase secrets set MONAD_BONDING_CURVE_ADDRESS=0x<NEW_ADDRESS>` |

### Step 3.2: Documentation (replace `0xA87F1E8EE6bC24D628f9C5d03e8736e5bF32c809` → `0x<NEW_ADDRESS>`)

| File | Lines | What to update |
|------|-------|----------------|
| `README.md` | L32, L103 | Contract address link and text |
| `world.md` | L38, L154 | Contract address in table and text |
| `skill.md` | L44, L137, L539 | Contract address in table, JSON example, and footer |

### Step 3.3: Hardcoded Script References

| File | Line | What to update |
|------|------|----------------|
| `scripts/seed-tokens.mjs` | L8 | `const CONTRACT = "0x<NEW_ADDRESS>"` |

### Step 3.4: Files that read from `process.env.MONAD_BONDING_CURVE_ADDRESS` (NO code changes needed)

These all read from env vars and will automatically pick up the new address:
- `supabase/functions/_shared/monad.ts` (shared helper)
- `supabase/functions/agent-trade/index.ts`
- `supabase/functions/agent-confirm-trade/index.ts`
- `supabase/functions/agent-claim-earnings/index.ts`
- `supabase/functions/admin-sync-onchain-tokens/index.ts`
- `scripts/register-athletes.ts`
- `scripts/register-debug.ts`
- `scripts/register-target.ts`
- `scripts/seed-athlete-wallets.ts`
- `scripts/register-athletes-onchain.cjs`
- `scripts/debug-trade-revert.ts`
- `scripts/debug-market-parity.mjs`

---

## Phase 4: Register Athletes on V2

### Step 4.1: Register all athletes on the new contract
```powershell
npx tsx scripts/register-athletes.ts
```
This script:
1. Reads all profiles with `monad_wallet_address` from Supabase
2. Calls `registerAthlete(walletAddress, CURVE_A, CURVE_B, CURVE_C)` on V2
3. Uses same params: `a=2e14, b=2e16, c=1e18`

### Step 4.2: Verify registration
```powershell
npx tsx scripts/debug-market-parity.mjs <athlete-username>
```
Expected: On-chain price should now match off-chain price (both ~1.02 MON at supply 1).

---

## Phase 5: Migrate Holdings (Airdrop)

### Current state of holdings:
- Most athletes have `supply = 1` (from the seed script)
- Very few real user trades exist (platform is pre-launch)

### Step 5.1: Seed initial tokens on V2
```powershell
# Re-run the seed script to buy 1 token per athlete on V2
node scripts/seed-tokens.mjs
```
This buys 1 token for each athlete using the deployer wallet, establishing `supply=1` on V2.

### Step 5.2: Reset DB supply to match V2
The `seed-tokens.mjs` script should update `athlete_tokens.supply` in Supabase.
If not, run a manual update:
```sql
-- Run in Supabase SQL Editor
UPDATE athlete_tokens SET supply = 1, treasury_balance = 0, athlete_earnings = 0;
```

### Step 5.3: Handle existing user holdings
Since holdings are minimal (hackathon demo), the simplest approach:

**Option A (Recommended for hackathon):** Reset holdings
```sql
-- Clear all existing holdings (they were on V1, now worthless)
DELETE FROM holdings;
-- Clear old trades (optional, keeps history but prices were wrong)
-- DELETE FROM trades WHERE is_on_chain = true;
```

**Option B (If real users have tokens):** Airdrop via script
Create a migration script that:
1. Snapshots current `holdings` table
2. For each holding: calls `buy()` on V2 using the deployer wallet
3. Records the purchase for the user in the `holdings` table with original `avg_cost`

This would require a new script `scripts/migrate-holdings-v2.ts` (not yet created).

---

## Phase 6: Redeploy Edge Functions

After updating Supabase secrets, redeploy all affected edge functions so they pick up the new address:

```powershell
supabase functions deploy agent-trade --no-verify-jwt
supabase functions deploy agent-confirm-trade --no-verify-jwt
supabase functions deploy agent-claim-earnings --no-verify-jwt
supabase functions deploy admin-sync-onchain-tokens --no-verify-jwt
supabase functions deploy execute-trade --no-verify-jwt
```

---

## Phase 7: Verification Checklist

| Check | Command/Action |
|-------|----------------|
| ✅ Contract compiled | `npx hardhat compile` |
| ✅ Contract deployed | `npx hardhat run scripts/deploy-v2.cjs --network monad` |
| ✅ .env updated | Verify `MONAD_BONDING_CURVE_ADDRESS` |
| ✅ Supabase secrets updated | `supabase secrets list` |
| ✅ Athletes registered | `npx tsx scripts/register-athletes.ts` |
| ✅ Tokens seeded | `node scripts/seed-tokens.mjs` |
| ✅ Price parity verified | `npx tsx scripts/debug-market-parity.mjs <username>` |
| ✅ Edge functions redeployed | `supabase functions deploy ...` |
| ✅ README/docs updated | Manual review |
| ✅ Old contract paused (optional) | Call `pause()` on V1 if available |
| ✅ UI shows correct prices | Open app, check marketplace |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Old V1 trades still indexed | `agent-confirm-trade` checks `tx.to` matches contract address; old txs will be rejected |
| Gas costs | Registration + seed = ~20 txs × ~0.003 MON each ≈ 0.06 MON total |
| Holdings loss | Current holdings are seed data (1 token each), no real value at risk |
| Off-chain params mismatch | V2 uses same a/b/c params as off-chain code — no frontend changes needed |
| ABI compatibility | V2 has identical external interface (registerAthlete, buy, sell, getAthleteInfo) |

---

## Timeline Estimate

| Phase | Time |
|-------|------|
| Phase 1 (Prepare) | ✅ Done |
| Phase 2 (Deploy) | ~5 minutes |
| Phase 3 (Update refs) | ~10 minutes |
| Phase 4 (Register) | ~5 minutes |
| Phase 5 (Migrate) | ~5 minutes |
| Phase 6 (Redeploy functions) | ~5 minutes |
| Phase 7 (Verify) | ~10 minutes |
| **Total** | **~40 minutes** |
