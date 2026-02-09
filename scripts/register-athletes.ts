/**
 * Script to register athletes on the AthlystBondingCurve contract
 * 
 * Usage: npx tsx scripts/register-athletes.ts
 */

import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Contract ABI (just the functions we need)
const BONDING_CURVE_ABI = [
    "function registerAthlete(address athlete, uint256 a, uint256 b, uint256 c) external",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
    "function owner() external view returns (address)"
];

// Monad network config (set these in your environment)
const MONAD_RPC = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
const BONDING_CURVE_ADDRESS = process.env.MONAD_BONDING_CURVE_ADDRESS;

if (!BONDING_CURVE_ADDRESS) {
    throw new Error("MONAD_BONDING_CURVE_ADDRESS not set in environment");
}

// Curve params (matching off-chain: a=0.0002, b=0.02, c=1 MON)
const CURVE_A = ethers.parseUnits("0.0002", 18); // 2e14
const CURVE_B = ethers.parseUnits("0.02", 18);   // 2e16  
const CURVE_C = ethers.parseUnits("1", 18);      // 1e18 (base price in MON)

async function main() {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(MONAD_RPC);
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY not set in environment");
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Deployer wallet:", wallet.address);

    // Connect to contract
    const contract = new ethers.Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, wallet);

    // Verify we're the owner
    const owner = await contract.owner();
    console.log("Contract owner:", owner);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error("Wallet is not the contract owner");
    }

    // Setup Supabase - use VITE_ prefixed vars from .env
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY required in .env");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get ALL profiles that have a wallet address
    // This ensures any agent/athlete that has connected a wallet is tradeable
    const { data: athletes, error } = await supabase
        .from("profiles")
        .select(`
            id, 
            username, 
            monad_wallet_address
        `)
        .not("monad_wallet_address", "is", null);

    if (error) {
        throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    console.log(`\nFound ${athletes?.length || 0} profiles with wallets to register`);

    for (const profile of athletes || []) {
        console.log(`\n--- ${profile.username} ---`);

        const athleteWallet = profile.monad_wallet_address;


        if (!athleteWallet) {
            console.log("No wallet address in profile, skipping (connect wallet first)");
            continue;
        }

        console.log("Wallet:", athleteWallet);

        // Check if already registered
        try {
            const info = await contract.getAthleteInfo(athleteWallet);
            if (info[4]) { // initialized is 5th return value
                console.log("Already registered, skipping");
                continue;
            }
        } catch (e) {
            // Not registered, continue
        }

        // Register athlete
        console.log("Registering with params:", {
            a: CURVE_A.toString(),
            b: CURVE_B.toString(),
            c: CURVE_C.toString()
        });

        try {
            const tx = await contract.registerAthlete(athleteWallet, CURVE_A, CURVE_B, CURVE_C);
            console.log("TX hash:", tx.hash);

            const receipt = await tx.wait();
            console.log("Confirmed in block:", receipt.blockNumber);
            console.log("✅ Successfully registered on-chain");

        } catch (txError) {
            console.error("TX failed:", txError);
        }
    }

    console.log("\n✅ Done!");
}

main().catch(console.error);
