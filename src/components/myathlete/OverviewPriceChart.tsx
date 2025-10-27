import { useMemo, useState } from 'react';
import type { Athlete } from '@/types';
import { useAthleteTrades } from '@/hooks/useAthleteTrades';
import AthletePriceChart from '@/components/charts/AthletePriceChart';
import { fillPriceGaps, getRangeWindow, type TimeRangeKey } from '@/utils/chartData';
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
  
  // Get range window and pass start as sinceMs
  const { start } = useMemo(() => getRangeWindow(activeTimeRange), [activeTimeRange]);
  
  const { data: trades = [], isLoading, isFetching } = useAthleteTrades(athlete.id, start);

  const chartPoints = useMemo(() => {
    if (!athlete?.price) return [];
    return fillPriceGaps(trades, athlete.price, activeTimeRange);
  }, [athlete?.price, trades, activeTimeRange]);

  const hasRealTrades = trades.length > 0;

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
          <TabsTrigger value="7d" disabled={isLoading || isFetching}>7D</TabsTrigger>
          <TabsTrigger value="30d" disabled={isLoading || isFetching}>30D</TabsTrigger>
          <TabsTrigger value="all" disabled={isLoading || isFetching}>All</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="h-64 md:h-72">
        <AthletePriceChart
          chartPoints={chartPoints}
          hasRealTrades={hasRealTrades}
          timeRange={activeTimeRange}
          formatXAxisTick={formatXAxisTick}
          formatTooltipLabel={formatTooltipLabel}
          isLoading={isLoading}
          isFetching={isFetching}
          posts={athlete.posts}
        />
      </div>
    </div>
  );
}
