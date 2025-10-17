import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';

export function useUserRole() {
  const user = useUser();

  const { data: athleteToken, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('athlete_tokens')
        .select('athlete_id')
        .eq('athlete_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  return {
    isAthlete: !!athleteToken,
    isFan: !!user && !athleteToken,
    loading: isLoading,
  };
}
