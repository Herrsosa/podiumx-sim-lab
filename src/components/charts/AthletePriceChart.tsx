import { memo, useMemo, useId, useCallback } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Scatter, type TooltipProps } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { Post } from '@/types';
import { POS_NEON_COLOR } from './StackedCircles';
import { featureFlags } from '@/lib/config/featureFlags';
import {
  formatTooltip as defaultFormatTooltip,
  getDailyTicks,
  getDomain,
} from '@/lib/charting/engine';

type ChartPoint = {
  t: number;
  price: number;
  carried?: boolean;
  lastTradeTime?: number;
};

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
  const startOfDay = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const posWorkouts = useMemo(() => {
    if (!posts || !featureFlags.showPoS) return [];
    return posts
      .filter((post) => post?.workout_json)
      .map((post) => ({ 
        t: new Date(post.created_at).getTime(),
        posMarker: 1
      }));
  }, [posts]);

  const chartData = useMemo(() => {
    return chartPoints
      .filter((point) => Number.isFinite(point.t))
      .map((point) => ({
        t: point.t,
        price: point.price,
        carried: point.carried,
        lastTradeTime: point.lastTradeTime,
      }))
      .sort((a, b) => a.t - b.t);
  }, [chartPoints]);

  const glowFilterId = useId().replace(/:/g, '');

  const xDomain = useMemo<[number, number]>(() => getDomain(timeRange, chartPoints), [chartPoints, timeRange]);

  const xTicks = useMemo<number[] | undefined>(() => {
    if (timeRange === 'all') {
      return undefined;
    }
    return getDailyTicks(xDomain);
  }, [timeRange, xDomain]);
  
  const yDomain = useMemo<[number, number]>(() => {
    // Filter for actual price points (not carried, not null)
    const pricePoints = chartPoints.filter((p) => p.price != null && !p.carried);
    
    if (pricePoints.length === 0) return [0, 1];
    
    const prices = pricePoints.map(p => p.price).filter(p => Number.isFinite(p));
    if (prices.length === 0) return [0, 1];
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || max * 0.1 || 0.1;
    
    return [Math.max(0, min - padding), max + padding];
  }, [chartPoints]);

  const renderTooltip = useCallback(({ active, label, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0 || typeof label !== 'number') {
      return null;
    }

    const priceEntry = payload.find((item) => item && item.dataKey === 'price');
    const price = typeof priceEntry?.value === 'number' ? priceEntry.value : undefined;
    const dataPoint = chartData.find(d => d.t === label);
    const dateLabel = formatTooltipLabel(label);

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
      </div>
    );
  }, [formatTooltipLabel, chartData]);

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
          margin={{ top: 24, right: 24, bottom: 56, left: 16 }}
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
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            allowDataOverflow
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            width={64}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip 
            content={renderTooltip} 
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '5 5', opacity: 0.5 }} 
            animationDuration={200}
          />
          {featureFlags.showPoS && posWorkouts.length > 0 ? (
            <Scatter
              data={posWorkouts}
              dataKey="posMarker"
              fill={POS_NEON_COLOR}
              fillOpacity={0.8}
              shape={(props: any) => {
                const { cx, cy } = props;
                return (
                  <g filter={`url(#posGlow-${glowFilterId})`}>
                    <circle cx={cx} cy={cy} r={5} fill={POS_NEON_COLOR} />
                  </g>
                );
              }}
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
