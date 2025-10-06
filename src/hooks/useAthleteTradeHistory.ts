import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TimeRange = '24h' | '7d' | '30d';

interface BucketedPrice {
  timestamp: number;
  price: number;
  date: string;
}

export function useAthleteTradeHistory(athleteId: string | undefined, range: TimeRange = '24h') {
  return useQuery({
    queryKey: ['athlete-trade-history', athleteId, range],
    queryFn: async () => {
      if (!athleteId) return [];

      const now = new Date();
      const rangeHours: Record<TimeRange, number> = {
        '24h': 24,
        '7d': 168,
        '30d': 720,
      };

      const hoursAgo = rangeHours[range];
      const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

      // Fetch all trades for this athlete in the time range
      const { data: trades, error } = await supabase
        .from('trades')
        .select('created_at, price_after')
        .eq('athlete_id', athleteId)
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching trade history:', error);
        return [];
      }

      if (!trades || trades.length === 0) {
        return [];
      }

      // Bucket trades into 1-hour intervals
      const buckets = new Map<number, BucketedPrice>();
      
      trades.forEach((trade) => {
        const tradeTime = new Date(trade.created_at).getTime();
        // Round down to the nearest hour
        const bucketTime = Math.floor(tradeTime / (60 * 60 * 1000)) * (60 * 60 * 1000);
        
        // Keep the latest price_after in each bucket
        const existing = buckets.get(bucketTime);
        if (!existing || tradeTime > new Date(existing.date).getTime()) {
          buckets.set(bucketTime, {
            timestamp: bucketTime,
            price: Number(trade.price_after),
            date: trade.created_at,
          });
        }
      });

      // Convert to array and sort by timestamp
      const bucketedData = Array.from(buckets.values())
        .sort((a, b) => a.timestamp - b.timestamp);

      return bucketedData;
    },
    enabled: !!athleteId,
  });
}
