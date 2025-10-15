
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAthleteTrades(athleteId: string) {
  return useQuery({
    queryKey: ['athlete-trades', athleteId],
    queryFn: async () => {
      if (!athleteId) return [];

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });

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
