
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport, Workout, Post } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useAthleteMetrics } from './useAthleteMetrics';
import type { Database } from '@/integrations/supabase/types';
import {
  isPostEnhancementSchemaError,
  markPostEnhancementsUnavailable,
  shouldUsePostEnhancements,
} from '@/lib/postSchemaCompat';

type PostRow = Database['public']['Tables']['posts']['Row'];

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
  type?: 'human' | 'agent' | null;
  onchain_initialized?: boolean | null;
  onchain_price?: number | string | null;
  onchain_updated_at?: string | null;
};

export function useAthletesByIds(athleteIds: string[]) {
  const { data: metricsMap, isLoading: metricsLoading, isFetching: metricsFetching } = useAthleteMetrics(
    '24h',
    athleteIds
  );

  const queryResult = useQuery({
    queryKey: ['athletes-by-ids', athleteIds],
    queryFn: async () => {
      if (!athleteIds || athleteIds.length === 0) return [];

      // Use batch RPC to get combined profile + token data
      const { data, error } = await supabase.rpc('get_athletes_batch', { _ids: athleteIds });

      if (error) throw error;

      const rows = (data || []) as BatchAthleteRow[];

      const postsLimit = Math.min(Math.max(athleteIds.length * 25, 50), 500);

      const buildPostsQuery = (includePostType: boolean) => {
        const select = includePostType
          ? 'id, created_at, author_id, workout_json, image_url, text, token_gated, strava_activity_id, visibility, min_tokens_required, post_type'
          : 'id, created_at, author_id, workout_json, image_url, text, token_gated, strava_activity_id, visibility, min_tokens_required';

        return supabase
          .from('posts')
          .select(select)
          .in('author_id', athleteIds)
          .order('created_at', { ascending: false })
          .limit(postsLimit);
      };

      const preferEnhancements = shouldUsePostEnhancements();
      let { data: posts, error: postsError } = await buildPostsQuery(preferEnhancements);

      if (preferEnhancements && postsError && isPostEnhancementSchemaError(postsError)) {
        markPostEnhancementsUnavailable();
        ({ data: posts, error: postsError } = await buildPostsQuery(false));
      }

      if (postsError) throw postsError;

      const postRows: PostRow[] = (posts ?? []) as PostRow[];

      const typedPosts: Post[] = postRows.map((post) => ({
        id: post.id,
        created_at: post.created_at,
        workout_json: (post.workout_json as Workout | Record<string, unknown> | null) ?? null,
        image_url: post.image_url,
        text: post.text,
        token_gated: Boolean(post.token_gated),
        strava_activity_id: post.strava_activity_id,
        author_id: post.author_id,
        visibility: (post.visibility as 'public' | 'supporters' | 'backers') || 'public',
        min_tokens_required: post.min_tokens_required || 0,
        post_type: (post.post_type as Post['post_type']) || 'proof_of_sweat',
      }));

      // Combine batch data with posts
      const athletes: Athlete[] = rows.map((row) => {
        const athletePosts = typedPosts.filter((p) => p.author_id === row.id);

        // Calculate current price from bonding curve
        const onchainPrice = row.onchain_price != null ? Number(row.onchain_price) : Number.NaN;
        const price =
          Number.isFinite(onchainPrice) && onchainPrice > 0
            ? onchainPrice
            : priceAt(row.supply, { a: row.a, b: row.b, c: row.c });
        const marketCap = price * row.supply;

        // Convert posts to workouts format
        const workouts = athletePosts
          .filter((post) => post.post_type === 'proof_of_sweat')
          .filter((post) => post.workout_json && typeof post.workout_json === 'object' && !Array.isArray(post.workout_json))
          .map((post) => ({
            id: post.id,
            ...(post.workout_json as Workout),
          }));

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
          workouts,
          posts: athletePosts,
          profileType: row.type ?? 'human',
        };
      });

      return athletes;
    },
    enabled: athleteIds && athleteIds.length > 0,
  });

  const athletesWithMetrics = useMemo(() => {
    const base = (queryResult.data ?? []) as Athlete[];
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
  }, [queryResult.data, metricsMap]);

  return {
    ...queryResult,
    data: athletesWithMetrics,
    isLoading: queryResult.isLoading || metricsLoading,
    isFetching: queryResult.isFetching || metricsFetching,
    isPending: queryResult.isPending || metricsLoading,
  };
}
