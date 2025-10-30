import { useCallback, useMemo, useState } from 'react';
import type { Athlete } from '@/types';
import { useAthleteTrades } from '@/hooks/useAthleteTrades';
import { useChartPosts } from '@/hooks/useChartPosts';
import AthletePriceChart from '@/components/charts/AthletePriceChart';
import type { TimeRangeKey } from '@/utils/chartData';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { featureFlags } from '@/lib/config/featureFlags';
import { buildPriceSeries, getWindowUTC } from '@/lib/charting/engine';

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
  const availableRanges = useMemo<TimeRangeKey[]>(() => {
    const ranges: TimeRangeKey[] = ['7d'];
    if (featureFlags.show30d) ranges.push('30d');
    if (featureFlags.showAll) ranges.push('all');
    return ranges;
  }, []);

  const [internalTimeRange, setInternalTimeRange] = useState<TimeRangeKey>('7d');
  const activeTimeRange = useMemo<TimeRangeKey>(() => {
    const candidate = externalTimeRange ?? internalTimeRange;
    return availableRanges.includes(candidate) ? candidate : availableRanges[0];
  }, [availableRanges, externalTimeRange, internalTimeRange]);

  const handleTimeRangeChange = useCallback((value: TimeRangeKey) => {
    if (!availableRanges.includes(value)) return;
    const setter = onTimeRangeChange ?? setInternalTimeRange;
    setter(value);
  }, [availableRanges, onTimeRangeChange]);
  
  // Get range window and pass start as sinceMs
  const { start } = useMemo(() => getWindowUTC(activeTimeRange), [activeTimeRange]);
  
  const { data: trades = [], isLoading, isFetching } = useAthleteTrades(athlete.id, start);
  
  // Fetch all workout posts for the chart (not paginated)
  const { data: chartPosts = [] } = useChartPosts(athlete.id, start);
  
  console.log('[OverviewPriceChart] chartPosts from hook:', chartPosts.length, 'athlete.posts:', athlete.posts?.length);

  const chartPoints = useMemo(() => {
    const priceInputs = trades
      .map((trade) => {
        const timestamp = typeof trade.timestamp === 'number'
          ? trade.timestamp
          : new Date(trade.created_at).getTime();
        const price = Number(trade.price_after);
        if (!Number.isFinite(timestamp) || !Number.isFinite(price)) {
          return null;
        }
        return { timestamp, price };
      })
      .filter((entry): entry is { timestamp: number; price: number } => entry !== null);

    return buildPriceSeries(priceInputs, activeTimeRange, {
      fallbackPrice: athlete?.price,
    });
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
        <TabsList className="flex w-full max-w-md gap-1">
          <TabsTrigger value="7d" disabled={isLoading || isFetching} className="flex-1">7D</TabsTrigger>
          {featureFlags.show30d ? (
            <TabsTrigger value="30d" disabled={isLoading || isFetching} className="flex-1">30D</TabsTrigger>
          ) : null}
          {featureFlags.showAll ? (
            <TabsTrigger value="all" disabled={isLoading || isFetching} className="flex-1">All</TabsTrigger>
          ) : null}
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
          posts={chartPosts}
          syncId="myathlete-chart"
        />
      </div>
    </div>
  );
}
