import { describe, expect, it } from 'vitest';
import {
  clampToSignup,
  stitchLatest,
  filterPointsByRange,
  ensureMs,
  getRangeStart,
  type ChartPoint,
} from '@/lib/charting/seriesUtils';

describe('clampToSignup', () => {
  const basePointsMs: ChartPoint[] = [
    { t: 1_700_000_000_000, price: 1 },
    { t: 1_700_000_100_000, price: 2 },
    { t: 1_700_000_200_000, price: 3 },
  ];

  const basePointsSeconds: ChartPoint[] = [
    { t: 1_700_000_000, price: 1 },
    { t: 1_700_000_100, price: 2 },
    { t: 1_700_000_200, price: 3 },
  ];

  it('filters out points before signup timestamp (ms)', () => {
    const result = clampToSignup(basePointsMs, 1_700_000_150_000);
    expect(result).toEqual([
      { t: 1_700_000_200_000, price: 3 },
    ]);
  });

  it('filters out points before signup timestamp (seconds)', () => {
    const result = clampToSignup(basePointsSeconds, 1_700_000_150_000);
    expect(result).toEqual([
      { t: 1_700_000_200, price: 3 },
    ]);
  });

  it('returns empty when signup is after last point', () => {
    expect(clampToSignup(basePointsMs, 1_800_000_000_000)).toEqual([]);
  });

  it('returns original points when signup timestamp is undefined', () => {
    expect(clampToSignup(basePointsMs, undefined)).toBe(basePointsMs);
  });
});

describe('stitchLatest', () => {
  const basePoints: ChartPoint[] = [
    { t: 1_700_000_000_000, price: 1 },
    { t: 1_700_000_100_000, price: 2 },
  ];

  it('adds the latest point when newer than existing data', () => {
    expect(stitchLatest(basePoints, { t: 3_000, price: 3 })).toEqual([
      { t: 1_000, price: 1 },
      { t: 2_000, price: 2 },
      { t: 3_000, price: 3 },
    ]);
  });

  it('replaces the last point when timestamps match but price differs', () => {
    expect(stitchLatest(basePoints, { t: 2_000, price: 5 })).toEqual([
      { t: 1_000, price: 1 },
      { t: 2_000, price: 5 },
    ]);
  });

  it('returns original points when latest is older', () => {
    expect(stitchLatest(basePoints, { t: 500, price: 9 })).toBe(basePoints);
  });

  it('creates array when no points exist', () => {
    expect(stitchLatest([], { t: 3_000, price: 3 })).toEqual([{ t: 3_000, price: 3 }]);
  });
});

describe('filterPointsByRange', () => {
  const basePoints: ChartPoint[] = [
    { t: 1_700_000_000_000, price: 1 },
    { t: 1_700_000_100_000, price: 2 },
    { t: 1_700_000_200_000, price: 3 },
  ];

  it('keeps points inside the range (ms inputs)', () => {
    expect(filterPointsByRange(basePoints, 1_699_999_900_000, 1_700_000_050_000)).toEqual([
      { t: 1_700_000_000_000, price: 1 },
    ]);
  });

  it('keeps points inside the range (seconds inputs)', () => {
    const rangeStartSeconds = 1_700_000_000;
    const rangeEndSeconds = 1_700_000_150;
    const secondsPoints = basePoints.map((p) => ({ t: p.t / 1000, price: p.price }));
    expect(filterPointsByRange(secondsPoints, rangeStartSeconds, rangeEndSeconds)).toEqual([
      { t: 1_700_000_000, price: 1 },
      { t: 1_700_000_100, price: 2 },
    ]);
  });

  it('returns empty when range excludes all points', () => {
    expect(filterPointsByRange(basePoints, 1_600_000_000_000, 1_600_000_100_000)).toEqual([]);
  });

  it('includes stitched latest point within range', () => {
    const stitched = stitchLatest(basePoints.slice(0, 1), { t: 1_700_000_300_000, price: 4 });
    expect(filterPointsByRange(stitched, 1_700_000_250_000, 1_700_000_350_000)).toEqual([
      { t: 1_700_000_300_000, price: 4 },
    ]);
  });
});

describe('ensureMs', () => {
  it('converts seconds to milliseconds', () => {
    expect(ensureMs(1_700_000_000)).toEqual(1_700_000_000_000);
  });

  it('leaves milliseconds untouched', () => {
    expect(ensureMs(1_700_000_000_000)).toEqual(1_700_000_000_000);
  });
});

describe('getRangeStart', () => {
  it('uses signup timestamp when later than range window', () => {
    const signup = 1_700_000_000_000;
    const now = Date.now();
    const start = getRangeStart('7d', signup);
    expect(start).toBeGreaterThanOrEqual(signup);
    expect(start).toBeLessThanOrEqual(now);
  });

  it('falls back to range window when signup older', () => {
    const now = Date.now();
    const start = getRangeStart('7d', now - 30 * 24 * 60 * 60 * 1000);
    const expected = now - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(start - expected)).toBeLessThanOrEqual(1_000);
  });
});
