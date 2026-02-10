/**
 * seed-tokens.mjs — Fixed version
 * Buys 1 token of each zero-supply athlete on the bonding curve.
 */
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

const CONTRACT = "0x946a333dB43BEFb080c2D9FA9d816F96437bC07B";
const SUPABASE_URL = "https://ssnehmposgsczoadycms.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzbmVobXBvc2dzY3pvYWR5Y21zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgxNjk2OCwiZXhwIjoyMDc0MzkyOTY4fQ.FD0mQXKlbwsZYBdX9_kL8_7-iE4oIliWRgc1RO99ptA";

const ABI = [
    "function buy(address athlete, uint256 qty) external payable",
    "function costToBuy(address athlete, uint256 qty) public view returns (uint256)",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
];

async function main() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) { console.error("Set PRIVATE_KEY env var"); process.exit(1); }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: tokens } = await supabase
        .from("athlete_tokens")
        .select("athlete_id, supply, monad_wallet_address")
        .eq("supply", 0);

    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, monad_wallet_address")
        .in("id", tokens.map((t) => t.athlete_id));

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const targets = tokens
        .map((t) => {
            const p = profileMap.get(t.athlete_id);
            return { athleteId: t.athlete_id, username: p?.username || "?", wallet: p?.monad_wallet_address || t.monad_wallet_address };
        })
        .filter((t) => {
            if (!t.wallet) return false;
            if (t.wallet === "0x1111111111111111111111111111111111111111") return false;
            if (t.wallet === "0x1234567890abcdef1234567890abcdef12345678") return false;
            return true;
        });

    console.log(`Found ${targets.length} athletes to seed:\n`);
    targets.forEach((t) => console.log(`  ${t.username} -> ${t.wallet}`));
    console.log();

    const provider = new ethers.JsonRpcProvider("https://rpc.monad.xyz");
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT, ABI, wallet);

    console.log(`Buyer wallet: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Buyer balance: ${ethers.formatEther(balance)} MON\n`);

    const results = [];

    for (const target of targets) {
        try {
            const info = await contract.getAthleteInfo(target.wallet);
            const initialized = info[4];
            const currentSupply = Number(info[0]);

            if (!initialized) {
                console.log(`SKIP ${target.username} - NOT initialized on-chain`);
                results.push({ username: target.username, status: "skipped", reason: "not initialized" });
                continue;
            }

            if (currentSupply > 0) {
                console.log(`SKIP ${target.username} - already has supply=${currentSupply}`);
                results.push({ username: target.username, status: "skipped", reason: "already has supply" });
                continue;
            }

            const cost = await contract.costToBuy(target.wallet, 1);
            const fee = (cost * 300n) / 10000n;
            const totalCost = cost + fee;
            console.log(`BUY  ${target.username} - cost: ${ethers.formatEther(totalCost)} MON (incl 3% fee)`);

            // Estimate gas first
            const gasEstimate = await contract.buy.estimateGas(target.wallet, 1, { value: totalCost });

            const tx = await contract.buy(target.wallet, 1, { value: totalCost, gasLimit: gasEstimate * 120n / 100n });
            console.log(`  TX: ${tx.hash}`);

            const receipt = await tx.wait();
            if (receipt.status === 1) {
                console.log(`  OK  block=${receipt.blockNumber}`);
                results.push({ username: target.username, status: "bought", txHash: tx.hash });
            } else {
                console.log(`  FAIL  status=0`);
                results.push({ username: target.username, status: "error", error: "receipt status 0" });
            }
        } catch (err) {
            console.log(`  ERR ${target.username}: ${err.shortMessage || err.message}`);
            results.push({ username: target.username, status: "error", error: err.shortMessage || err.message });
        }
    }

    console.log("\n=== SUMMARY ===");
    const bought = results.filter(r => r.status === "bought");
    const skipped = results.filter(r => r.status === "skipped");
    const errors = results.filter(r => r.status === "error");
    console.log(`Bought: ${bought.length}, Skipped: ${skipped.length}, Errors: ${errors.length}`);
    bought.forEach(r => console.log(`  OK ${r.username}: ${r.txHash}`));
    errors.forEach(r => console.log(`  ERR ${r.username}: ${r.error}`));
}

main().catch(console.error);
