import type { TimeRangeKey } from '@/utils/chartData';
import { getWindowUTC, type PriceSeriesPoint } from './engine';

// Generic XY type for chart points
export type XY = { x: number; y: number };

// Legacy types for backward compatibility
export type ChartPoint = {
  t: number;
  price: number;
  carried?: boolean;
  lastTradeTime?: number;
};

export type LatestPricePoint = {
  price: number;
  t: number;
};

export const ensureMs = (t: number | string | Date | null | undefined): number => {
  if (t == null) return NaN;
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'string') {
    const parsed = Date.parse(t);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  // number: treat < 10^11 as seconds, else ms
  return t < 1e11 ? Math.round(t * 1000) : t;
};

// Pad domain with guards for flat lines and never < 0 for USD charts
export const getPaddedDomain = (
  yMinRaw: number | undefined,
  yMaxRaw: number | undefined,
  opts: { floorAtZero?: boolean } = {}
): [number, number] => {
  const yMin = Number.isFinite(yMinRaw!) ? (yMinRaw as number) : 0;
  const yMax = Number.isFinite(yMaxRaw!) ? (yMaxRaw as number) : 0;
  if (yMax <= yMin) {
    const base = yMin || 1;
    const pad = Math.max(base * 0.02, 0.01);
    return opts.floorAtZero ? [0, base + pad] : [base - pad, base + pad];
  }
  const pad = (yMax - yMin) * 0.05;
  const min = opts.floorAtZero ? Math.max(0, yMin - pad) : yMin - pad;
  return [min, yMax + pad];
};

// Ensure at least two points so Recharts draws a visible segment
export const ensureMinimumPoints = <T extends XY>(pts: T[], end: number): T[] => {
  if (pts.length >= 2) return pts;
  if (pts.length === 1) return [{ ...pts[0], x: end - 1 } as T, pts[0]];
  // zero points → synthesize a flat zero line (or tiny epsilon to avoid flat domain)
  return [{ x: end - 1, y: 0.0001 } as T, { x: end, y: 0.0001 } as T];
};

// Range filter by UTC ms (normalize to ms first)
export const filterPointsByRange = <T extends XY>(pts: T[], start: number, end: number): T[] =>
  pts.map(p => ({...p, x: toMs(p.x) } as T)).filter(p => p.x >= start && p.x <= end);

// Always stitch latest after range filter so last visible value is shown (normalize to ms)
export const stitchLatest = <T extends XY>(pts: T[], latest: { t: number; price: number } | null): T[] => {
  if (!latest || !Number.isFinite(latest.t) || !Number.isFinite(latest.price)) return pts;
  const latestMs = { t: toMs(latest.t), price: latest.price };
  const last = pts[pts.length - 1];
  // Only add if latest is newer than the last point or there are no points
  if (!last || latestMs.t > last.x) {
    return [...pts, { x: latestMs.t, y: latestMs.price } as T];
  }
  return pts;
};

export function getRangeStart(nowUtcMs: number, days: number) {
  return nowUtcMs - days * 24 * 60 * 60 * 1000;
}

export const clampToSignup = <T extends XY>(pts: T[], signupAtMs?: number | null): T[] => {
  if (!signupAtMs || !Number.isFinite(signupAtMs)) return pts;
  return pts.filter(p => p.x >= signupAtMs);
};

// Legacy compatibility functions
export function clampToSignupLegacy(points: ChartPoint[], signupAtMs?: number | null): ChartPoint[] {
  if (!signupAtMs || !Number.isFinite(signupAtMs)) {
    return points;
  }
  const cutoff = ensureMs(Number(signupAtMs));
  return points.filter((point) => ensureMs(Number(point.t)) >= cutoff);
}

export const toChartPoints = (timestamps: Array<{ timestamp: number; price: number }>): ChartPoint[] =>
  timestamps.map((point) => ({ t: ensureMs(point.timestamp), price: point.price }));

export const toTradePoints = (points: ChartPoint[]): Array<{ timestamp: number; price: number }> =>
  points.map((point) => ({ timestamp: ensureMs(point.t), price: point.price }));

export const toLatestPricePoint = (
  latest: { price: number; updatedAt?: string | null } | null | undefined,
): LatestPricePoint | null => {
  if (!latest || !Number.isFinite(latest.price)) return null;
  const timestamp = latest.updatedAt ? Date.parse(latest.updatedAt) : Number.NaN;
  const t = Number.isFinite(timestamp) ? timestamp : Date.now();
  return { price: latest.price, t };
};

// Timestamp unit diagnostics
export function isMs(ts: number) { return ts > 1e11; }    // rough cutoff
export function isSec(ts: number) { return ts > 1e9 && ts < 1e11; }
export function toMs(ts: number) { return isSec(ts) ? ts * 1000 : ts; }

const ensurePointLastTrade = (point: PriceSeriesPoint): PriceSeriesPoint => {
  if (point.lastTradeTime != null) {
    return point;
  }
  return { ...point, lastTradeTime: point.t };
};

/**
 * Deduplicate price series points by timestamp, keeping the latest trade
 */
export const dedupePriceSeries = (points: PriceSeriesPoint[]): PriceSeriesPoint[] => {
  const map = new Map<number, PriceSeriesPoint>();

  for (const point of points) {
    if (!Number.isFinite(point.t)) continue;
    const normalized = ensurePointLastTrade(point);
    const existing = map.get(normalized.t);
    const existingTs = existing ? ensurePointLastTrade(existing).lastTradeTime ?? existing.t : 0;
    const candidateTs = normalized.lastTradeTime ?? normalized.t;
    if (!existing || candidateTs >= existingTs) {
      map.set(normalized.t, normalized);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.t - b.t);
};

/**
 * Clamp/densify a sorted price series to the requested window, seeding
 * a carried point at window start when the latest trade sits before it.
 */
export const applyPriceWindow = (
  points: PriceSeriesPoint[],
  range: TimeRangeKey,
  now: number = Date.now(),
): PriceSeriesPoint[] => {
  if (points.length === 0) return [];

  const { start, end } = getWindowUTC(range, now);
  const windowEnd = Math.max(end, now);

  if (start === undefined) {
    return points.filter((point) => point.t <= windowEnd);
  }

  let seed: PriceSeriesPoint | null = null;
  const windowed: PriceSeriesPoint[] = [];

  for (const point of points) {
    if (point.t < start) {
      seed = point;
      continue;
    }
    if (point.t > windowEnd) {
      break;
    }
    windowed.push(point);
  }

  if (seed && (windowed.length === 0 || windowed[0].t > start)) {
    windowed.unshift({
      t: start,
      price: seed.price,
      carried: true,
      lastTradeTime: seed.lastTradeTime ?? seed.t,
    });
  }

  return windowed;
};

/**
 * Convenience helper to dedupe + clamp a series to a window in one pass.
 */
export const normalizePriceSeries = (
  points: PriceSeriesPoint[],
  range: TimeRangeKey,
  now: number = Date.now(),
): PriceSeriesPoint[] => {
  if (points.length === 0) return [];
  const deduped = dedupePriceSeries(points);
  const windowed = applyPriceWindow(deduped, range, now);
  if (windowed.length === 0) {
    return windowed;
  }

  const lastPoint = windowed[windowed.length - 1];
  const { end } = getWindowUTC(range, now);
  const target =
    range === 'all'
      ? now
      : Math.min(end, now);

  // If we're already up-to-date (within 60 seconds), no need to append a carry point
  if (!Number.isFinite(target) || target - lastPoint.t <= 60_000) {
    return windowed;
  }

  return [
    ...windowed,
    {
      ...lastPoint,
      t: target,
      carried: true,
      lastTradeTime: lastPoint.lastTradeTime ?? lastPoint.t,
    },
  ];
};
