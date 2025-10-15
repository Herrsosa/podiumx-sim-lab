import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport, Workout } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useAthleteMetrics } from './useAthleteMetrics';

export function useAthlete(slug: string) {
  const { data: metricsMap, isLoading: metricsLoading, isFetching: metricsFetching } = useAthleteMetrics('24h');

  const queryResult = useQuery({
    queryKey: ['athlete', slug],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, sport, avatar_url, bio, instagram_url, strava_url, created_at')
        .eq('username', slug)
        .single();

      if (profileError) throw profileError;
      if (!profile) return null;

      const { data: token, error: tokenError } = await supabase
        .from('athlete_tokens')
        .select('*')
        .eq('athlete_id', profile.id)
        .single();

      if (tokenError) throw tokenError;

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Calculate current price from bonding curve
      const supply = token?.supply || 0;
      const a = token?.a || 0.0002;
      const b = token?.b || 0.02;
      const c = token?.c || 1;
      const price = priceAt(supply, { a, b, c });
      const marketCap = price * supply;

      // Convert posts to workouts format
      const workouts = posts
        .filter((p) => p.workout_json)
        .map((p) => ({
          id: p.id,
          ...(p.workout_json as unknown as Workout),
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
        posts: posts as any,
      };

      return athlete;
    },
    enabled: !!slug,
  });

  const athleteWithMetrics = useMemo(() => {
    if (!queryResult.data) return undefined;

    const metrics = metricsMap?.get(queryResult.data.id);
    if (!metrics) return queryResult.data;

    return {
      ...queryResult.data,
      change24h: metrics.changePct,
      volume24h: metrics.volume,
    };
  }, [queryResult.data, metricsMap]);

  return {
    ...queryResult,
    data: athleteWithMetrics,
    isLoading: queryResult.isLoading || metricsLoading,
    isFetching: queryResult.isFetching || metricsFetching,
    isPending: queryResult.isPending || metricsLoading,
  };
}
