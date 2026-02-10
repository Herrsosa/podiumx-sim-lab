import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trade } from '@/types';
import { useUser } from '@/store/auth';
import type { Database } from '@/integrations/supabase/types';

const TRADE_SELECT =
  'id, athlete_id, user_id, side, qty, gross_amount, net_amount, fee, created_at, price_after';

type TradeRow = Database['public']['Tables']['trades']['Row'];

type TradeWithProfile = TradeRow & {
  profiles: {
    display_name: string | null;
    username: string | null;
  } | null;
};

export function useTrades(athleteId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['trades', athleteId],
    queryFn: async () => {
      let query = supabase
        .from('trades')
        .select(
          `${TRADE_SELECT}, profiles!trades_athlete_id_profiles_id_fk(display_name, username)`
        )
        .eq('is_on_chain', true)
        .order('created_at', { ascending: false });

      if (athleteId) {
        query = query.eq('athlete_id', athleteId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows: TradeWithProfile[] = (data ?? []) as TradeWithProfile[];

      const trades: Trade[] = rows.map((trade) => {
        const profile = trade.profiles;
        return {
          id: trade.id,
          athleteId: trade.athlete_id,
          athleteName: profile?.display_name || profile?.username || 'Unknown',
          type: trade.side === 'BUY' ? 'buy' : 'sell',
          quantity: trade.qty,
          price: trade.qty !== 0 ? Number(trade.gross_amount) / trade.qty : 0,
          total: Number(trade.net_amount),
          fee: Number(trade.fee),
          timestamp: new Date(trade.created_at).getTime(),
        };
      });

      return trades;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000, // 30 seconds
  });
}

export function useUserTrades() {
  const user = useUser();

  return useQuery({
    queryKey: ['user-trades', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('trades')
        .select(
          `${TRADE_SELECT}, profiles!trades_athlete_id_profiles_id_fk(display_name, username)`
        )
        .eq('user_id', user.id)
        .eq('is_on_chain', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows: TradeWithProfile[] = (data ?? []) as TradeWithProfile[];

      const trades: Trade[] = rows.map((trade) => {
        const profile = trade.profiles;
        return {
          id: trade.id,
          athleteId: trade.athlete_id,
          athleteName: profile?.display_name || profile?.username || 'Unknown',
          type: trade.side === 'BUY' ? 'buy' : 'sell',
          quantity: trade.qty,
          price: trade.qty !== 0 ? Number(trade.gross_amount) / trade.qty : 0,
          total: Number(trade.net_amount),
          fee: Number(trade.fee),
          timestamp: new Date(trade.created_at).getTime(),
        };
      });

      return trades;
    },
    enabled: !!user,
    staleTime: 30_000, // 30 seconds
  });
}
