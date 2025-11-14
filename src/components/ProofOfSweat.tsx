import { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Workout, Post } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EditWorkoutModal from './EditWorkoutModal';
import { EmptyState } from '@/components/ui/empty-state';
import { useUser } from '@/store/auth';
import type { WorkoutMutationResult } from '@/hooks/useWorkouts';
import { WorkoutGridCard } from '@/components/WorkoutGridCard';

interface ProofOfSweatProps {
  workouts?: Workout[];
  posts: Post[];
  athleteId?: string;
  athleteName?: string;
  viewerHoldings?: number;
  onUnlock?: () => void;
  onWorkoutDeleted?: (workoutId: string) => void;
  onWorkoutUpdated?: (result: WorkoutMutationResult) => void;
  onConnectStrava?: () => void;
  groupByMonth?: boolean;
  initialExpandedMonths?: number;
}

export default function ProofOfSweat({
  workouts = [],
  posts,
  athleteId,
  athleteName,
  viewerHoldings = 0,
  onUnlock,
  onWorkoutDeleted,
  onWorkoutUpdated,
  onConnectStrava,
}: ProofOfSweatProps) {
  const user = useUser();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<Post | null>(null);
  const [optimisticWorkouts, setOptimisticWorkouts] = useState<Workout[]>([]);
  const canDelete = useMemo(() => user?.id === athleteId, [athleteId, user?.id]);

  // Sync optimistic state with actual workouts
  useEffect(() => {
    setOptimisticWorkouts(workouts || []);
  }, [workouts]);

  const workoutPostMap = useMemo(() => {
    const map = new Map<string, Post>();
    posts.forEach((post) => {
      if (post.workout_json && typeof post.workout_json === 'object' && !Array.isArray(post.workout_json)) {
        map.set(post.id, post);
      }
    });
    return map;
  }, [posts]);

  const handleDeleteClick = useCallback((workoutId: string) => {
    setWorkoutToDelete(workoutId);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((workout: Workout) => {
    const post = Array.from(workoutPostMap.values()).find(
      (p) => p.workout_json && typeof p.workout_json === 'object' &&
             !Array.isArray(p.workout_json) && (p.workout_json as any).id === workout.id
    );
    setWorkoutToEdit(post || null);
    setEditModalOpen(true);
  }, [workoutPostMap]);

  const handleConnectStrava = () => {
    if (onConnectStrava) {
      onConnectStrava();
      return;
    }
    if (typeof window !== 'undefined') {
      window.open('https://www.strava.com/settings/apps', '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete) return;

    setDeleting(true);
    try {
      const post = Array.from(workoutPostMap.values()).find(
        (p) => p.workout_json && typeof p.workout_json === 'object' &&
               !Array.isArray(p.workout_json) && (p.workout_json as any).id === workoutToDelete
      );

      if (post?.image_url) {
        const url = new URL(post.image_url);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const bucketName = pathParts[pathParts.length - 3];

        await supabase.storage.from(bucketName).remove([`public/${fileName}`]);
      }

      if (post) {
        const { error } = await supabase.from('posts').delete().eq('id', post.id);
        if (error) throw error;
      }

      setOptimisticWorkouts((prev) => prev.filter((w) => w.id !== workoutToDelete));

      toast({ title: 'Workout deleted', description: 'Your workout has been removed.' });

      if (onWorkoutDeleted) {
        onWorkoutDeleted(workoutToDelete);
      }
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete workout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setWorkoutToDelete(null);
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
          const post = Array.from(workoutPostMap.values()).find(
            (p) => p.workout_json && typeof p.workout_json === 'object' &&
                   !Array.isArray(p.workout_json) && (p.workout_json as any).id === workout.id
          );

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
              onClick={() => {
                if (canView && canDelete) {
                  handleEditClick(workout);
                } else if (!canView && onUnlock) {
                  onUnlock();
                }
              }}
            />
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this workout and its media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit modal */}
      {editModalOpen && workoutToEdit && workoutToEdit.workout_json && (
        <EditWorkoutModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          workoutPost={{
            id: workoutToEdit.id,
            workout_json: workoutToEdit.workout_json as Workout,
            token_gated: workoutToEdit.token_gated || false,
            image_url: workoutToEdit.image_url
          }}
          onSuccess={handleWorkoutUpdated}
        />
      )}
    </>
  );
}
