import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Post } from '@/types';
import type { Database } from '@/integrations/supabase/types';

type PostRow = Database['public']['Tables']['posts']['Row'];

/**
 * Hook to fetch ALL posts with workouts for chart display
 * Unlike useWorkouts which paginates, this fetches all posts in one query
 * for accurate PoS visualization across all time ranges
 */
export function useChartPosts(athleteId: string | undefined, startDate?: number) {
  return useQuery({
    queryKey: ['chart-posts', athleteId, startDate],
    enabled: Boolean(athleteId),
    staleTime: 60_000, // 1 minute
    queryFn: async (): Promise<Post[]> => {
      if (!athleteId) return [];

      console.log('[useChartPosts] Fetching posts for athlete:', athleteId, 'startDate:', startDate);

      let query = supabase
        .from('posts')
        .select('id, created_at, author_id, workout_json, image_url, text, token_gated, strava_activity_id, visibility, min_tokens_required')
        .eq('author_id', athleteId)
        .not('workout_json', 'is', null)
        .order('created_at', { ascending: false });

      // Filter by start date if provided
      if (startDate) {
        const startDateISO = new Date(startDate).toISOString();
        console.log('[useChartPosts] Filtering by start date:', startDateISO);
        query = query.gte('created_at', startDateISO);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = (data ?? []) as PostRow[];
      console.log('[useChartPosts] Fetched', rows.length, 'workout posts');
      console.log('[useChartPosts] Posts:', rows.map(r => ({ id: r.id, created_at: r.created_at })));
      
      return rows.map<Post>((row) => ({
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
      }));
    },
  });
}
