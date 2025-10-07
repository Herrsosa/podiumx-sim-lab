import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, XCircle, Play, Calendar, MapPin, Heart, TrendingUp } from 'lucide-react';
import { useStravaConnection } from '@/hooks/useStravaConnection';
import { useActivities } from '@/hooks/useActivities';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const STRAVA_CLIENT_ID = '172877';

export default function StravaTraining() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: connection, isLoading: connectionLoading } = useStravaConnection();
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const [importing, setImporting] = useState(false);

  const handleConnect = () => {
    const redirectUri = `${window.location.origin}/strava/callback`;
    const scope = 'read,activity:read_all';
    
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${scope}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('oauth_connections')
        .delete()
        .eq('provider', 'strava');

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['strava-connection'] });
      
      toast({
        title: 'Disconnected',
        description: 'Strava has been disconnected from your account',
      });
    } catch (error: any) {
      console.error('Error disconnecting Strava:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect Strava',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('import-strava-activities', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['activities'] });

      toast({
        title: 'Import Complete',
        description: `Imported ${data.inserted} new activities, updated ${data.updated}`,
      });
    } catch (error: any) {
      console.error('Error importing activities:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import Strava activities',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return '-';
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (connectionLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Activity className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Strava Training</CardTitle>
              <CardDescription>Sync your workouts automatically</CardDescription>
            </div>
          </div>
          {connection ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connection ? (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Strava account to automatically import your workouts.
            </p>
            <Button onClick={handleConnect} className="w-full">
              <Activity className="mr-2 h-4 w-4" />
              Connect Strava
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={importing}
                className="flex-1"
              >
                <Play className="mr-2 h-4 w-4" />
                {importing ? 'Importing...' : 'Import Activities'}
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>

            {activitiesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Activities</h4>
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h5 className="font-medium">{activity.name}</h5>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {activity.start_time && format(new Date(activity.start_time), 'PPp')}
                            </div>
                          </div>
                          <Badge variant="outline">{activity.sport_type}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDistance(activity.distance_m)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDuration(activity.moving_time_s)}</span>
                          </div>
                          {activity.avg_hr && (
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3 text-muted-foreground" />
                              <span>{Math.round(activity.avg_hr)} bpm</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activities yet. Click "Import Activities" to sync from Strava.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
