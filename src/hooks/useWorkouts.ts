import { useQuery } from '@tanstack/react-query';
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

const DEFAULT_PAGE_SIZE = 20;

export function useWorkouts(
  athleteId: string | undefined,
  { pageSize = DEFAULT_PAGE_SIZE }: UseWorkoutsOptions = {},
) {
  return useQuery({
    queryKey: ['workouts', athleteId, pageSize],
    enabled: Boolean(athleteId),
    queryFn: async () => {
      if (!athleteId) return [] as LockerWorkout[];

      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, created_at, workout_json, image_url, text, visibility, min_tokens_required',
        )
        .eq('author_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (error) throw error;

      return (data ?? []).map((row) => {
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
      });
    },
  });
}
