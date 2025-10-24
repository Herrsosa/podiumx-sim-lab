import { useMemo, useState } from 'react';
import type { Athlete } from '@/types';
import { useAthleteTrades } from '@/hooks/useAthleteTrades';
import AthletePriceChart from '@/components/charts/AthletePriceChart';
import { startOfUtcDay, getRangeWindow, type TimeRangeKey } from '@/utils/chartData';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OverviewPriceChartProps {
  athlete: Athlete;
}

export function OverviewPriceChart({ athlete, timeRange: externalTimeRange, onTimeRangeChange }: OverviewPriceChartProps & { timeRange?: TimeRangeKey; onTimeRangeChange?: (range: TimeRangeKey) => void }) {
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRangeKey>('7d');
  const timeRange = externalTimeRange ?? internalTimeRange;
  const setTimeRange = onTimeRangeChange ?? setInternalTimeRange;
  const { data: trades = [], isLoading } = useAthleteTrades(athlete.id);

  const chartPoints = useMemo(() => {
    const { start, end } = getRangeWindow(timeRange);
    const filteredTrades = trades.filter((trade) => {
      const t = typeof trade.timestamp === 'number' ? trade.timestamp : new Date(trade.created_at).getTime();
      return (!start || t >= start) && t <= end;
    });
    
    const tradesByDay = new Map<number, { t: number; price: number }>();

    for (const trade of filteredTrades) {
      const t =
        typeof trade.timestamp === 'number'
          ? trade.timestamp
          : new Date(trade.created_at).getTime();
      if (!Number.isFinite(t)) continue;

      const rawPrice =
        typeof trade.price_after === 'number'
          ? trade.price_after
          : Number(trade.price_after);
      const price = Number.isFinite(rawPrice) ? rawPrice : athlete.price;

      const dayStart = startOfUtcDay(t);
      const existing = tradesByDay.get(dayStart);
      if (!existing || t > existing.t) {
        tradesByDay.set(dayStart, { t, price });
      }
    }

    if (tradesByDay.size === 0) {
      const now = Date.now();
      tradesByDay.set(now, { t: now, price: athlete.price });
    } else {
      const nowMs = Date.now();
      const todayStart = startOfUtcDay(nowMs);
      const latestToday = tradesByDay.get(todayStart);
      if (!latestToday || nowMs > latestToday.t) {
        tradesByDay.set(todayStart, {
          t: nowMs,
          price: tradesByDay.get(todayStart)?.price ?? athlete.price,
        });
      }
    }

    return Array.from(tradesByDay.values()).sort((a, b) => a.t - b.t);
  }, [athlete.price, trades, timeRange]);

  const hasRealTrades = trades.length > 0;
  const firstTradePoint = hasRealTrades
    ? chartPoints[0] ?? null
    : null;

  const formatXAxisTick = (value: number) =>
    new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

  const formatTooltipLabel = (value: number) =>
    new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-4">
      <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRangeKey)}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="24h">24H</TabsTrigger>
          <TabsTrigger value="7d">7D</TabsTrigger>
          <TabsTrigger value="30d">30D</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="h-64 md:h-72">
        <AthletePriceChart
          chartPoints={chartPoints}
          firstTradePoint={firstTradePoint}
          hasRealTrades={hasRealTrades}
          timeRange={timeRange}
          formatXAxisTick={formatXAxisTick}
          formatTooltipLabel={formatTooltipLabel}
          isLoading={isLoading}
          posts={athlete.posts}
        />
      </div>
    </div>
  );
}
