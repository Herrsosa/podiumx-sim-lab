import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Lock, Calendar, Activity, Clock, Zap, MapPin, Flame, TrendingUp, CheckCircle } from 'lucide-react';
import { useUser } from '@/store/auth';
import { Post, Workout } from '@/types';
import { SupabaseResponsiveImage } from '@/components/SupabaseResponsiveImage';
import { ActivityMap } from '@/components/ui/ActivityMap';
import { cn } from '@/lib/utils';
import { ReactionBar } from '@/components/ReactionBar';
import { PropButton } from '@/components/PropButton';

interface WorkoutPostsProps {
  athleteId: string;
  userHoldings: number;
  posts: Post[];
  isLoading: boolean;
  onUnlockClick: () => void;
  onConnectStrava?: () => void;
}

// Get workout type styling
const getWorkoutStyle = (type: string | undefined) => {
  switch (type) {
    case 'Run':
      return {
        gradient: 'linear-gradient(135deg, #059669 0%, #047857 50%, #0f766e 100%)',
        icon: '🏃',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
      };
    case 'Bike':
      return {
        gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #0891b2 100%)',
        icon: '🚴',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
      };
    case 'Swim':
      return {
        gradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #1d4ed8 100%)',
        icon: '🏊',
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/20',
        borderColor: 'border-indigo-500/30',
      };
    case 'Strength':
      return {
        gradient: 'linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #b91c1c 100%)',
        icon: '💪',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30',
      };
    case 'HYROX':
      return {
        gradient: 'linear-gradient(135deg, #eab308 0%, #f59e0b 50%, #d97706 100%)',
        icon: '🔥',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
      };
    case 'HIIT':
      return {
        gradient: 'linear-gradient(135deg, #dc2626 0%, #be123c 50%, #9333ea 100%)',
        icon: '⚡',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/20',
        borderColor: 'border-rose-500/30',
      };
    default:
      return {
        gradient: 'linear-gradient(135deg, #475569 0%, #334155 50%, #1f2937 100%)',
        icon: '🎯',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        borderColor: 'border-slate-500/30',
      };
  }
};

export default function WorkoutPosts({
  athleteId,
  userHoldings,
  posts,
  isLoading,
  onUnlockClick,
  onConnectStrava
}: WorkoutPostsProps) {
  const user = useUser();

  const handleConnectStrava = () => {
    if (onConnectStrava) {
      onConnectStrava();
      return;
    }

    if (typeof window !== 'undefined') {
      window.open('https://www.strava.com/settings/apps', '_blank', 'noopener,noreferrer');
    }
  };

  const canViewPost = (post: Post) => {
    // User is the athlete
    if (user?.id === athleteId) return true;
    // Post is not token-gated
    if (!post.token_gated) return true;
    // User holds tokens
    if (userHoldings > 0) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden border-white/10 bg-card/60 backdrop-blur-md">
            <div className="h-32 animate-pulse bg-gradient-to-br from-muted/40 to-muted/20" />
            <CardContent className="space-y-3 p-4">
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted/40" />
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted/30" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 animate-pulse rounded-xl bg-muted/20" />
                <div className="h-16 animate-pulse rounded-xl bg-muted/20" />
                <div className="h-16 animate-pulse rounded-xl bg-muted/20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="border-white/10 bg-card/60 backdrop-blur-md">
        <CardContent className="p-6">
          <EmptyState
            icon={<Activity className="h-8 w-8" />}
            title="No workouts yet"
            description="Connect Strava to auto-sync training sessions or add a manual post to kick things off."
            ctaLabel="Connect Strava"
            onCta={handleConnectStrava}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const canView = canViewPost(post);
        const workout = (post.workout_json && typeof post.workout_json === 'object' && !Array.isArray(post.workout_json))
          ? post.workout_json as Partial<Workout>
          : {} as Partial<Workout>;

        const style = getWorkoutStyle(workout.type);
        const hasMedia = post.image_url || post.strava_map_polyline;

        return (
          <Card
            key={post.id}
            className="group overflow-hidden border-white/10 bg-card/60 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:shadow-lg"
          >
            <CardContent className="p-0">
              {/* Media / Gradient Header */}
              <div className="relative">
                {hasMedia ? (
                  <>
                    {post.image_url ? (
                      <SupabaseResponsiveImage
                        src={post.image_url}
                        alt="Workout"
                        widths={[480, 720, 960, 1280]}
                        sizes="(max-width: 768px) 100vw, 960px"
                        aspectRatio={1.8}
                        className="w-full"
                        imgClassName={cn(
                          'transition-all duration-300',
                          !canView && 'blur-lg scale-105'
                        )}
                      />
                    ) : (
                      <div className="w-full aspect-[1.8/1] bg-background/50 relative overflow-hidden">
                        <ActivityMap
                          polyline={post.strava_map_polyline!}
                          className={cn(!canView && 'blur-sm')}
                        />
                      </div>
                    )}

                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                      <div className="flex gap-2 flex-wrap">
                        <Badge
                          className={cn(
                            'px-2.5 py-1 font-semibold backdrop-blur-md border shadow-sm',
                            style.bgColor, style.color, style.borderColor
                          )}
                        >
                          <span className="mr-1">{style.icon}</span>
                          {workout.type || 'Workout'}
                        </Badge>
                        {post.strava_activity_id && (
                          <Badge
                            variant="outline"
                            className="gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 border-orange-500/30 backdrop-blur-md"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Strava
                          </Badge>
                        )}
                        {workout.is_agent && (
                          <Badge
                            variant="outline"
                            className="gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 border-blue-500/30 backdrop-blur-md"
                          >
                            <Zap className="h-3 w-3" />
                            AI Agent
                          </Badge>
                        )}
                      </div>
                      {post.token_gated && (
                        <Badge
                          variant="outline"
                          className="gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 border-purple-500/30 backdrop-blur-md"
                        >
                          <Lock className="h-3 w-3" />
                          VIP
                        </Badge>
                      )}
                    </div>

                    {/* Bottom date */}
                    <div className="absolute bottom-3 right-3">
                      <div className="flex items-center gap-1.5 text-xs text-white/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Gradient Header for posts without media */
                  <div
                    className="w-full h-28 relative overflow-hidden"
                    style={{ background: style.gradient }}
                  >
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-4 right-4 text-6xl opacity-30">{style.icon}</div>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                      <div className="flex gap-2">
                        <Badge className="px-2.5 py-1 font-semibold bg-black/30 text-white border-white/20 backdrop-blur-sm">
                          <span className="mr-1">{style.icon}</span>
                          {workout.type || 'Workout'}
                        </Badge>
                        {post.strava_activity_id && (
                          <Badge
                            variant="outline"
                            className="gap-1 px-2 py-1 bg-white/10 text-white border-white/20 backdrop-blur-sm"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Strava
                          </Badge>
                        )}
                        {workout.is_agent && (
                          <Badge
                            variant="outline"
                            className="gap-1 px-2 py-1 bg-white/10 text-white border-white/20 backdrop-blur-sm"
                          >
                            <Zap className="h-3 w-3" />
                            AI Agent
                          </Badge>
                        )}
                      </div>
                      {post.token_gated && (
                        <Badge
                          variant="outline"
                          className="gap-1 px-2 py-1 bg-white/10 text-white border-white/20 backdrop-blur-sm"
                        >
                          <Lock className="h-3 w-3" />
                          VIP
                        </Badge>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <div className="flex items-center gap-1.5 text-xs text-white/90 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Locked overlay */}
                {!canView && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="text-center text-white">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                        <Lock className="h-7 w-7" />
                      </div>
                      <p className="font-bold text-lg">Card Holders Only</p>
                      <p className="text-sm text-white/70 mt-1">Buy Cards to unlock</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {canView ? (
                  <>
                    {/* Workout Stats Grid */}
                    {(workout.distance || workout.duration || workout.rpe) && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {workout.distance && (
                          <div className={cn(
                            'text-center p-3 rounded-xl border transition-colors',
                            style.bgColor, style.borderColor
                          )}>
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                              <MapPin className="h-3 w-3" />
                              Distance
                            </div>
                            <div className={cn('text-lg font-bold', style.color)}>
                              {workout.distance}
                            </div>
                            <div className="text-[10px] text-muted-foreground">km</div>
                          </div>
                        )}
                        {workout.duration && (
                          <div className={cn(
                            'text-center p-3 rounded-xl border transition-colors',
                            style.bgColor, style.borderColor
                          )}>
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                              <Clock className="h-3 w-3" />
                              Duration
                            </div>
                            <div className={cn('text-lg font-bold', style.color)}>
                              {workout.duration}
                            </div>
                            <div className="text-[10px] text-muted-foreground">min</div>
                          </div>
                        )}
                        {workout.rpe && (
                          <div className={cn(
                            'text-center p-3 rounded-xl border transition-colors',
                            style.bgColor, style.borderColor
                          )}>
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                              <Flame className="h-3 w-3" />
                              Effort
                            </div>
                            <div className={cn('text-lg font-bold', style.color)}>
                              {workout.rpe}/10
                            </div>
                            <div className="text-[10px] text-muted-foreground">RPE</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {post.text && (
                      <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                        {post.text}
                      </p>
                    )}

                    {/* Reactions Bar */}
                    <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                      <ReactionBar postId={post.id} compact />
                      <PropButton postId={post.id} size="sm" />
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Unlock this exclusive workout content
                    </p>
                    <Button
                      onClick={onUnlockClick}
                      className="bg-primary hover:bg-primary/90 font-semibold gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      Buy Cards to Unlock
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
