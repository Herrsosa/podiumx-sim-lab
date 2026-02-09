import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport, Workout, Post } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { resolveAvatarUrl } from '@/utils/avatar';
import { useUser } from '@/store/auth';
import { useAthleteMetrics } from './useAthleteMetrics';
import { getActivityRaw } from '@/utils/stravaActivity';
import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type TokenRow = Database['public']['Tables']['athlete_tokens']['Row'];
type PostRow = Database['public']['Tables']['posts']['Row'];

type ProfileSummary = Pick<
  ProfileRow,
  'id' | 'username' | 'display_name' | 'sport' | 'avatar_url' | 'bio' | 'instagram_url' | 'strava_url' | 'created_at'
>;

export type MyAthletePageResult = {
  athlete: Athlete;
  hasToken: boolean;
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

      const [profileResult, tokenResult, postsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, sport, avatar_url, bio, instagram_url, strava_url, created_at')
          .eq('id', user.id)
          .single(),
        supabase
          .from('athlete_tokens')
          .select('athlete_id, symbol, supply, a, b, c, treasury_balance, athlete_earnings')
          .eq('athlete_id', user.id),
        supabase
          .from('posts')
          .select(
            'id, created_at, author_id, workout_json, image_url, text, token_gated, strava_activity_id, visibility, min_tokens_required, is_pinned, location_city, location_country, location_country_code, location_lat, location_lng',
          )
          .eq('author_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to),
      ]);

      const { data: rawPosts, error: postsError } = postsResult;
      if (postsError) throw postsError;

      const postRows: PostRow[] = (rawPosts ?? []) as unknown as PostRow[];

      // Fetch linked activities for these posts to get map data
      const stravaActivityIds = postRows
        .map(p => p.strava_activity_id)
        .filter((id): id is number => id !== null);

      const activityMap = new Map<number, string>();

      if (stravaActivityIds.length > 0) {
        // Query by external_id (Strava ID) since posts.strava_activity_id is likely the Strava ID
        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select('id, external_id, raw')
          .in('external_id', stravaActivityIds.map(String));

        if (activitiesError) {
          console.error('Error fetching activities:', activitiesError);
        }

        if (activities) {
          activities.forEach(activity => {
            const raw = getActivityRaw(activity as Database['public']['Tables']['activities']['Row']);
            // Try to find polyline in various Strava locations
            const map = raw?.map as Record<string, unknown> | undefined;
            const polyline = (map?.summary_polyline || map?.polyline) as string | undefined;

            // Map using the external_id because that's what we have in the post
            if (polyline && activity.external_id) {
              const stravaId = Number(activity.external_id);
              if (!isNaN(stravaId)) {
                activityMap.set(stravaId, polyline);
              }
            }
          });
        }
      }

      const { data: profile, error: profileError } = profileResult;
      if (profileError) throw profileError;
      if (!profile) return null;
      const profileData = profile as ProfileSummary;

      const { data: tokens, error: tokenError } = tokenResult;
      if (tokenError) throw tokenError;
      const tokenRows = (tokens ?? []) as TokenRow[];
      const token = tokenRows[0];
      const hasToken = !!token;

      // Calculate current price from bonding curve
      const supply = token?.supply || 0;
      const a = token?.a || 0.0002;
      const b = token?.b || 0.02;
      const c = token?.c || 1;
      const price = priceAt(supply, { a, b, c });
      const marketCap = price * supply;

      const posts: Post[] = postRows.map((post) => ({
        id: post.id,
        created_at: post.created_at,
        workout_json: (post.workout_json as Workout | Record<string, unknown> | null) ?? null,
        image_url: post.image_url,
        text: post.text,
        token_gated: Boolean(post.token_gated),
        strava_activity_id: post.strava_activity_id,
        strava_map_polyline: post.strava_activity_id ? activityMap.get(post.strava_activity_id) : null,
        author_id: post.author_id,
        visibility: (post.visibility as Post['visibility']) ?? 'public',
        min_tokens_required: post.min_tokens_required ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        is_pinned: (post as any).is_pinned,
        // Location fields
        location_city: post.location_city ?? null,
        location_country: post.location_country ?? null,
        location_country_code: post.location_country_code ?? null,
        location_lat: post.location_lat ?? null,
        location_lng: post.location_lng ?? null,
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

      const avatarSource = athleteAvatars[profileData.username] ?? profileData.avatar_url;

      const athlete: Athlete = {
        id: profileData.id,
        slug: profileData.username,
        name: profileData.display_name || profileData.username,
        sport: (profileData.sport || 'Other') as Sport,
        avatar: resolveAvatarUrl(avatarSource, { size: 192, seed: profileData.username ?? profileData.id }),
        bio: profileData.bio || '',
        location: '',
        socials: {
          instagram: profileData.instagram_url || undefined,
          strava: profileData.strava_url || undefined,
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
        const resolvedPrice = metrics.lastPrice > 0 ? metrics.lastPrice : athlete.price;
        athlete.price = resolvedPrice;
        athlete.marketCap = resolvedPrice * athlete.supply;
        athlete.change24h = metrics.changePct;
        athlete.volume24h = metrics.volume;
      }

      return {
        athlete,
        hasToken,
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
