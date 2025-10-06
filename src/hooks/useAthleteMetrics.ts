import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TimeRange = '24h' | '7d' | '30d';

interface AthleteMetrics {
  changePct: number;
  volume: number;
}

export function useAthleteMetrics(range: TimeRange = '24h') {
  return useQuery({
    queryKey: ['athlete-metrics', range],
    queryFn: async () => {
      const now = new Date();
      const rangeHours: Record<TimeRange, number> = {
        '24h': 24,
        '7d': 168,
        '30d': 720,
      };

      const hoursAgo = rangeHours[range];
      const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

      // Fetch all trades for all athletes in the time range
      const { data: trades, error } = await supabase
        .from('trades')
        .select('athlete_id, created_at, price_after, net_amount')
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching athlete metrics:', error);
        return new Map<string, AthleteMetrics>();
      }

      if (!trades || trades.length === 0) {
        return new Map<string, AthleteMetrics>();
      }

      // Group trades by athlete_id and compute metrics
      const metricsMap = new Map<string, AthleteMetrics>();
      const athleteTradesMap = new Map<string, typeof trades>();

      // Group trades by athlete
      trades.forEach((trade) => {
        const athleteTrades = athleteTradesMap.get(trade.athlete_id) || [];
        athleteTrades.push(trade);
        athleteTradesMap.set(trade.athlete_id, athleteTrades);
      });

      // Compute metrics for each athlete
      athleteTradesMap.forEach((athleteTrades, athleteId) => {
        // Calculate volume - sum of absolute net_amount
        const volume = athleteTrades.reduce(
          (sum, trade) => sum + Math.abs(Number(trade.net_amount) || 0),
          0
        );

        // Calculate price change percentage
        const firstPrice = Number(athleteTrades[0]?.price_after) || 0;
        const lastPrice = Number(athleteTrades[athleteTrades.length - 1]?.price_after) || 0;
        const changePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

        metricsMap.set(athleteId, { changePct, volume });
      });

      return metricsMap;
    },
  });
}
