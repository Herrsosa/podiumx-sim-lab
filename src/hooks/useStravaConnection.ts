import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';

export const stravaConnectionQueryKey = (userId: string | undefined) =>
  ['connections', { userId, provider: 'strava' }] as const;

export function useStravaConnection() {
  const user = useUser();
  const userId = user?.id;

  return useQuery({
    queryKey: stravaConnectionQueryKey(userId),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('athlete_integrations')
        .select('id, athlete_id, service, created_at, updated_at')
        .eq('athlete_id', userId)
        .eq('service', 'strava')
        .maybeSingle();

      if (error) {
        console.error('Error fetching Strava connection:', error);
        throw error;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
