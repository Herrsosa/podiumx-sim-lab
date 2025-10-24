import { useMemo, useState } from 'react';
import type { Athlete } from '@/types';
import { useAthleteTrades } from '@/hooks/useAthleteTrades';
import AthletePriceChart from '@/components/charts/AthletePriceChart';
import { fillPriceGaps, type TimeRangeKey } from '@/utils/chartData';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OverviewPriceChartProps {
  athlete: Athlete;
}

export function OverviewPriceChart({ 
  athlete, 
  timeRange: externalTimeRange, 
  onTimeRangeChange 
}: OverviewPriceChartProps & { 
  timeRange?: TimeRangeKey; 
  onTimeRangeChange?: (range: TimeRangeKey) => void 
}) {
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRangeKey>('7d');
  const activeTimeRange = externalTimeRange ?? internalTimeRange;
  const handleTimeRangeChange = onTimeRangeChange ?? setInternalTimeRange;
  const { data: trades = [], isLoading } = useAthleteTrades(athlete.id);

  const chartPoints = useMemo(() => {
    return fillPriceGaps(trades, athlete.price, activeTimeRange);
  }, [athlete.price, trades, activeTimeRange]);

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
      <Tabs value={activeTimeRange} onValueChange={(value) => handleTimeRangeChange(value as TimeRangeKey)}>
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
          timeRange={activeTimeRange}
          formatXAxisTick={formatXAxisTick}
          formatTooltipLabel={formatTooltipLabel}
          isLoading={isLoading}
          posts={athlete.posts}
        />
      </div>
    </div>
  );
}
