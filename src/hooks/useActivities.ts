import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useActivities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching activities:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });
}
