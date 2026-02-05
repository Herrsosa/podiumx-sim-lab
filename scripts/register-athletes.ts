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

// Monad Testnet config
const MONAD_RPC = "https://testnet-rpc.monad.xyz";
const BONDING_CURVE_ADDRESS = process.env.MONAD_BONDING_CURVE_ADDRESS || "0x9066E90d9d5DEBC9c75FFBA729feCC162Ea2601F";

// Curve params (matching off-chain: a=0.0002, b=0.02, c=0.001 MON)
const CURVE_A = ethers.parseUnits("0.0002", 18); // 2e14
const CURVE_B = ethers.parseUnits("0.02", 18);   // 2e16  
const CURVE_C = ethers.parseUnits("0.001", 18);  // 1e15 (base price in MON)

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

    // Get athletes to register - join with profiles to get name
    // athlete_tokens uses athlete_id as PK, not id
    const { data: athletes, error } = await supabase
        .from("athlete_tokens")
        .select("athlete_id, symbol, supply")
        .order("supply", { ascending: false })
        .limit(5);

    if (error) {
        throw new Error(`Failed to fetch athletes: ${error.message}`);
    }

    console.log(`\nFound ${athletes?.length || 0} athletes to register`);

    for (const athlete of athletes || []) {
        console.log(`\n--- ${athlete.symbol} (${athlete.athlete_id}) ---`);

        // Generate deterministic wallet address from athlete ID
        // This creates a unique address for each athlete
        const athleteWallet = ethers.keccak256(ethers.toUtf8Bytes(athlete.athlete_id)).slice(0, 42);
        console.log("Generated wallet:", athleteWallet);

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

            // Update Supabase with the wallet address
            const { error: updateError } = await supabase
                .from("athlete_tokens")
                .update({ monad_wallet_address: athleteWallet })
                .eq("athlete_id", athlete.athlete_id);

            if (updateError) {
                console.error("Failed to update Supabase:", updateError.message);
            } else {
                console.log("Updated Supabase with wallet address");
            }

        } catch (txError) {
            console.error("TX failed:", txError);
        }
    }

    console.log("\n✅ Done!");
}

main().catch(console.error);
