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
  const { start, end } = getRangeWindow(timeRange, now);
  
  // Parse all trades (including those before window for seeding)
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
  
  // Find trades within window
  const inWindowTrades = start 
    ? allTrades.filter(tr => tr.t >= start && tr.t <= end)
    : allTrades.filter(tr => tr.t <= end);
  
  if (inWindowTrades.length === 0) {
    // No trades in window; return empty or single current point
    return currentPrice && now <= end ? [{ t: now, price: currentPrice }] : [];
  }
  
  // Find seed price: last trade ≤ windowStart (or first trade if 'all')
  let seedPrice: number | undefined;
  let seedTime: number | undefined;
  
  if (timeRange === 'all') {
    // Start at first trade
    seedPrice = inWindowTrades[0].price;
    seedTime = inWindowTrades[0].t;
  } else if (start) {
    // Find last trade before or at start
    const beforeStart = allTrades.filter(tr => tr.t <= start);
    if (beforeStart.length > 0) {
      const lastBeforeStart = beforeStart[beforeStart.length - 1];
      seedPrice = lastBeforeStart.price;
      seedTime = lastBeforeStart.t;
    } else {
      // No trades before start; use first in-window trade
      seedPrice = inWindowTrades[0].price;
      seedTime = inWindowTrades[0].t;
    }
  }
  
  // Determine step and series start
  const stepMs = timeRange === '24h' ? 3_600_000 : 86_400_000; // 1h vs 1d
  const seriesStart = timeRange === 'all' 
    ? inWindowTrades[0].t 
    : (start && seedTime && seedTime < start ? start : seedTime!);
  
  // Build carry-forward series
  const series: TradePoint[] = [];
  let lastPrice = seedPrice!;
  let lastTradeTime = seedTime!;
  let tradeIndex = 0;
  
  // Align series start to step boundary for daily ranges
  let t = timeRange === '24h' ? seriesStart : startOfUtcDay(seriesStart);
  
  while (t <= end) {
    // Update with all trades up to this timestamp
    let hadTrade = false;
    while (tradeIndex < inWindowTrades.length && inWindowTrades[tradeIndex].t <= t) {
      lastPrice = inWindowTrades[tradeIndex].price;
      lastTradeTime = inWindowTrades[tradeIndex].t;
      tradeIndex++;
      hadTrade = true;
    }
    
    series.push({ 
      t, 
      price: lastPrice,
      carried: !hadTrade && series.length > 0,
      lastTradeTime: hadTrade ? undefined : lastTradeTime
    });
    
    t += stepMs;
  }
  
  // Ensure current time is included with current price
  if (now <= end && (series.length === 0 || series[series.length - 1].t < now)) {
    series.push({ t: now, price: currentPrice });
  } else if (now <= end) {
    series[series.length - 1] = { t: now, price: currentPrice };
  }
  
  return series;
}
