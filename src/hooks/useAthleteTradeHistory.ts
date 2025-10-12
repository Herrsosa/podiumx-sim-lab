import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { priceAt } from '@/utils/pricing';

type TimeRange = '24h' | '7d' | '30d' | 'all';

interface TradePoint {
  timestamp: number;
  price: number;
}

export function useAthleteTradeHistory(athleteId: string | undefined, range: TimeRange = '24h') {
  const queryClient = useQueryClient();

  // Subscribe to real-time trade updates
  useEffect(() => {
    if (!athleteId) return;

    const channel = supabase
      .channel('trade-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `athlete_id=eq.${athleteId}`
        },
        () => {
          // Invalidate and refetch the trade history when a new trade occurs
          queryClient.invalidateQueries({ 
            queryKey: ['athlete-trade-history', athleteId, range] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId, range, queryClient]);

  return useQuery({
    queryKey: ['athlete-trade-history', athleteId, range],
    queryFn: async () => {
      if (!athleteId) return { data: [], changePct: 0, volume: 0 };

      const now = new Date();
      const rangeHours: Record<Exclude<TimeRange, 'all'>, number> = {
        '24h': 24,
        '7d': 168,
        '30d': 720,
      };

      let query = supabase
        .from('trades')
        .select('created_at, price_after')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: true });

      if (range !== 'all') {
        const hoursAgo = rangeHours[range];
        const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
        query = query.gte('created_at', startTime.toISOString());
      }

      // Fetch all trades for this athlete in the time range
      const { data: trades, error } = await query;

      if (error) {
        console.error('Error fetching trade history:', error);
        return { data: [], changePct: 0, volume: 0 };
      }

      // Calculate volume from all trades in range
      const volume = trades?.reduce((sum, trade) => sum + Math.abs(Number(trade.price_after) || 0), 0) || 0;

      if (!trades || trades.length === 0) {
        // No trades yet - fetch current token data to show current price
        const { data: token } = await supabase
          .from('athlete_tokens')
          .select('supply, a, b, c')
          .eq('athlete_id', athleteId)
          .single();
        
        if (token) {
          const curve = {
            a: token.a || 0.0002,
            b: token.b || 0.02,
            c: token.c || 1,
          };
          const currentPrice = priceAt(token.supply || 0, curve);
          
          // Return a single point for the current price
          return {
            data: [{
              timestamp: now.getTime(),
              price: currentPrice,
            }],
            changePct: 0,
            volume: 0,
          };
        }
        
        return { data: [], changePct: 0, volume: 0 };
      }

      const points: TradePoint[] = (trades || [])
        .map((trade) => {
          const timestamp = new Date(trade.created_at).getTime();
          const price = Number(trade.price_after);
          if (!Number.isFinite(timestamp) || Number.isNaN(price)) {
            return null;
          }
          return { timestamp, price };
        })
        .filter((point): point is TradePoint => Boolean(point))
        .sort((a, b) => a.timestamp - b.timestamp);

      // Down-sample if needed to keep chart performant
      const MAX_POINTS = 240;
      let sampledPoints = points;
      if (points.length > MAX_POINTS) {
        const step = Math.ceil(points.length / MAX_POINTS);
        sampledPoints = points.filter((_, index) => index % step === 0);
        const lastPoint = points[points.length - 1];
        if (sampledPoints[sampledPoints.length - 1]?.timestamp !== lastPoint.timestamp) {
          sampledPoints = [...sampledPoints, lastPoint];
        }
      }

      // Calculate price change percentage
      const firstPrice = sampledPoints[0]?.price || 0;
      const lastPrice = sampledPoints[sampledPoints.length - 1]?.price || 0;
      const changePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

      return { data: sampledPoints, changePct, volume };
    },
    enabled: !!athleteId,
  });
}
