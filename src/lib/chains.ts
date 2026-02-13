const monadRpc = import.meta.env.VITE_MONAD_RPC_URL || 'https://rpc.monad.xyz';
const monadTestnetRpc = import.meta.env.VITE_MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz';
const baseRpc = import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org';

export const monad = {
    id: 143,
    name: 'Monad',
    network: 'monad',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [monadRpc],
        },
        public: {
            http: [monadRpc],
        },
    },
    testnet: false,
} as const;

export const monadTestnet = {
    id: 20143, // Common Devnet ID, adjust if needed
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'DMON',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [monadTestnetRpc],
        },
        public: {
            http: [monadTestnetRpc],
        },
    },
    testnet: true,
} as const;

export const base = {
    id: 8453,
    name: 'Base',
    network: 'base',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [baseRpc],
        },
        public: {
            http: [baseRpc],
        },
    },
    testnet: false,
} as const;

export const baseSepolia = {
    id: 84532,
    name: 'Base Sepolia',
    network: 'base-sepolia',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://sepolia.base.org'],
        },
        public: {
            http: ['https://sepolia.base.org'],
        },
    },
    testnet: true,
} as const;

// Currently using Monad Mainnet, with Testnet, Base, and Base Sepolia available
import { mainnet } from 'viem/chains';
export const supportedChains = [monad, monadTestnet, base, baseSepolia, mainnet];
