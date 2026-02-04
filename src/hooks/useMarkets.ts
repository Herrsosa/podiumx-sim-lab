import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Market, MarketOutcome, MarketWithOutcomes, MarketCard, MarketStatus } from '@/types/markets';

// Transform database row to Market type
function transformMarket(row: any): Market {
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name,
    eventDate: row.event_date,
    eventCity: row.event_city,
    division: row.division,
    question: row.question,
    type: row.type,
    status: row.status,
    closesAt: row.closes_at,
    resolvedAt: row.resolved_at,
    winningOutcomeId: row.winning_outcome_id,
    totalPool: row.total_pool,
    totalTrades: row.total_trades,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformOutcome(row: any): MarketOutcome {
  return {
    id: row.id,
    marketId: row.market_id,
    label: row.label,
    description: row.description,
    shares: row.shares,
    probability: row.probability,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

// Fetch all markets with optional status filter
export function useMarkets(status?: MarketStatus | MarketStatus[]) {
  return useQuery({
    queryKey: ['markets', status],
    queryFn: async (): Promise<Market[]> => {
      console.log('[useMarkets] Fetching markets with status:', status);

      let query = supabase
        .from('prediction_markets')
        .select('*')
        .order('closes_at', { ascending: true });

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;

      console.log('[useMarkets] Result:', { data, error });

      if (error) throw error;
      return (data || []).map(transformMarket);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch a single market with outcomes
export function useMarket(marketId: string | undefined) {
  return useQuery({
    queryKey: ['market', marketId],
    queryFn: async (): Promise<MarketWithOutcomes | null> => {
      if (!marketId) return null;

      const { data: marketData, error: marketError } = await supabase
        .from('prediction_markets')
        .select('*')
        .eq('id', marketId)
        .single();

      if (marketError) throw marketError;
      if (!marketData) return null;

      const { data: outcomesData, error: outcomesError } = await supabase
        .from('market_outcomes')
        .select('*')
        .eq('market_id', marketId)
        .order('probability', { ascending: false });

      if (outcomesError) throw outcomesError;

      return {
        ...transformMarket(marketData),
        outcomes: (outcomesData || []).map(transformOutcome),
      };
    },
    enabled: !!marketId,
    staleTime: 10 * 1000, // 10 seconds - markets update more frequently
  });
}

// Fetch markets with outcomes for display cards
export function useMarketCards(status?: MarketStatus | MarketStatus[]) {
  return useQuery({
    queryKey: ['market-cards', status],
    queryFn: async (): Promise<MarketCard[]> => {
      let query = supabase
        .from('prediction_markets')
        .select(`
          *,
          market_outcomes (
            label,
            probability
          )
        `)
        .order('closes_at', { ascending: true });

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        question: row.question,
        type: row.type,
        status: row.status,
        eventCity: row.event_city,
        division: row.division,
        closesAt: row.closes_at,
        totalPool: row.total_pool,
        totalTrades: row.total_trades,
        topOutcomes: (row.market_outcomes || [])
          .sort((a: any, b: any) => b.probability - a.probability)
          .slice(0, 3)
          .map((o: any) => ({
            label: o.label,
            probability: o.probability,
          })),
      }));
    },
    staleTime: 30 * 1000,
  });
}

// Fetch market outcomes
export function useMarketOutcomes(marketId: string | undefined) {
  return useQuery({
    queryKey: ['market-outcomes', marketId],
    queryFn: async (): Promise<MarketOutcome[]> => {
      if (!marketId) return [];

      const { data, error } = await supabase
        .from('market_outcomes')
        .select('*')
        .eq('market_id', marketId)
        .order('probability', { ascending: false });

      if (error) throw error;
      return (data || []).map(transformOutcome);
    },
    enabled: !!marketId,
    staleTime: 10 * 1000,
  });
}

// Fetch trending/popular markets
export function useTrendingMarkets(limit: number = 4) {
  return useQuery({
    queryKey: ['trending-markets', limit],
    queryFn: async (): Promise<MarketCard[]> => {
      const { data, error } = await supabase
        .from('prediction_markets')
        .select(`
          *,
          market_outcomes (
            label,
            probability
          )
        `)
        .eq('status', 'open')
        .order('total_trades', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        question: row.question,
        type: row.type,
        status: row.status,
        eventCity: row.event_city,
        division: row.division,
        closesAt: row.closes_at,
        totalPool: row.total_pool,
        totalTrades: row.total_trades,
        topOutcomes: (row.market_outcomes || [])
          .sort((a: any, b: any) => b.probability - a.probability)
          .slice(0, 3)
          .map((o: any) => ({
            label: o.label,
            probability: o.probability,
          })),
      }));
    },
    staleTime: 30 * 1000,
  });
}

// Fetch recently resolved markets
export function useResolvedMarkets(limit: number = 5) {
  return useQuery({
    queryKey: ['resolved-markets', limit],
    queryFn: async (): Promise<MarketCard[]> => {
      const { data, error } = await supabase
        .from('prediction_markets')
        .select(`
          *,
          market_outcomes (
            id,
            label,
            probability
          )
        `)
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        question: row.question,
        type: row.type,
        status: row.status,
        eventCity: row.event_city,
        division: row.division,
        closesAt: row.closes_at,
        totalPool: row.total_pool,
        totalTrades: row.total_trades,
        topOutcomes: (row.market_outcomes || [])
          .filter((o: any) => o.id === row.winning_outcome_id)
          .map((o: any) => ({
            label: o.label,
            probability: o.probability,
          })),
      }));
    },
    staleTime: 60 * 1000,
  });
}
