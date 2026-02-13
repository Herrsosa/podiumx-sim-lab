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

      // Fetch athlete token data to check if on-chain initialized
      const { data: token } = await supabase
        .from('athlete_tokens')
        .select('monad_address, onchain_initialized')
        .eq('athlete_id', variables.athleteId)
        .single();

      const isOnChainAthlete = token?.onchain_initialized && token?.monad_address;

      // If user has wallet AND athlete is on-chain -> Execute on blockchain
      if (authenticated && embeddedWallet && isOnChainAthlete) {
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
          const cost = await blockchainService.getCostToBuy(token.monad_address, variables.quantity);
          // Add slight buffer for price movement if needed, or send exact
          txHash = await blockchainService.buy(walletClient, token.monad_address, variables.quantity, cost);
        } else {
          const payout = await blockchainService.getPayoutToSell(token.monad_address, variables.quantity);
          // Min payout can be slippage protected
          const minPayout = (payout * 95n) / 100n; // 5% slippage tolerance
          txHash = await blockchainService.sell(walletClient, token.monad_address, variables.quantity, minPayout);
        }

        toast({
          title: 'Transaction Sent',
          description: `Hash: ${txHash}`,
        });

        // Return a mock envelope for now - real reconciliation happens via webhook/indexer later
        // In a real app, we might wait for receipt here or let the UI update optimistically
        return {
          status: 'success',
          tradeId: txHash,
          // ... fake other fields to satisfy type until we unify types
        } as unknown as TradeServerEnvelope;
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
