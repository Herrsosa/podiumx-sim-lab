require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.19",
    networks: {
        monadMainnet: {
            url: process.env.MONAD_MAINNET_RPC_URL || process.env.MONAD_RPC_URL || "https://rpc.monad.xyz",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 143,
        },
        monadTestnet: {
            url: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 10143,
        },
    },
};
