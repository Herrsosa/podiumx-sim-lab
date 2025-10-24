import { Post } from '@/types';

export type TimeRangeKey = '24h' | '7d' | '30d' | 'all';

export type PosDailyPoint = {
  dateMs: number;
  posCount: number;
};

export function getRangeWindow(range: TimeRangeKey, now: number = Date.now()): { start?: number; end: number } {
  const dayMs = 86_400_000;
  if (range === '24h') return { start: now - dayMs, end: now };
  if (range === '7d') return { start: now - 7 * dayMs, end: now };
  if (range === '30d') return { start: now - 30 * dayMs, end: now };
  return { start: undefined, end: now };
}

export function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

export function aggregatePosByDay(
  posts: Post[] | undefined,
  range: TimeRangeKey,
  now: number = Date.now(),
): PosDailyPoint[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  const { start, end } = getRangeWindow(range, now);
  const counts = new Map<number, number>();

  for (const post of posts) {
    if (!post?.workout_json) {
      continue;
    }
    const createdAt = new Date(post.created_at).getTime();
    if (!Number.isFinite(createdAt)) {
      continue;
    }
    if (start && createdAt < start) {
      continue;
    }
    if (createdAt > end) {
      continue;
    }

    const day = startOfUtcDay(createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([timestamp, posCount]) => ({ dateMs: timestamp, posCount }))
    .sort((a, b) => a.dateMs - b.dateMs);
}

export type TradePoint = {
  t: number;
  price: number;
};

/**
 * Fills gaps in price data using carry-forward logic.
 * For 24h: uses 1-hour increments. For 7d/30d: uses daily increments.
 * Strictly clamps all data points within the selected time range.
 */
export function fillPriceGaps(
  trades: Array<{ timestamp?: number; created_at: string; price_after: number | string }>,
  currentPrice: number,
  timeRange: TimeRangeKey,
  now: number = Date.now()
): TradePoint[] {
  const { start, end } = getRangeWindow(timeRange, now);
  
  // Parse and filter trades strictly within [start, end]
  const pts: TradePoint[] = [];
  for (const trade of trades) {
    const t = typeof trade.timestamp === 'number' 
      ? trade.timestamp 
      : new Date(trade.created_at).getTime();
    
    if (!Number.isFinite(t)) continue;
    
    // Strictly filter: only include trades within range
    if (start && t < start) continue;
    if (t > end) continue;
    
    const raw = typeof trade.price_after === 'number' ? trade.price_after : Number(trade.price_after);
    const price = Number.isFinite(raw) ? raw : currentPrice;
    
    pts.push({ t, price });
  }
  
  pts.sort((a, b) => a.t - b.t);
  
  // Determine step and starting point
  const stepMs = timeRange === '24h' ? 3_600_000 : 86_400_000; // 1h vs 1d
  const rangeStart = start ?? (pts[0]?.t ?? end - 30 * 86_400_000);
  
  // Build carry-forward series
  const series: TradePoint[] = [];
  let lastPrice = currentPrice ?? pts[0]?.price ?? 0;
  let ptIndex = 0;
  let t = rangeStart;
  
  while (t <= end) {
    // Update lastPrice with all trades up to this timestamp
    while (ptIndex < pts.length && pts[ptIndex].t <= t) {
      lastPrice = pts[ptIndex].price;
      ptIndex++;
    }
    
    series.push({ t, price: lastPrice });
    t += stepMs;
  }
  
  // Ensure current time is included with current price
  if (series.length === 0 || series[series.length - 1].t < now) {
    series.push({ t: now, price: currentPrice });
  } else {
    // Update last point to exact current time and price
    series[series.length - 1] = { t: now, price: currentPrice };
  }
  
  return series;
}
