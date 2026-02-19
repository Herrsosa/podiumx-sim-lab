import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { walletService } from '@/services/wallet';
import { blockchainService } from '@/services/blockchain';
import { useAuthStore, useUser } from '@/store/auth';
import { useTradeCelebrationStore } from '@/store/tradeCelebration';
import { logger } from '@/lib/logger';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  applyOptimisticTrade,
  rollbackOptimisticTrade,
  reconcileTradeSuccess,
  type OptimisticTradeContext,
  type TradeServerEnvelope,
} from './optimisticTrade';
import { monad } from '@/lib/chains';
import { createWalletClient, custom } from 'viem';

type TradeParams = {
  athleteId: string;
  athleteSlug?: string;
  quantity: number;
  side: 'BUY' | 'SELL';
  idempotencyKey?: string;
};

const buildHeaders = (idempotencyKey: string | undefined) =>
  idempotencyKey
    ? {
      'X-Idempotency-Key': idempotencyKey,
    }
    : undefined;

const BPS_DENOMINATOR = 10_000n;
const FEE_BPS = 300n;
const BUY_BUFFER_BPS = 500n;

export function useTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useUser();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();

  return useMutation<TradeServerEnvelope, Error, TradeParams, OptimisticTradeContext>({
    mutationFn: async (variables) => {
      // 1. Check for Privy Wallet (On-Chain)
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

      // Fetch athlete token + profile wallet so we can trust the current profile wallet
      // even if athlete_tokens.monad_wallet_address is stale.
      const { data: token } = await supabase
        .from('athlete_tokens')
        .select('monad_wallet_address, onchain_initialized, profiles!athlete_tokens_athlete_id_profiles_id_fk(monad_wallet_address)')
        .eq('athlete_id', variables.athleteId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenData = token as any;
      const tokenWallet = tokenData?.monad_wallet_address as string | undefined;
      // Supabase relation shape can vary; normalize defensively.
      const profileWalletRaw = Array.isArray(tokenData?.profiles)
        ? tokenData?.profiles?.[0]?.monad_wallet_address
        : tokenData?.profiles?.monad_wallet_address;
      const profileWallet = profileWalletRaw as string | undefined;
      const athleteWallet = profileWallet || tokenWallet;
      const isOnChainAthlete = tokenData?.onchain_initialized && Boolean(athleteWallet);

      let verifiedOnChain = false;
      if (isOnChainAthlete) {
        const walletsToTry = [athleteWallet, tokenWallet].filter(
          (value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index
        );

        for (const wallet of walletsToTry) {
          // Verify against contract state to avoid "Athlete not initialized" reverts.
          const info = await blockchainService.getAthleteInfo(wallet);
          if (info && Array.isArray(info) && info[4] === true) {
            verifiedOnChain = true;
            break;
          }
        }

        if (!verifiedOnChain) {
          console.error('State mismatch: athlete marked on-chain but no tested wallet is initialized', {
            athleteId: variables.athleteId,
            athleteSlug: variables.athleteSlug,
            profileWallet,
            tokenWallet,
          });
          throw new Error(`Athlete ${variables.athleteSlug} is not initialized on the blockchain contract. Contact support.`);
        }
      }

      // If user has wallet AND verified on-chain -> Execute on blockchain
      if (authenticated && embeddedWallet && verifiedOnChain) {
        logger.info('Executing ON-CHAIN trade', variables);

        // Switch chain if needed (though embedded usually handles this)
        await embeddedWallet.switchChain(monad.id);

        const provider = await embeddedWallet.getEthereumProvider();
        const walletClient = createWalletClient({
          account: embeddedWallet.address as `0x${string}`,
          chain: monad,
          transport: custom(provider)
        });

        // Get cost/payout estimation
        let txHash;
        if (variables.side === 'BUY') {
          const grossCost = await blockchainService.getCostToBuy(athleteWallet!, variables.quantity);
          const fee = (grossCost * FEE_BPS) / BPS_DENOMINATOR;
          const totalWithFee = grossCost + fee;
          // Match server-side approach: include fee plus extra buffer for mempool supply movement.
          const valueWithBuffer = (totalWithFee * (BPS_DENOMINATOR + BUY_BUFFER_BPS)) / BPS_DENOMINATOR;
          txHash = await blockchainService.buy(walletClient, athleteWallet!, variables.quantity, valueWithBuffer);
        } else {
          const payout = await blockchainService.getPayoutToSell(athleteWallet!, variables.quantity);
          // Min payout can be slippage protected
          const minPayout = (payout * 95n) / 100n; // 5% slippage tolerance
          txHash = await blockchainService.sell(walletClient, athleteWallet!, variables.quantity, minPayout);
        }

        toast({
          title: 'Transaction Sent',
          description: `Hash: ${txHash}`,
        });

        // Wait for inclusion, then index the on-chain trade into DB read models.
        await blockchainService.waitForTransactionReceipt(txHash as `0x${string}`);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const { data: confirmData, error: confirmError } = await supabase.functions.invoke('confirm-onchain-trade', {
          body: {
            tx_hash: txHash,
            athlete_id: variables.athleteId,
            side: variables.side.toLowerCase(),
            quantity: variables.quantity,
          },
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });

        if (confirmError) {
          throw new Error(`On-chain trade confirmed but indexing failed: ${confirmError.message}`);
        }

        return {
          tradeId: confirmData?.tradeId ?? txHash,
          serverTime: confirmData?.serverTime ?? new Date().toISOString(),
        } as TradeServerEnvelope;
      }

      // 2. Fallback to Off-Chain (Database) Trade
      // Use refreshSession to ensure we have a valid, non-expired token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.refreshSession();

      if (sessionError || !session) {
        throw new Error('Session expired. Please sign in again to trade.');
      }

      await walletService.ensureWallet(session.user.id);

      logger.info('Executing OFF-CHAIN trade', variables);

      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: {
          athleteId: variables.athleteId,
          quantity: variables.quantity,
          side: variables.side,
        },
        headers: buildHeaders(variables.idempotencyKey),
      });

      if (error) {
        // ... (existing error handling)
        console.error('🔴 RAW EDGE FUNCTION ERROR:', error);
        const message = error.message || 'Trade execution failed';
        // ...
        throw new Error(message);
      }

      return data as TradeServerEnvelope;
    },
    // ... (rest of onMutate, onError, onSuccess)
    onMutate: async (variables) => {
      // ... existing optimistic logic
      // We can potentially skip optimistic updates for on-chain trades if we want to rely on chain state
      // For now, keep it for perceived performance
      if (!user) {
        throw new Error('Not authenticated. Please sign in to trade.');
      }

      const makeId = () => {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
          return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      };

      const idempotencyKey = variables.idempotencyKey ?? makeId();
      variables.idempotencyKey = idempotencyKey;

      const context = applyOptimisticTrade({
        queryClient,
        athleteId: variables.athleteId,
        athleteSlug: variables.athleteSlug,
        userId: user.id,
        quantity: variables.quantity,
        side: variables.side,
        idempotencyKey,
      });

      return context;
    },
    onError: (error, variables, context) => {
      if (context) {
        rollbackOptimisticTrade(queryClient, context);
      }
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Trade Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    },
    onSuccess: (payload, variables, context) => {
      // ... existing success logic
      if (context && payload) {
        reconcileTradeSuccess(queryClient, context, payload);
      }

      const { showCelebration } = useTradeCelebrationStore.getState();
      showCelebration({
        side: variables.side,
        quantity: variables.quantity,
        // Fill details might be missing for on-chain immediate return
        fillPrice: 0,
        totalCost: 0,
        athleteName: variables.athleteSlug || 'Athlete',
      });

      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['wallet', user.id] });
        queryClient.invalidateQueries({ queryKey: ['positions', user.id] });
        queryClient.invalidateQueries({ queryKey: ['user-trades', user.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['trades', variables.athleteId] });
      queryClient.invalidateQueries({ queryKey: ['athlete-price', { athleteId: variables.athleteId }] });
      queryClient.invalidateQueries({ queryKey: ['athlete-holder-counts'] });
      queryClient.invalidateQueries({ queryKey: ['athletes-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['market-overview'] });
    }
  });
}

// ... useFaucet and initWallet remain unchanged
export function useFaucet() {
  const { toast } = useToast();
  const user = useUser();
  const refreshWallet = useAuthStore((state) => state.refreshWallet);

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Not authenticated');

      await walletService.addFunds(user.id, amount);
      return { amount };
    },
    onSuccess: async (result) => {
      const amount = result?.amount ?? 0;
      await refreshWallet(user?.id);
      toast({
        title: 'Funds Added',
        description: `${amount} test MON added`,
      });
    },
  });
}

export async function initWallet(userId: string) {
  if (!userId) return;
  await walletService.ensureWallet(userId);
}
