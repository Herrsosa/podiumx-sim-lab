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
  const { address, authenticated, connect } = useSmartWallet();

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
            .select('athlete_id, monad_wallet_address, profiles!athlete_tokens_athlete_id_profiles_id_fk(display_name, username, monad_wallet_address)');

          if (onChainAthletes && onChainAthletes.length > 0) {
            // This could be heavy if many athletes. In production, use The Graph or an Indexer.
            // For MVP (few athletes), parallel reads are okay.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const balancePromises = (
              onChainAthletes as unknown as {
                athlete_id: string;
                monad_wallet_address: string | null;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                profiles: any;
              }[]
            ).map(async (athlete) => {
              const profile = Array.isArray(athlete.profiles) ? athlete.profiles[0] : athlete.profiles;
              const athleteWallet = profile?.monad_wallet_address || athlete.monad_wallet_address;
              if (!athleteWallet) return null;

              // We need to read 'balanceOf(athlete, holder)' from the bonding curve
              // Wait, balanceOf in the bonding curve usually tracks the supply or similar?
              // Let's check ABI: "function balanceOf(address athlete, address holder) external view returns (uint256)"
              // Yes, the contract tracks balances.

              try {
                const balance = await publicClient.readContract({
                  address: import.meta.env.VITE_MONAD_BONDING_CURVE_ADDRESS as `0x${string}`,
                  abi: ATHLYST_BONDING_CURVE_ABI,
                  functionName: 'balanceOf',
                  args: [athleteWallet, address]
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any) as unknown as bigint;

                if (balance > 0n) {
                  // We also need current price to calculate value/pnl
                  // For now, let's just get the quantity.
                  // To do PnL properly on-chain requires event history which is complex without indexer.
                  // We will return basic position info.
                  const qty = Number(balance);
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

      // Merge positions: prefer off-chain avgCost/price when on-chain has placeholder 0s
      const mergedPositions: Wallet['positions'] = { ...offChainWallet?.positions };
      for (const [athleteId, onChainPos] of Object.entries(onChainPositions)) {
        const offChainPos = mergedPositions[athleteId];
        if (offChainPos) {
          // On-chain quantity is authoritative, but keep off-chain financial data
          // when on-chain returns placeholder 0s (no indexer available)
          mergedPositions[athleteId] = {
            ...offChainPos,
            quantity: onChainPos.quantity > 0 ? onChainPos.quantity : offChainPos.quantity,
            avgCost: onChainPos.avgCost > 0 ? onChainPos.avgCost : offChainPos.avgCost,
            currentPrice: onChainPos.currentPrice > 0 ? onChainPos.currentPrice : offChainPos.currentPrice,
            pnl: onChainPos.pnl !== 0 ? onChainPos.pnl : offChainPos.pnl,
            pnlPercent: onChainPos.pnlPercent !== 0 ? onChainPos.pnlPercent : offChainPos.pnlPercent,
          };
        } else {
          mergedPositions[athleteId] = onChainPos;
        }
      }

      const mergedWallet: Wallet = {
        mon: (authenticated && address) ? onChainBalance : (offChainWallet?.mon ?? 0),
        positions: mergedPositions,
      };

      queryClient.setQueryData(['positions', user.id], mergedWallet.positions);
      return mergedWallet;
    },
  });

  return {
    ...query,
    data: query.data ?? null,
    isAuthenticated: authenticated,
    connect,
    address,
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
