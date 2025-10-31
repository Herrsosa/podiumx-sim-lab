import { memo, useMemo, useId, useCallback } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Bar, type TooltipProps } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { Post } from '@/types';
import { StackedCircles, POS_NEON_COLOR } from './StackedCircles';
import { featureFlags } from '@/lib/config/featureFlags';
import {
  buildPoSSeries,
  formatTooltip as defaultFormatTooltip,
  getDailyTicks,
  getDomain,
  type PoSSeriesPoint,
} from '@/lib/charting/engine';

type ChartPoint = {
  t: number;
  price: number;
  carried?: boolean;
  lastTradeTime?: number;
};

type ChartDataPoint = {
  t: number;
  price: number | null;
  posCount: number;
  carried?: boolean;
  lastTradeTime?: number;
};

type TimeRangeKey = '7d' | '30d' | 'all';

const computePoSSeries = (showPoS: boolean, posts: Post[] | undefined, range: TimeRangeKey): PoSSeriesPoint[] => {
  if (!showPoS || !posts || posts.length === 0) {
    return [];
  }

  const entries = posts
    .filter((post) => post?.workout_json)
    .map((post) => ({ timestamp: new Date(post.created_at).getTime(), count: 1 }));

  return buildPoSSeries(entries, range);
};

const buildPosCountMap = (series: PoSSeriesPoint[]) =>
  new Map<number, number>(series.map((point) => [point.t, point.posCount]));

const buildChartData = (
  chartPoints: ChartPoint[],
  posSeries: PoSSeriesPoint[],
  posCountByDay: Map<number, number>,
  startOfDay: (timestamp: number) => number,
): ChartDataPoint[] => {
  const dayWithPrice = new Set<number>();

  const baseData = chartPoints
    .filter((point) => Number.isFinite(point.t))
    .map((point) => {
      const dayStart = startOfDay(point.t);
      dayWithPrice.add(dayStart);

      return {
        t: point.t,
        price: point.price,
        posCount: posCountByDay.get(dayStart) ?? 0,
        carried: point.carried,
        lastTradeTime: point.lastTradeTime,
      } satisfies ChartDataPoint;
    });

  const posOnlyData = posSeries
    .filter((posPoint) => Number.isFinite(posPoint.t) && !dayWithPrice.has(posPoint.t))
    .map((posPoint) => ({
      t: posPoint.t,
      price: null,
      posCount: posPoint.posCount,
      carried: undefined,
      lastTradeTime: undefined,
    } satisfies ChartDataPoint));

  return [...baseData, ...posOnlyData].sort((a, b) => a.t - b.t);
};

const computePosDomain = (posSeries: PoSSeriesPoint[]): [number, number] => {
  const maxPos = posSeries.reduce((max, point) => Math.max(max, point.posCount), 0);
  const upper = maxPos > 0 ? maxPos + 1 : 1;
  return [0, upper];
};

const computeYDomain = (chartPoints: ChartPoint[]): [number, number] => {
  const pricePoints = chartPoints.filter((p) => p.price != null && !p.carried);

  if (pricePoints.length === 0) return [0, 1];

  const prices = pricePoints.map((p) => p.price).filter((value): value is number => Number.isFinite(value));
  if (prices.length === 0) return [0, 1];

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.1 || max * 0.1 || 0.1;

  return [Math.max(0, min - padding), max + padding];
};

const computeXTicks = (range: TimeRangeKey, domain: [number, number]): number[] | undefined => {
  if (range === 'all') {
    return undefined;
  }

  return getDailyTicks(domain);
};

const buildChartLookup = (data: ChartDataPoint[]) => new Map<number, ChartDataPoint>(data.map((point) => [point.t, point]));

interface AthletePriceChartProps {
  chartPoints: ChartPoint[];
  hasRealTrades: boolean;
  timeRange: '7d' | '30d' | 'all';
  formatXAxisTick: (value: number) => string;
  formatTooltipLabel?: (value: number) => string;
  isLoading: boolean;
  isFetching?: boolean;
  posts?: Post[];
  syncId?: string | null;
}

const AthletePriceChart = memo(({
  chartPoints,
  hasRealTrades,
  timeRange,
  formatXAxisTick,
  formatTooltipLabel = defaultFormatTooltip,
  isLoading,
  isFetching = false,
  posts,
  syncId = null,
}: AthletePriceChartProps) => {
  const memoEnabled = featureFlags.perfChartMemo !== false;
  const showPoS = featureFlags.showPoS;

  const startOfDay = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const memoizedPosSeries = useMemo(() => computePoSSeries(showPoS, posts, timeRange), [posts, showPoS, timeRange]);
  const posSeries = memoEnabled ? memoizedPosSeries : computePoSSeries(showPoS, posts, timeRange);

  const memoizedPosCountByDay = useMemo(() => buildPosCountMap(posSeries), [posSeries]);
  const posCountByDay = memoEnabled ? memoizedPosCountByDay : buildPosCountMap(posSeries);

  const memoizedChartData = useMemo(
    () => buildChartData(chartPoints, posSeries, memoizedPosCountByDay, startOfDay),
    [chartPoints, memoizedPosCountByDay, posSeries, startOfDay],
  );
  const chartData = memoEnabled ? memoizedChartData : buildChartData(chartPoints, posSeries, posCountByDay, startOfDay);

  const posDomainMemo = useMemo(() => computePosDomain(posSeries), [posSeries]);
  const posDomain = memoEnabled ? posDomainMemo : computePosDomain(posSeries);

  const glowFilterId = useId().replace(/:/g, '');

  const xDomainMemo = useMemo(() => getDomain(timeRange, chartPoints), [chartPoints, timeRange]);
  const xDomain = memoEnabled ? xDomainMemo : getDomain(timeRange, chartPoints);

  const xTicksMemo = useMemo(() => computeXTicks(timeRange, xDomainMemo), [timeRange, xDomainMemo]);
  const xTicks = memoEnabled ? xTicksMemo : computeXTicks(timeRange, xDomain);

  const yDomainMemo = useMemo(() => computeYDomain(chartPoints), [chartPoints]);
  const yDomain = memoEnabled ? yDomainMemo : computeYDomain(chartPoints);

  const chartDataLookup = useMemo(() => buildChartLookup(chartData), [chartData]);

  const axisTickStyle = useMemo(
    () => ({ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }),
    [],
  );

  const chartMargin = useMemo(() => ({ top: 24, right: 24, bottom: 56, left: 16 }), []);

  const tooltipCursor = useMemo(
    () => ({ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '5 5', opacity: 0.5 }),
    [],
  );

  const posBarShape = useMemo(
    () => (
      <StackedCircles
        color={POS_NEON_COLOR}
        filterId={`posGlow-${glowFilterId}`}
        maxCircles={6}
        gap={8}
        radius={11}
        hitboxSize={56}
      />
    ),
    [glowFilterId],
  );

  const formatPriceTick = useCallback((value: number) => `$${value.toFixed(2)}`, []);

  const renderTooltip = useCallback(({ active, label, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0 || typeof label !== 'number') {
      return null;
    }

    const priceEntry = payload.find((item) => item && item.dataKey === 'price');
    const posEntry = payload.find((item) => item && item.dataKey === 'posCount');

    const price = typeof priceEntry?.value === 'number' ? priceEntry.value : undefined;
    const dataPoint = chartDataLookup.get(label);
    const dateLabel = formatTooltipLabel(label);
    const dayStart = startOfDay(label);
    const posCount =
      typeof posEntry?.value === 'number' ? posEntry.value : posCountByDay.get(dayStart) ?? 0;

    return (
      <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-xl">
        <div className="text-xs font-medium text-muted-foreground mb-1">{dateLabel}</div>
        {typeof price === 'number' && (
          <div className="text-base font-bold text-foreground mb-1">${price.toFixed(4)}</div>
        )}
        {dataPoint?.carried && dataPoint.lastTradeTime && (
          <div className="text-xs text-muted-foreground italic mb-1">
            No trades — price carried from {new Date(dataPoint.lastTradeTime).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-2 w-2 rounded-full bg-primary/80" />
          <span className="text-muted-foreground">PoS:</span>
          <span className="font-semibold text-foreground">{posCount}</span>
        </div>
      </div>
    );
  }, [chartDataLookup, formatTooltipLabel, posCountByDay, startOfDay]);

  const isBusy = isLoading || isFetching;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {isBusy ? (
        <div className="pointer-events-none absolute inset-0 px-6 pt-6 pb-10">
          <Skeleton className="h-full w-full rounded-lg opacity-70" />
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={chartMargin}
          syncId={syncId ?? undefined}
        >
          <defs>
            <filter id={`posGlow-${glowFilterId}`} x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.15} 
            vertical={false}
          />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={xDomain}
            ticks={xTicks}
            tickFormatter={formatXAxisTick}
            tick={axisTickStyle}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            allowDataOverflow
          />
          <YAxis
            domain={yDomain}
            tick={axisTickStyle}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={formatPriceTick}
            width={64}
            axisLine={false}
            tickLine={false}
          />
          <YAxis yAxisId="pos" domain={posDomain} hide />
          <RechartsTooltip 
            content={renderTooltip} 
            cursor={tooltipCursor} 
            animationDuration={200}
          />
          {featureFlags.showPoS ? (
            <Bar
              dataKey="posCount"
              yAxisId="pos"
              fill="transparent"
              barSize={56}
              shape={posBarShape}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="price"
            stroke={POS_NEON_COLOR}
            strokeWidth={3}
            strokeOpacity={0.8}
            dot={false}
            connectNulls
            strokeLinecap="round"
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

export default AthletePriceChart;
