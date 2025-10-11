import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { priceAt } from '@/utils/pricing';

export type MarketplaceChartPoint = {
  timestamp: number;
  price: number;
};

type MarketplaceCharts = Record<string, MarketplaceChartPoint[]>;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_POINTS = 30;

export function useMarketplaceCharts(athleteIds: string[]) {
  const dedupedIds = useMemo(() => {
    return Array.from(new Set(athleteIds)).filter(Boolean);
  }, [athleteIds]);

  return useQuery({
    queryKey: ['marketplace-charts', dedupedIds],
    queryFn: async () => {
      const charts: MarketplaceCharts = {};
      const now = new Date();
      const since = new Date(now.getTime() - SEVEN_DAYS_MS);

      await Promise.all(
        dedupedIds.map(async (athleteId) => {
          const { data: trades, error: tradesError } = await supabase
            .from('trades')
            .select('created_at, price_after, supply_after')
            .eq('athlete_id', athleteId)
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: true });

          if (tradesError) {
            console.error('Failed to load marketplace trades', athleteId, tradesError);
            charts[athleteId] = [];
            return;
          }

          let points: MarketplaceChartPoint[] = [];

          if (trades && trades.length > 0) {
            points = trades.map((trade) => ({
              timestamp: new Date(trade.created_at).getTime(),
              price: Number(trade.price_after),
            }));
          } else {
            const { data: token, error: tokenError } = await supabase
              .from('athlete_tokens')
              .select('supply, a, b, c')
              .eq('athlete_id', athleteId)
              .single();

            if (tokenError || !token) {
              console.error('Failed to load token data for chart', athleteId, tokenError);
              charts[athleteId] = [];
              return;
            }

            const curve = {
              a: token.a || 0.0002,
              b: token.b || 0.02,
              c: token.c || 1,
            };
            const currentPrice = priceAt(token.supply || 0, curve);

            points = Array.from({ length: 7 }, (_, index) => {
              const ts = now.getTime() - (6 - index) * 24 * 60 * 60 * 1000;
              return { timestamp: ts, price: currentPrice };
            });
          }

          if (!points.length) {
            charts[athleteId] = [];
            return;
          }

          const sampled = samplePoints(points, MAX_POINTS);
          const lastPoint = sampled[sampled.length - 1];

          if (now.getTime() - lastPoint.timestamp > 60 * 60 * 1000) {
            sampled.push({ timestamp: now.getTime(), price: lastPoint.price });
          }

          const trimmed =
            sampled.length > MAX_POINTS
              ? sampled.slice(sampled.length - MAX_POINTS)
              : sampled;

          charts[athleteId] = trimmed;
        })
      );

      return charts;
    },
    enabled: dedupedIds.length > 0,
    staleTime: 30000,
  });
}

function samplePoints(points: MarketplaceChartPoint[], target: number) {
  if (points.length <= target) {
    return [...points];
  }

  const step = Math.ceil(points.length / target);
  const sampled: MarketplaceChartPoint[] = [];

  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }

  const last = points[points.length - 1];
  if (sampled[sampled.length - 1]?.timestamp !== last.timestamp) {
    sampled.push(last);
  }

  if (sampled.length > target) {
    return sampled.slice(sampled.length - target);
  }

  return sampled;
}



