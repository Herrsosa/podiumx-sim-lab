const hre = require("hardhat");

async function main() {
    console.log("Deploying AthlystLogger...");

    const AthlystLogger = await hre.ethers.getContractFactory("AthlystLogger");
    const logger = await AthlystLogger.deploy();

    await logger.waitForDeployment();

    const address = await logger.getAddress();
    console.log(`AthlystLogger deployed to: ${address}`);

    // Important: Save this address for the backend to use
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
