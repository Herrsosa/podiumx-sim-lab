import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';

export function useStravaConnection() {
  const user = useUser();

  return useQuery({
    queryKey: ['strava-connection', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('oauth_connections')
        .select('id, user_id, provider, access_token, refresh_token, expires_at, scope, updated_at')
        .eq('user_id', user.id)
        .eq('provider', 'strava')
        .maybeSingle();

      if (error) {
        console.error('Error fetching Strava connection:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });
}
