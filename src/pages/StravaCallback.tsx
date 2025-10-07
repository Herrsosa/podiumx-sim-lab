import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const STRAVA_CLIENT_ID = '138859';

export default function StravaCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        console.error('Strava OAuth error:', error);
        navigate('/me?strava_error=' + error);
        return;
      }

      if (!code) {
        console.error('No code in callback');
        navigate('/me');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Not authenticated');
        }

        const redirectUri = `${window.location.origin}/strava/callback`;

        // Call edge function to exchange code
        const exchangeUrl = new URL(
          `https://ssnehmposgsczoadycms.supabase.co/functions/v1/strava-oauth-exchange`
        );
        exchangeUrl.searchParams.set('code', code);
        exchangeUrl.searchParams.set('client_id', STRAVA_CLIENT_ID);
        exchangeUrl.searchParams.set('redirect_uri', redirectUri);

        const response = await fetch(exchangeUrl.toString(), {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to exchange OAuth code');
        }

        // Redirect back to My Page
        navigate('/me?strava_connected=true');
      } catch (error: any) {
        console.error('Error in Strava callback:', error);
        navigate('/me?strava_error=' + encodeURIComponent(error.message));
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Connecting to Strava...</p>
      </div>
    </div>
  );
}
