import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TimeRange = '24h' | '7d' | '30d' | 'all';

export function useAthleteEarnings(athleteId: string | undefined, range: TimeRange = 'all') {
  return useQuery({
    queryKey: ['athlete-earnings', athleteId, range],
    queryFn: async () => {
      if (!athleteId) return { earnings: 0, tradeCount: 0 };

      let query = supabase
        .from('trades')
        .select('fee, side, created_at')
        .eq('athlete_id', athleteId);

      // Apply time filter
      if (range !== 'all') {
        const now = new Date();
        const hoursMap = { '24h': 24, '7d': 168, '30d': 720 };
        const hoursAgo = hoursMap[range];
        const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
        query = query.gte('created_at', startTime.toISOString());
      }

      const { data: trades, error } = await query;
      
      if (error) throw error;
      if (!trades) return { earnings: 0, tradeCount: 0 };

      // Calculate 50% of fees (athlete's share) - 1.5% total fee split 50/50
      const earnings = trades.reduce((sum, trade) => sum + (Number(trade.fee) * 0.5), 0);
      
      return {
        earnings,
        tradeCount: trades.length,
      };
    },
    enabled: !!athleteId,
    staleTime: 60000, // Cache for 1 minute
  });
}
