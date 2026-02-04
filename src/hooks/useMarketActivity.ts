import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketActivity } from '@/types/markets';

// Fetch market activity (recent trades)
export function useMarketActivity(marketId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: ['market-activity', marketId, limit],
    queryFn: async (): Promise<MarketActivity[]> => {
      if (!marketId) return [];

      const { data, error } = await supabase
        .from('market_activity')
        .select(`
          *,
          profiles!market_activity_user_id_fkey (
            username,
            avatar_url
          ),
          market_outcomes!market_activity_outcome_id_fkey (
            label
          )
        `)
        .eq('market_id', marketId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        marketId: row.market_id,
        userId: row.user_id,
        outcomeId: row.outcome_id,
        action: row.action,
        stake: row.stake,
        shares: row.shares,
        createdAt: row.created_at,
        username: row.profiles?.username,
        avatarUrl: row.profiles?.avatar_url,
        outcomeLabel: row.market_outcomes?.label,
      }));
    },
    enabled: !!marketId,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}
