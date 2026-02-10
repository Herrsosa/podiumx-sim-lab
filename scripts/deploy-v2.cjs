const hre = require("hardhat");

async function main() {
    console.log(`Deploying AthlystBondingCurveV2 to ${hre.network.name}...`);

    // Treasury address - this receives protocol fees
    const [deployer] = await hre.ethers.getSigners();
    // Use env var or default to deployer
    const treasuryAddress = process.env.MONAD_TREASURY_ADDRESS || deployer.address;

    console.log("Deployer:", deployer.address);
    console.log("Treasury:", treasuryAddress);

    const AthlystBondingCurveV2 = await hre.ethers.getContractFactory("AthlystBondingCurveV2");

    // Deploy with treasury address in constructor
    const curve = await AthlystBondingCurveV2.deploy(treasuryAddress);

    await curve.waitForDeployment();

    const address = await curve.getAddress();
    console.log("===================================");
    console.log("AthlystBondingCurveV2 deployed to:", address);
    console.log("===================================");
    console.log("");
    console.log("Next steps:");
    console.log("1. Save this address");
    console.log("2. Update .env and Supabase secrets with MONAD_BONDING_CURVE_ADDRESS=" + address);
    console.log("3. Run registration script: npx tsx scripts/register-athletes.ts");
    console.log("4. Run seed tokens script: npx tsx scripts/seed-tokens.mjs");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
