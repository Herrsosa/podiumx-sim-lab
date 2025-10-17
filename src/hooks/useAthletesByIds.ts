
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport, Workout, Post } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useAthleteMetrics } from './useAthleteMetrics';
import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type TokenRow = Database['public']['Tables']['athlete_tokens']['Row'];
type PostRow = Database['public']['Tables']['posts']['Row'];

export function useAthletesByIds(athleteIds: string[]) {
  const { data: metricsMap, isLoading: metricsLoading, isFetching: metricsFetching } = useAthleteMetrics(
    '24h',
    athleteIds
  );

  const queryResult = useQuery({
    queryKey: ['athletes-by-ids', athleteIds],
    queryFn: async () => {
      if (!athleteIds || athleteIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select<ProfileRow>('id, username, display_name, sport, avatar_url, bio, instagram_url, strava_url, created_at')
        .in('id', athleteIds);

      if (profilesError) throw profilesError;

      const { data: tokens, error: tokensError } = await supabase
        .from('athlete_tokens')
        .select<TokenRow>('athlete_id, supply, a, b, c, treasury_balance, athlete_earnings')
        .in('athlete_id', athleteIds);

      if (tokensError) throw tokensError;

      const postsLimit = Math.min(Math.max(athleteIds.length * 25, 50), 500);

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select<PostRow>('id, created_at, author_id, workout_json, image_url, text, token_gated, strava_activity_id')
        .in('author_id', athleteIds)
        .order('created_at', { ascending: false })
        .limit(postsLimit);

      if (postsError) throw postsError;

      const typedPosts: Post[] = (posts ?? []).map((post) => ({
        id: post.id,
        created_at: post.created_at,
        workout_json: post.workout_json as Workout | Record<string, unknown> | null,
        image_url: post.image_url,
        text: post.text,
        token_gated: Boolean(post.token_gated),
        strava_activity_id: post.strava_activity_id,
        author_id: post.author_id,
      }));

      // Combine profile + token data
      const athletes: Athlete[] = profiles.map((profile) => {
        const token = tokens.find((t) => t.athlete_id === profile.id);
        const athletePosts = typedPosts.filter((p) => p.author_id === profile.id);

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
          avatar: resolveAvatarUrl(avatarSource, { size: 128 }),
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
          posts: athletePosts,
        };
      });

      return athletes.map((athlete) => {
        const metrics = metricsMap?.get(athlete.id);
        if (!metrics) return athlete;

        return {
          ...athlete,
          change24h: metrics.changePct,
          volume24h: metrics.volume,
        };
      });
    },
    enabled: athleteIds && athleteIds.length > 0,
  });

  return {
    ...queryResult,
    isLoading: queryResult.isLoading || metricsLoading,
    isFetching: queryResult.isFetching || metricsFetching,
    isPending: queryResult.isPending || metricsLoading,
  };
}
