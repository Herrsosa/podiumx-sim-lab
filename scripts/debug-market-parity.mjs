import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

const username = process.argv.slice(2).find((a) => !a.startsWith("--"));

if (!username) {
  console.error("Usage: node scripts/debug-market-parity.mjs <athlete-username>");
  console.error("Example: node scripts/debug-market-parity.mjs leo-martinez");
  process.exit(2);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in env.");
}

const MONAD_RPC_URL = process.env.MONAD_RPC_URL;
const MONAD_BONDING_CURVE_ADDRESS = process.env.MONAD_BONDING_CURVE_ADDRESS;
const MONAD_CHAIN_ID = process.env.MONAD_CHAIN_ID || "(unset)";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function priceAt(supply, a, b, c) {
  return a * supply * supply + b * supply + c;
}

function fmt(n, digits = 6) {
  if (!Number.isFinite(n)) return String(n);
  return n.toFixed(digits);
}

async function main() {
  console.log(`Athlyst market parity debug`);
  console.log(`----------------------------------------`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Athlete username: ${username}`);
  console.log();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, type, monad_wallet_address")
    .eq("username", username)
    .maybeSingle();

  if (profileError) throw new Error(`profiles lookup failed: ${profileError.message}`);
  if (!profile) throw new Error(`No profile found for username="${username}"`);

  const { data: token, error: tokenError } = await supabase
    .from("athlete_tokens")
    .select("athlete_id, symbol, supply, a, b, c, updated_at")
    .eq("athlete_id", profile.id)
    .maybeSingle();

  if (tokenError) throw new Error(`athlete_tokens lookup failed: ${tokenError.message}`);
  if (!token) throw new Error(`No athlete_tokens row found for athlete_id=${profile.id}`);

  const supply = Number(token.supply ?? 0);
  const a = Number(token.a ?? 0.0002);
  const b = Number(token.b ?? 0.02);
  const c = Number(token.c ?? 1);
  const dbCurvePrice = priceAt(supply, a, b, c);

  const { data: lastTrade, error: lastTradeError } = await supabase
    .from("trades")
    .select("created_at, side, qty, price_after, supply_after")
    .eq("athlete_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastTradeError) throw new Error(`trades lookup failed: ${lastTradeError.message}`);

  console.log(`DB profile`);
  console.log(
    JSON.stringify(
      {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        type: profile.type,
        monad_wallet_address: profile.monad_wallet_address,
      },
      null,
      2,
    ),
  );
  console.log();

  console.log(`DB token`);
  console.log(
    JSON.stringify(
      {
        athlete_id: token.athlete_id,
        symbol: token.symbol,
        supply,
        a,
        b,
        c,
        curve_price_at_supply: Number.isFinite(dbCurvePrice) ? fmt(dbCurvePrice, 6) : String(dbCurvePrice),
        updated_at: token.updated_at,
      },
      null,
      2,
    ),
  );
  console.log();

  console.log(`DB last trade`);
  console.log(JSON.stringify(lastTrade ?? null, null, 2));
  console.log();

  console.log(`On-chain config (env)`);
  console.log(
    JSON.stringify(
      {
        MONAD_CHAIN_ID,
        MONAD_RPC_URL: MONAD_RPC_URL ?? "(unset)",
        MONAD_BONDING_CURVE_ADDRESS: MONAD_BONDING_CURVE_ADDRESS ?? "(unset)",
      },
      null,
      2,
    ),
  );
  console.log();

  if (!MONAD_RPC_URL || !MONAD_BONDING_CURVE_ADDRESS) {
    console.log(
      "Skipping on-chain check because MONAD_RPC_URL or MONAD_BONDING_CURVE_ADDRESS is not set.",
    );
    return;
  }

  if (!profile.monad_wallet_address) {
    console.log("Skipping on-chain check because athlete has no monad_wallet_address in DB.");
    return;
  }

  const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
  const abi = [
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
  ];
  const contract = new ethers.Contract(MONAD_BONDING_CURVE_ADDRESS, abi, provider);

  const info = await contract.getAthleteInfo(profile.monad_wallet_address);
  const onSupply = Number(info[0]);
  const onPriceMon = Number(ethers.formatEther(info[1]));
  const onTreasuryMon = Number(ethers.formatEther(info[2]));
  const onEarningsMon = Number(ethers.formatEther(info[3]));
  const onInit = Boolean(info[4]);

  console.log(`On-chain getAthleteInfo`);
  console.log(
    JSON.stringify(
      {
        athlete_wallet: profile.monad_wallet_address,
        initialized: onInit,
        supply: onSupply,
        current_price_mon: fmt(onPriceMon, 6),
        treasury_mon: fmt(onTreasuryMon, 6),
        athlete_earnings_mon: fmt(onEarningsMon, 6),
      },
      null,
      2,
    ),
  );
  console.log();

  if (Number.isFinite(dbCurvePrice) && dbCurvePrice > 0 && Number.isFinite(onPriceMon) && onPriceMon > 0) {
    console.log(`Price ratio (onchain/db): ${fmt(onPriceMon / dbCurvePrice, 4)}`);
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

