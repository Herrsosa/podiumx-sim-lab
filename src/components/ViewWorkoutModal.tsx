import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Activity, Trophy } from 'lucide-react';
import { Workout, Post } from '@/types';
import { ActivityMap } from '@/components/ui/ActivityMap';
import { OptimizedImage } from '@/components/OptimizedImage';

interface ViewWorkoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workoutPost: Post;
}

export default function ViewWorkoutModal({ open, onOpenChange, workoutPost }: ViewWorkoutModalProps) {
    const workout = (workoutPost.workout_json && typeof workoutPost.workout_json === 'object' && !Array.isArray(workoutPost.workout_json))
        ? workoutPost.workout_json as Partial<Workout>
        : {} as Partial<Workout>;

    const hasMap = !!workoutPost.strava_map_polyline;
    // Check both post.image_url and workout.mediaUrl for media
    const mediaUrl = workoutPost.image_url || workout.mediaUrl;
    const hasMedia = !!mediaUrl;

    // Detect video: check mediaType first, then fallback to URL extension
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
    const urlLower = mediaUrl?.toLowerCase() || '';
    const isVideo = workout.mediaType === 'video' || videoExtensions.some(ext => urlLower.includes(ext));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        {workout.type || 'Workout'} Details
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* Media Section: Map, Video, or Image */}
                    {hasMap ? (
                        <div className="h-64 w-full relative border-b border-border/50">
                            <ActivityMap
                                polyline={workoutPost.strava_map_polyline!}
                                className="w-full h-full"
                            />
                        </div>
                    ) : hasMedia ? (
                        <div className="w-full relative border-b border-border/50">
                            {isVideo ? (
                                <video
                                    src={mediaUrl}
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full max-h-96 object-contain bg-black"
                                />
                            ) : (
                                <div className="h-64">
                                    <OptimizedImage
                                        src={mediaUrl}
                                        alt="Workout media"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    ) : null}

                    <div className="p-6 space-y-6">
                        {/* Header Info */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">{workout.type}</h2>
                                <Badge variant="outline" className="text-sm">
                                    {new Date(workout.date || workoutPost.created_at).toLocaleDateString(undefined, {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </Badge>
                            </div>

                            {/* Location */}
                            {workoutPost.location_city && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>
                                        {workoutPost.location_city}
                                        {workoutPost.location_country ? `, ${workoutPost.location_country}` : ''}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {workout.distance && (
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Distance</p>
                                    <p className="text-xl font-semibold">{workout.distance} km</p>
                                </div>
                            )}

                            {workout.duration && (
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Duration</p>
                                    <p className="text-xl font-semibold">{workout.duration} min</p>
                                </div>
                            )}

                            {workout.pace && (
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Pace</p>
                                    <p className="text-xl font-semibold">{workout.pace} /km</p>
                                </div>
                            )}

                            {workout.rpe && (
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Effort</p>
                                    <p className="text-xl font-semibold">{workout.rpe}/10</p>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {workout.notes && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
                                <p className="text-base leading-relaxed whitespace-pre-wrap">{workout.notes}</p>
                            </div>
                        )}

                        {/* Additional media (if map is shown at top, show image/video here) */}
                        {hasMap && hasMedia && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                                    {isVideo ? 'Video' : 'Photo'}
                                </h3>
                                <div className="rounded-lg overflow-hidden border border-border/50">
                                    {isVideo ? (
                                        <video
                                            src={mediaUrl}
                                            controls
                                            muted
                                            playsInline
                                            className="w-full max-h-96 object-contain bg-black"
                                        />
                                    ) : (
                                        <OptimizedImage
                                            src={mediaUrl}
                                            alt="Workout media"
                                            className="w-full h-auto object-cover max-h-96"
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-background shrink-0 sm:rounded-b-lg flex justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
