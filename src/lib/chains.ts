const monadRpc = import.meta.env.VITE_MONAD_RPC_URL || 'https://rpc.monad.xyz';
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

// Currently using Monad, easy switch to Base later
export const supportedChains = [monad, base, baseSepolia];
