import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MarketplaceChartPoint = {
  timestamp: number;
  price: number;
};

type MarketplaceCharts = Record<string, MarketplaceChartPoint[]>;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function normaliseIds(ids: string[]) {
  return Array.from(new Set(ids)).filter(Boolean);
}

export function useMarketplaceCharts(athleteIds: string[]) {
  const dedupedIds = useMemo(() => normaliseIds(athleteIds), [athleteIds]);

  return useQuery({
    queryKey: ['marketplace-charts', dedupedIds],
    enabled: dedupedIds.length > 0 && dedupedIds.length <= 50,
    queryFn: async () => {
      if (dedupedIds.length === 0) return {};

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [tradesResult, metricsResult] = await Promise.all([
        supabase
          .from('trades')
          .select('athlete_id, price_after, created_at')
          .in('athlete_id', dedupedIds)
          .eq('is_on_chain', true)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('athlete_metrics_24h')
          .select('athlete_id, last_price')
          .in('athlete_id', dedupedIds)
      ]);

      if (tradesResult.error) {
        console.error('Failed to fetch marketplace trades', tradesResult.error);
        throw tradesResult.error;
      }

      const charts: MarketplaceCharts = {};
      const metricsMap = new Map(
        metricsResult.data?.map(m => [m.athlete_id, m.last_price]) ?? []
      );

      // Initialize arrays for requested athletes
      dedupedIds.forEach(id => {
        charts[id] = [];
      });

      // Group trades by athlete
      tradesResult.data?.forEach(trade => {
        if (charts[trade.athlete_id]) {
          charts[trade.athlete_id].push({
            timestamp: new Date(trade.created_at).getTime(),
            price: trade.price_after
          });
        }
      });

      // Add current time point and handle empty charts
      const now = Date.now();
      dedupedIds.forEach(athleteId => {
        const points = charts[athleteId];

        if (points.length > 0) {
          // If we have trades, just ensure the line goes to "now"
          const lastPoint = points[points.length - 1];
          if (now - lastPoint.timestamp > ONE_DAY_MS / 24) {
            points.push({
              timestamp: now,
              price: lastPoint.price
            });
          }
        } else {
          // If no trades, use last_price from metrics to create a flat line
          const lastPrice = metricsMap.get(athleteId);
          if (typeof lastPrice === 'number') {
            charts[athleteId] = [
              { timestamp: sevenDaysAgo.getTime(), price: lastPrice },
              { timestamp: now, price: lastPrice }
            ];
          }
        }
      });

      return charts;
    }
  });
}
