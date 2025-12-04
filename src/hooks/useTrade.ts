import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { walletService } from '@/services/wallet';
import { useAuthStore, useUser } from '@/store/auth';
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
      // Use refreshSession to ensure we have a valid, non-expired token
      // getSession can return stale cached sessions that fail with 401
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.refreshSession();

      if (sessionError || !session) {
        throw new Error('Session expired. Please sign in again to trade.');
      }

      await walletService.ensureWallet(session.user.id);

      logger.info('Executing trade', variables);

      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: {
          athleteId: variables.athleteId,
          quantity: variables.quantity,
          side: variables.side,
        },
        headers: buildHeaders(variables.idempotencyKey),
      });

      if (error) {
        logger.error('Trade error', error.message ?? error, variables);
        throw new Error(error.message || 'Trade execution failed');
      }

      return data as TradeServerEnvelope;
    },
    onMutate: async (variables) => {
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

      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your trade';

      let title = 'Trade Failed';
      if (errorMessage.includes('Insufficient USDC')) {
        title = 'Insufficient Balance';
      } else if (errorMessage.includes('Insufficient token')) {
        title = 'Insufficient Tokens';
      } else if (errorMessage.includes('Authentication')) {
        title = 'Authentication Error';
      } else if (errorMessage.includes('Quantity must be')) {
        title = 'Invalid Quantity';
      } else if (errorMessage.includes('Athlete not found')) {
        title = 'Athlete Not Found';
      }

      toast({
        title,
        description: errorMessage,
        variant: 'destructive',
      });
    },
    onSuccess: (payload, variables, context) => {
      logger.info('Trade successful', { ...variables, tradeId: payload?.tradeId });

      if (context && payload) {
        reconcileTradeSuccess(queryClient, context, payload);
      }

      const fillPrice = payload?.athletePrice?.price ?? payload?.priceTick?.price ?? 0;
      toast({
        title: `${variables.side === 'BUY' ? 'Bought' : 'Sold'}!`,
        description: `Filled ${variables.quantity} @ $${fillPrice.toFixed(2)}`,
      });
    },
  });
}

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
        description: `$${amount} test USDC added`,
      });
    },
  });
}

export async function initWallet(userId: string) {
  if (!userId) return;
  await walletService.ensureWallet(userId);
}
