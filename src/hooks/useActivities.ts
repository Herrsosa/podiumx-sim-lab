import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import type { StoredActivity } from '@/utils/stravaActivity';

type UseActivitiesOptions = {
  enabled?: boolean;
  limit?: number;
};

export function useActivities(options: UseActivitiesOptions = {}) {
  const user = useUser();
  const queryEnabled = options.enabled ?? !!user;
  const resultLimit = options.limit ?? 10;

  return useQuery({
    queryKey: ['activities', user?.id, resultLimit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('activities')
        .select(
          'id, user_id, name, sport_type, start_time, distance_m, moving_time_s, elapsed_time_s, avg_hr, max_hr, elev_gain_m, calories, raw, external_id, source, created_at, imported_post_id, imported_at'
        )
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(resultLimit);

      if (error) {
        console.error('Error fetching activities:', error);
        throw error;
      }

      return (data ?? []) as StoredActivity[];
    },
    enabled: queryEnabled && !!user,
  });
}
