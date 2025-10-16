import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TimeRange = '24h' | '7d' | '30d';
type MarketOverviewRow =
  Database['public']['Functions']['get_market_overview']['Returns'] extends Array<infer R> ? R : never;

export type AthleteMetrics = {
  changePct: number;
  volume: number;
  lastPrice: number;
  quantity: number;
  sparkline: number[];
};

function normaliseAthleteIds(athleteIds?: string[]) {
  if (!athleteIds || athleteIds.length === 0) {
    return undefined;
  }
  const unique = Array.from(new Set(athleteIds.filter(Boolean)));
  unique.sort();
  return unique;
}

export function parseSparkline(row: MarketOverviewRow): number[] {
  if (!row?.spark7d || row.spark7d.length === 0) {
    return [];
  }
  return row.spark7d.map((value) => Number(value) / 100);
}

export function mapMarketOverviewRow(row: MarketOverviewRow): AthleteMetrics {
  const sparkline = parseSparkline(row);

  return {
    changePct: Number(row.pct_change_24h ?? 0),
    volume: Number(row.notional_24h ?? 0),
    lastPrice: Number(row.last_price ?? 0),
    quantity: Number(row.qty_24h ?? 0),
    sparkline,
  };
}

export function useAthleteMetrics(
  range: TimeRange = '24h',
  athleteIds?: string[],
  options?: { enabled?: boolean }
) {
  const normalisedIds = useMemo(() => normaliseAthleteIds(athleteIds), [athleteIds]);

  return useQuery({
    queryKey: ['market-overview', range, normalisedIds],
    queryFn: async () => {
      if (range !== '24h') {
        console.warn(`useAthleteMetrics: range "${range}" not supported server-side yet`);
        return new Map<string, AthleteMetrics>();
      }

      const payload =
        normalisedIds && normalisedIds.length > 0
          ? { athlete_ids: normalisedIds }
          : { athlete_ids: null };

      const { data, error } = await supabase.rpc('get_market_overview', payload);

      if (error) {
        console.error('Failed to load market overview metrics', error);
        throw error;
      }

      const metricsMap = new Map<string, AthleteMetrics>();
      (data ?? []).forEach((row) => {
        if (!row?.athlete_id) {
          return;
        }

        metricsMap.set(row.athlete_id, mapMarketOverviewRow(row));
      });

      return metricsMap;
    },
    enabled: options?.enabled ?? true,
  });
}
