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

export const ensureMs = (ts: number): number => (ts < 1_000_000_000_000 ? ts * 1000 : ts);

// Pad domain with guards for flat lines and never < 0 for USD charts
export function getPaddedDomain(min: number, max: number, { floorAtZero = true }: { floorAtZero?: boolean } = {}) {
  if (!isFinite(min) || !isFinite(max)) return [0, 1] as const;
  if (min === max) {
    const pad = Math.max(0.02 * (min || 1), 0.01); // 2% or ≥ 0.01
    const lo = floorAtZero ? Math.max(0, min - pad) : min - pad;
    return [lo, max + pad] as const;
  }
  const span = max - min;
  const pad = Math.max(0.03 * span, 0.01); // 3% or ≥ 0.01
  const lo = floorAtZero ? Math.max(0, min - pad) : min - pad;
  return [lo, max + pad] as const;
}

// Ensure at least two points so Recharts draws a visible segment
export function ensureMinimumPoints<T extends XY>(points: T[], synthDeltaMs = 60_000): T[] {
  if (points.length >= 2) return points;
  if (points.length === 0) return points;
  const only = points[0];
  const prevX = Math.max(0, only.x - synthDeltaMs);
  const prevY = only.y;
  const prev = { ...only, x: prevX, y: prevY } as T;
  return [prev, only];
}

// Range filter by UTC ms
export function filterPointsByRange<T extends XY>(pts: T[], startMs: number, endMs: number): T[] {
  return pts.filter(p => p.x >= startMs && p.x <= endMs);
}

// Always stitch latest after range filter so last visible value is shown
export function stitchLatest<T extends XY>(pts: T[], latest: T | null, endMs: number): T[] {
  if (!latest) return pts;
  const last = pts[pts.length - 1];
  if (!last || latest.x > last.x) {
    const stitched = { ...latest, x: Math.min(endMs, Date.now()) } as T;
    return [...pts, stitched];
  }
  return pts;
}

export function getRangeStart(nowUtcMs: number, days: number) {
  return nowUtcMs - days * 24 * 60 * 60 * 1000;
}

// Legacy compatibility functions
export function clampToSignup(points: ChartPoint[], signupAtMs?: number | null): ChartPoint[] {
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
