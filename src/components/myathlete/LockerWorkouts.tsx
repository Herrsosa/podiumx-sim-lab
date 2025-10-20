import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import ProofOfSweat from '@/components/ProofOfSweat';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkouts } from '@/hooks/useWorkouts';

export default function LockerWorkouts() {
  const { data: athleteData, isLoading: athleteLoading } = useMyAthlete();
  const athlete = athleteData?.athlete;
  const workoutsQuery = useWorkouts(athlete?.id, { pageSize: 50 });
  const isLoading = athleteLoading || workoutsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-6 text-muted-foreground">
        Unable to load athlete workouts.
      </div>
    );
  }

  const workoutItems = workoutsQuery.data ?? [];
  const workouts = workoutItems
    .map((item) => item.workout)
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  const posts = workoutItems.map((item) => ({
    id: item.id,
    created_at: item.createdAt,
    author_id: athlete.id,
    workout_json: item.workout,
    image_url: item.imageUrl,
    text: item.notes,
    token_gated: item.visibility !== 'public',
    strava_activity_id: null,
    visibility: item.visibility,
    min_tokens_required: item.minTokensRequired,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">My Workouts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your workout posts and set access levels
          </p>
        </div>
        <Button asChild>
          <a href="/my-athlete/locker/workouts?add-workout=true">
            <Plus className="mr-2 h-4 w-4" />
            Add Workout
          </a>
        </Button>
      </div>

      {workouts.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="mb-4 text-muted-foreground">No workouts yet</p>
            <Button asChild>
              <a href="/my-athlete/locker/workouts?add-workout=true">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Workout
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <ProofOfSweat
          athleteId={athlete.id}
          athleteName={athlete.name}
          posts={posts}
          workouts={workouts}
          viewerHoldings={Number.MAX_SAFE_INTEGER}
        />
      )}
    </div>
  );
}
