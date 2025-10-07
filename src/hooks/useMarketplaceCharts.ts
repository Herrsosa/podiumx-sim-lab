import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { priceAt } from '@/utils/pricing';

interface SparklineData {
  athleteId: string;
  data: number[];
}

export function useMarketplaceCharts(athleteIds: string[]) {
  return useQuery({
    queryKey: ['marketplace-charts', athleteIds],
    queryFn: async () => {
      const charts: Record<string, number[]> = {};

      await Promise.all(
        athleteIds.map(async (athleteId) => {
          // Get last 24 hours of trades
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const { data: trades } = await supabase
            .from('trades')
            .select('created_at, price_after, supply_after')
            .eq('athlete_id', athleteId)
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: true });

          if (!trades || trades.length === 0) {
            // If no trades, get current price from token data
            const { data: token } = await supabase
              .from('athlete_tokens')
              .select('supply, a, b, c')
              .eq('athlete_id', athleteId)
              .single();

            if (token) {
              const curve = {
                a: token.a || 0.0002,
                b: token.b || 0.02,
                c: token.c || 1,
              };
              const currentPrice = priceAt(token.supply || 0, curve);
              // Return flat line with current price
              charts[athleteId] = Array(20).fill(currentPrice);
            } else {
              charts[athleteId] = [];
            }
            return;
          }

          // Sample trades to get ~20 data points for sparkline
          const sampleSize = Math.min(20, trades.length);
          const step = Math.max(1, Math.floor(trades.length / sampleSize));
          
          const sampledPrices = [];
          for (let i = 0; i < trades.length; i += step) {
            if (sampledPrices.length < 20) {
              sampledPrices.push(Number(trades[i].price_after));
            }
          }

          // If we have fewer than 20 points, pad with the last price
          while (sampledPrices.length < 20) {
            sampledPrices.push(sampledPrices[sampledPrices.length - 1]);
          }

          charts[athleteId] = sampledPrices.slice(0, 20);
        })
      );

      return charts;
    },
    enabled: athleteIds.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });
}
