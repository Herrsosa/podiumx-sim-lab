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
  carried?: boolean;
  lastTradeTime?: number;
};

/**
 * Builds chart series using carry-forward logic.
 * - Seeds from the last trade ≤ windowStart (if available)
 * - Marks carried-forward points with {carried: true, lastTradeTime}
 * - For 'all', starts at first trade date
 * - For 24h: hourly increments; 7d/30d: daily increments
 */
export function fillPriceGaps(
  trades: Array<{ timestamp?: number; created_at: string; price_after: number | string }>,
  currentPrice: number,
  timeRange: TimeRangeKey,
  now: number = Date.now()
): TradePoint[] {
  const { start: windowStart, end: windowEnd } = getRangeWindow(timeRange, now);
  
  // Parse all trades
  const allTrades: Array<{ t: number; price: number }> = [];
  for (const trade of trades) {
    const t = typeof trade.timestamp === 'number' 
      ? trade.timestamp 
      : new Date(trade.created_at).getTime();
    
    if (!Number.isFinite(t)) continue;
    
    const raw = typeof trade.price_after === 'number' ? trade.price_after : Number(trade.price_after);
    const price = Number.isFinite(raw) ? raw : currentPrice;
    
    allTrades.push({ t, price });
  }
  
  allTrades.sort((a, b) => a.t - b.t);
  
  if (allTrades.length === 0) {
    return [];
  }
  
  // For ALL: use all trades
  // For time windows: filter to trades in or before window
  let relevantTrades: Array<{ t: number; price: number }>;
  
  if (timeRange === 'all') {
    relevantTrades = allTrades;
  } else {
    // Include trades before window for seeding
    relevantTrades = allTrades.filter(tr => tr.t <= windowEnd!);
  }
  
  if (relevantTrades.length === 0) {
    return [];
  }
  
  // Determine series boundaries
  let seriesStart: number;
  let seriesEnd: number;
  
  if (timeRange === 'all') {
    // ALL: start at first trade, end at now
    seriesStart = relevantTrades[0].t;
    seriesEnd = Math.max(relevantTrades[relevantTrades.length - 1].t, now);
  } else {
    // Window-based: start at windowStart, end at windowEnd
    seriesStart = windowStart!;
    seriesEnd = windowEnd!;
  }
  
  // Find seed price for window start
  let seedPrice: number;
  let seedTradeTime: number;
  
  if (timeRange === 'all') {
    seedPrice = relevantTrades[0].price;
    seedTradeTime = relevantTrades[0].t;
  } else {
    // Find last trade <= seriesStart
    const beforeStart = relevantTrades.filter(tr => tr.t <= seriesStart);
    if (beforeStart.length > 0) {
      const lastBefore = beforeStart[beforeStart.length - 1];
      seedPrice = lastBefore.price;
      seedTradeTime = lastBefore.t;
    } else {
      // No trades before window; use first trade
      const firstInWindow = relevantTrades.find(tr => tr.t >= seriesStart);
      if (!firstInWindow) return [];
      seedPrice = firstInWindow.price;
      seedTradeTime = firstInWindow.t;
      // Adjust seriesStart to first trade if it's after window start
      seriesStart = firstInWindow.t;
    }
  }
  
  // Build series with proper spacing
  const stepMs = timeRange === '24h' ? 3_600_000 : 86_400_000; // 1h for 24h, 1d otherwise
  const series: TradePoint[] = [];
  
  // Align start to step boundary for daily (not for 24h to preserve hours)
  let t = timeRange === '24h' ? seriesStart : startOfUtcDay(seriesStart);
  
  let lastPrice = seedPrice;
  let lastTradeTime = seedTradeTime;
  let tradeIndex = 0;
  
  // Skip trades before series start
  while (tradeIndex < relevantTrades.length && relevantTrades[tradeIndex].t < t) {
    lastPrice = relevantTrades[tradeIndex].price;
    lastTradeTime = relevantTrades[tradeIndex].t;
    tradeIndex++;
  }
  
  while (t <= seriesEnd) {
    let hadTradeAtThisPoint = false;
    
    // Apply all trades up to this timestamp
    while (tradeIndex < relevantTrades.length && relevantTrades[tradeIndex].t <= t) {
      lastPrice = relevantTrades[tradeIndex].price;
      lastTradeTime = relevantTrades[tradeIndex].t;
      hadTradeAtThisPoint = true;
      tradeIndex++;
    }
    
    series.push({
      t,
      price: lastPrice,
      carried: !hadTradeAtThisPoint && series.length > 0,
      lastTradeTime: hadTradeAtThisPoint ? undefined : lastTradeTime,
    });
    
    t += stepMs;
  }
  
  // Ensure final point is at current time with current price (for non-ALL ranges)
  if (timeRange !== 'all' && series.length > 0) {
    const lastPoint = series[series.length - 1];
    if (lastPoint.t < now && now <= seriesEnd) {
      series.push({ t: now, price: currentPrice });
    } else if (Math.abs(lastPoint.t - now) < stepMs / 2 && now <= seriesEnd) {
      // Update last point to now
      series[series.length - 1] = { t: now, price: currentPrice };
    }
  }
  
  return series;
}
