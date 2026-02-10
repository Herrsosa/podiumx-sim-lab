/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import type { PredictionCredits, PlaceBetResponse, UserMarketPosition, MarketBet } from '@/types/markets';

// Transform database row to PredictionCredits type
function transformCredits(row: any): PredictionCredits {
  return {
    userId: row.user_id,
    balance: row.balance,
    totalEarned: row.total_earned,
    totalWagered: row.total_wagered,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Fetch user's prediction credits
export function usePredictionCredits() {
  const user = useUser();

  return useQuery({
    queryKey: ['prediction-credits', user?.id],
    queryFn: async (): Promise<PredictionCredits | null> => {
      if (!user?.id) return null;

      console.log('[PredictionCredits] Fetching credits for user:', user.id);

      const { data, error } = await supabase
        .from('prediction_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[PredictionCredits] Error fetching:', error);
        throw error;
      }

      // If no credits exist, create them
      if (!data) {
        console.log('[PredictionCredits] No credits found, creating new record');
        const { data: newCredits, error: insertError } = await supabase
          .from('prediction_credits')
          .insert({ user_id: user.id, balance: 1000 })
          .select()
          .single();

        if (insertError) {
          console.error('[PredictionCredits] Error creating credits:', insertError);
          // If insert fails (e.g., RLS), return a default
          return {
            userId: user.id,
            balance: 1000,
            totalEarned: 0,
            totalWagered: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return transformCredits(newCredits);
      }

      console.log('[PredictionCredits] Found credits:', data);
      return transformCredits(data);
    },
    enabled: !!user?.id,
    staleTime: 10 * 1000, // 10 seconds
  });
}

// Place a bet mutation
export function usePlaceBet() {
  const queryClient = useQueryClient();
  const user = useUser();

  return useMutation({
    mutationFn: async ({
      marketId,
      outcomeId,
      stake,
    }: {
      marketId: string;
      outcomeId: string;
      stake: number;
    }): Promise<PlaceBetResponse> => {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated. Please log in to place bets.' };
      }

      console.log('[PlaceBet] Placing bet:', { userId: user.id, marketId, outcomeId, stake });

      const { data, error } = await supabase.rpc('place_prediction_bet', {
        p_user_id: user.id,
        p_market_id: marketId,
        p_outcome_id: outcomeId,
        p_stake: stake,
      });

      console.log('[PlaceBet] Result:', { data, error });

      if (error) {
        console.error('[PlaceBet] RPC error:', error);
        throw error;
      }

      // Handle null/undefined data
      if (!data) {
        return { success: false, error: 'No response from server' };
      }

      // The RPC returns JSONB which is already parsed
      return data as PlaceBetResponse;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['prediction-credits'] });
        queryClient.invalidateQueries({ queryKey: ['market', variables.marketId] });
        queryClient.invalidateQueries({ queryKey: ['market-outcomes', variables.marketId] });
        queryClient.invalidateQueries({ queryKey: ['user-positions', variables.marketId] });
        queryClient.invalidateQueries({ queryKey: ['market-activity', variables.marketId] });
        queryClient.invalidateQueries({ queryKey: ['market-cards'] });
        queryClient.invalidateQueries({ queryKey: ['trending-markets'] });
      }
    },
  });
}

// Fetch user's positions in a market
export function useUserMarketPositions(marketId: string | undefined) {
  const user = useUser();

  return useQuery({
    queryKey: ['user-positions', marketId, user?.id],
    queryFn: async (): Promise<UserMarketPosition[]> => {
      if (!user?.id || !marketId) return [];

      const { data, error } = await supabase
        .from('market_bets')
        .select(`
          outcome_id,
          stake,
          shares_received,
          price_at_purchase,
          market_outcomes!inner (
            label
          )
        `)
        .eq('user_id', user.id)
        .eq('market_id', marketId);

      if (error) throw error;

      // Aggregate positions by outcome
      const positionMap = new Map<string, UserMarketPosition>();

      for (const bet of data || []) {
        const existing = positionMap.get(bet.outcome_id);
        if (existing) {
          existing.totalShares += bet.shares_received;
          existing.totalStake += bet.stake;
          // Recalculate average price
          existing.avgPrice = existing.totalStake / existing.totalShares;
        } else {
          positionMap.set(bet.outcome_id, {
            outcomeId: bet.outcome_id,
            outcomeLabel: (bet.market_outcomes as any)?.label || 'Unknown',
            totalShares: bet.shares_received,
            totalStake: bet.stake,
            avgPrice: bet.stake / bet.shares_received,
          });
        }
      }

      return Array.from(positionMap.values());
    },
    enabled: !!user?.id && !!marketId,
    staleTime: 10 * 1000,
  });
}

// Fetch user's bets across all markets
export function useUserBets() {
  const user = useUser();

  return useQuery({
    queryKey: ['user-bets', user?.id],
    queryFn: async (): Promise<MarketBet[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('market_bets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        marketId: row.market_id,
        outcomeId: row.outcome_id,
        stake: row.stake,
        sharesReceived: row.shares_received,
        priceAtPurchase: row.price_at_purchase,
        createdAt: row.created_at,
      }));
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}
