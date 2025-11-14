import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Calendar } from 'lucide-react';
import type { Workout, Post } from '@/types';
import { SupabaseResponsiveImage } from '@/components/SupabaseResponsiveImage';
import { cn } from '@/lib/utils';

interface WorkoutGridCardProps {
  workout: Workout;
  post?: Post;
  canView: boolean;
  onClick: () => void;
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
    default:
      return 'bg-muted/40 text-muted-foreground border-muted/50';
  }
};

const getTypeGradient = (type: Workout['type']) => {
  switch (type) {
    case 'Run':
    case 'HYROX':
      return 'from-primary/10 via-primary/5 to-background/20';
    case 'Swim':
      return 'from-accent/10 via-accent/5 to-background/20';
    case 'Bike':
      return 'from-accent/10 via-accent/5 to-background/20';
    case 'Strength':
      return 'from-warning/10 via-warning/5 to-background/20';
    default:
      return 'from-muted/20 via-muted/10 to-background/20';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function WorkoutGridCard({ workout, post, canView, onClick }: WorkoutGridCardProps) {
  const hasPhoto = post?.image_url;
  const typeGradient = getTypeGradient(workout.type);
  const typeColor = getTypeColor(workout.type);

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

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-muted/40 transition-all duration-300 cursor-pointer',
        'hover:scale-[1.02] hover:shadow-lg hover:border-primary/20',
        'active:scale-[0.98]'
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
      aria-label={`${workout.type} workout on ${formatDate(post?.created_at || '')}`}
    >
      <div className="relative aspect-square">
        {/* Background layer */}
        {hasPhoto ? (
          <SupabaseResponsiveImage
            src={post.image_url!}
            alt={`${workout.type} workout`}
            widths={[280, 360, 480]}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            aspectRatio={1}
            className="absolute inset-0"
            imgClassName={cn(
              'object-cover',
              !canView && 'blur-xl'
            )}
          />
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br', typeGradient)} />
        )}

        {/* Dark gradient overlay for text readability */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t',
          hasPhoto ? 'from-black/80 via-black/40 to-black/20' : 'from-background/80 via-background/40 to-transparent'
        )} />

        {/* Content overlay */}
        <CardContent className="absolute inset-0 p-4 flex flex-col justify-between">
          {/* Top row: type badge + date */}
          <div className="flex items-start justify-between gap-2">
            <Badge className={cn('backdrop-blur-sm border text-xs font-semibold', typeColor)}>
              {workout.type}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-foreground/90 backdrop-blur-sm bg-background/80 px-2 py-1 rounded-md border border-border/50">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">
                {formatDate(post?.created_at || '')}
              </span>
            </div>
          </div>

          {/* Bottom section: metrics + caption */}
          <div className="space-y-2">
            {canView ? (
              <>
                {/* Metrics */}
                {metricsText && (
                  <div className="text-foreground font-semibold text-base md:text-lg">
                    {metricsText}
                  </div>
                )}

                {/* Caption */}
                {post?.text && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-tight">
                    {post.text}
                  </p>
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

        {/* Lock overlay for gated content */}
        {!canView && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" />
        )}
      </div>
    </Card>
  );
}
