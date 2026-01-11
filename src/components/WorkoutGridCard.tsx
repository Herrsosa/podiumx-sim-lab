import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Calendar, Pin, CheckCircle2 } from 'lucide-react';
import type { Workout, Post } from '@/types';
import { SupabaseResponsiveImage } from '@/components/SupabaseResponsiveImage';
import { ActivityMap } from '@/components/ui/ActivityMap';
import { cn } from '@/lib/utils';
import { PropButton } from '@/components/PropButton';
import { CommentButtonWithModal } from '@/components/comments';
import { ShareButton } from '@/components/share';
import { ReactionBar } from '@/components/ReactionBar';

interface WorkoutGridCardProps {
  workout: Workout;
  post?: Post;
  canView: boolean;
  onClick: () => void;
  variant?: 'grid' | 'feed';
  athleteName?: string;
  athleteHandle?: string;
  athleteAvatar?: string;
}

const getTypeColor = (type: Workout['type']) => {
  switch (type) {
    case 'Run':
    case 'HYROX':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'Swim':
      return 'bg-accent/20 text-accent border-accent/30';
    case 'Bike':
      return 'bg-accent/20 text-accent border-accent/30';
    case 'Strength':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'HIIT':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default:
      return 'bg-muted/40 text-muted-foreground border-muted/50';
  }
};

const getTypeGradient = (type: Workout['type']) => {
  switch (type) {
    case 'Run':
    case 'HYROX':
      return '!from-emerald-600 !to-teal-900';
    case 'Swim':
      return '!from-indigo-600 !to-blue-900';
    case 'Bike':
      return '!from-blue-600 !to-cyan-900';
    case 'Strength':
      return '!from-orange-600 !to-red-900';
    case 'HIIT':
      return '!from-orange-500 !to-rose-900';
    default:
      return '!from-slate-600 !to-gray-900';
  }
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

function WorkoutGridCardComponent({ workout, post, canView, onClick, variant = 'grid', athleteName, athleteHandle, athleteAvatar }: WorkoutGridCardProps) {
  const hasPhoto = post?.image_url || workout.mediaUrl;
  const hasMap = post?.strava_map_polyline;
  const photoUrl = post?.image_url || workout.mediaUrl;
  const typeGradient = getTypeGradient(workout.type);
  const typeColor = getTypeColor(workout.type);
  const displayDate = post?.created_at || workout.date;
  const isStravaVerified = !!post?.strava_activity_id;

  // Build metrics string
  const metrics: string[] = [];
  if (workout.distance) metrics.push(`${workout.distance} km`);
  if (workout.duration) {
    const hours = Math.floor(workout.duration / 60);
    const mins = workout.duration % 60;
    metrics.push(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
  }
  if (workout.rpe) metrics.push(`RPE ${workout.rpe}`);

  const metricsText = metrics.join(' • ');

  const showOverlayContent = variant !== 'feed';
  const aspectClass = variant === 'feed' ? 'aspect-square max-w-xs sm:max-w-sm' : 'aspect-square';
  const padding = variant === 'feed' ? 'p-4 sm:p-5' : 'p-4';
  const metricsClass = variant === 'feed' ? 'text-lg font-bold tracking-tight text-foreground' : 'text-base md:text-lg text-foreground font-semibold';
  const captionClass = variant === 'feed' ? 'text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-1' : 'text-sm text-muted-foreground line-clamp-2 leading-tight';
  const typeBadgeClass = 'text-xs font-semibold px-2 py-0.5';
  const calendarClass = 'text-xs font-medium';

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 cursor-pointer',
        'hover:shadow-lg hover:border-primary/20',
        variant === 'feed'
          ? 'rounded-3xl border-white/5 bg-card/40 backdrop-blur-md shadow-sm'
          : 'hover:scale-[1.02] active:scale-[0.98] rounded-xl border-muted/40'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${workout.type} workout on ${formatDate(displayDate)}`}
    >
      <div className={cn('relative', aspectClass)}>
        {hasPhoto && photoUrl ? (
          <SupabaseResponsiveImage
            src={photoUrl}
            alt={`${workout.type} workout`}
            widths={[320, 420, 560]}
            sizes="(max-width: 768px) 100vw, 560px"
            aspectRatio={1}
            className="absolute inset-0"
            imgClassName={cn(
              'object-cover',
              variant === 'feed' ? 'rounded-2xl' : '',
              !canView && 'blur-xl'
            )}
          />
        ) : hasMap ? (
          <div className="absolute inset-0">
            <ActivityMap
              polyline={post!.strava_map_polyline!}
              className={cn(variant === 'feed' ? 'rounded-2xl' : '', !canView && 'blur-sm')}
            />
          </div>
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br overflow-hidden', variant === 'feed' ? 'rounded-2xl' : '', typeGradient)} />
        )}

        {showOverlayContent && (
          <>
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t pointer-events-none',
                hasPhoto ? 'from-black/80 via-black/40 to-black/20' : 'from-black/60 via-transparent to-transparent'
              )}
            />
            <CardContent className={cn('absolute inset-0 flex flex-col justify-between', padding)}>
              <div className="flex items-start justify-between gap-2">
                <Badge className={cn('backdrop-blur-sm border', typeColor, typeBadgeClass)}>
                  {workout.type}
                </Badge>
                {post?.is_pinned && (
                  <Badge variant="secondary" className="gap-1 px-1.5 py-0.5 bg-background/90 text-primary backdrop-blur-md border-primary/20">
                    <Pin className="h-3 w-3 fill-current rotate-45" />
                  </Badge>
                )}
                <div className={cn('flex items-center gap-1 text-foreground/90 backdrop-blur-sm bg-background/70 px-2 py-1 rounded-md border border-border/40', calendarClass)}>
                  <Calendar className="h-3 w-3" />
                  <span className="font-medium">
                    {formatDate(displayDate)}
                  </span>
                </div>
                {isStravaVerified && (
                  <Badge variant="secondary" className="gap-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-500 backdrop-blur-md border-orange-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[10px]">Strava</span>
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {canView ? (
                  <>
                    {metricsText && (
                      <div className={metricsClass}>
                        {metricsText}
                      </div>
                    )}

                    {post?.text && (
                      <p className={captionClass}>
                        {post.text}
                      </p>
                    )}

                    {/* Props, Comments & Share Buttons */}
                    {post?.id && (
                      <div className="flex items-center gap-3 mt-2 relative z-10">
                        <ReactionBar postId={post.id} compact />
                        <PropButton postId={post.id} size="sm" />
                        <CommentButtonWithModal postId={post.id} size="sm" />
                        {athleteName && athleteHandle && (
                          <ShareButton
                            workout={workout}
                            athleteName={athleteName}
                            athleteHandle={athleteHandle}
                            athleteAvatar={athleteAvatar}
                            imageUrl={post.image_url || workout.mediaUrl}
                            athleteProfileUrl={`${window.location.origin}/athlete/${athleteHandle}`}
                            location={post.location_lat != null && post.location_lng != null
                              ? { lat: post.location_lat, lng: post.location_lng }
                              : null}
                            size="sm"
                          />
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Lock className="h-8 w-8 text-foreground mb-2" />
                    <p className="text-foreground font-semibold text-sm">Token Holders Only</p>
                  </div>
                )}
              </div>
            </CardContent>
          </>
        )}

        {!showOverlayContent && (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex items-start justify-between gap-2 p-3">
              <Badge className={cn('bg-black/60 text-white border border-white/20', typeBadgeClass)}>
                {workout.type}
              </Badge>
              <div className={cn('flex items-center gap-1 text-white/80 bg-black/40 px-2 py-1 rounded-md text-[10px]')}>
                <Calendar className="h-3 w-3" />
                <span>{formatDate(displayDate)}</span>
              </div>
            </div>
          </div>
        )}

        {!canView && (
          <div className={cn('absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm', variant === 'feed' ? 'rounded-2xl' : '')}>
            {!showOverlayContent && (
              <div className="flex flex-col items-center text-primary-foreground text-center text-xs">
                <Lock className="h-5 w-5 mb-1" />
                Holder Exclusive
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Custom comparison to prevent re-renders when props haven't meaningfully changed
function arePropsEqual(prev: WorkoutGridCardProps, next: WorkoutGridCardProps): boolean {
  return (
    prev.workout.id === next.workout.id &&
    prev.post?.id === next.post?.id &&
    prev.canView === next.canView &&
    prev.variant === next.variant &&
    prev.workout.mediaUrl === next.workout.mediaUrl &&
    prev.post?.image_url === next.post?.image_url
  );
}

export const WorkoutGridCard = memo(WorkoutGridCardComponent, arePropsEqual);
