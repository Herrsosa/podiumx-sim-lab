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
        .from('athlete_integrations')
        .select('id, athlete_id, service, created_at, updated_at')
        .eq('athlete_id', user.id)
        .eq('service', 'strava')
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
