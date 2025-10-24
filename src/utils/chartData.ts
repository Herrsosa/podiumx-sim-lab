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
 * Fills gaps in price data by forward-filling prices across all days in the timerange.
 * Ensures every day has a price point, using the last known price or current price.
 */
export function fillPriceGaps(
  trades: Array<{ timestamp?: number; created_at: string; price_after: number | string }>,
  currentPrice: number,
  timeRange: TimeRangeKey,
  now: number = Date.now()
): TradePoint[] {
  const { start, end } = getRangeWindow(timeRange, now);
  
  // Extract and sort trade points
  const tradePoints: TradePoint[] = [];
  for (const trade of trades) {
    const t = typeof trade.timestamp === 'number' ? trade.timestamp : new Date(trade.created_at).getTime();
    if (!Number.isFinite(t)) continue;
    
    const rawPrice = typeof trade.price_after === 'number' ? trade.price_after : Number(trade.price_after);
    const price = Number.isFinite(rawPrice) ? rawPrice : currentPrice;
    
    // Only include trades within the range
    if (start && t < start) continue;
    if (t > end) continue;
    
    tradePoints.push({ t, price });
  }
  
  tradePoints.sort((a, b) => a.t - b.t);
  
  // If no trades in range, create single point at current price
  if (tradePoints.length === 0) {
    return [{ t: end, price: currentPrice }];
  }
  
  // Generate all days in range
  const rangeStart = start || tradePoints[0].t;
  const allDays: number[] = [];
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  for (let dayMs = startOfUtcDay(rangeStart); dayMs <= end; dayMs += oneDayMs) {
    allDays.push(dayMs);
  }
  
  // Fill gaps with forward-filled prices
  const filledPoints: TradePoint[] = [];
  let lastPrice = currentPrice;
  let tradeIndex = 0;
  
  for (const dayMs of allDays) {
    // Find latest trade up to this day
    while (tradeIndex < tradePoints.length && tradePoints[tradeIndex].t <= dayMs + oneDayMs - 1) {
      lastPrice = tradePoints[tradeIndex].price;
      tradeIndex++;
    }
    
    // Add point for this day with the latest known price
    filledPoints.push({ t: dayMs, price: lastPrice });
  }
  
  // Always ensure today is included with current price
  const todayStart = startOfUtcDay(now);
  const todayIndex = filledPoints.findIndex(p => p.t === todayStart);
  if (todayIndex >= 0) {
    filledPoints[todayIndex] = { t: now, price: currentPrice };
  } else {
    filledPoints.push({ t: now, price: currentPrice });
  }
  
  return filledPoints.sort((a, b) => a.t - b.t);
}
