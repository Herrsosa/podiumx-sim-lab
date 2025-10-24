
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TradeRow = Database['public']['Tables']['trades']['Row'];

export type AthleteTrade = TradeRow & {
  timestamp: number;
  athleteName: string;
  userName: string;
};

export function useAthleteTrades(athleteId: string, sinceMs?: number) {
  return useQuery({
    queryKey: ['athlete-trades', athleteId, sinceMs],
    queryFn: async () => {
      if (!athleteId) return [];

      let query = supabase
        .from('trades')
        .select('id, created_at, athlete_id, user_id, side, qty, gross_amount, net_amount, fee, price_after')
        .eq('athlete_id', athleteId);

      // Add time filter if provided to reduce overfetch
      if (sinceMs) {
        query = query.gte('created_at', new Date(sinceMs).toISOString());
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows: TradeRow[] = (data ?? []) as TradeRow[];

      return rows.map<AthleteTrade>((trade) => ({
        ...trade,
        timestamp: new Date(trade.created_at).getTime(),
        athleteName: '', // This can be enriched if needed
        userName: '', // This can be enriched if needed
      }));
    },
    enabled: !!athleteId,
  });
}
