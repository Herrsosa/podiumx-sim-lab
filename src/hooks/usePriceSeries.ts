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
        .from('athlete_prices')
        .select('price, created_at')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch price series', error);
        throw error;
      }

      const rows = (data ?? []) as Array<Pick<AthletePriceRow, 'price' | 'created_at'>>;

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

      if (normalized.length === 0 && typeof options.fallbackPrice === 'number') {
        return [toFallbackPoint(options.fallbackPrice, options.fallbackTimestamp ?? null)];
      }

      return normalized;
    },
  });
}

