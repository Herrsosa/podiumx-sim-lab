const hre = require("hardhat");

async function main() {
    console.log(`Deploying AthlystBondingCurve to ${hre.network.name}...`);

    // Treasury address - this receives protocol fees
    const [deployer] = await hre.ethers.getSigners();
    const treasuryAddress = process.env.MONAD_TREASURY_ADDRESS || deployer.address;

    console.log("Deployer:", deployer.address);
    console.log("Treasury:", treasuryAddress);

    const AthlystBondingCurve = await hre.ethers.getContractFactory("AthlystBondingCurve");
    const curve = await AthlystBondingCurve.deploy(treasuryAddress);

    await curve.waitForDeployment();

    const address = await curve.getAddress();
    console.log("===================================");
    console.log("AthlystBondingCurve deployed to:", address);
    console.log("===================================");
    console.log("");
    console.log("Next steps:");
    console.log("1. Save this address");
    console.log("2. Add to Supabase secrets: supabase secrets set MONAD_BONDING_CURVE_ADDRESS=" + address);
    console.log("3. Register athletes using registerAthlete()");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
