/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import type {
  PlacePredictionEntryResponse,
  PredictionWalletSummary,
  UserMarketPosition,
} from '@/types/markets';

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function usePredictionWalletSummary() {
  const user = useUser();

  return useQuery({
    queryKey: ['prediction-wallet-summary', user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 1000,
    queryFn: async (): Promise<PredictionWalletSummary | null> => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any).rpc('get_prediction_wallet_summary', {
        p_user_id: user.id,
      });

      if (error) throw error;
      if (!data) return null;

      return {
        availableBalance: Number(data.available_balance ?? 0),
        lockedPredictionBalance: Number(data.locked_prediction_balance ?? 0),
        totalBalance: Number(data.total_balance ?? 0),
      };
    },
  });
}

export function usePlacePredictionEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      marketId,
      outcomeId,
      stakeAmount,
    }: {
      marketId: string;
      outcomeId: string;
      stakeAmount: number;
    }): Promise<PlacePredictionEntryResponse> => {
      const idempotencyKey = makeIdempotencyKey();

      const { data, error } = await supabase.functions.invoke('place-prediction-entry-v2', {
        body: {
          marketId,
          outcomeId,
          stakeAmount,
        },
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      });

      if (error) {
        throw new Error(error.message || 'Prediction entry failed');
      }

      return {
        success: Boolean(data?.success),
        replayed: Boolean(data?.replayed),
        entryId: data?.entryId ?? null,
        marketId: data?.marketId ?? null,
        outcomeId: data?.outcomeId ?? null,
        stakeAmount: Number(data?.stakeAmount ?? stakeAmount),
        wallet: data?.wallet
          ? {
              availableBalance: Number(data.wallet.available_balance ?? data.wallet.availableBalance ?? 0),
              lockedPredictionBalance: Number(
                data.wallet.locked_prediction_balance ?? data.wallet.lockedPredictionBalance ?? 0,
              ),
              totalBalance: Number(data.wallet.total_balance ?? data.wallet.totalBalance ?? 0),
            }
          : null,
        error: data?.error,
        errorCode: data?.errorCode,
      };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prediction-wallet-summary'] });
      queryClient.invalidateQueries({ queryKey: ['market', variables.marketId] });
      queryClient.invalidateQueries({ queryKey: ['market-cards'] });
      queryClient.invalidateQueries({ queryKey: ['resolved-markets'] });
      queryClient.invalidateQueries({ queryKey: ['trending-markets'] });
      queryClient.invalidateQueries({ queryKey: ['user-prediction-positions', variables.marketId] });
    },
  });
}

export function useUserPredictionPositions(marketId: string | undefined) {
  const user = useUser();

  return useQuery({
    queryKey: ['user-prediction-positions', marketId, user?.id],
    enabled: !!user?.id && !!marketId,
    staleTime: 10 * 1000,
    queryFn: async (): Promise<UserMarketPosition[]> => {
      if (!user?.id || !marketId) return [];

      const { data, error } = await (supabase as any)
        .from('prediction_entries')
        .select(`
          outcome_id,
          stake_amount,
          market_outcomes!prediction_entries_outcome_id_fkey (
            label
          )
        `)
        .eq('user_id', user.id)
        .eq('market_id', marketId);

      if (error) throw error;

      const positionMap = new Map<string, UserMarketPosition>();

      for (const entry of data || []) {
        const existing = positionMap.get(entry.outcome_id);
        if (existing) {
          existing.totalStake += Number(entry.stake_amount ?? 0);
          existing.entryCount += 1;
          continue;
        }

        positionMap.set(entry.outcome_id, {
          outcomeId: entry.outcome_id,
          outcomeLabel: entry.market_outcomes?.label ?? 'Unknown',
          totalStake: Number(entry.stake_amount ?? 0),
          entryCount: 1,
        });
      }

      return Array.from(positionMap.values());
    },
  });
}
