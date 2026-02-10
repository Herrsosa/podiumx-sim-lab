/* eslint-disable @typescript-eslint/no-explicit-any */
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
        console.error('🔴 RAW EDGE FUNCTION ERROR:', error);

        let message = error.message || 'Trade execution failed';
        let detailedError = '';

        try {
          if ('context' in error && (error as any).context instanceof Response) {
            const response = (error as any).context as Response;
            const body = await response.clone().json();
            console.error('🔴 PARSED BODY:', body);

            if (body?.error) {
              message = body.error;
              detailedError = JSON.stringify(body);
            }
          }
        } catch (e) {
          console.error('Json parse error', e);
        }

        // Force visibility
        toast({
          title: 'Debug Error',
          description: message + (detailedError ? ` | ${detailedError}` : ''),
          variant: 'destructive',
          duration: 10000,
        });

        throw new Error(message);
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
      if (errorMessage.includes('Insufficient MON')) {
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
      const totalCost = fillPrice * variables.quantity;

      // Get new position from payload
      const newPosition = payload?.positions?.[variables.athleteId]?.quantity;

      // Get athlete info from cache if available
      const athleteData = queryClient.getQueryData<{ name?: string; avatar?: string }>(['athlete', variables.athleteSlug]);

      // Trigger celebration modal
      const { showCelebration } = useTradeCelebrationStore.getState();
      showCelebration({
        side: variables.side,
        quantity: variables.quantity,
        fillPrice,
        totalCost,
        athleteName: athleteData?.name || variables.athleteSlug || 'Athlete',
        athleteAvatar: athleteData?.avatar,
        newPosition,
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
        description: `${amount} test MON added`,
      });
    },
  });
}

export async function initWallet(userId: string) {
  if (!userId) return;
  await walletService.ensureWallet(userId);
}
