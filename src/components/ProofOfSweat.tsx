import { Activity, Calendar, Clock, Gauge, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Workout } from '@/types';

interface ProofOfSweatProps {
  workouts: Workout[];
}

export default function ProofOfSweat({ workouts }: ProofOfSweatProps) {
  // Safety check for undefined workouts
  const safeWorkouts = workouts || [];
  
  const getWorkoutIcon = (type: Workout['type']) => {
    switch (type) {
      case 'Run':
        return <Activity className="h-4 w-4" />;
      case 'Swim':
        return <Zap className="h-4 w-4" />;
      case 'Bike':
        return <Activity className="h-4 w-4" />;
      case 'Strength':
        return <Gauge className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Proof of Sweat
        </CardTitle>
      </CardHeader>
      <CardContent>
        {safeWorkouts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No workouts yet
          </div>
        ) : (
          <div className="space-y-3">
            {safeWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-primary/30 hover:bg-card/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        {getWorkoutIcon(workout.type)}
                        {workout.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(workout.date)}
                      </span>
                    </div>
                    
                    <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                      {workout.distance && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Activity className="h-3.5 w-3.5" />
                          <span>{workout.distance.toFixed(1)} km</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDuration(workout.duration)}</span>
                      </div>
                      {workout.pace && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Gauge className="h-3.5 w-3.5" />
                          <span>{workout.pace}</span>
                        </div>
                      )}
                      {workout.speed && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Gauge className="h-3.5 w-3.5" />
                          <span>{workout.speed}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Zap className="h-3.5 w-3.5" />
                        <span>RPE {workout.rpe}/10</span>
                      </div>
                    </div>
                    
                    {workout.notes && (
                      <p className="text-sm text-foreground/80">{workout.notes}</p>
                    )}
                  </div>
                </div>
                
                {/* Subtle accent bar */}
                <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
