import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import type { MyAthletePageResult } from '@/hooks/useMyAthlete';
import ProofOfSweat from '@/components/ProofOfSweat';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useWorkouts,
  addWorkoutToCache,
  replaceWorkoutInCache,
  removeWorkoutFromCache,
  type WorkoutMutationResult,
  type WorkoutViewerRole,
} from '@/hooks/useWorkouts';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import type { Athlete } from '@/types';
import { DatePickerWithRange } from '@/components/DatePickerWithRange';
import { DateRange } from 'react-day-picker';

const PAGE_SIZE = 30;

interface LockerWorkoutsProps {
  athleteId?: string;
  athleteName?: string;
  isOwner?: boolean;
  viewerHoldings?: number;
}

export function LockerWorkouts({
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
  const effectiveAthleteHandle = athlete?.slug;
  const effectiveAthleteAvatar = athlete?.avatar;
  const canEdit = isOwnerProp ?? (!lockerAthleteId && Boolean(athlete?.id));
  const viewerRole = useMemo<WorkoutViewerRole>(() => {
    if (canEdit) return 'owner';
    if (viewerHoldings >= 10) return 'backer';
    if (viewerHoldings >= 1) return 'supporter';
    return 'fan';
  }, [canEdit, viewerHoldings]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const workoutsQuery = useWorkouts(effectiveAthleteId, {
    pageSize: PAGE_SIZE,
    viewerRole,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });
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

  const workoutsKeyParams = useMemo(
    () => ({
      athleteId: effectiveAthleteId,
      viewerRole,
      pageSize: PAGE_SIZE,
      startDate: dateRange?.from?.toISOString(),
      endDate: dateRange?.to?.toISOString(),
    }),
    [effectiveAthleteId, viewerRole, dateRange],
  );

  const updateMyAthleteCache = useCallback(
    (mutator: (prev: Athlete) => Athlete) => {
      if (!canEdit || !athlete?.id) return;
      queryClient.setQueryData<InfiniteData<MyAthletePageResult> | undefined>(
        ['my-athlete', athlete.id],
        (current) => {
          if (!current) return current;

          const pages = current.pages.map((page) => {
            if (!page?.athlete) return page;
            return {
              ...page,
              athlete: mutator(page.athlete),
            };
          });

          return {
            ...current,
            pages,
          };
        },
      );
    },
    [athlete?.id, canEdit, queryClient],
  );

  const handleWorkoutCreated = useCallback(
    async (result: WorkoutMutationResult) => {
      if (!effectiveAthleteId) return;
      addWorkoutToCache(queryClient, workoutsKeyParams, result.workout);

      updateMyAthleteCache((prev) => {
        const createdWorkout = result.workout.workout;
        const nextWorkouts = createdWorkout
          ? [createdWorkout, ...prev.workouts.filter((w) => w.id !== createdWorkout.id)]
          : prev.workouts;
        const nextPosts = [result.post, ...prev.posts.filter((post) => post.id !== result.post.id)];
        return {
          ...prev,
          workouts: nextWorkouts,
          posts: nextPosts,
        };
      });

      // Invalidate identity kernel so Aura Score updates
      await queryClient.invalidateQueries({
        queryKey: ['identity-kernel'],
      });
    },
    [effectiveAthleteId, queryClient, updateMyAthleteCache, workoutsKeyParams],
  );

  const handleWorkoutUpdated = useCallback(
    async (result: WorkoutMutationResult) => {
      if (!effectiveAthleteId) return;

      // Update the cache with the new workout data including location
      replaceWorkoutInCache(queryClient, workoutsKeyParams, result.workout);

      updateMyAthleteCache((prev) => {
        const updatedWorkout = result.workout.workout;
        const nextWorkouts = updatedWorkout
          ? prev.workouts.map((item) => (item.id === updatedWorkout.id ? { ...item, ...updatedWorkout } : item))
          : prev.workouts;
        const nextPosts = prev.posts.map((post) => (post.id === result.post.id ? result.post : post));
        return {
          ...prev,
          workouts: nextWorkouts,
          posts: nextPosts,
        };
      });

      // Force refetch to ensure UI updates with fresh data from database
      await queryClient.refetchQueries({ queryKey: ['workouts', workoutsKeyParams] });
    },
    [effectiveAthleteId, queryClient, updateMyAthleteCache, workoutsKeyParams],
  );

  const handleWorkoutDeleted = useCallback(
    async (workoutId: string) => {
      if (!effectiveAthleteId) return;

      // Remove from local caches immediately for optimistic UI
      removeWorkoutFromCache(queryClient, workoutsKeyParams, workoutId);

      updateMyAthleteCache((prev) => ({
        ...prev,
        workouts: prev.workouts.filter((workout) => workout.id !== workoutId),
        posts: prev.posts.filter((post) => post.id !== workoutId),
      }));

      // Invalidate related queries to ensure fresh data on tab switch
      // Using invalidate instead of refetch to mark as stale
      await queryClient.invalidateQueries({
        queryKey: ['workouts'],
        refetchType: 'none', // Don't auto-refetch, just mark stale
      });
      await queryClient.invalidateQueries({
        queryKey: ['my-athlete'],
        refetchType: 'none',
      });
      // Also invalidate identity kernel as workout count affects score
      await queryClient.invalidateQueries({
        queryKey: ['identity-kernel'],
      });
    },
    [effectiveAthleteId, queryClient, updateMyAthleteCache, workoutsKeyParams],
  );

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
      // Include location fields
      location_city: item.locationCity,
      location_country: item.locationCountry,
      location_country_code: item.locationCountryCode,
      location_lat: item.locationLat,
      location_lng: item.locationLng,
      // Include Strava map polyline for map rendering
      strava_map_polyline: item.stravaMapPolyline,
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

      <div className="flex justify-end">
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
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
          athleteHandle={effectiveAthleteHandle}
          athleteAvatar={effectiveAthleteAvatar}
          posts={posts}
          workouts={workouts}
          viewerHoldings={effectiveViewerHoldings}
          onWorkoutDeleted={handleWorkoutDeleted}
          onWorkoutUpdated={handleWorkoutUpdated}
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
          onSuccess={handleWorkoutCreated}
        />
      )}
    </div>
  );
}
