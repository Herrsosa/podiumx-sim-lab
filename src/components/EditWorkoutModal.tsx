import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutPost: {
    id: string;
    workout_json: any;
    token_gated: boolean;
    image_url?: string;
  };
  onSuccess: () => void;
}

export default function EditWorkoutModal({ open, onOpenChange, workoutPost, onSuccess }: EditWorkoutModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const workout = workoutPost.workout_json || {};
  const [formData, setFormData] = useState({
    date: workout.date || new Date().toISOString().split('T')[0],
    type: workout.type || 'Run',
    distance: workout.distance?.toString() || '',
    duration: workout.duration?.toString() || '',
    rpe: workout.rpe?.toString() || '5',
    notes: workout.notes || '',
    tokenGated: workoutPost.token_gated || false,
  });

  const distanceApplicableTypes = ['Run', 'Bike', 'Swim'];
  const showDistanceField = distanceApplicableTypes.includes(formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update workout JSON
      const updatedWorkout = {
        id: workoutPost.id,
        date: formData.date,
        type: formData.type,
        distance: formData.distance ? parseFloat(formData.distance) : undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        rpe: parseInt(formData.rpe),
        notes: formData.notes,
      };

      // Update post
      const { error } = await supabase
        .from('posts')
        .update({
          workout_json: updatedWorkout,
          text: formData.notes,
          token_gated: formData.tokenGated,
        })
        .eq('id', workoutPost.id);

      if (error) throw error;

      toast({
        title: 'Workout updated!',
        description: 'Your changes have been saved',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating workout:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workout',
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
