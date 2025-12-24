import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Activity, Trophy, Pin, PinOff, Share2 } from 'lucide-react';
import { Workout, Post } from '@/types';
import { ActivityMap } from '@/components/ui/ActivityMap';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useUser } from '@/store/auth';
import { usePinPost } from '@/hooks/usePinPost';
import { cn } from '@/lib/utils';
import { ShareButton } from '@/components/share';

interface ViewWorkoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workoutPost: Post;
    athleteName?: string;
    athleteHandle?: string;
    athleteAvatar?: string;
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ViewWorkoutModal({ open, onOpenChange, workoutPost, athleteName, athleteHandle, athleteAvatar }: ViewWorkoutModalProps) {
    const user = useUser();
    const { mutate: pinPost, isPending: isPinning } = usePinPost();

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

    const isOwner = user?.id === workoutPost.author_id;
    const isPinned = workoutPost.is_pinned;

    console.log('[ViewWorkoutModal] Debug Pin Button:', {
        userId: user?.id,
        authorId: workoutPost.author_id,
        isOwner,
        isPinned,
        postTokenGated: workoutPost.token_gated
    });

    const handlePinToggle = () => {
        pinPost({ postId: workoutPost.id, pin: !isPinned });
    };

    const renderMap = () => (
        <div className="h-72 w-full relative border-b border-border/50">
            <ActivityMap
                key={`${workoutPost.id}-map`}
                polyline={workoutPost.strava_map_polyline!}
                className="w-full h-full"
            />
        </div>
    );

    const renderMedia = () => (
        <div className="w-full relative border-b border-border/50 bg-black/5">
            {isVideo ? (
                <video
                    src={mediaUrl}
                    controls
                    muted
                    playsInline
                    className="w-full h-72 object-contain bg-black"
                />
            ) : (
                <OptimizedImage
                    src={mediaUrl}
                    alt="Workout media"
                    className="w-full h-72 object-contain"
                />
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        {workout.type || 'Workout'} Details
                        {isPinned && !isOwner && (
                            <Badge variant="secondary" className="ml-2 gap-1 text-xs font-normal">
                                <Pin className="h-3 w-3 fill-current rotate-45" />
                                Pinned
                            </Badge>
                        )}
                    </DialogTitle>

                    {isOwner && (
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
                    )}

                    {/* Share Button */}
                    {athleteName && athleteHandle && (
                        <ShareButton
                            workout={workout as Workout}
                            athleteName={athleteName}
                            athleteHandle={athleteHandle}
                            athleteAvatar={athleteAvatar}
                            imageUrl={mediaUrl}
                            athleteProfileUrl={`${window.location.origin}/athlete/${athleteHandle}`}
                            location={workoutPost.location_lat != null && workoutPost.location_lng != null
                                ? { lat: workoutPost.location_lat, lng: workoutPost.location_lng }
                                : null}
                            size="md"
                        />
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* Media Section: Map, Video, or Image */}
                    {open && (
                        <>
                            {hasMap && hasMedia ? (
                                <Tabs defaultValue="map" className="w-full">
                                    <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
                                        <TabsTrigger value="map" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Map</TabsTrigger>
                                        <TabsTrigger value="media" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">{isVideo ? 'Video' : 'Photo'}</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="map" className="mt-0">
                                        {renderMap()}
                                    </TabsContent>
                                    <TabsContent value="media" className="mt-0">
                                        {renderMedia()}
                                    </TabsContent>
                                </Tabs>
                            ) : hasMap ? (
                                renderMap()
                            ) : hasMedia ? (
                                renderMedia()
                            ) : null}
                        </>
                    )}

                    <div className="p-6 space-y-6">
                        {/* Header Info */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold">{workout.type || 'Workout'}</h2>
                                {isPinned && (
                                    <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                                        <Pin className="h-3 w-3 fill-current rotate-45" />
                                        Pinned Workout
                                    </Badge>
                                )}
                            </div>
                            <Badge variant="outline" className="text-sm py-1 px-3">
                                {new Date(workout.date || new Date()).toLocaleDateString('en-GB', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
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

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {workout.distance && (
                                <div className="p-4 rounded-xl bg-card border shadow-sm">
                                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Distance</div>
                                    <div className="text-xl font-bold flex items-baseline gap-1">
                                        {workout.distance}
                                        <span className="text-sm font-normal text-muted-foreground">km</span>
                                    </div>
                                </div>
                            )}
                            {workout.duration && (
                                <div className="p-4 rounded-xl bg-card border shadow-sm">
                                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Duration</div>
                                    <div className="text-xl font-bold flex items-baseline gap-1">
                                        {workout.duration}
                                        <span className="text-sm font-normal text-muted-foreground">min</span>
                                    </div>
                                </div>
                            )}
                            <div className="p-4 rounded-xl bg-card border shadow-sm">
                                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Effort</div>
                                <div className="text-xl font-bold flex items-baseline gap-1">
                                    {workout.rpe || '-'}<span className="text-muted-foreground">/10</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {workout.notes && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
                                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                                    <p className="text-base leading-relaxed whitespace-pre-wrap">{workout.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* No duplicate media section at the bottom anymore */}
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
