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

const DAY_MS = 86_400_000;

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

export function buildPriceSeries(
  prices: PriceInput[],
  range: TimeRangeKey,
  options: { fallbackPrice?: number; now?: number } = {},
): PriceSeriesPoint[] {
  const now = options.now ?? Date.now();
  const fallbackPrice = options.fallbackPrice;
  const { start: windowStart, end: windowEnd } = getWindowUTC(range, now);

  const trades = prices
    .filter((entry) => Number.isFinite(entry.timestamp) && Number.isFinite(entry.price))
    .map((entry) => ({ t: Number(entry.timestamp), price: Number(entry.price) }))
    .sort((a, b) => a.t - b.t);

  if (trades.length === 0) {
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

  const relevantTrades = range === 'all' ? trades : trades.filter((trade) => trade.t <= windowEnd);

  if (relevantTrades.length === 0) {
    if (typeof fallbackPrice === 'number') {
      if (range === 'all') {
        const base = startOfUtcDay(now);
        return [{ t: base, price: fallbackPrice, carried: true, lastTradeTime: base }];
      }
      const start = windowStart ?? startOfUtcDay(trades[0].t);
      const end = windowEnd;
      const points: PriceSeriesPoint[] = [];
      for (let t = start; t <= end; t += DAY_MS) {
        points.push({
          t,
          price: fallbackPrice,
          carried: true,
          lastTradeTime: trades[0].t,
        });
      }
      return points;
    }
    return [];
  }

  let seriesStart: number;
  let seriesEnd: number;

  if (range === 'all') {
    seriesStart = startOfUtcDay(relevantTrades[0].t);
    seriesEnd = Math.max(relevantTrades[relevantTrades.length - 1].t, now);
  } else {
    seriesStart = windowStart ?? startOfUtcDay(relevantTrades[0].t);
    seriesEnd = windowEnd;
  }

  let seedPrice: number;
  let seedTradeTime: number;
  let shouldSeedAtStart = false;

  if (range === 'all') {
    seedPrice = relevantTrades[0].price;
    seedTradeTime = relevantTrades[0].t;
  } else {
    const beforeStart = relevantTrades.filter((trade) => trade.t <= seriesStart);
    if (beforeStart.length > 0) {
      const lastBefore = beforeStart[beforeStart.length - 1];
      seedPrice = lastBefore.price;
      seedTradeTime = lastBefore.t;
      shouldSeedAtStart = true;
    } else {
      const firstInWindow = relevantTrades.find((trade) => trade.t >= seriesStart);
      if (firstInWindow) {
        seedPrice = firstInWindow.price;
        seedTradeTime = firstInWindow.t;
        seriesStart = firstInWindow.t;
      } else if (typeof fallbackPrice === 'number') {
        seedPrice = fallbackPrice;
        seedTradeTime = seriesStart;
        shouldSeedAtStart = true;
      } else {
        return [];
      }
    }
  }

  const series: PriceSeriesPoint[] = [];

  if (shouldSeedAtStart && range !== 'all') {
    series.push({
      t: seriesStart,
      price: seedPrice,
      carried: true,
      lastTradeTime: seedTradeTime,
    });
  }

  let tCursor = startOfUtcDay(seriesStart);
  if (tCursor < seriesStart) tCursor += DAY_MS;

  let lastPrice = seedPrice;
  let lastTradeTime = seedTradeTime;
  let tradeIndex = 0;

  while (tradeIndex < relevantTrades.length && relevantTrades[tradeIndex].t <= seriesStart) {
    lastPrice = relevantTrades[tradeIndex].price;
    lastTradeTime = relevantTrades[tradeIndex].t;
    tradeIndex++;
  }

  while (tCursor <= seriesEnd) {
    let hadTrade = false;

    while (tradeIndex < relevantTrades.length && relevantTrades[tradeIndex].t <= tCursor) {
      lastPrice = relevantTrades[tradeIndex].price;
      lastTradeTime = relevantTrades[tradeIndex].t;
      hadTrade = true;
      tradeIndex++;
    }

    series.push({
      t: tCursor,
      price: lastPrice,
      carried: !hadTrade && (series.length > 0 || shouldSeedAtStart),
      lastTradeTime: hadTrade ? undefined : lastTradeTime,
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
    const timestamp = Number(entry.timestamp);
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
  const firstPriceTime = actualPrices[0].t;

  if (range === '30d' && start !== undefined && firstPriceTime >= start) {
    return [startOfUtcDay(firstPriceTime), end];
  }

  return [start ?? startOfUtcDay(firstPriceTime), end];
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
  formatTooltip: typeof formatTooltip;
};

export const chartEngine: ChartEngine = {
  getWindowUTC,
  buildPriceSeries,
  buildPoSSeries,
  getDomain,
  getDailyTicks,
  formatTooltip,
};

export type { PriceInput, PoSInput };
