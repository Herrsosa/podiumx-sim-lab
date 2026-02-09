
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

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
    console.log("Connecting to Monad RPC...");
    const provider = new ethers.JsonRpcProvider(MONAD_RPC);
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) throw new Error("No PRIVATE_KEY");

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Deployer:", wallet.address);

    const contract = new ethers.Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, wallet);

    // Supabase
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

    // Find molt_bot
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("monad_wallet_address, username")
        .eq("username", "molt_bot") // Try explicit username
        .single();

    if (error || !profile) {
        console.error("Could not find molt_bot profile:", error);
        // Fallback: try finding ANY profile with wallet
        console.log("Fallback: searching for any agent with wallet...");
        const { data: anyProfile } = await supabase
            .from("profiles")
            .select("monad_wallet_address, username")
            .not("monad_wallet_address", "is", null)
            .limit(1)
            .single();
        if (anyProfile) {
            console.log("Found alt profile:", anyProfile.username);
            await register(contract, anyProfile.monad_wallet_address);
        }
        return;
    }

    console.log(`Found target: ${profile.username} (${profile.monad_wallet_address})`);
    await register(contract, profile.monad_wallet_address);
}

async function register(contract: any, walletAddress: any) {
    if (!walletAddress) {
        console.log("No wallet address");
        return;
    }

    // Check status
    try {
        const info = await contract.getAthleteInfo(walletAddress);
        if (info[4]) {
            console.log("Already registered on-chain!");
            return;
        }
    } catch (e) {
        console.log("Not registered yet...");
    }

    console.log("Sending registration tx...");
    const tx = await contract.registerAthlete(walletAddress, CURVE_A, CURVE_B, CURVE_C);
    console.log("Tx sent:", tx.hash);
    await tx.wait();
    console.log("Confirmed!");
}

main().catch(console.error);
