import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AccessTier = 'public' | 'supporter' | 'backer';

export function useAccessTier(athleteId: string | undefined) {
  return useQuery({
    queryKey: ['access-tier', athleteId],
    queryFn: async () => {
      if (!athleteId) return { balance: 0, tier: 'public' as AccessTier };

      const { data, error } = await supabase.rpc('get_user_balance', {
        p_athlete_id: athleteId,
      });

      if (error) throw error;

      const balance = data ?? 0;
      const tier: AccessTier =
        balance >= 10 ? 'backer' : balance >= 1 ? 'supporter' : 'public';

      return { balance, tier };
    },
    enabled: !!athleteId,
  });
}
