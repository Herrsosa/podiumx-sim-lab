import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useAthleteMetrics } from './useAthleteMetrics';

type BatchAthleteRow = {
  id: string;
  username: string;
  display_name: string | null;
  sport: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_url: string | null;
  strava_url: string | null;
  created_at: string;
  supply: number;
  a: number;
  b: number;
  c: number;
  treasury_balance: number;
  athlete_earnings: number;
  onchain_initialized?: boolean | null;
  onchain_price?: number | string | null;
  onchain_updated_at?: string | null;
};

/**
 * Batches athlete data fetching using a single RPC call.
 * Handles deduplication and returns Athlete objects.
 * 
 * @param ids - Array of athlete IDs to fetch
 * @param options - React Query options (enabled, etc.)
 */
export function useAthletesBatch(ids: string[], options?: { enabled?: boolean }) {
  // Deduplicate and sort for stable cache key
  const dedupedIds = useMemo(() => {
    if (!ids || ids.length === 0) return [];
    const unique = Array.from(new Set(ids.filter(Boolean)));
    unique.sort();
    return unique;
  }, [ids]);

  const metricsQuery = useAthleteMetrics('24h', dedupedIds, {
    enabled: options?.enabled !== false && dedupedIds.length > 0,
  });

  const queryResult = useQuery({
    queryKey: ['athletes-batch', dedupedIds],
    queryFn: async (): Promise<Athlete[]> => {
      if (dedupedIds.length === 0) return [];

      const { data, error } = await supabase.rpc('get_athletes_batch', {
        _ids: dedupedIds,
      });

      if (error) throw error;

      const rows = (data || []) as BatchAthleteRow[];

      return rows.map((row) => {
        const onchainPrice = row.onchain_price != null ? Number(row.onchain_price) : Number.NaN;
        const price =
          Number.isFinite(onchainPrice) && onchainPrice > 0
            ? onchainPrice
            : priceAt(row.supply, { a: row.a, b: row.b, c: row.c });
        const marketCap = price * row.supply;
        const avatarSource = athleteAvatars[row.username] ?? row.avatar_url;

        return {
          id: row.id,
          slug: row.username,
          name: row.display_name || row.username,
          sport: (row.sport || 'Other') as Sport,
          avatar: resolveAvatarUrl(avatarSource, { size: 128, seed: row.username ?? row.id }),
          bio: row.bio || '',
          location: '',
          socials: {
            instagram: row.instagram_url || undefined,
            strava: row.strava_url || undefined,
          },
          supply: row.supply,
          reserve: row.treasury_balance,
          price,
          marketCap,
          athleteRevenue: row.athlete_earnings,
          change24h: 0,
          volume24h: 0,
          workouts: [],
          posts: [],
        };
      });
    },
    enabled: options?.enabled !== false && dedupedIds.length > 0,
    staleTime: 30_000,
  });

  const athletesWithMetrics = useMemo(() => {
    const base = (queryResult.data ?? []) as Athlete[];
    const metricsMap = metricsQuery.data;
    if (!metricsMap || metricsMap.size === 0) {
      return base;
    }

    return base.map((athlete) => {
      const metrics = metricsMap.get(athlete.id);
      if (!metrics) return athlete;

      const resolvedPrice = metrics.lastPrice > 0 ? metrics.lastPrice : athlete.price;

      return {
        ...athlete,
        price: resolvedPrice,
        marketCap: resolvedPrice * athlete.supply,
        change24h: metrics.changePct,
        volume24h: metrics.volume,
      };
    });
  }, [queryResult.data, metricsQuery.data]);

  return {
    ...queryResult,
    data: athletesWithMetrics,
    isLoading: queryResult.isLoading || metricsQuery.isLoading,
    isFetching: queryResult.isFetching || metricsQuery.isFetching,
    isPending: queryResult.isPending || metricsQuery.isLoading,
  };
}
