import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { Post, Sport, Workout } from '@/types';
import { resolveAvatarUrl } from '@/utils/avatar';
import { mapPostRowToLockerWorkout, mapPostRowToPost } from '@/hooks/useWorkouts';

type PostRow = Database['public']['Tables']['posts']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface FeedPostRow extends PostRow {
  profiles: Pick<ProfileRow, 'id' | 'display_name' | 'username' | 'avatar_url' | 'sport'> | null;
}

export interface ProofOfSweatFeedItem {
  post: Post;
  workout: Workout;
  athlete: {
    id: string;
    name: string;
    slug: string;
    avatar?: string | null;
    sport?: Sport;
  };
}

interface FeedPage {
  items: ProofOfSweatFeedItem[];
  nextPage?: number;
}

interface UseProofOfSweatFeedOptions {
  athleteId?: string;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 12;

const ensureWorkoutFromPost = (post: Post): Workout => ({
  id: post.id,
  date: post.created_at,
  type: 'Other',
  duration: 0,
  rpe: 5,
  notes: post.text ?? '',
  mediaUrl: typeof post.workout_json === 'object' && post.workout_json !== null && 'mediaUrl' in post.workout_json
    ? (post.workout_json as Record<string, unknown>).mediaUrl as string | undefined
    : post.image_url ?? undefined,
  mediaType: post.image_url ? 'image' : undefined,
  visibility: post.visibility,
  minTokensRequired: post.min_tokens_required ?? 0,
});

export function useProofOfSweatFeed(options: UseProofOfSweatFeedOptions = {}) {
  const { athleteId, pageSize = DEFAULT_PAGE_SIZE } = options;

  return useInfiniteQuery<FeedPage>({
    queryKey: ['proof-of-sweat-feed', athleteId, pageSize],
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage?.nextPage,
    queryFn: async ({ pageParam = 0 }) => {
      const currentPage = Number(pageParam) || 0;
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('posts')
        .select(
          `
            id,
            created_at,
            author_id,
            workout_json,
            image_url,
            text,
            token_gated,
            strava_activity_id,
            visibility,
            min_tokens_required,
            profiles:profiles!posts_author_id_profiles_id_fk (
              id,
              display_name,
              username,
              avatar_url,
              sport
            )
          `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      if (athleteId) {
        query = query.eq('author_id', athleteId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as FeedPostRow[];

      const items: ProofOfSweatFeedItem[] = rows.map((row) => {
        const lockerWorkout = mapPostRowToLockerWorkout(row);
        const post = mapPostRowToPost(row);
        const workout =
          lockerWorkout.workout ??
          ensureWorkoutFromPost(post);

        const profile = row.profiles;
        const slug = profile?.username ?? row.author_id;
        const name = profile?.display_name || profile?.username || 'Unknown Athlete';

        return {
          post,
          workout: {
            ...workout,
            mediaUrl: workout.mediaUrl ?? lockerWorkout.imageUrl ?? post.image_url ?? undefined,
            visibility: post.visibility,
            minTokensRequired: post.min_tokens_required ?? workout.minTokensRequired,
          },
          athlete: {
            id: row.author_id,
            name,
            slug,
            sport: (profile?.sport as Sport) || 'Running',
            avatar: resolveAvatarUrl(profile?.avatar_url ?? undefined, { size: 160 }),
          },
        };
      });

      const total = count ?? rows.length;
      const hasMore = to + 1 < total;

      return {
        items,
        nextPage: hasMore ? currentPage + 1 : undefined,
      };
    },
  });
}
