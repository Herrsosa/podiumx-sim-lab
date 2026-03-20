import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Post } from '@/types';
import type { Database } from '@/integrations/supabase/types';
import {
  isPostEnhancementSchemaError,
  markPostEnhancementsUnavailable,
  shouldUsePostEnhancements,
} from '@/lib/postSchemaCompat';

type PostRow = Database['public']['Tables']['posts']['Row'];

const mapPostRowToPost = (row: PostRow): Post => ({
  id: row.id,
  created_at: row.created_at,
  author_id: row.author_id,
  workout_json: (row.workout_json as Post['workout_json']) ?? null,
  image_url: row.image_url,
  text: row.text,
  token_gated: Boolean(row.token_gated),
  strava_activity_id: row.strava_activity_id,
  visibility: row.visibility as Post['visibility'],
  min_tokens_required: row.min_tokens_required ?? 0,
  post_type: (row.post_type as Post['post_type']) ?? 'proof_of_sweat',
});

/**
 * Hook to fetch ALL posts with workouts for chart display
 * Unlike useWorkouts which paginates, this fetches all posts in one query
 * for accurate PoS visualization across all time ranges
 */
export function useChartPosts(athleteId: string | undefined, startDate?: number) {
  return useQuery<PostRow[], Error, Post[]>({
    queryKey: ['chart-posts', athleteId, startDate],
    enabled: Boolean(athleteId),
    staleTime: startDate ? 2 * 60_000 : 5 * 60_000,
    gcTime: 10 * 60_000,
    select: (rows) =>
      rows.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        author_id: row.author_id,
        // We know workout_json is not null due to the query filter.
        // We provide a minimal object to satisfy the type and truthiness check in AthletePriceChart.
        workout_json: { id: row.id } as Post['workout_json'],
        image_url: null,
        text: null,
        token_gated: false,
        strava_activity_id: null,
        visibility: 'public',
        min_tokens_required: 0,
      })),
    queryFn: async () => {
      if (!athleteId) return [];

      const buildQuery = (includePostType: boolean) => {
        let query = supabase
          .from('posts')
          .select(includePostType ? 'id, created_at, author_id, post_type' : 'id, created_at, author_id')
          .eq('author_id', athleteId)
          .not('workout_json', 'is', null)
          .order('created_at', { ascending: true });

        if (includePostType) {
          query = query.eq('post_type', 'proof_of_sweat');
        }

        if (startDate) {
          const startDateISO = new Date(startDate).toISOString();
          query = query.gte('created_at', startDateISO);
        }

        return query;
      };

      const preferEnhancements = shouldUsePostEnhancements();
      let { data, error } = await buildQuery(preferEnhancements);
      if (preferEnhancements && error && isPostEnhancementSchemaError(error)) {
        markPostEnhancementsUnavailable();
        ({ data, error } = await buildQuery(false));
      }
      if (error) throw error;

      return (data ?? []) as PostRow[];
    },
  });
}
