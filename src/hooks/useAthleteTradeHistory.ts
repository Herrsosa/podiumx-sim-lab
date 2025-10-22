import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { priceAt } from '@/utils/pricing';
import type { Database } from '@/integrations/supabase/types';
import type { AthletePriceSnapshot } from './useAthletePrice';

export type TimeRange = '24h' | '7d' | '30d' | 'all';

export interface TradePoint {
  timestamp: number;
  price: number;
}

export interface ChartSeries {
  data: TradePoint[];
  changePct: number;
  volume: number;
}

export const RANGE_WINDOWS: Record<Exclude<TimeRange, 'all'>, number> = {
  '24h': 24,
  '7d': 168,
  '30d': 720,
};

const MAX_POINTS = 240;

export const trimToWindow = (points: TradePoint[], range: TimeRange) => {
  if (range === 'all') return points;
  const hours = RANGE_WINDOWS[range];
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return points.filter((point) => point.timestamp >= cutoff);
};

const samplePoints = (points: TradePoint[]) => {
  if (points.length <= MAX_POINTS) {
    return points;
  }
  const step = Math.ceil(points.length / MAX_POINTS);
  const sampled = points.filter((_, index) => index % step === 0);
  const lastPoint = points[points.length - 1];
  if (sampled[sampled.length - 1]?.timestamp !== lastPoint.timestamp) {
    sampled.push(lastPoint);
  }
  return sampled;
};

export const recalcSeries = (points: TradePoint[], volume: number): ChartSeries => {
  if (points.length === 0) {
    return { data: [], changePct: 0, volume: 0 };
  }

  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const sampled = samplePoints(sorted);
  const firstPrice = sampled[0]?.price ?? 0;
  const lastPrice = sampled[sampled.length - 1]?.price ?? 0;
  const changePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  return {
    data: sampled,
    changePct,
    volume,
  };
};

export function useAthleteTradeHistory(athleteId: string | undefined, range: TimeRange = '24h') {
  const queryClient = useQueryClient();
  const pendingTicksRef = useRef<AthletePriceSnapshot[]>([]);
  const flushTimeoutRef = useRef<number>();

  useEffect(() => {
    if (!athleteId) return;

      const flushPendingTicks = () => {
        const ticks = pendingTicksRef.current;
        pendingTicksRef.current = [];
        flushTimeoutRef.current = undefined;

        if (ticks.length === 0) return;

        const latest = ticks[ticks.length - 1];
        queryClient.setQueryData<AthletePriceSnapshot | null>(['athlete-price', athleteId], () => latest);

        queryClient.setQueryData<ChartSeries | undefined>(['chart', athleteId, range], (current) => {
          if (!current) return current;

          const basePoints = [...current.data];
          const appendedPoints = ticks.reduce<TradePoint[]>((acc, tick) => {
            const timestamp = tick.updatedAt ? new Date(tick.updatedAt).getTime() : Date.now();
            if (!Number.isFinite(timestamp)) {
              return acc;
            }
            return [...acc, { timestamp, price: tick.price }];
          }, basePoints);

          const deduped = Array.from(new Map(appendedPoints.map((point) => [point.timestamp, point])).values()).sort(
            (a, b) => a.timestamp - b.timestamp,
          );

          const windowed = trimToWindow(deduped, range);
          return recalcSeries(windowed, current.volume);
        });
      };

    const scheduleFlush = () => {
      if (flushTimeoutRef.current !== undefined) return;
      flushTimeoutRef.current = window.setTimeout(flushPendingTicks, 120);
    };

    const channel = supabase
      .channel(`price-stream:${athleteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'athlete_prices',
          filter: `athlete_id=eq.${athleteId}`,
        },
        (payload) => {
          const snapshot = payload.new as any;

          if (!snapshot) return;

          const updatedAt =
            snapshot.updated_at ??
            snapshot.updatedAt ??
            snapshot.created_at ??
            null;

          const previous = queryClient.getQueryData<AthletePriceSnapshot | null>(['athlete-price', athleteId]);
          const curve =
            'curve_a' in snapshot
              ? {
                  a: Number(snapshot.curve_a ?? previous?.curve.a ?? 0.0002),
                  b: Number(snapshot.curve_b ?? previous?.curve.b ?? 0.02),
                  c: Number(snapshot.curve_c ?? previous?.curve.c ?? 1),
                }
              : previous?.curve ?? { a: 0.0002, b: 0.02, c: 1 };

          const formatted: AthletePriceSnapshot = {
            athleteId: snapshot.athlete_id ?? athleteId,
            price: Number(snapshot.price ?? 0),
            supply: Number(snapshot.supply ?? 0),
            reserve: Number(
              snapshot.reserve ?? snapshot.treasury_balance ?? 0,
            ),
            athleteRevenue: Number(
              snapshot.athleteRevenue ?? snapshot.athlete_earnings ?? 0,
            ),
            updatedAt,
            curve,
          };

          pendingTicksRef.current.push(formatted);
          scheduleFlush();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (flushTimeoutRef.current !== undefined) {
        window.clearTimeout(flushTimeoutRef.current);
      }
      pendingTicksRef.current = [];
      flushTimeoutRef.current = undefined;
    };
  }, [athleteId, queryClient, range]);

  const result = useQuery<ChartSeries>({
    queryKey: ['chart', athleteId, range],
    enabled: !!athleteId,
    staleTime: 15 * 60_000,
    queryFn: async () => {
      if (!athleteId) return { data: [], changePct: 0, volume: 0 };

      const now = new Date();
      let query = supabase
        .from('trades')
        .select('created_at, price_after, qty, gross_amount, net_amount')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: true });

      if (range !== 'all') {
        const hoursAgo = RANGE_WINDOWS[range];
        const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
        query = query.gte('created_at', startTime.toISOString());
      }

      const { data: trades, error } = await query;

      if (error) {
        console.error('Error fetching trade history:', error);
        return { data: [], changePct: 0, volume: 0 };
      }

      type TradeRow = Pick<
        Database['public']['Tables']['trades']['Row'],
        'created_at' | 'price_after' | 'qty' | 'gross_amount' | 'net_amount'
      >;

      const tradeRows = (trades ?? []) as TradeRow[];

      const volume = tradeRows.reduce((sum, trade) => {
        const gross = Number(trade.gross_amount);
        if (Number.isFinite(gross) && gross !== 0) {
          return sum + Math.abs(gross);
        }

        const net = Number(trade.net_amount);
        if (Number.isFinite(net) && net !== 0) {
          return sum + Math.abs(net);
        }

        const price = Number(trade.price_after);
        const qty = Number(trade.qty);
        if (Number.isFinite(price) && Number.isFinite(qty)) {
          return sum + Math.abs(price * qty);
        }

        return sum;
      }, 0);

      if (!trades || trades.length === 0) {
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

          return recalcSeries([{ timestamp: now.getTime(), price: currentPrice }], 0);
        }

        return { data: [], changePct: 0, volume: 0 };
      }

      const points: TradePoint[] = tradeRows
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

      const windowed = trimToWindow(points, range);

      return recalcSeries(windowed, volume);
    },
  });

  return useMemo(
    () => ({
      ...result,
      data: result.data ?? { data: [], changePct: 0, volume: 0 },
    }),
    [result],
  );
}
