import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type UseActivitiesOptions = {
  enabled?: boolean;
  limit?: number;
};

export function useActivities(options: UseActivitiesOptions = {}) {
  const { user } = useAuth();
  const queryEnabled = options.enabled ?? !!user;
  const resultLimit = options.limit ?? 10;

  return useQuery({
    queryKey: ['activities', user?.id, resultLimit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(resultLimit);

      if (error) {
        console.error('Error fetching activities:', error);
        throw error;
      }

      return data;
    },
    enabled: queryEnabled && !!user,
  });
}
