import type { Post } from '@/types';

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

export const ensureMs = (ts: number): number => (ts < 1_000_000_000_000 ? ts * 1000 : ts);

export function clampToSignup(points: ChartPoint[], signupAtMs?: number | null): ChartPoint[] {
  if (!signupAtMs || !Number.isFinite(signupAtMs)) {
    return points;
  }
  const cutoff = ensureMs(Number(signupAtMs));
  return points.filter((point) => ensureMs(Number(point.t)) >= cutoff);
}

export function stitchLatest(points: ChartPoint[], latest: LatestPricePoint | null | undefined): ChartPoint[] {
  if (!latest || !Number.isFinite(latest.price) || !Number.isFinite(latest.t)) {
    return points;
  }

  if (points.length === 0) {
    return [{ t: latest.t, price: latest.price }];
  }

  const lastPoint = points[points.length - 1];

  if (latest.t > lastPoint.t) {
    return [...points, { t: latest.t, price: latest.price }];
  }

  if (latest.t === lastPoint.t && lastPoint.price !== latest.price) {
    const copy = points.slice(0, -1);
    copy.push({ ...lastPoint, price: latest.price });
    return copy;
  }

  return points;
}

export function filterPointsByRange(points: ChartPoint[], startMs: number, endMs: number): ChartPoint[] {
  const s = ensureMs(Number(startMs));
  const e = ensureMs(Number(endMs));
  return points.filter((point) => {
    const t = ensureMs(Number(point.t));
    return t >= s && t <= e;
  });
}

export const toChartPoints = (timestamps: Array<{ timestamp: number; price: number }>): ChartPoint[] =>
  timestamps.map((point) => ({ t: ensureMs(point.timestamp), price: point.price }));

export const toTradePoints = (points: ChartPoint[]): Array<{ timestamp: number; price: number }> =>
  points.map((point) => ({ timestamp: ensureMs(point.t), price: point.price }));

export const getRangeStart = (range: '24h' | '7d' | '30d' | 'all', signupAtMs?: number | null): number => {
  const now = Date.now();
  let startFromRange = 0;

  switch (range) {
    case '24h':
      startFromRange = now - 24 * 60 * 60 * 1000;
      break;
    case '7d':
      startFromRange = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
      startFromRange = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case 'all':
      startFromRange = Number.NEGATIVE_INFINITY;
      break;
    default:
      startFromRange = now;
  }

  const signup = signupAtMs != null ? ensureMs(Number(signupAtMs)) : Number.NEGATIVE_INFINITY;
  return Math.max(startFromRange, signup);
};

export const toLatestPricePoint = (
  latest: { price: number; updatedAt?: string | null } | null | undefined,
): LatestPricePoint | null => {
  if (!latest || !Number.isFinite(latest.price)) return null;
  const timestamp = latest.updatedAt ? Date.parse(latest.updatedAt) : Number.NaN;
  const t = Number.isFinite(timestamp) ? timestamp : Date.now();
  return { price: latest.price, t };
};

export const mapPostsToPoS = (posts: Post[] | undefined): Array<{ timestamp: number; count: number }> =>
  (posts ?? [])
    .filter((post) => post?.workout_json)
    .map((post) => ({ timestamp: new Date(post.created_at).getTime(), count: 1 }));

/**
 * Compute padded Y-axis domain with guards for edge cases
 * Ensures visible lines even when min===max or very small ranges
 */
export const getPaddedDomain = (points: ChartPoint[]): [number, number] => {
  const pricePoints = points.filter((p) => p.price != null && !p.carried);
  
  if (pricePoints.length === 0) return [0, 1];
  
  const prices = pricePoints.map((p) => p.price).filter((value): value is number => Number.isFinite(value));
  if (prices.length === 0) return [0, 1];
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  
  // Handle min===max case with explicit padding
  if (min === max) {
    const pad = Math.max(1, max * 0.02);
    return [Math.max(0, min - pad), max + pad];
  }
  
  // Normal case: add 3% padding
  const padding = (max - min) * 0.03;
  return [Math.max(0, min - padding), max + padding];
};

/**
 * Guard against single-point datasets by synthesizing a previous point
 * This ensures a visible line segment renders instead of just a dot
 * Generic type allows working with ChartPoint or extended types like ChartDataPoint
 */
export const ensureMinimumPoints = <T extends ChartPoint>(points: T[]): T[] => {
  if (points.length === 1) {
    const singlePoint = points[0];
    const syntheticPoint = {
      ...singlePoint,
      t: singlePoint.t - 1000,
      carried: true,
    };
    return [syntheticPoint as T, singlePoint];
  }
  return points;
};
