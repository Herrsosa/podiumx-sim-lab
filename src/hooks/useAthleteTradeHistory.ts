import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { priceAt } from '@/utils/pricing';
import type { Database } from '@/integrations/supabase/types';
import { athletePriceQueryKey, type AthletePriceSnapshot } from './useAthletePrice';
import { featureFlags } from '@/lib/config/featureFlags';
import {
  clampToSignup,
  toChartPoints,
  toTradePoints,
  ensureMs,
  type ChartPoint,
} from '@/lib/charting/seriesUtils';

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
  const queryClient = useQueryClient();
  const pendingTicksRef = useRef<AthletePriceSnapshot[]>([]);
  const flushTimeoutRef = useRef<number>();
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
    () => ['athleteChart', athleteId, range, signupAtMs, latestPricePoint?.t ?? null, latestPricePoint?.price ?? null] as const,
    [athleteId, range, signupAtMs, latestPricePoint?.t, latestPricePoint?.price],
  );

  useEffect(() => {
    if (!athleteId) return;
    queryClient.removeQueries({ queryKey: ['prices', athleteId], exact: false });
    queryClient.removeQueries({ queryKey: ['athletePrices', athleteId], exact: false });
    queryClient.removeQueries({ queryKey: ['chart', athleteId], exact: false });
  }, [athleteId, queryClient]);

  useEffect(() => {
    if (!athleteId) return;

    const priceKey = athletePriceQueryKey(athleteId);

      const flushPendingTicks = () => {
        const ticks = pendingTicksRef.current;
        pendingTicksRef.current = [];
        flushTimeoutRef.current = undefined;

        if (ticks.length === 0) return;

        const latest = ticks[ticks.length - 1];
        queryClient.setQueryData<AthletePriceSnapshot | null>(priceKey, () => latest);

        queryClient.setQueryData<ChartSeries | undefined>(tradeHistoryQueryKey, (current) => {
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

          const windowed = trimToWindow(deduped, range, signupAtMs);
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
          const snapshot = payload.new as RealtimePricePayload | null;

          if (!snapshot) return;

          const updatedAt =
            snapshot.updated_at ??
            snapshot.updatedAt ??
            snapshot.created_at ??
            null;

          const previous = queryClient.getQueryData<AthletePriceSnapshot | null>(priceKey);
          const curve =
            snapshot.curve_a !== undefined || snapshot.curve_b !== undefined || snapshot.curve_c !== undefined
              ? {
                  a: Number(snapshot.curve_a ?? previous?.curve.a ?? 0.0002),
                  b: Number(snapshot.curve_b ?? previous?.curve.b ?? 0.02),
                  c: Number(snapshot.curve_c ?? previous?.curve.c ?? 1),
                }
              : previous?.curve ?? { a: 0.0002, b: 0.02, c: 1 };

          const formatted: AthletePriceSnapshot = {
            athleteId: snapshot.athlete_id ?? athleteId,
            price: Number(snapshot.price ?? previous?.price ?? 0),
            supply: Number(snapshot.supply ?? previous?.supply ?? 0),
            reserve: Number(snapshot.reserve ?? snapshot.treasury_balance ?? previous?.reserve ?? 0),
            athleteRevenue: Number(snapshot.athleteRevenue ?? snapshot.athlete_earnings ?? previous?.athleteRevenue ?? 0),
            updatedAt,
            curve,
            tokenCreatedAt: previous?.tokenCreatedAt ?? null,
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
  }, [athleteId, queryClient, range, signupAtMs, tradeHistoryQueryKey]);

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
      const startFromRange =
        range === '24h' ? now - 24 * 60 * 60 * 1000
        : range === '7d' ? now - 7 * 24 * 60 * 60 * 1000
        : range === '30d' ? now - 30 * 24 * 60 * 60 * 1000
        : Number.NEGATIVE_INFINITY;

      const signup = signupAtMs != null ? ensureMs(Number(signupAtMs)) : Number.NEGATIVE_INFINITY;
      const rangeStart = Math.max(startFromRange, signup);
      const rangeEnd = now;

      let query = supabase
        .from('trades')
        .select('created_at, price_after, qty, gross_amount, net_amount')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: true });

      if (range !== 'all' || signupAtMs != null) {
        const startIso = new Date(Math.min(rangeStart, now)).toISOString();
        query = query.gte('created_at', startIso);
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

      const chartPoints: ChartPoint[] = tradeRows
        .map((trade) => {
          const timestamp = trade.created_at ? ensureMs(Date.parse(trade.created_at)) : Number.NaN;
          const price = Number(trade.price_after);
          if (!Number.isFinite(timestamp) || !Number.isFinite(price)) {
            return null;
          }
          return { t: timestamp, price };
        })
        .filter((point): point is ChartPoint => Boolean(point))
        .sort((a, b) => a.t - b.t);

      let clamped = chartPoints;
      if (featureFlags.chartClampToSignup && signupAtMs) {
        clamped = clampToSignup(clamped, signupAtMs);
      }

      let stitched = clamped;
      if (featureFlags.chartStitchLatest && latestPricePoint) {
        const lastPoint = clamped[clamped.length - 1];
        if (!lastPoint || latestPricePoint.t > lastPoint.t) {
          stitched = [...clamped, { t: latestPricePoint.t, price: latestPricePoint.price }];
        }
      }

      let rangeFiltered = stitched.filter(point => {
        const t = ensureMs(Number(point.t));
        return t >= rangeStart && t <= rangeEnd;
      });

      if (rangeFiltered.length > 0 && range !== 'all') {
        const startCandidate = ensureMs(rangeStart);
        const firstPoint = rangeFiltered[0];
        if (firstPoint.t > startCandidate) {
          rangeFiltered = [{ t: startCandidate, price: firstPoint.price }, ...rangeFiltered];
        }
      }

      if (rangeFiltered.length === 0) {
        if (latestPricePoint && latestPricePoint.t >= rangeStart && latestPricePoint.t <= rangeEnd) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[ChartDiag] empty series -> stitched latest only');
          }
          return recalcSeries([{ timestamp: latestPricePoint.t, price: latestPricePoint.price }], 0);
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('[ChartDiag] empty series -> no latest point available');
        }

        return { data: [], changePct: 0, volume: 0 };
      }

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

      const tradePoints = toTradePoints(rangeFiltered);

      if (process.env.NODE_ENV !== 'production') {
        const first = rangeFiltered?.[0];
        const last = rangeFiltered?.[rangeFiltered.length - 1];
        console.log('[ChartDiag] athleteId=', athleteId);
        console.log('[ChartDiag] range=', range, 'signupAtMs=', signupAtMs, signupAtMs ? new Date(signupAtMs).toISOString() : null);
        console.log('[ChartDiag] points(raw)->', chartPoints.length);
        console.log('[ChartDiag] clamped->', clamped.length);
        console.log('[ChartDiag] stitched->', stitched.length);
        console.log('[ChartDiag] rangeFiltered->', rangeFiltered.length, 'first=', first?.t && new Date(first.t).toISOString(), 'last=', last?.t && new Date(last.t).toISOString(), 'lastPrice=', last?.price);
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
