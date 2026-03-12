import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { walletService } from '@/services/wallet';
import { useAuthStore, useUser } from '@/store/auth';
import { useTradeCelebrationStore } from '@/store/tradeCelebration';
import { logger } from '@/lib/logger';
import {
  applyOptimisticTrade,
  rollbackOptimisticTrade,
  reconcileTradeSuccess,
  type OptimisticTradeContext,
  type TradeServerEnvelope,
} from './optimisticTrade';

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

  return useMutation<TradeServerEnvelope, Error, TradeParams, OptimisticTradeContext>({
    mutationFn: async (variables) => {
      // Off-Chain (Database) Trade via Edge Function
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
        description: `${amount} test SOL added`,
      });
    },
  });
}

export async function initWallet(userId: string) {
  if (!userId) return;
  await walletService.ensureWallet(userId);
}
