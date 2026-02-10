/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LeaderboardEntry } from '@/types/markets';

// Fetch prediction leaderboard
export function usePredictionLeaderboard(limit: number = 20) {
  return useQuery({
    queryKey: ['prediction-leaderboard', limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('prediction_leaderboard')
        .select('*')
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        currentBalance: row.current_balance,
        totalEarned: row.total_earned,
        totalWagered: row.total_wagered,
        totalMarkets: row.total_markets,
        correctPredictions: row.correct_predictions,
        accuracy: row.accuracy,
        netProfit: row.net_profit,
        rank: row.rank,
      }));
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
