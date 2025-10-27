import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Workout } from '@/types';

export type WorkoutVisibility = 'public' | 'supporters' | 'backers';

export interface LockerWorkout {
  id: string;
  createdAt: string;
  workout: Workout | null;
  visibility: WorkoutVisibility;
  minTokensRequired: number;
  imageUrl: string | null;
  notes: string | null;
}

interface UseWorkoutsOptions {
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 30;

type WorkoutsPage = {
  items: LockerWorkout[];
  nextCursor?: number;
  total: number;
};

export function useWorkouts(
  athleteId: string | undefined,
  { pageSize = DEFAULT_PAGE_SIZE }: UseWorkoutsOptions = {},
) {
  const queryResult = useInfiniteQuery<WorkoutsPage>({
    queryKey: ['workouts', athleteId, pageSize],
    initialPageParam: 0,
    enabled: Boolean(athleteId),
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

      const { data, error, count } = await supabase
        .from('posts')
        .select(
          'id, created_at, workout_json, image_url, text, visibility, min_tokens_required',
          { count: 'exact' },
        )
        .eq('author_id', athleteId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const items =
        data?.map((row) => {
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
          } satisfies LockerWorkout;
        }) ?? [];

      const hasMore = items.length === pageSize;

      return {
        items,
        nextCursor: hasMore ? offset + pageSize : undefined,
        total: count ?? items.length,
      };
    },
  });

  const workouts =
    queryResult.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    ...queryResult,
    workouts,
    pages: queryResult.data?.pages ?? [],
    totalCount:
      queryResult.data?.pages.slice(-1)[0]?.total ??
      queryResult.data?.pages[0]?.total ??
      workouts.length,
  };
}
