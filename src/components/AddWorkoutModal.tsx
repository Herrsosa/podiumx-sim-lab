import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CelebrationModal } from './CelebrationModal';
import { celebrateAura } from '@/lib/celebrate';
import type { WorkoutMutationResult } from '@/hooks/useWorkouts';
import { mapPostRowToLockerWorkout, mapPostRowToPost } from '@/hooks/useWorkouts';

interface AddWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  onSuccess: (result: WorkoutMutationResult) => void;
}

export default function AddWorkoutModal({ open, onOpenChange, athleteId, onSuccess }: AddWorkoutModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Run',
    distance: '',
    duration: '',
    rpe: '5',
    notes: '',
    visibility: 'public',
  });

  const distanceApplicableTypes = ['Run', 'Bike', 'Swim'];
  const showDistanceField = distanceApplicableTypes.includes(formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let mediaUrl = '';
      
      // Upload media if provided
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('workout-media')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('workout-media')
          .getPublicUrl(fileName);
        
        mediaUrl = urlData.publicUrl;
      }

      // Create workout JSON
      const workoutJson = {
        date: formData.date,
        type: formData.type,
        distance: formData.distance ? parseFloat(formData.distance) : undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        rpe: parseInt(formData.rpe),
        notes: formData.notes,
      };

      const visibility = formData.visibility as 'public' | 'supporters' | 'backers';
      const minTokensRequired =
        visibility === 'supporters' ? 1 : visibility === 'backers' ? 10 : 0;

      // Insert post
      const { data: insertData, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: athleteId,
          workout_json: workoutJson,
          image_url: mediaUrl || null,
          text: formData.notes,
          token_gated: visibility !== 'public',
          visibility,
          min_tokens_required: minTokensRequired,
        })
        .select('id, created_at, author_id, workout_json, image_url, text, visibility, min_tokens_required, token_gated, strava_activity_id')
        .single();

      if (postError) throw postError;
      if (!insertData) throw new Error('Workout was created but details are missing');

      setShowCelebration(true);
      celebrateAura();

      const workout = mapPostRowToLockerWorkout(
        insertData as Parameters<typeof mapPostRowToLockerWorkout>[0],
      );
      const post = mapPostRowToPost(insertData as Parameters<typeof mapPostRowToPost>[0]);

      onSuccess({ workout, post });
      onOpenChange(false);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'Run',
        distance: '',
        duration: '',
        rpe: '5',
        notes: '',
        visibility: 'public',
      });
      setMediaFile(null);
    } catch (error: unknown) {
      console.error('Error posting workout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post workout',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CelebrationModal open={showCelebration} onOpenChange={setShowCelebration} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Workout</DialogTitle>
            <DialogDescription>
              Share your training with your followers
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
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
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    placeholder="10.5"
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="45"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rpe">RPE (Rate of Perceived Exertion: 1-10)</Label>
              <Input
                id="rpe"
                type="number"
                min="1"
                max="10"
                value={formData.rpe}
                onChange={(e) => setFormData({ ...formData, rpe: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="How did it feel? Any observations?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="media">Media Upload</Label>
              <div className="mt-2">
                <label
                  htmlFor="media"
                  className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {mediaFile ? mediaFile.name : 'Click to upload photo or video'}
                    </span>
                  </div>
                  <input
                    id="media"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) =>
                  setFormData({ ...formData, visibility: value })
                }
              >
                <SelectTrigger id="visibility" className="mt-1">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (everyone)</SelectItem>
                  <SelectItem value="supporters">Supporters (≥1 token)</SelectItem>
                  <SelectItem value="backers">Backers (≥10 tokens)</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Choose who can view this workout. Supporters and backers can be customised later.
              </p>
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
                    Posting...
                  </>
                ) : (
                  'Post Workout'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
