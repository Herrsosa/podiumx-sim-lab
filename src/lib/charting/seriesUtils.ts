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

// Range filter by UTC ms
export const filterPointsByRange = <T extends XY>(pts: T[], start: number, end: number): T[] =>
  pts.filter(p => Number.isFinite(p.x) && p.x >= start && p.x <= end);

// Always stitch latest after range filter so last visible value is shown
export const stitchLatest = <T extends XY>(pts: T[], latest: { t: number; price: number } | null): T[] => {
  if (!latest || !Number.isFinite(latest.t) || !Number.isFinite(latest.price)) return pts;
  const last = pts[pts.length - 1];
  // Only add if latest is newer than the last point or there are no points
  if (!last || latest.t > last.x) {
    return [...pts, { x: latest.t, y: latest.price } as T];
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
