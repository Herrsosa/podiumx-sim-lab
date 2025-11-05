import { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, Clock, Gauge, Zap, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { UnlockCard } from '@/components/myathlete/UnlockCard';
import { LockBadge } from '@/components/myathlete/LockBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { useUser } from '@/store/auth';
import type { WorkoutMutationResult } from '@/hooks/useWorkouts';
import { SupabaseResponsiveImage } from '@/components/SupabaseResponsiveImage';

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

const getWorkoutIcon = (type: Workout['type']) => {
  switch (type) {
    case 'Run':
    case 'HYROX':
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

const formatDurationMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

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
  groupByMonth = false,
  initialExpandedMonths = 4,
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

  // Use optimistic workouts for display
  const safeWorkouts = optimisticWorkouts;

  // Persist accordion state in sessionStorage
  const storageKey = useMemo(() => `pos-accordion-${athleteId || 'default'}`, [athleteId]);
  
  const [openMonths, setOpenMonths] = useState<string[]>(() => {
    if (!groupByMonth) return [];
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const monthlyGroups = useMemo(() => {
    if (!groupByMonth || safeWorkouts.length === 0) {
      return [] as Array<{ key: string; label: string; workouts: Workout[] }>;
    }

    const map = new Map<string, { key: string; label: string; workouts: Workout[] }>();

    safeWorkouts.forEach((workout) => {
      const rawDate = workout.date ?? new Date().toISOString();
      const date = new Date(rawDate);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });

      if (!map.has(key)) {
        map.set(key, { key, label, workouts: [] });
      }
      map.get(key)!.workouts.push(workout);
    });

    return Array.from(map.values()).sort((a, b) => (a.key > b.key ? -1 : 1));
  }, [groupByMonth, safeWorkouts]);

  // Initialize openMonths on mount and persist changes
  useEffect(() => {
    if (!groupByMonth) return;
    
    const stored = openMonths.length > 0 ? openMonths : null;
    
    if (!stored) {
      // First load - expand initial months
      const next: string[] = [];
      monthlyGroups.forEach((group, index) => {
        if (index < initialExpandedMonths) {
          next.push(group.key);
        }
      });
      setOpenMonths(next);
    }
  }, [groupByMonth, monthlyGroups, initialExpandedMonths, openMonths]);

  // Persist to sessionStorage whenever openMonths changes
  useEffect(() => {
    if (!groupByMonth || openMonths.length === 0) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(openMonths));
    } catch (err) {
      console.warn('Failed to persist accordion state:', err);
    }
  }, [openMonths, storageKey, groupByMonth]);

  const handleDeleteClick = useCallback((workoutId: string) => {
    setWorkoutToDelete(workoutId);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditClick = useCallback(
    (workout: Workout) => {
      const post = workoutPostMap.get(workout.id);
      if (post) {
        setWorkoutToEdit(post);
        setEditModalOpen(true);
      }
    },
    [workoutPostMap],
  );

  const renderWorkoutCard = useCallback(
    (workout: Workout) => {
      const post = workoutPostMap.get(workout.id);
      const visibility =
        post?.visibility ?? workout.visibility ?? ('public' as 'public' | 'supporters' | 'backers');
      const minTokens = post?.min_tokens_required ?? workout.minTokensRequired ?? 0;
      const requiredTokens =
        visibility === 'supporters'
          ? Math.max(1, minTokens)
          : visibility === 'backers'
          ? Math.max(10, minTokens)
          : 0;
      const canView = visibility === 'public' || canDelete || viewerHoldings >= requiredTokens;
      const mediaUrl = workout.mediaUrl ?? post?.image_url ?? undefined;

      return (
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
                  {formatRelativeDate(workout.date)}
                </span>
                {visibility !== 'public' && <LockBadge tier={visibility} className="text-xs" />}
              </div>

              {canView ? (
                <>
                  {mediaUrl && (
                    <div className="mb-3 w-full max-w-[160px]">
                      <SupabaseResponsiveImage
                        src={mediaUrl}
                        alt={`${workout.type} workout media`}
                        widths={[160, 240, 320]}
                        sizes="(max-width: 768px) 45vw, 160px"
                        aspectRatio={1}
                        className="w-full rounded-lg border border-border/40 bg-muted/30"
                      />
                    </div>
                  )}
                  <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                    {workout.distance && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Activity className="h-3.5 w-3.5" />
                        <span>{workout.distance.toFixed(1)} km</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDurationMinutes(workout.duration)}</span>
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

                  {workout.notes && <p className="text-sm text-foreground/80">{workout.notes}</p>}
                </>
              ) : (
                <div className="mt-3">
                  <UnlockCard
                    tier={visibility === 'backers' ? 'backers' : 'supporters'}
                    athleteName={athleteName || 'this athlete'}
                    onUnlock={onUnlock}
                  />
                </div>
              )}
            </div>

            {canDelete && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditClick(workout)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(workout.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      );
    },
    [athleteName, canDelete, handleDeleteClick, handleEditClick, onUnlock, viewerHoldings, workoutPostMap],
  );

  const handleEditModalChange = (open: boolean) => {
    setEditModalOpen(open);
    if (!open) {
      setWorkoutToEdit(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete) return;

    setDeleting(true);

    // Store the workout for potential restoration
    const workoutToDeleteData = optimisticWorkouts.find(w => w.id === workoutToDelete);
    const postToDelete = workoutPostMap.get(workoutToDelete);

    // Optimistically remove from UI
    setOptimisticWorkouts(prev => prev.filter(w => w.id !== workoutToDelete));
    setDeleteDialogOpen(false);

    if (workoutToEdit && workoutToEdit.id === workoutToDelete) {
      setWorkoutToEdit(null);
      setEditModalOpen(false);
    }

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

      if (workoutToDelete) {
        onWorkoutDeleted?.(workoutToDelete);
      }
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
          ) : groupByMonth ? (
            <Accordion
              type="multiple"
              value={openMonths}
              onValueChange={(value) => setOpenMonths(Array.isArray(value) ? value : [])}
              className="space-y-2"
            >
              {monthlyGroups.map((group) => (
                <AccordionItem
                  key={group.key}
                  value={group.key}
                  className="overflow-hidden rounded-xl border border-border/60 bg-card/40"
                >
                  <AccordionTrigger className="flex items-center justify-between px-4 py-3 text-left text-sm font-semibold">
                    <span>{group.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {group.workouts.length} {group.workouts.length === 1 ? 'workout' : 'workouts'}
                    </Badge>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 px-4 pb-4">
                    {group.workouts.map((workout) => renderWorkoutCard(workout))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="space-y-3">
              {safeWorkouts.map((workout) => renderWorkoutCard(workout))}
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
          onOpenChange={handleEditModalChange}
          workoutPost={{
            id: workoutToEdit.id,
            workout_json:
              (workoutToEdit.workout_json &&
                typeof workoutToEdit.workout_json === 'object' &&
                !Array.isArray(workoutToEdit.workout_json)
                ? (workoutToEdit.workout_json as Workout)
                : ({} as Workout)),
            token_gated: Boolean(workoutToEdit.token_gated),
            image_url: workoutToEdit.image_url ?? undefined,
          }}
          onSuccess={(result) => {
            const updatedWorkout = result.workout.workout;
            if (updatedWorkout) {
              setOptimisticWorkouts((prev) =>
                prev.map((w) => (w.id === result.workout.id ? { ...w, ...updatedWorkout } : w)),
              );
            }
            onWorkoutUpdated?.(result);
          }}
        />
      )}
    </>
  );
}
