require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://rpc.monad.xyz";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        monad: {
            url: MONAD_RPC_URL,
            chainId: 143, // Monad Mainnet
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
    },
    paths: {
        artifacts: "./artifacts",
        cache: "./cache",
        sources: "./contracts",
        tests: "./test",
    },
};
