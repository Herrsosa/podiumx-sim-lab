import { useQuery, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/wallet';
import { useUser } from '@/store/auth';
import type { Wallet } from '@/types';
import { useSmartWallet } from './useSmartWallet';
import { createPublicClient, http, formatEther } from 'viem';
import { monad } from '@/lib/chains';
import { ATHLYST_BONDING_CURVE_ABI } from '@/lib/abi/AthlystBondingCurve';
import { supabase } from '@/integrations/supabase/client';

export function useWallet() {
  const user = useUser();
  const queryClient = useQueryClient();
  const { address, authenticated } = useSmartWallet();

  const query = useQuery<Wallet | null>({
    queryKey: ['wallet', user?.id, address], // Include address to re-fetch when it changes
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async () => {
      if (!user?.id) return null;

      // 1. Fetch Off-Chain Wallet (DB)
      const offChainWallet = await walletService.getWallet(user.id);

      // 2. If authenticated with Smart Wallet, fetch On-Chain Balance
      let onChainBalance = 0;
      const onChainPositions: Wallet['positions'] = {};

      if (authenticated && address) {
        try {
          const publicClient = createPublicClient({
            chain: monad,
            transport: http()
          });

          // Get native MON balance
          const balanceWei = await publicClient.getBalance({ address: address as `0x${string}` });
          onChainBalance = Number(formatEther(balanceWei));

          // Fetch user's holdings from on-chain tokens
          // This part is tricky because we need to know WHICH tokens to check.
          // For now, we can rely on our database 'holdings' table or indexer, 
          // but if we want true on-chain read, we'd need a list of token addresses.
          // 
          // STRATEGY: 
          // We will fetch all athletes that are 'on_chain_initialized' from DB,
          // get their contract addresses, and read 'balanceOf' for the user.

          const { data: onChainAthletes } = await supabase
            .from('athlete_tokens')
            .select('athlete_id, monad_address, onchain_initialized, profiles(display_name, username)')
            .eq('onchain_initialized', true)
            .not('monad_address', 'is', null);

          if (onChainAthletes && onChainAthletes.length > 0) {
            // This could be heavy if many athletes. In production, use The Graph or an Indexer.
            // For MVP (few athletes), parallel reads are okay.
            const balancePromises = (onChainAthletes as unknown as { athlete_id: string; monad_address: string; profiles: any }[]).map(async (athlete) => {
              if (!athlete.monad_address) return null;

              // We need to read 'balanceOf(athlete, holder)' from the bonding curve
              // Wait, balanceOf in the bonding curve usually tracks the supply or similar? 
              // Let's check ABI: "function balanceOf(address athlete, address holder) external view returns (uint256)"
              // Yes, the contract tracks balances.

              try {
                const balance = await publicClient.readContract({
                  address: import.meta.env.VITE_MONAD_BONDING_CURVE_ADDRESS as `0x${string}`,
                  abi: ATHLYST_BONDING_CURVE_ABI,
                  functionName: 'balanceOf',
                  args: [athlete.monad_address, address]
                } as any) as unknown as bigint;

                if (balance > 0n) {
                  // We also need current price to calculate value/pnl
                  // For now, let's just get the quantity. 
                  // To do PnL properly on-chain requires event history which is complex without indexer.
                  // We will return basic position info.
                  const qty = Number(balance);
                  const profile = athlete.profiles;
                  const name = profile?.display_name || profile?.username || 'Unknown';

                  return {
                    athleteId: athlete.athlete_id,
                    athleteName: name,
                    quantity: qty,
                    avgCost: 0, // Hard to know without indexer
                    currentPrice: 0, // Would need another call
                    pnl: 0,
                    pnlPercent: 0,
                    isOnChain: true
                  };
                }
              } catch (e) {
                console.error(`Failed to read balance for ${athlete.athlete_id}`, e);
              }
              return null;
            });

            const results = await Promise.all(balancePromises);
            results.forEach(pos => {
              if (pos) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = pos as any;
                onChainPositions[p.athleteId] = p;
              }
            });
          }

        } catch (e) {
          console.error('Error fetching on-chain wallet data', e);
        }
      }

      // Merge Wallets
      // If we have on-chain balance, use it (or add it? usually it replaces the simulate balance for those specific tokens)
      // For MON, we probably want to show the Smart Wallet balance if connected.

      const mergedWallet: Wallet = {
        // Prefer on-chain balance if connected, otherwise DB balance
        mon: (authenticated && address) ? onChainBalance : (offChainWallet?.mon ?? 0),
        positions: {
          ...offChainWallet?.positions,
          ...onChainPositions // On-chain positions override off-chain ones for same athlete
        }
      };

      queryClient.setQueryData(['positions', user.id], mergedWallet.positions);
      return mergedWallet;
    },
  });

  return {
    ...query,
    data: query.data ?? null,
  };
}

export function useWalletPositions() {
  const user = useUser();
  const queryClient = useQueryClient();
  const { data: wallet } = useWallet();

  // Since useWallet already sets the cache, we can just return what we have or rely on useWallet
  return useQuery({
    queryKey: ['positions', user?.id],
    enabled: !!user?.id,
    queryFn: () => wallet?.positions || {}
  });
}
