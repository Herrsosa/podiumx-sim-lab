import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { subscribeToAthletePrice } from '@/lib/realtime/athleteRealtime';
import {
  clampToSignup,
  toChartPoints,
  toTradePoints,
  ensureMs,
  type ChartPoint,
} from '@/lib/charting/seriesUtils';
import { buildPriceSeries } from '@/lib/charting/engine';

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

type PriceRow = Database['public']['Tables']['athlete_prices']['Row'];

type RealtimePricePayload = Partial<PriceRow> & {
  updated_at?: string | null;
  updatedAt?: string | null;
  reserve?: number | null;
  athleteRevenue?: number | null;
};

export interface UseAthleteTradeHistoryOptions {
  signupAt?: number | null;
  latestPrice?: { price: number; t: number | null } | null;
}

export const trimToWindow = (points: TradePoint[], range: TimeRange, signupAtMs?: number | null) => {
  if (range === 'all' && !signupAtMs) {
    return points;
  }

  const now = Date.now();
  const startFromRange =
    range === '24h' ? now - 24 * 60 * 60 * 1000
    : range === '7d' ? now - 7 * 24 * 60 * 60 * 1000
    : range === '30d' ? now - 30 * 24 * 60 * 60 * 1000
    : Number.NEGATIVE_INFINITY;

  const signup = signupAtMs != null ? ensureMs(Number(signupAtMs)) : Number.NEGATIVE_INFINITY;
  const rangeStart = Math.max(startFromRange, signup);
  
  return points.filter(p => p.timestamp >= rangeStart && p.timestamp <= now);
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

export function useAthleteTradeHistory(
  athleteId: string | undefined,
  range: TimeRange = '24h',
  options: UseAthleteTradeHistoryOptions = {},
) {
  const signupAtMs = useMemo(() => {
    if (options.signupAt == null || !Number.isFinite(options.signupAt)) return null;
    return ensureMs(Number(options.signupAt));
  }, [options.signupAt]);

  const latestPricePoint = useMemo(() => {
    const latest = options.latestPrice;
    if (!latest || !Number.isFinite(latest.price)) return null;
    const timestamp = latest.t != null && Number.isFinite(latest.t) ? ensureMs(Number(latest.t)) : Date.now();
    return { price: latest.price, t: timestamp };
  }, [options.latestPrice]);

  const tradeHistoryQueryKey = useMemo(
    () => ['athleteTradeHistory', athleteId, range] as const,
    [athleteId, range],
  );

  // Subscribe to real-time updates via centralized manager
  useEffect(() => {
    if (!athleteId) return;
    return subscribeToAthletePrice(athleteId);
  }, [athleteId]);

  const result = useQuery<ChartSeries>({
    queryKey: tradeHistoryQueryKey,
    enabled: !!athleteId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async () => {
      if (!athleteId) return { data: [], changePct: 0, volume: 0 };

      const now = Date.now();

      // Fetch ALL trades (don't filter by range - we need historical context for price carrying)
      const { data: trades, error } = await supabase
        .from('trades')
        .select('created_at, price_after, qty, gross_amount, net_amount')
        .eq('athlete_id', athleteId)
        .eq('is_on_chain', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching trade history:', error);
        return { data: [], changePct: 0, volume: 0 };
      }

      type TradeRow = Pick<
        Database['public']['Tables']['trades']['Row'],
        'created_at' | 'price_after' | 'qty' | 'gross_amount' | 'net_amount'
      >;

      const tradeRows = (trades ?? []) as TradeRow[];

      // Map trades to price inputs for the engine
      const priceInputs = tradeRows
        .map((trade) => {
          const timestamp = trade.created_at ? ensureMs(Date.parse(trade.created_at)) : Number.NaN;
          const price = Number(trade.price_after);
          if (!Number.isFinite(timestamp) || !Number.isFinite(price)) {
            return null;
          }
          return { timestamp, price };
        })
        .filter((point): point is { timestamp: number; price: number } => Boolean(point));

      // Map range to TimeRangeKey for engine
      const rangeKey = range === '24h' ? '7d' : range; // Treat 24h as 7d for now

      // Use the engine to build daily price series with price carrying
      const priceSeries = buildPriceSeries(priceInputs, rangeKey, {
        fallbackPrice: latestPricePoint?.price,
        now,
      });

      if (priceSeries.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ChartDiag] buildPriceSeries returned empty');
        }
        return { data: [], changePct: 0, volume: 0 };
      }

      // Convert engine output to ChartPoint format
      const visiblePoints: ChartPoint[] = priceSeries.map(point => ({
        t: point.t,
        price: point.price,
      }));

      // Calculate volume for trades within the window
      const rangeStart = priceSeries[0]?.t ?? now;
      const rangeEnd = priceSeries[priceSeries.length - 1]?.t ?? now;
      
      const windowedVolume = tradeRows.reduce((sum, trade) => {
        const timestamp = trade.created_at ? ensureMs(Date.parse(trade.created_at)) : Number.NaN;
        if (!Number.isFinite(timestamp) || timestamp < rangeStart || timestamp > rangeEnd) {
          return sum;
        }

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
        if (Number.isFinite(price) && Number.isFinite(qty) && qty !== 0) {
          return sum + Math.abs(price * qty);
        }

        return sum;
      }, 0);

      const tradePoints = toTradePoints(visiblePoints);

      if (process.env.NODE_ENV !== 'production') {
        const first = visiblePoints?.[0];
        const last = visiblePoints?.[visiblePoints.length - 1];
        console.log('[ChartDiag] athleteId=', athleteId);
        console.log('[ChartDiag] range=', range, 'signupAtMs=', signupAtMs, signupAtMs ? new Date(signupAtMs).toISOString() : null);
        console.log('[ChartDiag] all trades count=', priceInputs.length);
        console.log('[ChartDiag] buildPriceSeries returned=', priceSeries.length, 'daily points');
        console.log('[ChartDiag] visible points=', visiblePoints.length, 'first=', first?.t && new Date(first.t).toISOString(), 'last=', last?.t && new Date(last.t).toISOString(), 'lastPrice=', last?.price);
      }

      return recalcSeries(tradePoints, windowedVolume);
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
