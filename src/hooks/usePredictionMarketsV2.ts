/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import type {
  MarketStatus,
  PlacePredictionEntryResponse,
  PredictionMarketCardV2,
  PredictionMarketV2,
  PredictionOutcomeV2,
  PredictionWalletSummary,
} from '@/types/markets';

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function transformOutcome(row: any): PredictionOutcomeV2 {
  return {
    id: row.id,
    marketId: row.market_id,
    outcomeKey: row.outcome_key,
    label: row.label,
    description: row.description,
    totalStake: toNumber(row.total_stake),
    sortOrder: toNumber(row.sort_order),
  };
}

function transformMarketCard(row: any): PredictionMarketCardV2 {
  return {
    id: row.id,
    title: row.title || row.question,
    question: row.question,
    status: row.status,
    marketScope: row.market_scope || 'hyrox',
    eventName: row.event_name,
    eventCity: row.event_city,
    division: row.division,
    locksAt: row.locks_at || row.closes_at,
    totalPool: toNumber(row.total_pool),
    totalTrades: toNumber(row.total_trades),
    outcomes: ((row.market_outcomes || []) as any[])
      .slice()
      .sort((a, b) => toNumber(a.sort_order) - toNumber(b.sort_order))
      .map(transformOutcome),
  };
}

export function usePredictionWalletSummary() {
  const user = useUser();

  return useQuery({
    queryKey: ['prediction-wallet-summary', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PredictionWalletSummary | null> => {
      const { data, error } = await (supabase as any).rpc('get_prediction_wallet_summary');

      if (error) throw error;
      if (!data) return null;

      const wallet = data as {
        available_balance?: number | string;
        locked_prediction_balance?: number | string;
        total_balance?: number | string;
      };

      return {
        availableBalance: toNumber(wallet.available_balance),
        lockedPredictionBalance: toNumber(wallet.locked_prediction_balance),
        totalBalance: toNumber(wallet.total_balance),
      };
    },
  });
}

export function usePredictionMarketCardsV2(status?: MarketStatus[]) {
  return useQuery({
    queryKey: ['prediction-market-cards-v2', status],
    queryFn: async (): Promise<PredictionMarketCardV2[]> => {
      let query = (supabase as any)
        .from('prediction_markets')
        .select(`
          id,
          event_name,
          event_city,
          division,
          question,
          status,
          total_pool,
          total_trades,
          closes_at,
          locks_at,
          market_scope,
          title,
          market_outcomes (
            id,
            market_id,
            label,
            description,
            total_stake,
            sort_order,
            outcome_key
          )
        `)
        .eq('legacy_model', 'binary_wallet')
        .order('locks_at', { ascending: true });

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(transformMarketCard);
    },
    staleTime: 15_000,
  });
}

export function usePredictionMarketV2(marketId: string | undefined) {
  return useQuery({
    queryKey: ['prediction-market-v2', marketId],
    enabled: !!marketId,
    queryFn: async (): Promise<PredictionMarketV2 | null> => {
      if (!marketId) return null;

      const { data, error } = await (supabase as any)
        .from('prediction_markets')
        .select(`
          id,
          event_name,
          event_date,
          event_city,
          division,
          question,
          status,
          total_pool,
          total_trades,
          closes_at,
          locks_at,
          market_scope,
          title,
          description,
          official_source,
          settlement_rule_text,
          winning_outcome_id,
          resolved_at,
          market_outcomes (
            id,
            market_id,
            label,
            description,
            total_stake,
            sort_order,
            outcome_key
          )
        `)
        .eq('legacy_model', 'binary_wallet')
        .eq('id', marketId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const card = transformMarketCard(data);

      return {
        ...card,
        description: data.description,
        eventDate: data.event_date,
        officialSource: data.official_source,
        settlementRuleText: data.settlement_rule_text,
        winningOutcomeId: data.winning_outcome_id,
        resolvedAt: data.resolved_at,
      };
    },
    staleTime: 10_000,
  });
}

function buildIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function usePlacePredictionEntryV2() {
  const queryClient = useQueryClient();
  const user = useUser();

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
      if (!user?.id) {
        return {
          success: false,
          error: 'Not authenticated',
          errorCode: 'UNAUTHORIZED',
        };
      }

      const { data, error } = await supabase.functions.invoke('place-prediction-entry-v2', {
        body: {
          marketId,
          outcomeId,
          stakeAmount,
        },
        headers: {
          'X-Idempotency-Key': buildIdempotencyKey(),
        },
      });

      if (error) {
        throw error;
      }

      return (data as PlacePredictionEntryResponse) ?? {
        success: false,
        error: 'No response from server',
      };
    },
    onSuccess: (result, variables) => {
      if (!result.success) return;

      queryClient.invalidateQueries({ queryKey: ['prediction-wallet-summary'] });
      queryClient.invalidateQueries({ queryKey: ['prediction-market-v2', variables.marketId] });
      queryClient.invalidateQueries({ queryKey: ['prediction-market-cards-v2'] });
      queryClient.invalidateQueries({ queryKey: ['user-prediction-positions', variables.marketId] });
    },
  });
}
