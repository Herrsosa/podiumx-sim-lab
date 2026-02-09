import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Workout, Post } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type WorkoutVisibility = 'public' | 'supporters' | 'backers';

export interface LockerWorkout {
  id: string;
  createdAt: string;
  workout: Workout | null;
  visibility: WorkoutVisibility;
  minTokensRequired: number;
  imageUrl: string | null;
  notes: string | null;
  // Location fields
  locationCity: string | null;
  locationCountry: string | null;
  locationCountryCode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  // Strava map
  stravaMapPolyline: string | null;
  stravaActivityId: number | null;
  isPinned: boolean;
}

export type WorkoutViewerRole = 'owner' | 'backer' | 'supporter' | 'fan';

export interface WorkoutMutationResult {
  workout: LockerWorkout;
  post: Post;
}

type PostRow = Database['public']['Tables']['posts']['Row'];

export const mapPostRowToLockerWorkout = (row: PostRow): LockerWorkout => {
  const workoutJson = row.workout_json as Partial<Workout> | null;
  const workout: Workout | null = workoutJson
    ? ({
      id: row.id,
      ...workoutJson,
      date: workoutJson.date ?? row.created_at,
      notes: workoutJson.notes ?? row.text ?? '',
      mediaUrl: workoutJson.mediaUrl ?? row.image_url ?? undefined,
      mediaType:
        workoutJson.mediaType ??
        (row.image_url ? ('image' as const) : undefined),
      visibility: (row.visibility as WorkoutVisibility) ?? 'public',
      minTokensRequired: row.min_tokens_required ?? 0,
    } as Workout)
    : null;

  return {
    id: row.id,
    createdAt: row.created_at,
    workout,
    visibility: (row.visibility as WorkoutVisibility) ?? 'public',
    minTokensRequired: row.min_tokens_required ?? 0,
    imageUrl: row.image_url,
    notes: row.text,
    // Map location fields
    locationCity: row.location_city ?? null,
    locationCountry: row.location_country ?? null,
    locationCountryCode: row.location_country_code ?? null,
    locationLat: row.location_lat ?? null,
    locationLng: row.location_lng ?? null,
    // Strava map
    stravaMapPolyline: row.strava_map_polyline ?? null,
    stravaActivityId: row.strava_activity_id ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isPinned: (row as any).is_pinned ?? false,
  };
};

// Update Post mapper to include is_pinned and location fields
export const mapPostRowToPost = (row: PostRow): Post => ({
  id: row.id,
  created_at: row.created_at,
  author_id: row.author_id,
  workout_json: (row.workout_json as Workout | Record<string, unknown> | null) ?? null,
  image_url: row.image_url,
  text: row.text,
  token_gated: Boolean(row.token_gated),
  strava_activity_id: row.strava_activity_id,
  visibility: (row.visibility as WorkoutVisibility) ?? 'public',
  min_tokens_required: row.min_tokens_required ?? 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  is_pinned: (row as any).is_pinned,
  // Location fields
  location_city: row.location_city ?? null,
  location_country: row.location_country ?? null,
  location_country_code: row.location_country_code ?? null,
  location_lat: row.location_lat ?? null,
  location_lng: row.location_lng ?? null,
});

interface UseWorkoutsOptions {
  pageSize?: number;
  viewerRole?: WorkoutViewerRole;
  startDate?: Date;
  endDate?: Date;
}

const DEFAULT_PAGE_SIZE = 15;

type WorkoutsPage = {
  items: LockerWorkout[];
  nextCursor?: number;
  total: number;
};

export const workoutsQueryKey = (params: {
  athleteId?: string;
  viewerRole: WorkoutViewerRole;
  pageSize: number;
  startDate?: string;
  endDate?: string;
}) => ['workouts', params] as const;

type WorkoutsQueryData = InfiniteData<WorkoutsPage>;

const flattenWorkouts = (data: WorkoutsQueryData | undefined) =>
  data?.pages.flatMap((page) => page.items) ?? [];

const deriveTotal = (data: WorkoutsQueryData | undefined, fallback: number) =>
  data?.pages?.[data.pages.length - 1]?.total ?? fallback;

const paginateWorkouts = (items: LockerWorkout[], pageSize: number, total: number): WorkoutsQueryData => {
  if (items.length === 0) {
    return {
      pages: [
        {
          items: [],
          total: Math.max(total, 0),
          nextCursor: undefined,
        },
      ],
      pageParams: [0],
    };
  }

  const pages: WorkoutsPage[] = [];
  const pageParams: number[] = [];

  for (let offset = 0; offset < items.length; offset += pageSize) {
    const slice = items.slice(offset, offset + pageSize);
    const hasMore = offset + slice.length < Math.max(total, items.length);
    pages.push({
      items: slice,
      total: Math.max(total, items.length),
      nextCursor: hasMore ? offset + pageSize : undefined,
    });
    pageParams.push(offset);
  }

  return {
    pages,
    pageParams,
  };
};

type WorkoutsUpdater = (current: LockerWorkout[]) => LockerWorkout[];

export const updateWorkoutsCache = (
  queryClient: QueryClient,
  params: { athleteId?: string; viewerRole: WorkoutViewerRole; pageSize: number; startDate?: string; endDate?: string },
  reducer: WorkoutsUpdater,
) => {
  const key = workoutsQueryKey(params);
  queryClient.setQueryData<WorkoutsQueryData | undefined>(key, (current) => {
    const currentItems = flattenWorkouts(current);
    const nextItems = reducer(currentItems);

    if (nextItems === currentItems) {
      return current ?? paginateWorkouts([], params.pageSize, 0);
    }

    if (
      nextItems.length === currentItems.length &&
      nextItems.every((item, index) => item === currentItems[index])
    ) {
      return current ?? paginateWorkouts(nextItems, params.pageSize, nextItems.length);
    }

    const baseTotal = deriveTotal(current, currentItems.length);
    const delta = nextItems.length - currentItems.length;
    const total = Math.max(baseTotal + delta, nextItems.length);

    return paginateWorkouts(nextItems, params.pageSize, total);
  });
};

export const addWorkoutToCache = (
  queryClient: QueryClient,
  params: { athleteId?: string; viewerRole: WorkoutViewerRole; pageSize: number; startDate?: string; endDate?: string },
  workout: LockerWorkout,
) =>
  updateWorkoutsCache(queryClient, params, (current) => {
    const filtered = current.filter((item) => item.id !== workout.id);
    return [workout, ...filtered];
  });

export const replaceWorkoutInCache = (
  queryClient: QueryClient,
  params: { athleteId?: string; viewerRole: WorkoutViewerRole; pageSize: number; startDate?: string; endDate?: string },
  workout: LockerWorkout,
) =>
  updateWorkoutsCache(queryClient, params, (current) => {
    const index = current.findIndex((item) => item.id === workout.id);
    if (index === -1) return current;
    const next = [...current];
    next[index] = workout;
    return next;
  });

export const removeWorkoutFromCache = (
  queryClient: QueryClient,
  params: { athleteId?: string; viewerRole: WorkoutViewerRole; pageSize: number; startDate?: string; endDate?: string },
  workoutId: string,
) =>
  updateWorkoutsCache(queryClient, params, (current) => current.filter((item) => item.id !== workoutId));

export function useWorkouts(
  athleteId: string | undefined,
  { pageSize = DEFAULT_PAGE_SIZE, viewerRole = 'fan', startDate, endDate }: UseWorkoutsOptions = {},
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const startDateStr = startDate?.toISOString();
  const endDateStr = endDate?.toISOString();
  const queryKey = workoutsQueryKey({ athleteId, viewerRole, pageSize, startDate: startDateStr, endDate: endDateStr });

  const queryResult = useInfiniteQuery<WorkoutsPage>({
    queryKey,
    initialPageParam: 0,
    enabled: Boolean(athleteId),
    staleTime: 15_000,
    retry: false,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    queryFn: async ({ pageParam = 0 }) => {
      if (!athleteId) {
        return {
          items: [],
          nextCursor: undefined,
          total: 0,
        };
      }

      const offset = Number(pageParam) || 0;
      const from = offset;
      const to = offset + pageSize - 1;

      let query = supabase
        .from('posts')
        .select(
          'id, created_at, author_id, workout_json, image_url, text, visibility, min_tokens_required, token_gated, strava_activity_id, is_pinned, location_city, location_country, location_country_code, location_lat, location_lng, strava_map_polyline',
          { count: 'exact' },
        )
        .eq('author_id', athleteId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const rows = (data ?? []) as unknown as PostRow[];
      const items = rows.map(mapPostRowToLockerWorkout);

      const hasMore = items.length === pageSize;

      return {
        items,
        nextCursor: hasMore ? offset + pageSize : undefined,
        total: count ?? items.length,
      };
    },
  });

  // Handle errors in component
  if (queryResult.error) {
    const message = queryResult.error instanceof Error ? queryResult.error.message : 'Please try again.';
    toast({
      title: 'Unable to load workouts',
      description: message,
      variant: 'destructive',
    });
  }

  const workouts =
    queryResult.data?.pages.flatMap((page) => (page as WorkoutsPage).items) ?? [];

  return {
    ...queryResult,
    workouts,
    pages: queryResult.data?.pages ?? [],
    totalCount:
      (queryResult.data?.pages.slice(-1)[0] as WorkoutsPage | undefined)?.total ??
      (queryResult.data?.pages[0] as WorkoutsPage | undefined)?.total ??
      workouts.length,
  };
}
