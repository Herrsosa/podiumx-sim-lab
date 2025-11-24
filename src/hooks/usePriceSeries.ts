import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { subscribeToAthletePrice } from '@/lib/realtime/athleteRealtime';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import type { TimeRangeKey } from '@/utils/chartData';
import { ensureMs, normalizePriceSeries } from '@/lib/charting/seriesUtils';

type AthletePriceRow = Database['public']['Tables']['athlete_prices']['Row'];

interface UsePriceSeriesOptions {
  fallbackPrice?: number | null;
  fallbackTimestamp?: number | null;
}

const toFallbackPoint = (price: number, timestamp?: number | null): PriceSeriesPoint => {
  const fallbackTime = Number.isFinite(timestamp ?? NaN) ? (timestamp as number) : Date.now();
  return {
    t: fallbackTime,
    price,
    carried: true,
    lastTradeTime: fallbackTime,
  };
};

export function usePriceSeries(
  athleteId: string | undefined,
  range: TimeRangeKey,
  options: UsePriceSeriesOptions = {},
) {
  // Subscribe to real-time updates via centralized manager
  useEffect(() => {
    if (!athleteId) return;
    return subscribeToAthletePrice(athleteId);
  }, [athleteId]);

  return useQuery<PriceSeriesPoint[]>({
    queryKey: ['priceSeries', athleteId, range],
    enabled: !!athleteId,
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async () => {
      if (!athleteId) {
        if (typeof options.fallbackPrice === 'number') {
          return [toFallbackPoint(options.fallbackPrice, options.fallbackTimestamp ?? null)];
        }
        return [];
      }

      const { data, error } = await supabase
        .from('trades')
        .select('price_after, created_at')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: true });

      console.log(`[usePriceSeries] athleteId=${athleteId}, range=${range}, tradesCount=${data?.length ?? 0}`, { data, error });

      if (error) {
        console.error('Failed to fetch price series', error);
        throw error;
      }

      // Map trades to price points
      const rows = (data ?? []).map(t => ({
        price: t.price_after,
        created_at: t.created_at
      }));

      const points: PriceSeriesPoint[] = rows
        .map((row) => {
          const timestamp = ensureMs(row.created_at);
          const price = Number(row.price ?? 0);
          if (!Number.isFinite(timestamp) || !Number.isFinite(price)) {
            return null;
          }
          return {
            t: timestamp,
            price,
            carried: false,
            lastTradeTime: timestamp,
          };
        })
        .filter((point) => point !== null) as PriceSeriesPoint[];

      const normalized = normalizePriceSeries(points, range);

      console.log(`[usePriceSeries] normalized points count=${normalized.length}, points=${JSON.stringify(normalized.slice(0, 3))}`);

      if (normalized.length === 0 && typeof options.fallbackPrice === 'number') {
        console.log(`[usePriceSeries] Using fallback price=${options.fallbackPrice}`);
        return [toFallbackPoint(options.fallbackPrice, options.fallbackTimestamp ?? null)];
      }

      return normalized;
    },
  });
}

