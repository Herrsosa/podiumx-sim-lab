import { memo, useMemo, useId, useCallback } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot, Bar, type TooltipProps } from 'recharts';
import { ChartSkeleton } from '@/components/ui/skeletons';
import type { Post } from '@/types';
import { StackedCircles, POS_NEON_COLOR } from './StackedCircles';
import { aggregatePosByDay, startOfUtcDay, getRangeWindow } from '@/utils/chartData';

type ChartPoint = {
  t: number;
  price: number;
  carried?: boolean;
  lastTradeTime?: number;
};

interface AthletePriceChartProps {
  chartPoints: ChartPoint[];
  hasRealTrades: boolean;
  timeRange: '24h' | '7d' | '30d' | 'all';
  formatXAxisTick: (value: number) => string;
  formatTooltipLabel: (value: number) => string;
  isLoading: boolean;
  posts?: Post[];
}

const AthletePriceChart = memo(({
  chartPoints,
  hasRealTrades,
  timeRange,
  formatXAxisTick,
  formatTooltipLabel,
  isLoading,
  posts,
}: AthletePriceChartProps) => {
  const posDailyPoints = useMemo(() => aggregatePosByDay(posts, timeRange), [posts, timeRange]);
  const posCountByDay = useMemo(
    () => new Map(posDailyPoints.map((point) => [startOfUtcDay(point.dateMs), point.posCount])),
    [posDailyPoints],
  );

  const chartData = useMemo(() => {
    const dayWithPrice = new Set<number>();

    const baseData = chartPoints
      .filter((point) => Number.isFinite(point.t))
      .map((point) => {
        const dayStart = startOfUtcDay(point.t);
        dayWithPrice.add(dayStart);

        return {
          t: point.t,
          price: point.price,
          posCount: posCountByDay.get(dayStart) ?? 0,
          carried: point.carried,
          lastTradeTime: point.lastTradeTime,
        };
      });

    const posOnlyData = posDailyPoints
      .filter((posPoint) => Number.isFinite(posPoint.dateMs) && !dayWithPrice.has(posPoint.dateMs))
      .map((posPoint) => ({
        t: posPoint.dateMs,
        price: null,
        posCount: posPoint.posCount,
        carried: undefined,
        lastTradeTime: undefined,
      }));

    return [...baseData, ...posOnlyData].sort((a, b) => a.t - b.t);
  }, [chartPoints, posCountByDay, posDailyPoints]);

  const posDomain = useMemo<[number, number]>(() => {
    const maxPos = posDailyPoints.reduce((max, point) => Math.max(max, point.posCount), 0);
    const upper = maxPos > 0 ? maxPos + 1 : 1;
    return [0, upper];
  }, [posDailyPoints]);

  const glowFilterId = useId().replace(/:/g, '');

  const { start, end } = getRangeWindow(timeRange);
  
  const xDomain = useMemo<[number, number]>(() => {
    const now = Date.now();
    
    // Filter for actual price points only (not carried, ignore PoS-only)
    const pricePoints = chartPoints.filter((p) => p.price != null && !p.carried);
    
    if (pricePoints.length === 0) {
      return timeRange === 'all' ? [now - 86400000, now] : [start || now - 86400000, end];
    }
    
    const firstPriceT = pricePoints[0].t;
    const lastPriceT = pricePoints[pricePoints.length - 1].t;
    
    if (timeRange === 'all') {
      // ALL: start at first trade, end at max(lastTrade, now)
      const domainEnd = Math.max(lastPriceT, now);
      return [firstPriceT, domainEnd];
    }
    
    // 24h/7d/30d: data-aware domain with no calendar padding
    const domainStart = Math.max(start || now - 86400000, firstPriceT);
    const domainEnd = end;
    
    return [domainStart, domainEnd];
  }, [chartPoints, timeRange, start, end]);
  
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
    const posEntry = payload.find((item) => item && item.dataKey === 'posCount');

    const price = typeof priceEntry?.value === 'number' ? priceEntry.value : undefined;
    const dataPoint = chartData.find(d => d.t === label);
    const dateLabel = formatTooltipLabel(label);
    const dayStart = startOfUtcDay(label);
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
  }, [formatTooltipLabel, posCountByDay, chartData]);

  if (isLoading) {
    return <ChartSkeleton className="h-full" />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 24, right: 24, bottom: 56, left: 16 }}>
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
            padding={{ right: 18 }}
            tickFormatter={formatXAxisTick}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
            tickLine={false}
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
          <YAxis yAxisId="pos" domain={posDomain} hide />
          <RechartsTooltip 
            content={renderTooltip} 
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '5 5', opacity: 0.5 }} 
            animationDuration={200}
          />
          <Bar
            dataKey="posCount"
            yAxisId="pos"
            fill="transparent"
            barSize={56}
            shape={
              <StackedCircles
                color={POS_NEON_COLOR}
                filterId={`posGlow-${glowFilterId}`}
                maxCircles={6}
                gap={8}
                radius={11}
                hitboxSize={56}
              />
            }
          />
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
