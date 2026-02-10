import "dotenv/config";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MONAD_NETWORK = {
  chainId: Number(process.env.MONAD_CHAIN_ID || "143"),
  rpcUrl: process.env.MONAD_RPC_URL || "https://rpc.monad.xyz",
  bondingCurveAddress: process.env.MONAD_BONDING_CURVE_ADDRESS,
};

if (!Number.isInteger(MONAD_NETWORK.chainId) || MONAD_NETWORK.chainId <= 0) {
  throw new Error(`Invalid MONAD_CHAIN_ID: ${process.env.MONAD_CHAIN_ID ?? ""}`);
}

if (!MONAD_NETWORK.bondingCurveAddress) {
  throw new Error("Missing MONAD_BONDING_CURVE_ADDRESS for on-chain registration");
}

const CURVE_A = ethers.parseUnits("0.0002", 18);
const CURVE_B = ethers.parseUnits("0.02", 18);
const CURVE_C = ethers.parseUnits("1", 18);

const EXCLUDED_USERNAMES = new Set(["derek", "washek"]);

interface WalletRecord {
  athlete_id: string;
  username: string;
  address: string;
  privateKey: string;
  mnemonic: string;
  created_at: string;
  registration_tx?: string;
}

type AthleteRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  monad_wallet_address: string | null;
};

function getTimestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function getEligibleAthletesWithoutWallets(): Promise<AthleteRow[]> {
  const { data: tokenRows, error: tokenError } = await supabase
    .from("athlete_tokens")
    .select("athlete_id");

  if (tokenError) {
    throw new Error(`Failed to fetch athlete_tokens: ${tokenError.message}`);
  }

  const athleteIds = (tokenRows || []).map((r: { athlete_id: string }) => r.athlete_id);
  if (athleteIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, monad_wallet_address")
    .in("id", athleteIds)
    .is("monad_wallet_address", null)
    .order("username", { ascending: true });

  if (profileError) {
    throw new Error(`Failed to fetch profiles: ${profileError.message}`);
  }

  return (profiles || []).filter((athlete) => {
    const username = (athlete.username || "").toLowerCase();
    return !EXCLUDED_USERNAMES.has(username);
  });
}

async function registerOnBondingCurve(records: WalletRecord[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const protocolPrivateKey = process.env.PROTOCOL_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!protocolPrivateKey) {
    throw new Error("Missing PROTOCOL_PRIVATE_KEY/PRIVATE_KEY for on-chain registration");
  }

  const provider = new ethers.JsonRpcProvider(MONAD_NETWORK.rpcUrl);
  const signer = new ethers.Wallet(protocolPrivateKey, provider);
  const bondingCurveABI = [
    "function registerAthlete(address athlete, uint256 a, uint256 b, uint256 c) external",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
    "function owner() external view returns (address)",
  ];

  const bondingCurve = new ethers.Contract(
    MONAD_NETWORK.bondingCurveAddress,
    bondingCurveABI,
    signer
  );

  const owner = await bondingCurve.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      `Configured signer (${signer.address}) is not contract owner (${owner}); cannot register athletes`
    );
  }

  console.log(`\nRegistering ${records.length} athletes on bonding curve...`);
  for (const record of records) {
    try {
      const info = await bondingCurve.getAthleteInfo(record.address);
      if (info[4]) {
        console.log(`  - ${record.username}: already registered`);
        continue;
      }
    } catch {
      // Continue to registration attempt.
    }

    const tx = await bondingCurve.registerAthlete(record.address, CURVE_A, CURVE_B, CURVE_C);
    await tx.wait();
    record.registration_tx = tx.hash;
    console.log(`  - ${record.username}: registered (${tx.hash})`);
  }
}

async function main(): Promise<void> {
  const argSet = new Set(process.argv.slice(2));
  const dryRun = argSet.has("--dry-run");
  const registerOnchain = argSet.has("--register-onchain");

  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE RUN"}`);
  console.log(`Register on-chain: ${registerOnchain ? "yes" : "no"}`);

  const athletes = await getEligibleAthletesWithoutWallets();

  if (athletes.length === 0) {
    console.log("All eligible athletes already have wallet addresses.");
    return;
  }

  console.log(`Found ${athletes.length} eligible athletes without wallets.`);
  console.log(`Excluded usernames: ${Array.from(EXCLUDED_USERNAMES).join(", ")}`);

  const walletRecords: WalletRecord[] = [];
  for (const athlete of athletes) {
    const wallet = ethers.Wallet.createRandom();
    const username = athlete.username || athlete.display_name || athlete.id;

    console.log(`\n${username}`);
    console.log(`  Address: ${wallet.address}`);

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ monad_wallet_address: wallet.address.toLowerCase() })
        .eq("id", athlete.id);

      if (updateError) {
        console.error(`  Failed DB update: ${updateError.message}`);
        continue;
      }

      console.log("  DB updated");
    } else {
      console.log("  Skipped DB update (dry run)");
    }

    walletRecords.push({
      athlete_id: athlete.id,
      username,
      address: wallet.address.toLowerCase(),
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || "",
      created_at: new Date().toISOString(),
    });
  }

  if (dryRun) {
    console.log(`\nDry run complete. Would create ${walletRecords.length} wallets.`);
    return;
  }

  if (registerOnchain) {
    await registerOnBondingCurve(walletRecords);
  }

  const secretsDir = path.resolve(process.cwd(), "secrets");
  const outputPath = path.join(secretsDir, `demo-athlete-wallets-${getTimestampForFile()}.json`);
  fs.mkdirSync(secretsDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(walletRecords, null, 2), "utf8");
  fs.chmodSync(outputPath, 0o600);
  const mode = fs.statSync(outputPath).mode & 0o777;

  console.log(`\nSaved ${walletRecords.length} wallet records to ${outputPath}`);
  if (mode !== 0o600) {
    console.warn(
      `WARNING: File mode is ${mode.toString(8)} (not 600). This can happen on Windows-mounted paths.`
    );
  }
  console.log("IMPORTANT: Keep this file secure and never commit it.");

  console.log("\nSummary");
  console.log("------------------------------------------------------------");
  for (const record of walletRecords) {
    const txInfo = record.registration_tx ? ` | tx: ${record.registration_tx}` : "";
    console.log(`${record.username.padEnd(28)} ${record.address}${txInfo}`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
