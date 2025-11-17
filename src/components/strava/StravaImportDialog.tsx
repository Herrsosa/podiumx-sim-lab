import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/store/auth';
import {
  deriveImportDefaults,
  formatPaceFromSpeed,
  getAverageSpeedFromActivity,
  getActivityDescription,
  getActivityStartTimestamp,
  getStravaActivityId,
  type StoredActivity,
} from '@/utils/stravaActivity';
import { mapPostRowToLockerWorkout, mapPostRowToPost, type WorkoutMutationResult } from '@/hooks/useWorkouts';
import type { Database } from '@/integrations/supabase/types';

type PostRow = Database['public']['Tables']['posts']['Row'];

interface StravaImportDialogProps {
  activity: StoredActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (result: WorkoutMutationResult) => void;
}

interface FormState {
  date: string;
  type: 'Run' | 'HYROX' | 'Swim' | 'Bike' | 'Strength' | 'Other';
  distance: string;
  duration: string;
  rpe: string;
  notes: string;
  visibility: 'public' | 'supporters' | 'backers';
}

function mergeDateWithTimestamp(date: string, referenceTimestamp: string): string {
  if (!date) return referenceTimestamp;
  const reference = new Date(referenceTimestamp);
  if (Number.isNaN(reference.getTime())) {
    return new Date(`${date}T00:00:00.000Z`).toISOString();
  }
  const [year, month, day] = date.split('-').map((value) => Number(value));
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return referenceTimestamp;
  }
  reference.setUTCFullYear(year);
  reference.setUTCMonth(month - 1);
  reference.setUTCDate(day);
  return reference.toISOString();
}

export function StravaImportDialog({ activity, open, onOpenChange, onImported }: StravaImportDialogProps) {
  const user = useUser();
  const userId = user?.id;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const defaults = useMemo(() => (activity ? deriveImportDefaults(activity) : null), [activity]);
  const [formState, setFormState] = useState<FormState>({
    date: defaults?.date ?? new Date().toISOString().split('T')[0],
    type: defaults?.type ?? 'Run',
    distance: defaults?.distance ?? '',
    duration: defaults?.duration ?? '',
    rpe: defaults?.rpe ?? '6',
    notes: defaults?.notes ?? '',
    visibility: defaults?.visibility ?? 'public',
  });

  useEffect(() => {
    if (!defaults) return;
    setFormState({
      date: defaults.date,
      type: defaults.type,
      distance: defaults.distance,
      duration: defaults.duration,
      rpe: defaults.rpe,
      notes: defaults.notes,
      visibility: defaults.visibility,
    });
  }, [defaults, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSaving(false);
    }
    onOpenChange(next);
  };

  const handleInputChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSelectChange = (field: keyof FormState) => (value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activity || !userId) return;
    if (!formState.date) {
      toast({ title: 'Missing date', description: 'Select a workout date before importing.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const stravaActivityId = getStravaActivityId(activity);

      if (activity.imported_post_id) {
        toast({
          title: 'Already imported',
          description: 'This Strava activity is already on your timeline.',
        });
        setSaving(false);
        return;
      }

      if (stravaActivityId !== null) {
        const { data: existing, error: existingError } = await supabase
          .from('posts')
          .select('id')
          .eq('author_id', userId)
          .eq('strava_activity_id', stravaActivityId)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) {
          toast({
            title: 'Already imported',
            description: 'This Strava activity is already on your timeline.',
          });
          setSaving(false);
          return;
        }
      }

      const distanceValue =
        formState.distance.trim().length > 0 ? Math.max(0, Number.parseFloat(formState.distance)) : undefined;
      const durationValue =
        formState.duration.trim().length > 0 ? Math.max(1, Math.round(Number.parseFloat(formState.duration))) : undefined;
      const rpeValue = Math.min(10, Math.max(1, Number.parseInt(formState.rpe, 10) || 6));
      const minTokens =
        formState.visibility === 'supporters' ? 1 : formState.visibility === 'backers' ? 10 : 0;

      const createdAt = mergeDateWithTimestamp(formState.date, getActivityStartTimestamp(activity));

      const workoutJson = {
        date: formState.date,
        type: formState.type,
        distance: distanceValue,
        duration: durationValue ?? 0,
        rpe: rpeValue,
        notes: formState.notes,
        pace: formatPaceFromSpeed(getAverageSpeedFromActivity(activity)) ?? undefined,
        visibility: formState.visibility,
        minTokensRequired: minTokens,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('posts')
        .insert({
          author_id: userId,
          workout_json: workoutJson,
          text: formState.notes,
          token_gated: formState.visibility !== 'public',
          visibility: formState.visibility,
          min_tokens_required: minTokens,
          strava_activity_id: stravaActivityId,
          created_at: createdAt,
        })
        .select('id, created_at, author_id, workout_json, image_url, text, visibility, min_tokens_required, token_gated, strava_activity_id')
        .single();

      if (insertError) throw insertError;
      if (!inserted) throw new Error('Workout was created but details are missing.');

      const postRow = inserted as PostRow;
      await supabase
        .from('activities')
        .update({
          imported_post_id: postRow.id,
          imported_at: new Date().toISOString(),
        })
        .eq('id', activity.id);

      const workout = mapPostRowToLockerWorkout(postRow);
      const post = mapPostRowToPost(postRow);

      toast({
        title: 'Workout imported',
        description: 'Your Strava activity was added to the timeline.',
      });
      onImported?.({ workout, post });
      handleOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import Strava activity.';
      toast({
        title: 'Import failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const description = activity ? getActivityDescription(activity) : '';
  const avgSpeed = activity ? getAverageSpeedFromActivity(activity) : null;
  const pace = formatPaceFromSpeed(avgSpeed);
  const title = activity ? activity.name ?? defaults?.derivedTitle ?? 'Strava activity' : 'Strava activity';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Strava workout</DialogTitle>
          <DialogDescription>
            Pre-fill from Strava and make manual tweaks before sharing it on your Proof-of-Sweat timeline.
          </DialogDescription>
        </DialogHeader>

        {!activity ? (
          <div className="py-12 text-center text-muted-foreground">Select a Strava activity to import.</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <p className="font-semibold">{title}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(getActivityStartTimestamp(activity)).toLocaleString()}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {activity.distance_m ? (
                  <Badge variant="outline">{(activity.distance_m / 1000).toFixed(2)} km</Badge>
                ) : null}
                {activity.moving_time_s ? (
                  <Badge variant="outline">
                    {Math.floor(activity.moving_time_s / 60)} min
                  </Badge>
                ) : null}
                {pace ? <Badge variant="outline">{pace}</Badge> : null}
              </div>
              {description ? (
                <p className="mt-3 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="strava-date">Date</Label>
                  <Input
                    id="strava-date"
                    type="date"
                    value={formState.date}
                    onChange={handleInputChange('date')}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="strava-type">Type</Label>
                  <Select value={formState.type} onValueChange={handleSelectChange('type')}>
                    <SelectTrigger id="strava-type">
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

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="strava-distance">Distance (km)</Label>
                  <Input
                    id="strava-distance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.distance}
                    onChange={handleInputChange('distance')}
                    placeholder="10.5"
                  />
                </div>
                <div>
                  <Label htmlFor="strava-duration">Duration (minutes)</Label>
                  <Input
                    id="strava-duration"
                    type="number"
                    min="1"
                    value={formState.duration}
                    onChange={handleInputChange('duration')}
                    placeholder="45"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="strava-rpe">RPE (effort)</Label>
                <Input
                  id="strava-rpe"
                  type="number"
                  min="1"
                  max="10"
                  value={formState.rpe}
                  onChange={handleInputChange('rpe')}
                  placeholder="6"
                />
                <p className="mt-1 text-xs text-muted-foreground">Optional perceived effort rating.</p>
              </div>

              <div>
                <Label htmlFor="strava-notes">Notes</Label>
                <Textarea
                  id="strava-notes"
                  rows={4}
                  value={formState.notes}
                  onChange={handleInputChange('notes')}
                  placeholder="Imported from Strava"
                />
              </div>

              <div>
                <Label htmlFor="strava-visibility">Visibility</Label>
                <Select value={formState.visibility} onValueChange={handleSelectChange('visibility')}>
                  <SelectTrigger id="strava-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="supporters">Supporters (1+ tokens)</SelectItem>
                    <SelectItem value="backers">Backers (10+ tokens)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !userId}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    'Add to timeline'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default StravaImportDialog;
