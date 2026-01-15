import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, Pin, PinOff, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/store/auth';
import { Workout } from '@/types';
import type { WorkoutMutationResult } from '@/hooks/useWorkouts';
import { mapPostRowToLockerWorkout, mapPostRowToPost } from '@/hooks/useWorkouts';
import { LocationInput } from './LocationInput';
import type { LocationResult } from '@/hooks/useLocationSearch';
import { ActivityMap } from '@/components/ui/ActivityMap';
import { usePinPost } from '@/hooks/usePinPost';
import { cn } from '@/lib/utils';

interface EditWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutPost: {
    id: string;
    workout_json: Workout;
    token_gated: boolean;
    image_url?: string;
    strava_map_polyline?: string;
    is_pinned?: boolean;
    location_city?: string | null;
    location_country?: string | null;
    location_country_code?: string | null;
    location_lat?: number | null;
    location_lng?: number | null;
  };
  onSuccess: (result: WorkoutMutationResult) => void;
  onDelete?: (workoutId: string) => void;
}

export default function EditWorkoutModal({ open, onOpenChange, workoutPost, onSuccess, onDelete }: EditWorkoutModalProps) {
  const { toast } = useToast();
  const user = useUser();
  const { mutate: pinPost, isPending: isPinning } = usePinPost();
  const [loading, setLoading] = useState(false);
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(workoutPost.image_url || null);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPinned = workoutPost.is_pinned;

  const handlePinToggle = () => {
    pinPost({ postId: workoutPost.id, pin: !isPinned });
  };

  const workout = (workoutPost.workout_json && typeof workoutPost.workout_json === 'object' && !Array.isArray(workoutPost.workout_json))
    ? workoutPost.workout_json as Partial<Workout>
    : {} as Partial<Workout>;

  const [formData, setFormData] = useState({
    date: workout.date || new Date().toISOString().split('T')[0],
    type: (workout.type as Workout['type']) || 'Run',
    distance: workout.distance?.toString() || '',
    duration: workout.duration?.toString() || '',
    rpe: workout.rpe?.toString() || '5',
    notes: workout.notes || '',
    tokenGated: workoutPost.token_gated || false,
  });

  useEffect(() => {
    setMediaPreviewUrl(workoutPost.image_url || null);
    setNewMediaFile(null);
    const w = (workoutPost.workout_json && typeof workoutPost.workout_json === 'object' && !Array.isArray(workoutPost.workout_json))
      ? workoutPost.workout_json as Partial<Workout>
      : {} as Partial<Workout>;
    setFormData({
      date: w.date || new Date().toISOString().split('T')[0],
      type: (w.type as Workout['type']) || 'Run',
      distance: w.distance?.toString() || '',
      duration: w.duration?.toString() || '',
      rpe: w.rpe?.toString() || '5',
      notes: w.notes || '',
      tokenGated: workoutPost.token_gated || false,
    });
    // Initialize location from workoutPost
    if (workoutPost.location_lat != null && workoutPost.location_lng != null) {
      setLocation({
        lat: workoutPost.location_lat,
        lng: workoutPost.location_lng,
        city: workoutPost.location_city || undefined,
        country: workoutPost.location_country || undefined,
        country_code: workoutPost.location_country_code || undefined,
      } as LocationResult);
    } else {
      setLocation(null);
    }
  }, [workoutPost]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const distanceApplicableTypes = ['Run', 'Bike', 'Swim'];
  const showDistanceField = distanceApplicableTypes.includes(formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to edit a workout.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      let imageUrl = workoutPost.image_url;

      // Handle media file changes
      if (newMediaFile) {
        // If there was an old image, delete it
        if (workoutPost.image_url) {
          const oldImageKey = workoutPost.image_url.split('/workout-media/').pop();
          if (oldImageKey) {
            await supabase.storage.from('workout-media').remove([oldImageKey]);
          }
        }

        // Upload new file
        const fileExt = newMediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('workout-media')
          .upload(fileName, newMediaFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('workout-media')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      } else if (workoutPost.image_url && !mediaPreviewUrl) {
        // If media was removed, delete from storage and set URL to null
        const oldImageKey = workoutPost.image_url.split('/workout-media/').pop();
        if (oldImageKey) {
          await supabase.storage.from('workout-media').remove([oldImageKey]);
        }
        imageUrl = undefined;
      }

      // Update workout JSON
      const updatedWorkoutJson = {
        date: formData.date,
        type: formData.type,
        distance: formData.distance ? parseFloat(formData.distance) : undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        rpe: parseInt(formData.rpe),
        notes: formData.notes,
      };

      // Update post in DB with location data
      const { data: updatedRow, error } = await supabase
        .from('posts')
        .update({
          workout_json: updatedWorkoutJson,
          text: formData.notes,
          token_gated: formData.tokenGated,
          image_url: imageUrl,
          location_city: location?.city || null,
          location_country: location?.country || null,
          location_country_code: location?.country_code || null,
          location_geohash: location?.cell_id || null,
          location_lat: location?.lat || null,
          location_lng: location?.lng || null,
          has_location: Boolean(location),
        })
        .eq('id', workoutPost.id)
        .select('id, created_at, author_id, workout_json, image_url, text, visibility, min_tokens_required, token_gated, strava_activity_id, location_city, location_country, location_country_code, location_lat, location_lng')
        .single();

      if (error) throw error;
      if (!updatedRow) throw new Error('Failed to load updated workout');

      toast({
        title: 'Workout updated!',
        description: 'Your changes have been saved',
      });

      const mappedWorkout = mapPostRowToLockerWorkout(
        updatedRow as Parameters<typeof mapPostRowToLockerWorkout>[0],
      );
      const mappedPost = mapPostRowToPost(updatedRow as Parameters<typeof mapPostRowToPost>[0]);

      onSuccess({ workout: mappedWorkout, post: mappedPost });
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error updating workout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update workout',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      // Delete media from storage if it exists
      if (workoutPost.image_url) {
        const oldImageKey = workoutPost.image_url.split('/workout-media/').pop();
        if (oldImageKey) {
          await supabase.storage.from('workout-media').remove([oldImageKey]);
        }
      }

      // Delete the post from database
      const { error } = await supabase.from('posts').delete().eq('id', workoutPost.id);
      if (error) throw error;

      toast({
        title: 'Workout deleted',
        description: 'Your workout has been removed.',
      });

      onDelete(workoutPost.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete workout',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle>Edit Workout</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-2", isPinned ? "text-primary hover:text-primary/80" : "text-muted-foreground")}
              onClick={handlePinToggle}
              disabled={isPinning}
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? 'Unpin' : 'Pin'}
            </Button>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as Workout['type'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Run">Run</SelectItem>
                    <SelectItem value="HYROX">HYROX</SelectItem>
                    <SelectItem value="Swim">Swim</SelectItem>
                    <SelectItem value="Bike">Bike</SelectItem>
                    <SelectItem value="Strength">Strength</SelectItem>
                    <SelectItem value="HIIT">HIIT</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={showDistanceField ? "grid grid-cols-2 gap-4" : ""}>
              {showDistanceField && (
                <div>
                  <Label htmlFor="edit-distance">Distance (km)</Label>
                  <Input
                    id="edit-distance"
                    type="number"
                    step="0.1"
                    placeholder="10.5"
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="edit-duration">Duration (minutes)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  placeholder="45"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-rpe">RPE (Rate of Perceived Exertion: 1-10)</Label>
              <Input
                id="edit-rpe"
                type="number"
                min="1"
                max="10"
                value={formData.rpe}
                onChange={(e) => setFormData({ ...formData, rpe: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="How did it feel? Any observations?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <LocationInput
              value={location}
              onChange={setLocation}
              label="Location"
              placeholder="Search for city..."
            />

            {/* Map Display (Read-only) */}
            {workoutPost.strava_map_polyline && (
              <div>
                <Label>Route Map</Label>
                <div className="mt-2 h-48 w-full rounded-lg border border-border/50 overflow-hidden relative">
                  <ActivityMap
                    polyline={workoutPost.strava_map_polyline}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Media</Label>
              <div className="mt-2 flex items-center gap-4">
                {mediaPreviewUrl && (
                  <img
                    src={mediaPreviewUrl}
                    alt="Workout media preview"
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <label
                    htmlFor="media-upload-edit"
                    className="flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{mediaPreviewUrl ? 'Change' : 'Upload'} photo or video</span>
                  </label>
                  <input
                    id="media-upload-edit"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {mediaPreviewUrl && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-destructive"
                      onClick={() => {
                        setNewMediaFile(null);
                        setMediaPreviewUrl(null);
                      }}
                    >
                      Remove media
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="edit-tokenGated" className="font-semibold">Card Holders Only</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Only users holding your Cards can view this post
                </p>
              </div>
              <Switch
                id="edit-tokenGated"
                checked={formData.tokenGated}
                onCheckedChange={(checked) => setFormData({ ...formData, tokenGated: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              {onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    onOpenChange(false); // Close edit dialog first
                    setDeleteDialogOpen(true);
                  }}
                  disabled={loading || deleting}
                  title="Delete workout"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={loading || deleting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || deleting}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
