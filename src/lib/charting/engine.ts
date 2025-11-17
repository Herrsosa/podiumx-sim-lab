import type { TimeRangeKey } from '@/utils/chartData';

type PriceInput = {
  timestamp: number;
  price: number;
};

type PoSInput = {
  timestamp: number;
  count?: number;
};

export type PriceSeriesPoint = {
  t: number;
  price: number;
  carried?: boolean;
  lastTradeTime?: number;
};

export type PoSSeriesPoint = {
  t: number;
  posCount: number;
};

export const DAY_MS = 86_400_000;

const startOfUtcDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
};

const endOfUtcDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setUTCHours(23, 59, 59, 999);
  return date.getTime();
};

export function getWindowUTC(range: TimeRangeKey, now: number = Date.now()): { start?: number; end: number } {
  if (range === 'all') {
    return { end: now };
  }

  const days = range === '30d' ? 29 : 6;
  const start = startOfUtcDay(now - days * DAY_MS);
  const end = endOfUtcDay(now);
  return { start, end };
}

// Normalize timestamp to milliseconds (handles seconds/ms ambiguity)
const ensureMs = (ts: number): number => {
  // Treat values < 10^11 as seconds, otherwise as ms
  return ts < 1e11 ? Math.round(ts * 1000) : ts;
};

export function buildPriceSeries(
  prices: PriceInput[],
  range: TimeRangeKey,
  options: { fallbackPrice?: number; now?: number } = {},
): PriceSeriesPoint[] {
  const now = options.now ?? Date.now();
  const fallbackPrice = options.fallbackPrice;
  const { start: windowStart, end: windowEnd } = getWindowUTC(range, now);

  // Normalize ALL trades to milliseconds
  const allTrades = prices
    .filter((entry) => Number.isFinite(entry.timestamp) && Number.isFinite(entry.price))
    .map((entry) => ({ t: ensureMs(Number(entry.timestamp)), price: Number(entry.price) }))
    .sort((a, b) => a.t - b.t);

  if (allTrades.length === 0) {
    if (typeof fallbackPrice === 'number' && Number.isFinite(fallbackPrice)) {
      if (range === 'all') {
        const base = startOfUtcDay(now);
        return [{ t: base, price: fallbackPrice, carried: true, lastTradeTime: base }];
      }
      const start = windowStart ?? startOfUtcDay(now);
      const end = windowEnd;
      const points: PriceSeriesPoint[] = [];
      for (let t = start; t <= end; t += DAY_MS) {
        points.push({ t, price: fallbackPrice, carried: true, lastTradeTime: start });
      }
      return points;
    }
    return [];
  }

  // For 7d/30d ranges, we need to consider ALL historical trades to carry forward prices
  // Find the last trade before or at the window end
  let seriesStart: number;
  let seriesEnd: number;
  let seedPrice: number;
  let seedTradeTime: number;
  let shouldSeedAtStart = false;

  if (range === 'all') {
    seriesStart = startOfUtcDay(allTrades[0].t);
    seriesEnd = endOfUtcDay(now);
    seedPrice = allTrades[0].price;
    seedTradeTime = allTrades[0].t;
  } else {
    // For windowed ranges (7d, 30d)
    const start = windowStart ?? startOfUtcDay(now - 7 * DAY_MS);
    const end = windowEnd;
    seriesStart = start;
    seriesEnd = end;

    // Find the last trade BEFORE the window starts (to carry forward its price)
    const tradesBeforeWindow = allTrades.filter((trade) => trade.t < start);
    const tradesInOrBeforeEnd = allTrades.filter((trade) => trade.t <= end);
    
    if (tradesBeforeWindow.length > 0) {
      // Use the last trade before window as seed
      const lastBefore = tradesBeforeWindow[tradesBeforeWindow.length - 1];
      seedPrice = lastBefore.price;
      seedTradeTime = lastBefore.t;
      shouldSeedAtStart = true;
    } else if (tradesInOrBeforeEnd.length > 0) {
      // Use first trade in window
      const firstInWindow = tradesInOrBeforeEnd[0];
      seedPrice = firstInWindow.price;
      seedTradeTime = firstInWindow.t;
      seriesStart = Math.max(start, startOfUtcDay(firstInWindow.t));
    } else if (typeof fallbackPrice === 'number') {
      // No trades at all in or before window
      seedPrice = fallbackPrice;
      seedTradeTime = start;
      shouldSeedAtStart = true;
    } else {
      return [];
    }
  }

  const series: PriceSeriesPoint[] = [];

  // Add seed point at window start if needed
  if (shouldSeedAtStart && range !== 'all') {
    series.push({
      t: seriesStart,
      price: seedPrice,
      carried: true,
      lastTradeTime: seedTradeTime,
    });
  }

  // Process day-by-day from start to end
  let tCursor = startOfUtcDay(seriesStart);
  if (tCursor < seriesStart) tCursor += DAY_MS;

  let lastPrice = seedPrice;
  let lastTradeTime = seedTradeTime;
  
  // Process all trades up to series end
  const relevantTrades = allTrades.filter((trade) => trade.t >= seriesStart && trade.t <= seriesEnd);
  let tradeIndex = 0;

  while (tCursor <= seriesEnd) {
    let hadTrade = false;

    // Process all trades on this day
    while (tradeIndex < relevantTrades.length && relevantTrades[tradeIndex].t <= tCursor) {
      lastPrice = relevantTrades[tradeIndex].price;
      lastTradeTime = relevantTrades[tradeIndex].t;
      hadTrade = true;
      tradeIndex++;
    }

    series.push({
      t: tCursor,
      price: lastPrice,
      carried: !hadTrade,
      lastTradeTime: hadTrade ? tCursor : lastTradeTime,
    });

    tCursor += DAY_MS;
  }

  return series;
}

export function buildPoSSeries(
  entries: PoSInput[] = [],
  range: TimeRangeKey,
  now: number = Date.now(),
): PoSSeriesPoint[] {
  const { start, end } = getWindowUTC(range, now);
  const counts = new Map<number, number>();

  entries.forEach((entry) => {
    const timestamp = ensureMs(Number(entry.timestamp));
    if (!Number.isFinite(timestamp)) {
      return;
    }
    if (start !== undefined && timestamp < start) {
      return;
    }
    if (end !== undefined && timestamp > end) {
      return;
    }
    const day = startOfUtcDay(timestamp);
    counts.set(day, (counts.get(day) ?? 0) + (entry.count ?? 1));
  });

  return Array.from(counts.entries())
    .map(([t, posCount]) => ({ t, posCount }))
    .sort((a, b) => a.t - b.t);
}

export function getDomain(
  range: TimeRangeKey,
  series: PriceSeriesPoint[],
  now: number = Date.now(),
): [number, number] {
  const actualPrices = series
    .filter((point) => point.price != null && !point.carried)
    .sort((a, b) => a.t - b.t);

  if (actualPrices.length === 0) {
    const { start, end } = getWindowUTC(range, now);
    if (range === 'all') {
      return [now - DAY_MS, now];
    }
    return [start ?? now - DAY_MS, end];
  }

  if (range === 'all') {
    const start = startOfUtcDay(actualPrices[0].t);
    const end = Math.max(actualPrices[actualPrices.length - 1].t, now);
    return [start, end];
  }

  const { start, end } = getWindowUTC(range, now);
  if (start !== undefined) {
    return [start, end];
  }

  const firstPriceTime = actualPrices[0].t;
  return [startOfUtcDay(firstPriceTime), end];
}

export function getDailyTicks(domain: [number, number]): number[] {
  const [start, end] = domain;
  const ticks: number[] = [];
  let cursor = startOfUtcDay(start);
  while (cursor <= end) {
    ticks.push(cursor);
    cursor += DAY_MS;
  }
  return ticks;
}

export function getUniformTicks(
  domain: [number, number],
  opts: { targetTickCount?: number } = {},
): number[] {
  const [rawStart, rawEnd] = domain;
  if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) {
    return [];
  }

  const start = startOfUtcDay(rawStart);
  const end = startOfUtcDay(rawEnd);
  if (end <= start) {
    return [start];
  }

  const daySpan = Math.max(1, Math.round((end - start) / DAY_MS));
  const targetTicks = Math.max(2, opts.targetTickCount ?? 12);
  const stepDays = Math.max(1, Math.ceil(daySpan / (targetTicks - 1)));

  const ticks: number[] = [];
  for (let cursor = start; cursor <= end; cursor += stepDays * DAY_MS) {
    ticks.push(cursor);
  }
  if (ticks[ticks.length - 1] !== end) {
    ticks.push(end);
  }
  return ticks;
}

export function formatTooltip(timestamp: number, locale?: string): string {
  const formatter = new Intl.DateTimeFormat(locale ?? undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatter.format(new Date(timestamp));
}

export type ChartEngine = {
  getWindowUTC: typeof getWindowUTC;
  buildPriceSeries: typeof buildPriceSeries;
  buildPoSSeries: typeof buildPoSSeries;
  getDomain: typeof getDomain;
  getDailyTicks: typeof getDailyTicks;
  getUniformTicks: typeof getUniformTicks;
  formatTooltip: typeof formatTooltip;
};

export const chartEngine: ChartEngine = {
  getWindowUTC,
  buildPriceSeries,
  buildPoSSeries,
  getDomain,
  getDailyTicks,
  getUniformTicks,
  formatTooltip,
};

export type { PriceInput, PoSInput };
