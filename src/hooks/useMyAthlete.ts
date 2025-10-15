import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport, Workout } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useAuth } from './useAuth';
import { useAthleteMetrics } from './useAthleteMetrics';

const POSTS_PAGE_SIZE = 10;

export function useMyAthlete() {
  const { user } = useAuth();
  const { data: metricsMap, isLoading: metricsLoading, isFetching: metricsFetching } = useAthleteMetrics('24h');

  const queryResult = useInfiniteQuery({
    queryKey: ['my-athlete', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id) return null;

      const from = pageParam * POSTS_PAGE_SIZE;
      const to = from + POSTS_PAGE_SIZE - 1;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, sport, avatar_url, bio, instagram_url, strava_url, created_at')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: tokens, error: tokenError } = await supabase
        .from('athlete_tokens')
        .select('*')
        .eq('athlete_id', user.id);

      if (tokenError) throw tokenError;

      const token = tokens?.[0];

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (postsError) throw postsError;

      // Calculate current price from bonding curve
      const supply = token?.supply || 0;
      const a = token?.a || 0.0002;
      const b = token?.b || 0.02;
      const c = token?.c || 1;
      const price = priceAt(supply, { a, b, c });
      const marketCap = price * supply;

      // Convert posts to workouts format
      const workouts = (posts || [])
        .filter((p) => p.workout_json)
        .map((p) => ({
          id: p.id,
          ...(p.workout_json as Workout),
        }));

      const avatarSource = athleteAvatars[profile.username] ?? profile.avatar_url;

      const athlete: Athlete = {
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
        posts: posts || [],
      };

      const metrics = metricsMap?.get(athlete.id);
      if (metrics) {
        athlete.change24h = metrics.changePct;
        athlete.volume24h = metrics.volume;
      }

      return {
        athlete,
        nextPage: posts.length === POSTS_PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    enabled: !!user?.id,
    getNextPageParam: (lastPage) => lastPage?.nextPage,

  });

  return {
    ...queryResult,
    data: queryResult.data?.pages[0],
    isLoading: queryResult.isLoading || metricsLoading,
    isFetching: queryResult.isFetching || metricsFetching,
    isPending: queryResult.isPending || metricsLoading,
  };
}
