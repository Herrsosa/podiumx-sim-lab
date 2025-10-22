import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport, Workout, Post } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useAthleteMetrics } from './useAthleteMetrics';
import { useAthletePrice } from './useAthletePrice';
import type { Database } from '@/integrations/supabase/types';

type PostRow = Database['public']['Tables']['posts']['Row'];

export function useAthlete(slug: string) {
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

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(
          'id, created_at, author_id, workout_json, image_url, text, token_gated, strava_activity_id, visibility, min_tokens_required',
        )
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (postsError) throw postsError;

      const typedPosts: Post[] = (posts ?? []).map((post: any) => ({
        id: post.id,
        created_at: post.created_at,
        workout_json: post.workout_json as Workout | Record<string, unknown> | null,
        image_url: post.image_url,
        text: post.text,
        token_gated: Boolean(post.token_gated),
        strava_activity_id: post.strava_activity_id,
        author_id: post.author_id,
        visibility: (post.visibility as 'public' | 'supporters' | 'backers') || 'public',
        min_tokens_required: post.min_tokens_required || 0,
      }));

      const workouts = typedPosts
        .filter((p) => p.workout_json && typeof p.workout_json === 'object' && !Array.isArray(p.workout_json))
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
        avatar: resolveAvatarUrl(avatarSource, { size: 192 }),
        bio: profile.bio || '',
        location: '',
        socials: {
          instagram: profile.instagram_url || undefined,
          strava: profile.strava_url || undefined,
        },
        supply: 0,
        reserve: 0,
        price: 0,
        marketCap: 0,
        athleteRevenue: 0,
        change24h: 0,
        volume24h: 0,
        workouts,
        posts: typedPosts,
      };

      return athlete;
    },
    enabled: !!slug,
  });

  const athleteIdForMetrics = useMemo(() => {
    const id = queryResult.data?.id;
    return id ? [id] : undefined;
  }, [queryResult.data?.id]);

  const { data: priceSnapshot, isLoading: priceLoading, isFetching: priceFetching } = useAthletePrice(
    queryResult.data?.id,
  );

  const { data: metricsMap, isLoading: metricsLoading, isFetching: metricsFetching } = useAthleteMetrics(
    '24h',
    athleteIdForMetrics,
  );

  const athleteWithMetrics = useMemo(() => {
    if (!queryResult.data) return undefined;

    const enriched: Athlete = priceSnapshot
      ? {
          ...queryResult.data,
          supply: priceSnapshot.supply,
          reserve: priceSnapshot.reserve,
          price: priceSnapshot.price,
          marketCap: priceSnapshot.price * priceSnapshot.supply,
          athleteRevenue: priceSnapshot.athleteRevenue,
        }
      : queryResult.data;

    const metrics = metricsMap?.get(enriched.id);
    if (!metrics) return enriched;

    return {
      ...enriched,
      change24h: metrics.changePct,
      volume24h: metrics.volume,
    };
  }, [queryResult.data, priceSnapshot, metricsMap]);

  return {
    ...queryResult,
    data: athleteWithMetrics,
    isLoading: queryResult.isLoading || metricsLoading || priceLoading,
    isFetching: queryResult.isFetching || metricsFetching || priceFetching,
    isPending: queryResult.isPending || metricsLoading || priceLoading,
  };
}
