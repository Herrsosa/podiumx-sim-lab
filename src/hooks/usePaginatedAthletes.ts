
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport } from '@/types';
import { resolveAvatarUrl } from '@/utils/avatar';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
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
};

const PAGE_SIZE = 12;

export function usePaginatedAthletes() {
  const queryResult = useInfiniteQuery({
    queryKey: ['athletes-paginated'],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch profile IDs first for pagination
      const { data: profileIds, error: idsError } = await supabase
        .from('profiles')
        .select('id')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (idsError) throw idsError;

      const ids = profileIds.map((p) => p.id);

      // Use batch RPC to get combined profile + token data
      const { data, error } = await supabase.rpc('get_athletes_batch', { _ids: ids });

      if (error) throw error;

      const rows = (data || []) as BatchAthleteRow[];

      // Filter out users without tokens (supply === 0 means no token launched)
      const athleteRows = rows.filter(row => row.supply > 0);

      // Combine profile + token data (posts are intentionally omitted for marketplace views)
      const athletes: Athlete[] = athleteRows.map((row) => {
        const price = priceAt(row.supply, { a: row.a, b: row.b, c: row.c });
        const marketCap = price * row.supply;
        const avatarSource = athleteAvatars[row.username] ?? row.avatar_url;

        return {
          id: row.id,
          slug: row.username,
          name: row.display_name || row.username,
          sport: (row.sport || 'Other') as Sport,
          avatar: resolveAvatarUrl(avatarSource, { size: 160, seed: row.username ?? row.id }),
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

      return {
        athletes,
        nextPage: profileIds.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  const metricsIds = useMemo(() => {
    if (!queryResult.data) return undefined;
    const ids = new Set<string>();
    queryResult.data.pages.forEach((page) => {
      page.athletes.forEach((athlete) => ids.add(athlete.id));
    });
    return ids.size > 0 ? Array.from(ids) : undefined;
  }, [queryResult.data]);

  const { data: metricsMap, isLoading: metricsLoading, isFetching: metricsFetching } = useAthleteMetrics(
    '24h',
    metricsIds
  );

  const athletesWithMetrics = useMemo(() => {
    if (!queryResult.data) return undefined;

    const flatAthletes = queryResult.data.pages.flatMap((page) => page.athletes);

    if (!metricsMap || metricsMap.size === 0) {
      return flatAthletes;
    }

    return flatAthletes.map((athlete) => {
      const metrics = metricsMap.get(athlete.id);
      if (!metrics) return athlete;

      return {
        ...athlete,
        change24h: metrics.changePct,
        volume24h: metrics.volume,
      };
    });
  }, [queryResult.data, metricsMap]);

  return {
    ...queryResult,
    data: athletesWithMetrics,
    isLoading: queryResult.isLoading || metricsLoading,
    isFetching: queryResult.isFetching || metricsFetching,
    isPending: queryResult.isPending || metricsLoading,
  };
}
