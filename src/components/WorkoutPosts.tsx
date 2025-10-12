import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Lock, Calendar, Activity, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Post {
  id: string;
  created_at: string;
  workout_json: any;
  image_url: string | null;
  text: string | null;
  token_gated: boolean;
  strava_activity_id: number | null;
}

interface WorkoutPostsProps {
  athleteId: string;
  userHoldings: number;
  onUnlockClick: () => void;
  onConnectStrava?: () => void;
}

export default function WorkoutPosts({ athleteId, userHoldings, onUnlockClick, onConnectStrava }: WorkoutPostsProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [athleteId]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', athleteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-muted/40" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted/30" />
            <div className="h-44 animate-pulse rounded-lg bg-muted/20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="glass-card">
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
        const workout = post.workout_json || {};

        return (
          <Card key={post.id} className="glass-card overflow-hidden">
            <CardContent className="p-0">
              {/* Media */}
              {post.image_url && (
                <div className="relative">
                  <img
                    src={post.image_url}
                    alt="Workout"
                    className={`w-full h-64 object-cover ${!canView ? 'blur-lg' : ''}`}
                  />
                  {!canView && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        <Lock className="h-12 w-12 mx-auto mb-2" />
                        <p className="font-semibold">Token Holders Only</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {workout.type || 'Workout'}
                    </Badge>
                    {post.token_gated && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Exclusive
                      </Badge>
                    )}
                    {post.strava_activity_id && (
                      <Badge variant="outline" className="gap-1">
                        <Activity className="h-3 w-3" />
                        Strava
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>

                {canView ? (
                  <>
                    {/* Workout Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {workout.distance && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1">Distance</div>
                          <div className="font-semibold">{workout.distance} km</div>
                        </div>
                      )}
                      {workout.duration && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration
                          </div>
                          <div className="font-semibold">{workout.duration} min</div>
                        </div>
                      )}
                      {workout.rpe && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                            <Zap className="h-3 w-3" />
                            RPE
                          </div>
                          <div className="font-semibold">{workout.rpe}/10</div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {post.text && (
                      <p className="text-sm text-muted-foreground">{post.text}</p>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-semibold mb-2">Unlock by Holding Tokens</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      This exclusive workout is only available to token holders
                    </p>
                    <Button onClick={onUnlockClick} size="sm">
                      Buy 1 Token to Unlock
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
