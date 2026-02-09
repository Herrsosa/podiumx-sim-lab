
import { ethers } from "ethers";
import "dotenv/config";

// Configuration
const targetWallet = "0x0bbc3F8778C538df0F46Ff288E2374e2d26032FC"; // Reconstructed from "0x0bbc…32FC" - wait, I should ask user for full address or try to find it in logs if possible, but user provided truncated.
// Actually, I can use the one from the profile lookup if I trust "POST /agent-connect-wallet succeeded".
// But to be safe, I should look up the profile AGAIN to see what is currently there.

// Let's make this script lookup the profile for "molt_bot" and print it, AND attempt to register it.
// If the user provided a partial, I can't hardcode it easily without the full string.
// "0x0bbc…32FC" isn't a full address.
// However, the user said "POST /agent-connect-wallet succeeded", so the DB should have the updated address.

// I will revert to fetching from DB but with more logging and NO fallback to random profiles.

const BONDING_CURVE_ABI = [
    "function registerAthlete(address athlete, uint256 a, uint256 b, uint256 c) external",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
    "function owner() external view returns (address)"
];

const MONAD_RPC = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
const BONDING_CURVE_ADDRESS = process.env.MONAD_BONDING_CURVE_ADDRESS;

if (!BONDING_CURVE_ADDRESS) {
    throw new Error("MONAD_BONDING_CURVE_ADDRESS not set in environment");
}

const CURVE_A = ethers.parseUnits("0.0002", 18);
const CURVE_B = ethers.parseUnits("0.02", 18);
const CURVE_C = ethers.parseUnits("1", 18);

async function main() {
    const provider = new ethers.JsonRpcProvider(MONAD_RPC);
    const privateKey = process.env.PRIVATE_KEY || process.env.MONAD_PRIVATE_KEY;

    if (!privateKey) throw new Error("No PRIVATE_KEY or MONAD_PRIVATE_KEY found in .env");

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Using Deployer Account:", wallet.address);

    const contract = new ethers.Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, wallet);

    // 1. Verify Owner
    const owner = await contract.owner();
    console.log("Contract Owner:", owner);
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error("WARNING: Deployer is NOT the owner. Registration will fail.");
    }

    // 2. Fetch Target Address from Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

    // Check 'molt_bot' specifically
    const { data: profile } = await supabase
        .from("profiles")
        .select("monad_wallet_address, username, id")
        .eq("username", "molt_bot")
        .single();

    if (!profile) {
        throw new Error("Could not find 'molt_bot' in Supabase.");
    }

    console.log(`Target Profile: ${profile.username}`);
    console.log(`Target Wallet (DB): ${profile.monad_wallet_address}`);

    if (!profile.monad_wallet_address) {
        throw new Error("Profile has no wallet address linked.");
    }

    const targetAddress = profile.monad_wallet_address;

    // 3. Check Registration Status
    const info = await contract.getAthleteInfo(targetAddress);
    const isInitialized = info[4];
    console.log(`On-Chain Status for ${targetAddress}: ${isInitialized ? "REGISTERED" : "NOT REGISTERED"}`);

    if (isInitialized) {
        console.log("Nothing to do.");
        return;
    }

    // 4. Register
    console.log("Broadcasting registration tx...");
    try {
        const tx = await contract.registerAthlete(targetAddress, CURVE_A, CURVE_B, CURVE_C);
        console.log("Tx Hash:", tx.hash);
        console.log("Waiting for confirmations...");
        await tx.wait(1);
        console.log("CONFIRMED! User is now registered.");
    } catch (err: any) {
        console.error("Registration FAILED:", err.message);
        if (err.data) console.error("Revert Data:", err.data);
    }
}

main().catch(console.error);
