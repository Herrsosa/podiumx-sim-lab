
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import * as fs from 'fs';

const BONDING_CURVE_ABI = [
    "function buy(address athlete, uint256 qty) external payable",
    "function registerAthlete(address athlete, uint256 a, uint256 b, uint256 c) external",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
    "function costToBuy(address athlete, uint256 qty) external view returns (uint256)"
];

const MONAD_RPC = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
const BONDING_CURVE_ADDRESS = process.env.MONAD_BONDING_CURVE_ADDRESS;

if (!BONDING_CURVE_ADDRESS) {
    throw new Error("MONAD_BONDING_CURVE_ADDRESS not set in environment");
}

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync('debug_log.txt', msg + '\n');
}

async function main() {
    fs.writeFileSync('debug_log.txt', ''); // Clear file
    log("--- DEBUGGING TRADE REVERT ---");

    // 1. Get Profile Address from DB
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile } = await supabase.from("profiles").select("username, monad_wallet_address").eq("username", "molt_bot").single();

    if (!profile) {
        log("ERROR: molt_bot profile not found in DB");
        return;
    }

    log(`DB Profile: ${profile.username}`);
    log(`DB Wallet:  ${profile.monad_wallet_address}`);

    const athleteAddress = profile.monad_wallet_address;
    if (!athleteAddress) {
        log("ERROR: No wallet address in DB");
        return;
    }

    // 2. Check On-Chain Status
    const provider = new ethers.JsonRpcProvider(MONAD_RPC);
    const contract = new ethers.Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, provider);

    log(`Checking contract: ${BONDING_CURVE_ADDRESS}`);
    const info = await contract.getAthleteInfo(athleteAddress);
    log(`On-Chain Info: supply=${info.supply.toString()} initialized=${info.initialized}`);

    if (!info.initialized) {
        log("❌ CRITICAL: Athlete NOT registered on-chain!");

        // Attempt immediate registration if we have the key
        const privateKey = process.env.PRIVATE_KEY;
        if (privateKey) {
            log("Attempting to FIX registration now...");
            const wallet = new ethers.Wallet(privateKey, provider);
            const signer = contract.connect(wallet);

            const a = ethers.parseUnits("0.0002", 18);
            const b = ethers.parseUnits("0.02", 18);
            const c = ethers.parseUnits("1", 18);

            try {
                // @ts-ignore
                const tx = await signer.registerAthlete(athleteAddress, a, b, c);
                log(`Fix TX Sent: ${tx.hash}`);
                await tx.wait();
                log("✅ Fix Confirmed!");
            } catch (e: any) {
                log(`Fix Failed: ${e.message}`);
            }
        } else {
            log("Cannot fix: No PRIVATE_KEY in env");
        }
    } else {
        log("✅ Athlete IS registered.");

        // 3. Simulate Buy
        log("Simulating Buy transaction...");
        const quantity = 1;

        try {
            const cost = await contract.costToBuy(athleteAddress, quantity);
            const fee = cost * 300n / 10000n;
            const total = cost + fee; // Matches contract logic

            log(`Cost to buy 1: ${ethers.formatEther(total)} MON`);

            // Use callStatic to simulate
            // We need a signer to simulate? No, provider can call, but 'buy' is state changing so we use call()

            const txData = await contract.buy.populateTransaction(athleteAddress, quantity, { value: total });
            delete txData.from; // Let provider simulate without sig? Or use random address

            // Raw eth_call simulation
            await provider.call({
                to: BONDING_CURVE_ADDRESS,
                data: txData.data,
                value: total,
                from: "0x0000000000000000000000000000000000000001" // dummy sender
            });
            log("✅ Simulation SUCCESS (No revert)");
        } catch (e: any) {
            log(`❌ Simulation FAILED: ${e.message}`);
            if (e.data) log(`Revert Data: ${e.data}`);
            if (e.info) log(`Revert Info: ${e.info}`);
        }
    }
}

main().catch(console.error);
