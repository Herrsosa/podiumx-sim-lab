import { memo, useMemo, useId, useCallback } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot, Bar, type TooltipProps } from 'recharts';
import { ChartSkeleton } from '@/components/ui/skeletons';
import type { Post } from '@/types';
import { StackedCircles, POS_NEON_COLOR } from './StackedCircles';
import { aggregatePosByDay, startOfUtcDay, getRangeWindow } from '@/utils/chartData';

type ChartPoint = {
  t: number;
  price: number;
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
        };
      });

    const posOnlyData = posDailyPoints
      .filter((posPoint) => Number.isFinite(posPoint.dateMs) && !dayWithPrice.has(posPoint.dateMs))
      .map((posPoint) => ({
        t: posPoint.dateMs,
        price: null,
        posCount: posPoint.posCount,
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
    // For non-'all' ranges with defined start, clamp to range window
    if (timeRange !== 'all' && start) {
      return [start, end];
    }
    
    // For 'all', compute from data
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    if (chartPoints.length === 0) {
      return [now - dayMs, now + dayMs];
    }
    
    const min = chartPoints[0].t;
    const max = Math.max(chartPoints[chartPoints.length - 1].t, now);
    const pad = dayMs * 0.1;
    return [min - pad, max + pad];
  }, [chartPoints, timeRange, start, end]);

  const renderTooltip = useCallback(({ active, label, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0 || typeof label !== 'number') {
      return null;
    }

    const priceEntry = payload.find((item) => item && item.dataKey === 'price');
    const posEntry = payload.find((item) => item && item.dataKey === 'posCount');

    const price = typeof priceEntry?.value === 'number' ? priceEntry.value : undefined;
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
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-2 w-2 rounded-full bg-primary/80" />
          <span className="text-muted-foreground">PoS:</span>
          <span className="font-semibold text-foreground">{posCount}</span>
        </div>
      </div>
    );
  }, [formatTooltipLabel, posCountByDay]);

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
            domain={['auto', 'auto']}
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
