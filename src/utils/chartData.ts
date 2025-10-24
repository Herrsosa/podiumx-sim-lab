import { Post } from '@/types';

const RANGE_IN_HOURS: Record<TimeRangeKey, number | null> = {
  '24h': 24,
  '7d': 7 * 24,
  '30d': 30 * 24,
  'all': null,
};

export type TimeRangeKey = '24h' | '7d' | '30d' | 'all';

export type PosDailyPoint = {
  dateMs: number;
  posCount: number;
};

export function getRangeWindow(range: TimeRangeKey, now: number = Date.now()): { start?: number; end: number } {
  const hours = RANGE_IN_HOURS[range];
  if (hours === null) {
    return { end: now };
  }

  const start = now - hours * 60 * 60 * 1000;
  return { start, end: now };
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
 * Fills gaps in price data by forward-filling prices across all intervals in the timerange.
 * For 24h: uses 1-hour increments. For 7d/30d: uses daily increments.
 */
export function fillPriceGaps(
  trades: Array<{ timestamp?: number; created_at: string; price_after: number | string }>,
  currentPrice: number,
  timeRange: TimeRangeKey,
  now: number = Date.now()
): TradePoint[] {
  const { start, end } = getRangeWindow(timeRange, now);
  
  // Extract and sort trade points - strictly filter within range
  const tradePoints: TradePoint[] = [];
  for (const trade of trades) {
    const t = typeof trade.timestamp === 'number' ? trade.timestamp : new Date(trade.created_at).getTime();
    if (!Number.isFinite(t)) continue;
    
    const raw = typeof trade.price_after === 'number' ? trade.price_after : Number(trade.price_after);
    const price = Number.isFinite(raw) ? raw : currentPrice;
    
    // Strictly filter: only include trades within [start, end]
    if (start && t < start) continue;
    if (t > end) continue;
    
    tradePoints.push({ t, price });
  }
  
  tradePoints.sort((a, b) => a.t - b.t);
  
  // If no trades in range, seed a single point at start with currentPrice
  if (tradePoints.length === 0) {
    const seedTime = start || end;
    return [{ t: seedTime, price: currentPrice }];
  }
  
  // Determine step size and alignment based on timeRange
  const oneHourMs = 60 * 60 * 1000;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const is24h = timeRange === '24h';
  const stepMs = is24h ? oneHourMs : oneDayMs;
  
  // Generate all intervals in range
  const rangeStart = start || tradePoints[0].t;
  const allIntervals: number[] = [];
  
  if (is24h) {
    // For 24h: step by hour, no rounding to day start
    for (let t = rangeStart; t <= end; t += oneHourMs) {
      allIntervals.push(t);
    }
  } else {
    // For 7d/30d: step by day using startOfUtcDay
    for (let dayMs = startOfUtcDay(rangeStart); dayMs <= end; dayMs += oneDayMs) {
      allIntervals.push(dayMs);
    }
  }
  
  // Fill gaps with forward-filled prices
  const filledPoints: TradePoint[] = [];
  let lastPrice = currentPrice;
  let tradeIndex = 0;
  
  for (const intervalTime of allIntervals) {
    // Find latest trade up to this interval
    while (tradeIndex < tradePoints.length && tradePoints[tradeIndex].t <= intervalTime) {
      lastPrice = tradePoints[tradeIndex].price;
      tradeIndex++;
    }
    
    // Add point for this interval with the latest known price
    filledPoints.push({ t: intervalTime, price: lastPrice });
  }
  
  // Always ensure current time is included with current price
  if (filledPoints.length === 0 || filledPoints[filledPoints.length - 1].t < now) {
    filledPoints.push({ t: now, price: currentPrice });
  } else if (Math.abs(filledPoints[filledPoints.length - 1].t - now) > stepMs / 2) {
    filledPoints.push({ t: now, price: currentPrice });
  } else {
    // Update last point to current time and price
    filledPoints[filledPoints.length - 1] = { t: now, price: currentPrice };
  }
  
  return filledPoints;
}
