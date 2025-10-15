import { useState, useEffect, useCallback } from 'react';
import { Activity, Calendar, Clock, Gauge, Zap, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/hooks/useAuth';
import EditWorkoutModal from './EditWorkoutModal';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/empty-state';

interface ProofOfSweatProps {
  workouts: Workout[];
  athleteId?: string;
  onWorkoutDeleted?: () => void;
  onConnectStrava?: () => void;
}

export default function ProofOfSweat({ workouts, athleteId, onWorkoutDeleted, onConnectStrava }: ProofOfSweatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<Workout | null>(null);
  const [workoutPosts, setWorkoutPosts] = useState<Post[]>([]);
  const [optimisticWorkouts, setOptimisticWorkouts] = useState<Workout[]>([]);

  // Sync optimistic state with actual workouts
  useEffect(() => {
    setOptimisticWorkouts(workouts || []);
  }, [workouts]);

  const fetchWorkoutPosts = useCallback(async () => {
    if (!athleteId) return;
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', athleteId)
        .not('workout_json', 'is', null);

      if (error) throw error;
      setWorkoutPosts((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching workout posts:', error);
    }
  }, [athleteId]);

  // Fetch workout posts to get full post data including token_gated
  useEffect(() => {
    if (athleteId) {
      fetchWorkoutPosts();
    }
  }, [athleteId, fetchWorkoutPosts]);


  // Use optimistic workouts for display
  const safeWorkouts = optimisticWorkouts;
  
  const canDelete = user?.id === athleteId;

  const handleEditClick = (workout: Workout) => {
    const post = workoutPosts.find(p => p.id === workout.id);
    if (post) {
      setWorkoutToEdit(post as any);
      setEditModalOpen(true);
    }
  };

  const handleDeleteClick = (workoutId: string) => {
    setWorkoutToDelete(workoutId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete) return;

    setDeleting(true);

    // Store the workout for potential restoration
    const workoutToDeleteData = optimisticWorkouts.find(w => w.id === workoutToDelete);
    const postToDelete = workoutPosts.find(p => p.id === workoutToDelete);

    // Optimistically remove from UI
    setOptimisticWorkouts(prev => prev.filter(w => w.id !== workoutToDelete));
    setDeleteDialogOpen(false);

    try {
      // Delete media from storage if it exists
      if (postToDelete?.image_url) {
        const urlParts = postToDelete.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const folderPath = urlParts.slice(-2, -1)[0]; // Get user folder
        const filePath = `${folderPath}/${fileName}`;
        
        const { error: storageError } = await supabase.storage
          .from('workout-media')
          .remove([filePath]);
        
        if (storageError) {
          console.error('Error deleting media:', storageError);
          // Continue with post deletion even if media deletion fails
        }
      }

      // Delete the post from database
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', workoutToDelete);

      if (error) throw error;

      toast({
        title: 'Workout deleted',
        description: 'Your workout has been removed',
      });

      // Invalidate queries to refetch fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['athletes'] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
      ]);

      // Refetch workout posts
      await fetchWorkoutPosts();
      onWorkoutDeleted?.();
    } catch (error: unknown) {
      console.error('Error deleting workout:', error);
      
      // Restore the workout on error
      if (workoutToDeleteData) {
        setOptimisticWorkouts(prev => [...prev, workoutToDeleteData].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete workout',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setWorkoutToDelete(null);
    }
  };
  
  const getWorkoutIcon = (type: Workout['type']) => {
    switch (type) {
      case 'Run':
        return <Activity className="h-4 w-4" />;
      case 'Swim':
        return <Zap className="h-4 w-4" />;
      case 'Bike':
        return <Activity className="h-4 w-4" />;
      case 'Strength':
        return <Gauge className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleConnectStrava = () => {
    if (onConnectStrava) {
      onConnectStrava();
      return;
    }

    if (typeof window !== 'undefined') {
      window.open('https://www.strava.com/settings/apps', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Proof of Sweat
          </CardTitle>
        </CardHeader>
        <CardContent>
          {safeWorkouts.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-10 w-10" />}
              title="No workouts yet"
              description="Connect Strava to automatically import training or add workouts manually."
              ctaLabel="Connect Strava"
              onCta={handleConnectStrava}
              className="py-12"
            />
          ) : (
            <div className="space-y-3">
              {safeWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-primary/30 hover:bg-card/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          {getWorkoutIcon(workout.type)}
                          {workout.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(workout.date)}
                        </span>
                      </div>
                      
                      <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                        {workout.distance && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Activity className="h-3.5 w-3.5" />
                            <span>{workout.distance.toFixed(1)} km</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDuration(workout.duration)}</span>
                        </div>
                        {workout.pace && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Gauge className="h-3.5 w-3.5" />
                            <span>{workout.pace}</span>
                          </div>
                        )}
                        {workout.speed && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Gauge className="h-3.5 w-3.5" />
                            <span>{workout.speed}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Zap className="h-3.5 w-3.5" />
                          <span>RPE {workout.rpe}/10</span>
                        </div>
                      </div>
                      
                      {workout.notes && (
                        <p className="text-sm text-foreground/80">{workout.notes}</p>
                      )}
                    </div>

                    {canDelete && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(workout)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(workout.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Subtle accent bar */}
                  <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this workout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Workout Modal */}
      {workoutToEdit && (
        <EditWorkoutModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          workoutPost={workoutToEdit as any}
          onSuccess={async () => {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['athletes'] }),
              queryClient.invalidateQueries({ queryKey: ['posts'] }),
            ]);
            await fetchWorkoutPosts();
            onWorkoutDeleted?.();
          }}
        />
      )}
    </>
  );
}
