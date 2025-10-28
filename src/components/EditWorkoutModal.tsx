import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/store/auth';
import { Workout } from '@/types';
import type { WorkoutMutationResult } from '@/hooks/useWorkouts';
import { mapPostRowToLockerWorkout, mapPostRowToPost } from '@/hooks/useWorkouts';

interface EditWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutPost: {
    id: string;
    workout_json: Workout;
    token_gated: boolean;
    image_url?: string;
  };
  onSuccess: (result: WorkoutMutationResult) => void;
}

export default function EditWorkoutModal({ open, onOpenChange, workoutPost, onSuccess }: EditWorkoutModalProps) {
  const { toast } = useToast();
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(workoutPost.image_url || null);
  
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

      // Update post in DB
      const { data: updatedRow, error } = await supabase
        .from('posts')
        .update({
          workout_json: updatedWorkoutJson,
          text: formData.notes,
          token_gated: formData.tokenGated,
          image_url: imageUrl,
        })
        .eq('id', workoutPost.id)
        .select('id, created_at, author_id, workout_json, image_url, text, visibility, min_tokens_required, token_gated, strava_activity_id')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workout</DialogTitle>
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
              <Label htmlFor="edit-tokenGated" className="font-semibold">Token Holders Only</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Only users holding your tokens can view this post
              </p>
            </div>
            <Switch
              id="edit-tokenGated"
              checked={formData.tokenGated}
              onCheckedChange={(checked) => setFormData({ ...formData, tokenGated: checked })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
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
  );
}
