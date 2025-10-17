import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StravaConnectProps {
  athleteId: string;
}

export default function StravaConnect({ athleteId }: StravaConnectProps) {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('athlete_integrations')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('service', 'strava')
        .maybeSingle();

      setConnected(!!data);
    } catch (error) {
      console.error('Error checking Strava connection:', error);
    }
  }, [athleteId]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleConnect = () => {
    // Strava OAuth flow
    const STRAVA_CLIENT_ID = '138859'; // You'll need to create a Strava app
    const REDIRECT_URI = `${window.location.origin}/strava/callback`;
    const SCOPE = 'read,activity:read_all';
    
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&approval_prompt=force&scope=${SCOPE}`;
    
    toast({
      title: 'Strava Integration',
      description: 'To connect Strava, you need to create a Strava API application first. Visit Settings > My API Application on Strava.',
    });
    
    // For now, just show instructions
    // In production, you'd open authUrl in a popup or redirect
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('athlete_integrations')
        .delete()
        .eq('athlete_id', athleteId)
        .eq('service', 'strava');

      if (error) throw error;

      setConnected(false);
      toast({
        title: 'Disconnected',
        description: 'Strava has been disconnected from your account',
      });
    } catch (error: unknown) {
      console.error('Error disconnecting Strava:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disconnect Strava',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Activity className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Strava</CardTitle>
              <CardDescription>Sync workouts automatically</CardDescription>
            </div>
          </div>
          {connected ? (
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
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {connected
            ? 'Your Strava activities will be automatically synced as workout posts.'
            : 'Connect your Strava account to automatically import your workouts.'}
        </p>
        {connected ? (
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full"
          >
            Disconnect Strava
          </Button>
        ) : (
          <Button onClick={handleConnect} className="w-full">
            Connect Strava
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
