
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport, Workout } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useAthleteMetrics } from './useAthleteMetrics';

const PAGE_SIZE = 12;

export function usePaginatedAthletes() {
  const { data: metricsMap, isLoading: metricsLoading, isFetching: metricsFetching } = useAthleteMetrics('24h');

  const queryResult = useInfiniteQuery({
    queryKey: ['athletes-paginated'],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, sport, avatar_url, bio, instagram_url, strava_url, created_at')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (profilesError) throw profilesError;

      const athleteIds = profiles.map((p) => p.id);

      const { data: tokens, error: tokensError } = await supabase
        .from('athlete_tokens')
        .select('*')
        .in('athlete_id', athleteIds);

      if (tokensError) throw tokensError;

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('author_id', athleteIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Combine profile + token data
      const athletes: Athlete[] = profiles.map((profile) => {
        const token = tokens.find((t) => t.athlete_id === profile.id);
        const athletePosts = posts.filter((p) => p.author_id === profile.id);

        // Calculate current price from bonding curve
        const supply = token?.supply || 0;
        const a = token?.a || 0.0002;
        const b = token?.b || 0.02;
        const c = token?.c || 1;
        const price = priceAt(supply, { a, b, c });
        const marketCap = price * supply;

        // Convert posts to workouts format
        const workouts = athletePosts
          .filter((p) => p.workout_json)
          .map((p) => ({
            id: p.id,
            ...(p.workout_json as unknown as Workout),
          }));

        const avatarSource = athleteAvatars[profile.username] ?? profile.avatar_url;

        return {
          id: profile.id,
          slug: profile.username,
          name: profile.display_name || profile.username,
          sport: (profile.sport || 'Other') as Sport,
          avatar: resolveAvatarUrl(avatarSource),
          bio: profile.bio || '',
          location: '',
          socials: {
            instagram: profile.instagram_url || undefined,
            strava: profile.strava_url || undefined,
          },
          supply,
          reserve: token?.treasury_balance || 0,
          price,
          marketCap,
          athleteRevenue: token?.athlete_earnings || 0,
          change24h: 0,
          volume24h: 0,
          workouts,
          posts: athletePosts as any,
        };
      });

      return {
        athletes,
        nextPage: profiles.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

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
