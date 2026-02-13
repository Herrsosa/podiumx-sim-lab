import { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity } from 'lucide-react';
import { Workout, Post } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EditWorkoutModal from './EditWorkoutModal';
import ViewWorkoutModal from './ViewWorkoutModal';
import { EmptyState } from '@/components/ui/empty-state';
import { useUser } from '@/store/auth';
import type { WorkoutMutationResult } from '@/hooks/useWorkouts';
import { WorkoutGridCard } from '@/components/WorkoutGridCard';

const extractWorkoutId = (value: Post['workout_json']): string | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const maybeId = (value as Partial<Workout> & { id?: string }).id;
  return typeof maybeId === 'string' ? maybeId : undefined;
};

const postMatchesWorkout = (post: Post, workoutId: string): boolean => {
  const workoutJsonId = extractWorkoutId(post.workout_json);
  if (workoutJsonId) {
    return workoutJsonId === workoutId;
  }
  return post.id === workoutId;
};

interface ProofOfSweatProps {
  workouts?: Workout[];
  posts: Post[];
  athleteId?: string;
  athleteName?: string;
  athleteHandle?: string;
  athleteAvatar?: string;
  viewerHoldings?: number;
  onUnlock?: () => void;
  onWorkoutDeleted?: (workoutId: string) => void;
  onWorkoutUpdated?: (result: WorkoutMutationResult) => void;
  onConnectStrava?: () => void;
  groupByMonth?: boolean;
  initialExpandedMonths?: number;
  initialPostId?: string;
}

export default function ProofOfSweat({
  workouts = [],
  posts,
  athleteId,
  athleteName,
  athleteHandle,
  athleteAvatar,
  viewerHoldings = 0,
  onUnlock,
  onWorkoutDeleted,
  onWorkoutUpdated,
  onConnectStrava,
  initialPostId,
}: ProofOfSweatProps) {
  const user = useUser();
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<Post | null>(null);
  const [optimisticWorkouts, setOptimisticWorkouts] = useState<Workout[]>([]);
  const canDelete = useMemo(() => user?.id === athleteId, [athleteId, user?.id]);

  // Sync optimistic state with actual workouts, sorted by pin status then date
  useEffect(() => {
    const sorted = [...(workouts || [])].sort((a, b) => {
      // Lookup posts to check pin status
      const postA = posts.find(p => postMatchesWorkout(p, a.id));
      const postB = posts.find(p => postMatchesWorkout(p, b.id));

      // Pinned posts come first
      if (postA?.is_pinned && !postB?.is_pinned) return -1;
      if (!postA?.is_pinned && postB?.is_pinned) return 1;

      // Then sort by date (newest first)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    setOptimisticWorkouts(sorted);
  }, [workouts, posts]);

  // Map workout IDs to their corresponding Post objects for O(1) lookup
  const workoutPostMap = useMemo(() => {
    const map = new Map<string, Post>();
    posts.forEach((post) => {
      if (post.workout_json && typeof post.workout_json === 'object' && !Array.isArray(post.workout_json)) {
        // Key by workout_json.id if available, otherwise by post.id
        const workoutId = extractWorkoutId(post.workout_json);
        const key = workoutId || post.id;
        map.set(key, post);
        // Also map by post.id as fallback for cases where workout.id === post.id
        if (workoutId && workoutId !== post.id) {
          map.set(post.id, post);
        }
      }
    });
    return map;
  }, [posts]);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [workoutToView, setWorkoutToView] = useState<Post | null>(null);

  const handleEditClick = useCallback((workout: Workout) => {
    // Direct lookup by workout.id
    const post = workoutPostMap.get(workout.id);
    setWorkoutToEdit(post || null);
    setEditModalOpen(true);
  }, [workoutPostMap]);


  const handleViewClick = useCallback((workout: Workout) => {
    // Direct lookup by workout.id
    const post = workoutPostMap.get(workout.id);
    setWorkoutToView(post || null);
    setViewModalOpen(true);
  }, [workoutPostMap]);

  // Handle initial post highlighting/scrolling
  useEffect(() => {
    if (initialPostId && optimisticWorkouts.length > 0) {
      // Find the workout associated with this post ID
      // It could be a direct match (post.id === initialPostId) or via workout_json.id
      let targetWorkoutId: string | undefined;

      // First check if initialPostId is directly a workout ID in our list
      if (optimisticWorkouts.some(w => w.id === initialPostId)) {
        targetWorkoutId = initialPostId;
      } else {
        // Otherwise look it up in the map
        const post = workoutPostMap.get(initialPostId);
        if (post) {
          // Extract workout ID from post
          targetWorkoutId = extractWorkoutId(post.workout_json) || post.id;
        }
      }

      if (targetWorkoutId) {
        // Scroll to element
        setTimeout(() => {
          const element = document.getElementById(`workout-${targetWorkoutId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary highlight effect class
            element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 3000);
          }
        }, 500); // Small delay to ensure rendering

        // Also open the view modal if we found the workout
        const workout = optimisticWorkouts.find(w => w.id === targetWorkoutId);
        if (workout) {
          /* 
             Only auto-open if it's viewable. 
             If it's editable (my own profile), maybe just scroll to it?
             The user request says "leads to the liked proof of sweat".
             Usually clicking a notification opens the content details.
          */
          // Check if can view
          const visibility = workout.visibility;
          const minTokens = workout.minTokensRequired || 0;
          const requiredTokens =
            visibility === 'supporters'
              ? Math.max(1, minTokens)
              : visibility === 'backers'
                ? Math.max(10, minTokens)
                : 0;
          const canView = visibility === 'public' || canDelete || viewerHoldings >= requiredTokens;

          if (canView) {
            handleViewClick(workout);
          }
        }
      }
    }
  }, [initialPostId, optimisticWorkouts, workoutPostMap, handleViewClick, canDelete, viewerHoldings]);

  const handleConnectStrava = () => {
    if (onConnectStrava) {
      onConnectStrava();
      return;
    }
    if (typeof window !== 'undefined') {
      window.open('https://www.strava.com/settings/apps', '_blank', 'noopener,noreferrer');
    }
  };

  const handleWorkoutUpdated = (result: WorkoutMutationResult) => {
    if (onWorkoutUpdated) {
      onWorkoutUpdated(result);
    }
  };

  if (optimisticWorkouts.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-10 w-10" />}
        title="No workouts yet"
        description="Connect Strava to automatically import training or add workouts manually."
        ctaLabel="Connect Strava"
        onCta={handleConnectStrava}
        className="py-12"
      />
    );
  }

  return (
    <>
      {/* Instagram-style grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {optimisticWorkouts.map((workout) => {
          const post = Array.from(workoutPostMap.values()).find((p) => postMatchesWorkout(p, workout.id));

          const visibility = workout.visibility;
          const minTokens = workout.minTokensRequired || 0;
          const requiredTokens =
            visibility === 'supporters'
              ? Math.max(1, minTokens)
              : visibility === 'backers'
                ? Math.max(10, minTokens)
                : 0;
          const canView = visibility === 'public' || canDelete || viewerHoldings >= requiredTokens;

          return (
            <WorkoutGridCard
              key={workout.id}
              workout={workout}
              post={post}
              canView={canView}
              athleteName={athleteName}
              athleteHandle={athleteHandle}
              athleteAvatar={athleteAvatar}
              id={`workout-${workout.id}`}
              onClick={() => {
                if (canView && canDelete) {
                  handleEditClick(workout);
                } else if (canView && !canDelete) {
                  handleViewClick(workout);
                } else if (!canView && onUnlock) {
                  onUnlock();
                }
              }}
            />
          );
        })}
      </div>

      {/* Edit modal - keep mounted while workoutToEdit exists to preserve delete flow */}
      {workoutToEdit && workoutToEdit.workout_json && (
        <EditWorkoutModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          workoutPost={{
            id: workoutToEdit.id,
            workout_json: workoutToEdit.workout_json as Workout,
            token_gated: workoutToEdit.token_gated || false,
            image_url: workoutToEdit.image_url,
            strava_map_polyline: workoutToEdit.strava_map_polyline,
            is_pinned: workoutToEdit.is_pinned,
            location_city: workoutToEdit.location_city,
            location_country: workoutToEdit.location_country,
            location_country_code: workoutToEdit.location_country_code,
            location_lat: workoutToEdit.location_lat,
            location_lng: workoutToEdit.location_lng,
          }}
          onSuccess={handleWorkoutUpdated}
          onDelete={(workoutId) => {
            setOptimisticWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
            setWorkoutToEdit(null); // Clear after delete
            if (onWorkoutDeleted) {
              onWorkoutDeleted(workoutId);
            }
          }}
        />
      )}

      {/* View modal */}
      {viewModalOpen && workoutToView && (
        <ViewWorkoutModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          workoutPost={workoutToView}
          athleteName={athleteName}
          athleteHandle={athleteHandle}
          athleteAvatar={athleteAvatar}
        />
      )}
    </>
  );
}
