import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';

export type AccessTier = 'public' | 'supporter' | 'backer';

export function useAccessTier(athleteId: string | undefined) {
  const user = useUser();

  return useQuery({
    queryKey: ['locker-access', user?.id, athleteId],
    queryFn: async () => {
      if (!athleteId || !user?.id) return { balance: 0, tier: 'public' as AccessTier };

      const { data, error } = await supabase.rpc('get_user_balance', {
        p_athlete_id: athleteId,
      });

      if (error) throw error;

      const balance = data ?? 0;
      const tier: AccessTier = balance >= 10 ? 'backer' : balance >= 1 ? 'supporter' : 'public';

      return { balance, tier };
    },
    enabled: !!athleteId && !!user?.id,
    staleTime: 10_000,
  });
}
