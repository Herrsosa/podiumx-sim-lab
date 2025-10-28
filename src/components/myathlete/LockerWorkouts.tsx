import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import ProofOfSweat from '@/components/ProofOfSweat';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkouts } from '@/hooks/useWorkouts';
import AddWorkoutModal from '@/components/AddWorkoutModal';

interface LockerWorkoutsProps {
  athleteId?: string;
  athleteName?: string;
  isOwner?: boolean;
  viewerHoldings?: number;
}

export default function LockerWorkouts({
  athleteId: lockerAthleteId,
  athleteName: lockerAthleteName,
  isOwner: isOwnerProp,
  viewerHoldings = 0,
}: LockerWorkoutsProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: athleteData, isLoading: athleteLoading } = useMyAthlete();
  const athlete = athleteData?.athlete;
  const queryClient = useQueryClient();
  const isAddWorkoutOpen = searchParams.get('add-workout') === 'true';
  const effectiveAthleteId = lockerAthleteId ?? athlete?.id;
  const effectiveAthleteName = lockerAthleteName ?? athlete?.name ?? 'Athlete';
  const canEdit = isOwnerProp ?? (!lockerAthleteId && Boolean(athlete?.id));
  const workoutsQuery = useWorkouts(effectiveAthleteId, { pageSize: 30 });
  const { fetchNextPage, hasNextPage = false, isFetchingNextPage } = workoutsQuery;
  const isLoading = (!lockerAthleteId && athleteLoading) || workoutsQuery.isLoading;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [intersectionFailed, setIntersectionFailed] = useState(false);
  const effectiveViewerHoldings = canEdit ? Number.MAX_SAFE_INTEGER : viewerHoldings;
  const headerTitle = canEdit
    ? 'My Workouts'
    : `${effectiveAthleteName}'s Workouts`;
  const headerDescription = canEdit
    ? 'Manage your workout posts and set access levels'
    : 'Catch the latest training sessions shared with supporters';

  const openAddWorkoutModal = useCallback(() => {
    if (!canEdit) return;
    if (isAddWorkoutOpen) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('add-workout', 'true');
    setSearchParams(nextParams);
  }, [canEdit, isAddWorkoutOpen, searchParams, setSearchParams]);

  const handleModalOpenChange = useCallback(
    (open: boolean) => {
      if (!canEdit) return;
      const currentlyOpen = searchParams.get('add-workout') === 'true';
      if (open === currentlyOpen) return;

      const nextParams = new URLSearchParams(searchParams);
      if (open) {
        nextParams.set('add-workout', 'true');
        setSearchParams(nextParams);
        return;
      }

      if (!nextParams.has('add-workout')) return;
      nextParams.delete('add-workout');
      setSearchParams(nextParams, { replace: true });
    },
    [canEdit, searchParams, setSearchParams],
  );

  const handleWorkoutSuccess = useCallback(async () => {
    if (!canEdit) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workouts'] }),
      queryClient.invalidateQueries({ queryKey: ['my-athlete'] }),
    ]);
  }, [canEdit, queryClient]);

  const workoutItems = useMemo(
    () => workoutsQuery.workouts ?? [],
    [workoutsQuery.workouts]
  );
  

  const { workouts, posts } = useMemo(() => {
    const assembledWorkouts = workoutItems
      .map((item) => item.workout)
      .filter((w): w is NonNullable<typeof w> => Boolean(w));

    const assembledPosts = workoutItems.map((item) => ({
      id: item.id,
      created_at: item.createdAt,
      author_id: effectiveAthleteId,
      workout_json: item.workout,
      image_url: item.imageUrl,
      text: item.notes,
      token_gated: item.visibility !== 'public',
      strava_activity_id: null,
      visibility: item.visibility,
      min_tokens_required: item.minTokensRequired,
    }));

    return {
      workouts: assembledWorkouts,
      posts: assembledPosts,
    };
  }, [workoutItems, effectiveAthleteId]);

  // Infinite scroll with IntersectionObserver (with fallback detection)
  useEffect(() => {
    if (!hasNextPage || intersectionFailed) return;
    const node = loadMoreRef.current;
    if (!node) return;

    try {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { rootMargin: '200px' },
      );

      observer.observe(node);

      // Detect if IntersectionObserver fails (iOS low-power mode)
      const timeout = setTimeout(() => {
        if (hasNextPage && !isFetchingNextPage) {
          setIntersectionFailed(true);
        }
      }, 3000);

      return () => {
        observer.disconnect();
        clearTimeout(timeout);
      };
    } catch (err) {
      console.warn('IntersectionObserver failed:', err);
      setIntersectionFailed(true);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, intersectionFailed]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!effectiveAthleteId) {
    return (
      <div className="p-6 text-muted-foreground">
        Unable to load athlete workouts.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{headerTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {headerDescription}
          </p>
        </div>
        {canEdit && (
          <Button onClick={openAddWorkoutModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Workout
          </Button>
        )}
      </div>

      {workouts.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="mb-4 text-muted-foreground">No workouts yet</p>
            {canEdit && (
              <Button onClick={openAddWorkoutModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Workout
              </Button>
            )}
          </div>
        </div>
      ) : (
        <ProofOfSweat
          athleteId={effectiveAthleteId}
          athleteName={effectiveAthleteName}
          posts={posts}
          workouts={workouts}
          viewerHoldings={effectiveViewerHoldings}
          groupByMonth
          initialExpandedMonths={4}
        />
      )}

      {!intersectionFailed && <div ref={loadMoreRef} className="h-8" aria-hidden="true" />}
      
      {hasNextPage && (
        <div className="flex flex-col items-center gap-3">
          {intersectionFailed || isFetchingNextPage ? (
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              size="lg"
              className="w-full max-w-xs"
            >
              {isFetchingNextPage ? 'Loading more workouts…' : 'Load more workouts'}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scroll to load more
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <AddWorkoutModal
          open={isAddWorkoutOpen}
          onOpenChange={handleModalOpenChange}
          athleteId={effectiveAthleteId}
          onSuccess={handleWorkoutSuccess}
        />
      )}
    </div>
  );
}
