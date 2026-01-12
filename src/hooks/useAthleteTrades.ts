
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AthleteTrade {
  id: string;
  created_at: string;
  athlete_id: string;
  user_id: string;
  side: 'BUY' | 'SELL';
  qty: number;
  gross_amount: number;
  net_amount: number;
  fee: number;
  price_after: number;
  timestamp: number;
  athleteName: string;
  userName: string;
  userAvatar?: string;
}

export function useAthleteTrades(athleteId: string, sinceMs?: number) {
  return useQuery({
    queryKey: ['athlete-trades', athleteId, sinceMs],
    queryFn: async (): Promise<AthleteTrade[]> => {
      if (!athleteId) return [];

      // First, fetch trades
      let query = supabase
        .from('trades')
        .select('id, created_at, athlete_id, user_id, side, qty, gross_amount, net_amount, fee, price_after')
        .eq('athlete_id', athleteId);

      // Filter by time window when provided
      if (sinceMs !== undefined) {
        query = query.gte('created_at', new Date(sinceMs).toISOString());
      }

      const { data: trades, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!trades || trades.length === 0) return [];

      // Get unique user IDs to fetch profiles
      const userIds = [...new Set(trades.map(t => t.user_id))];

      // Fetch profiles for all unique users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      // Create a lookup map
      const profileMap = new Map<string, { display_name: string | null; username: string; avatar_url: string | null }>();
      profiles?.forEach(p => profileMap.set(p.id, p));

      return trades.map<AthleteTrade>((trade) => {
        const profile = profileMap.get(trade.user_id);
        const displayName = profile?.display_name || profile?.username || 'Anonymous';
        return {
          id: trade.id,
          created_at: trade.created_at,
          athlete_id: trade.athlete_id,
          user_id: trade.user_id,
          side: trade.side as 'BUY' | 'SELL',
          qty: trade.qty,
          gross_amount: trade.gross_amount,
          net_amount: trade.net_amount,
          fee: trade.fee,
          price_after: trade.price_after,
          timestamp: new Date(trade.created_at).getTime(),
          athleteName: '',
          userName: displayName,
          userAvatar: profile?.avatar_url ?? undefined,
        };
      });
    },
    enabled: !!athleteId,
  });
}
