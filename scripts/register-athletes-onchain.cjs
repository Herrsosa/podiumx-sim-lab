require("dotenv").config();
const { ethers } = require("ethers");
const { createClient } = require("@supabase/supabase-js");

const BONDING_CURVE_ABI = [
  "function registerAthlete(address athlete, uint256 a, uint256 b, uint256 c) external",
  "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
  "function owner() external view returns (address)",
];

function parseArgs(argv) {
  const args = { dryRun: false, limit: null };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    else if (token === "--limit") {
      const raw = argv[i + 1];
      if (!raw) throw new Error("--limit requires a number");
      const n = Number(raw);
      if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid --limit: ${raw}`);
      args.limit = n;
      i++;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv);

  const rpcUrl = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
  const bondingCurveAddress = process.env.MONAD_BONDING_CURVE_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  if (!bondingCurveAddress) {
    throw new Error("Missing MONAD_BONDING_CURVE_ADDRESS in environment");
  }
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in environment");
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in environment");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, wallet);

  console.log("Network RPC:", rpcUrl);
  console.log("Bonding curve:", bondingCurveAddress);
  console.log("Deployer:", wallet.address);
  console.log("Mode:", dryRun ? "DRY RUN" : "LIVE");
  if (limit) console.log("Limit:", limit);

  const owner = await contract.owner();
  console.log("Contract owner:", owner);
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Wallet is not the contract owner; cannot register athletes");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, monad_wallet_address")
    .not("monad_wallet_address", "is", null)
    .order("username", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  const rows = profiles || [];
  console.log(`\nFound ${rows.length} profiles with wallets`);

  const CURVE_A = ethers.parseUnits("0.0002", 18);
  const CURVE_B = ethers.parseUnits("0.02", 18);
  const CURVE_C = ethers.parseUnits("1", 18);

  let processed = 0;
  for (const profile of rows) {
    if (limit && processed >= limit) break;
    processed++;

    const username = profile.username || profile.id;
    const athleteWallet = profile.monad_wallet_address;
    if (!athleteWallet) continue;

    let isInitialized = false;
    try {
      const info = await contract.getAthleteInfo(athleteWallet);
      isInitialized = Boolean(info?.[4]);
    } catch {
      // If the call fails, treat as not registered (we'll attempt registration).
      isInitialized = false;
    }

    if (isInitialized) {
      console.log(`- ${username}: already registered (${athleteWallet})`);
      continue;
    }

    if (dryRun) {
      console.log(`- ${username}: WOULD register (${athleteWallet})`);
      continue;
    }

    console.log(`- ${username}: registering (${athleteWallet})...`);
    const tx = await contract.registerAthlete(athleteWallet, CURVE_A, CURVE_B, CURVE_C);
    console.log(`  tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`  confirmed in block: ${receipt.blockNumber}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
