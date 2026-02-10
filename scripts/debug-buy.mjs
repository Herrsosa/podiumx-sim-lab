import { ethers } from "ethers";

const CONTRACT = "0xA87F1E8EE6bC24D628f9C5d03e8736e5bF32c809";
const ABI = [
    "function buy(address athlete, uint256 qty) external payable",
    "function costToBuy(address athlete, uint256 qty) public view returns (uint256)",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
    "function paused() public view returns (bool)",
    "function owner() external view returns (address)",
];

const provider = new ethers.JsonRpcProvider("https://rpc.monad.xyz");
const contract = new ethers.Contract(CONTRACT, ABI, provider);

const TEST_WALLET = "0x9fb5b32314ea7ea0211830263ec6d753f5c3aa7e"; // hairoxsage

async function main() {
    const paused = await contract.paused();
    console.log("CONTRACT PAUSED:", paused);

    const owner = await contract.owner();
    console.log("CONTRACT OWNER:", owner);

    const info = await contract.getAthleteInfo(TEST_WALLET);
    console.log("SUPPLY:", info[0].toString());
    console.log("CURRENT_PRICE_WEI:", info[1].toString());
    console.log("CURRENT_PRICE_MON:", ethers.formatEther(info[1]));
    console.log("TREASURY:", ethers.formatEther(info[2]));
    console.log("EARNINGS:", ethers.formatEther(info[3]));
    console.log("INITIALIZED:", info[4]);

    const cost = await contract.costToBuy(TEST_WALLET, 1);
    console.log("COST_TO_BUY_1_WEI:", cost.toString());
    console.log("COST_TO_BUY_1_MON:", ethers.formatEther(cost));

    // Calculate total cost including 3% fee
    const fee = (cost * 300n) / 10000n;
    const total = cost + fee;
    console.log("TOTAL_WITH_FEE_MON:", ethers.formatEther(total));

    // Try to estimate gas for a buy
    const buyerKey = process.env.PRIVATE_KEY;
    if (buyerKey) {
        const wallet = new ethers.Wallet(buyerKey, provider);
        console.log("\nBUYER:", wallet.address);
        const balance = await provider.getBalance(wallet.address);
        console.log("BALANCE:", ethers.formatEther(balance), "MON");

        try {
            const gasEstimate = await contract.buy.estimateGas(TEST_WALLET, 1, { value: total, from: wallet.address });
            console.log("GAS_ESTIMATE:", gasEstimate.toString());
        } catch (e) {
            console.log("GAS_ESTIMATE_ERROR:", e.message?.substring(0, 200));
        }
    }
}

main().catch(console.error);
