import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport, Workout, Post } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useUser } from '@/store/auth';
import { useAthleteMetrics } from './useAthleteMetrics';
import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type TokenRow = Database['public']['Tables']['athlete_tokens']['Row'];
type PostRow = Database['public']['Tables']['posts']['Row'];

type MyAthletePageResult = {
  athlete: Athlete;
  nextPage?: number;
};

const POSTS_PAGE_SIZE = 10;

export function useMyAthlete() {
  const user = useUser();
  const athleteId = user?.id ? [user.id] : undefined;
  const { data: metricsMap, isLoading: metricsLoading, isFetching: metricsFetching } = useAthleteMetrics(
    '24h',
    athleteId
  );

  const queryResult = useInfiniteQuery<MyAthletePageResult>({
    queryKey: ['my-athlete', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id) return null;

      const currentPage = Number(pageParam) || 0;
      const from = currentPage * POSTS_PAGE_SIZE;
      const to = from + POSTS_PAGE_SIZE - 1;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, sport, avatar_url, bio, instagram_url, strava_url, created_at')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: tokens, error: tokenError } = await supabase
        .from('athlete_tokens')
        .select('athlete_id, symbol, supply, a, b, c, treasury_balance, athlete_earnings')
        .eq('athlete_id', user.id);

      if (tokenError) throw tokenError;

      const token: any = tokens?.[0];

      const { data: rawPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, created_at, author_id, workout_json, image_url, text, token_gated, strava_activity_id, visibility, min_tokens_required')
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

      // Convert posts to typed objects and workouts format
      const posts: Post[] = (rawPosts || []).map((p: any) => ({
        id: p.id,
        created_at: p.created_at,
        workout_json: p.workout_json as Workout | Record<string, unknown> | null,
        image_url: p.image_url,
        text: p.text,
        token_gated: Boolean(p.token_gated),
        strava_activity_id: p.strava_activity_id,
        author_id: p.author_id,
        visibility: (p.visibility as Post['visibility']) ?? 'public',
        min_tokens_required: p.min_tokens_required ?? 0,
      }));

      const workouts: Workout[] = posts
        .filter((p) => p.workout_json && typeof p.workout_json === 'object' && !Array.isArray(p.workout_json))
        .map((p) => {
          const workoutJson = p.workout_json as Partial<Workout>;
          return {
            id: p.id,
            date: workoutJson.date || new Date(p.created_at).toISOString().split('T')[0],
            type: workoutJson.type || 'Other',
            duration: workoutJson.duration || 0,
            rpe: workoutJson.rpe || 5,
            distance: workoutJson.distance,
            pace: workoutJson.pace,
            speed: workoutJson.speed,
            notes: workoutJson.notes ?? p.text ?? '',
            mediaUrl: workoutJson.mediaUrl ?? (p.image_url ?? undefined),
            mediaType: workoutJson.mediaType ?? (p.image_url ? ('image' as const) : undefined),
            visibility: p.visibility,
            minTokensRequired: p.min_tokens_required,
          } as Workout;
        });

      const avatarSource = athleteAvatars[(profile as any).username] ?? (profile as any).avatar_url;

      const athlete: Athlete = {
        id: (profile as any).id,
        slug: (profile as any).username,
        name: (profile as any).display_name || (profile as any).username,
        sport: ((profile as any).sport || 'Other') as Sport,
        avatar: resolveAvatarUrl(avatarSource, { size: 192 }),
        bio: (profile as any).bio || '',
        location: '',
        socials: {
          instagram: (profile as any).instagram_url || undefined,
          strava: (profile as any).strava_url || undefined,
        },
        supply,
        reserve: token?.treasury_balance || 0,
        price,
        marketCap,
        athleteRevenue: token?.athlete_earnings || 0,
        change24h: 0,
        volume24h: 0,
        workouts,
        posts,
      };

      const metrics = metricsMap?.get(athlete.id);
      if (metrics) {
        athlete.change24h = metrics.changePct;
        athlete.volume24h = metrics.volume;
      }

      return {
        athlete,
        nextPage: posts.length === POSTS_PAGE_SIZE ? currentPage + 1 : undefined,
      };
    },
    enabled: !!user?.id,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage?.nextPage,

  });

  return {
    ...queryResult,
    data: queryResult.data?.pages?.[0],
    pages: queryResult.data?.pages ?? [],
    isLoading: queryResult.isLoading || metricsLoading,
    isFetching: queryResult.isFetching || metricsFetching,
    isPending: queryResult.isPending || metricsLoading,
  };
}
