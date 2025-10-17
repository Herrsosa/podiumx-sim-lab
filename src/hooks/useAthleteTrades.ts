
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAthleteTrades(athleteId: string) {
  return useQuery({
    queryKey: ['athlete-trades', athleteId],
    queryFn: async () => {
      if (!athleteId) return [];

      const { data, error } = await supabase
        .from('trades')
        .select('id, created_at, athlete_id, user_id, side, qty, gross_amount, net_amount, fee, price_after')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data.map(trade => ({
        ...trade,
        timestamp: new Date(trade.created_at).getTime(),
        athleteName: '', // This can be enriched if needed
        userName: '', // This can be enriched if needed
      }));
    },
    enabled: !!athleteId,
  });
}
