import { createPublicClient, http, WalletClient } from 'viem';
import { monad } from '@/lib/chains';
import { ATHLYST_BONDING_CURVE_ABI } from '@/lib/abi/AthlystBondingCurve';

const CONTRACT_ADDRESS = import.meta.env.VITE_MONAD_BONDING_CURVE_ADDRESS as `0x${string}`;

export class BlockchainService {
    private publicClient;

    constructor() {
        this.publicClient = createPublicClient({
            chain: monad,
            transport: http()
        });
    }

    async getAthleteInfo(athleteAddress: string) {
        try {
            const result = await this.publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: ATHLYST_BONDING_CURVE_ABI,
                functionName: 'getAthleteInfo',
                args: [athleteAddress]
            });
            return result;
        } catch (error) {
            console.error('Error fetching athlete info:', error);
            return null;
        }
    }

    async buy(walletClient: WalletClient, athleteAddress: string, quantity: number, maxCost: bigint) {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: ATHLYST_BONDING_CURVE_ABI,
            functionName: 'buy',
            args: [athleteAddress, BigInt(quantity)],
            value: maxCost, // Send exact amount calculated + buffer if needed
            chain: monad,
            account: walletClient.account
        });
        return hash;
    }

    async sell(walletClient: WalletClient, athleteAddress: string, quantity: number, minPayout: bigint) {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: ATHLYST_BONDING_CURVE_ABI,
            functionName: 'sell',
            args: [athleteAddress, BigInt(quantity), minPayout],
            chain: monad,
            account: walletClient.account
        });
        return hash;
    }

    async getCostToBuy(athleteAddress: string, quantity: number): Promise<bigint> {
        return await this.publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: ATHLYST_BONDING_CURVE_ABI,
            functionName: 'costToBuy',
            args: [athleteAddress, BigInt(quantity)]
        }) as bigint;
    }

    async getPayoutToSell(athleteAddress: string, quantity: number): Promise<bigint> {
        return await this.publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: ATHLYST_BONDING_CURVE_ABI,
            functionName: 'payoutToSell',
            args: [athleteAddress, BigInt(quantity)]
        }) as bigint;
    }
}

export const blockchainService = new BlockchainService();
