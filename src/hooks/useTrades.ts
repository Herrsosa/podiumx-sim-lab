import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trade } from '@/types';
import { useUser } from '@/store/auth';

const TRADE_SELECT =
  'id, athlete_id, user_id, side, qty, gross_amount, net_amount, fee, created_at, price_after';

interface DbTrade {
  id: string;
  created_at: string;
  athlete_id: string;
  user_id: string;
  side: 'BUY' | 'SELL';
  qty: number;
  gross_amount: string;
  net_amount: string;
  fee: string;
  profiles: {
    display_name: string;
    username: string;
  } | null;
}

export function useTrades(athleteId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['trades', athleteId],
    queryFn: async () => {
      let query = supabase
        .from('trades')
        .select(
          `${TRADE_SELECT}, profiles!trades_athlete_id_profiles_id_fk(display_name, username)`
        )
        .order('created_at', { ascending: false });

      if (athleteId) {
        query = query.eq('athlete_id', athleteId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const trades: Trade[] = ((data ?? []) as any).map((trade: any) => {
        const profile = trade.profiles;
        return {
          id: trade.id,
          athleteId: trade.athlete_id,
          athleteName: profile?.display_name || profile?.username || 'Unknown',
          type: trade.side === 'BUY' ? 'buy' : 'sell',
          quantity: trade.qty,
          price: Number(trade.gross_amount) / trade.qty,
          total: Number(trade.net_amount),
          fee: Number(trade.fee),
          timestamp: new Date(trade.created_at).getTime(),
        };
      });

      return trades;
    },
    enabled: options?.enabled ?? true,
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const trades: Trade[] = (data as any).map((trade: any) => {
        const profile = trade.profiles;
        return {
          id: trade.id,
          athleteId: trade.athlete_id,
          athleteName: profile?.display_name || profile?.username || 'Unknown',
          type: trade.side === 'BUY' ? 'buy' : 'sell',
          quantity: trade.qty,
          price: Number(trade.gross_amount) / trade.qty,
          total: Number(trade.net_amount),
          fee: Number(trade.fee),
          timestamp: new Date(trade.created_at).getTime(),
        };
      });

      return trades;
    },
    enabled: !!user,
  });
}
