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
  getUniformTicks,
  type PoSSeriesPoint,
} from '@/lib/charting/engine';
import {
  getPaddedDomain,
  ensureMinimumPoints,
  filterPointsByRange,
  stitchLatest,
  getRangeStart,
  type XY,
  isMs,
  isSec,
  toMs,
} from '@/lib/charting/seriesUtils';
import { cn } from '@/lib/utils';

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

// Removed: now using getPaddedDomain from seriesUtils.ts

const computeXTicks = (range: TimeRangeKey, domain: [number, number]): number[] | undefined => {
  if (range === 'all') {
    const ticks = getUniformTicks(domain, { targetTickCount: 12 });
    return ticks.length ? ticks : undefined;
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
  const isDebug = import.meta.env?.MODE !== 'production';
  const logDiag = useCallback(
    (...args: unknown[]) => {
      if (isDebug) {
        console.log(...args);
      }
    },
    [isDebug],
  );
  const memoEnabled = featureFlags.perfChartMemo;
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

  // Apply range filtering, stitching, and minimum point guards
  const memoizedChartData = useMemo(
    () => {
      const baseData = buildChartData(chartPoints, posSeries, memoizedPosCountByDay, startOfDay);
      
      // Convert to XY format for new helpers (normalize to ms) while carrying last known price across PoS-only rows
      const firstPriceEntry = baseData.find((entry) => typeof entry.price === 'number');
      let lastKnownPrice = typeof firstPriceEntry?.price === 'number' ? firstPriceEntry.price : 0;
      const xyPoints = baseData.map((p) => {
        if (typeof p.price === 'number') {
          lastKnownPrice = p.price;
          return { x: toMs(p.t), y: p.price };
        }
        return { x: toMs(p.t), y: lastKnownPrice };
      });
      
      const now = Date.now();
      const [start, end] =
        timeRange === "7d" ? [getRangeStart(now, 7), now]
        : timeRange === "30d" ? [getRangeStart(now, 30), now]
        : [Number.NEGATIVE_INFINITY, now]; // "All" - include everything
      
      // DIAGNOSTICS - Detect timestamp unit mismatches
      logDiag("[ChartDiag] range", timeRange);
      logDiag("[ChartDiag] series len", xyPoints.length);
      if (xyPoints.length) {
        const xs = xyPoints.map(p => p.x);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        logDiag("[ChartDiag] series x min/max", minX, maxX, 
                    "units?", isMs(minX) ? "ms" : isSec(minX) ? "sec" : "other");
        logDiag("[ChartDiag] series x min/max (ISO)", new Date(minX).toISOString(), new Date(maxX).toISOString());
      }
      
      const lastBase = xyPoints[xyPoints.length - 1];
      const latestPoint = lastBase ? { t: lastBase.x, price: lastBase.y } : null;
      logDiag("[ChartDiag] latestPoint", latestPoint?.t, latestPoint?.price, 
                  latestPoint ? (isMs(latestPoint.t) ? "ms" : isSec(latestPoint.t) ? "sec" : "other") : "none");
      if (latestPoint) {
        logDiag("[ChartDiag] latestPoint (ISO)", new Date(latestPoint.t).toISOString());
      }
      
      // Check PoS/workout post timestamps
      if (posts && posts.length > 0) {
        const postSample = posts.slice(0, 3).map(p => {
          const ts = new Date(p.created_at).getTime();
          return {
            created_at: p.created_at,
            x: ts,
            units: isMs(ts) ? "ms" : isSec(ts) ? "sec" : "other",
            iso: new Date(ts).toISOString()
          };
        });
        logDiag("[ChartDiag] posts sample", posts.length, postSample);
      } else {
        logDiag("[ChartDiag] posts", 0);
      }
      
      let visible = filterPointsByRange(xyPoints, start, end);
      logDiag("[ChartDiag] after range filter", visible.length);
      
      // Stitch latest point if available
      const beforeStitch = visible.length;
      if (latestPoint) {
        visible = stitchLatest(visible, latestPoint);
      }
      const stitched = visible.length > beforeStitch;
      logDiag("[ChartDiag] stitchLatest", stitched ? "ADDED" : "skipped", "count now", visible.length);
      
      visible = ensureMinimumPoints(visible, end);
      logDiag("[ChartDiag] after ensureMinimumPoints", visible.length);
      
      logDiag("[ChartDiag] start/end (ISO)", 
        start === Number.NEGATIVE_INFINITY ? 'ALL' : new Date(start).toISOString(), 
        new Date(end).toISOString());
      
      if (visible.length > 0) {
        const lastVisible = visible[visible.length - 1];
        logDiag("[ChartDiag] last visible x (ISO)", new Date(lastVisible.x).toISOString(), "y", lastVisible.y);
      }
      
      logDiag("[Chart]", { 
        range: timeRange, 
        start: start === Number.NEGATIVE_INFINITY ? 'ALL' : new Date(start).toISOString(), 
        end: new Date(end).toISOString(), 
        count: visible.length, 
        baseCount: xyPoints.length 
      });
      
      // Convert back to ChartDataPoint format
      return visible.map((p, idx) => ({
        t: p.x,
        price: p.y,
        posCount: baseData[idx]?.posCount ?? 0,
        carried: baseData[idx]?.carried,
        lastTradeTime: baseData[idx]?.lastTradeTime,
      }));
    },
    [chartPoints, memoizedPosCountByDay, posSeries, startOfDay, timeRange, posts, logDiag],
  );
  
  const chartData = memoEnabled 
    ? memoizedChartData 
    : (() => {
        const baseData = buildChartData(chartPoints, posSeries, posCountByDay, startOfDay);
        const firstPriceEntry = baseData.find((entry) => typeof entry.price === 'number');
        let lastKnownPrice = typeof firstPriceEntry?.price === 'number' ? firstPriceEntry.price : 0;
        const xyPoints = baseData.map((p) => {
          if (typeof p.price === 'number') {
            lastKnownPrice = p.price;
            return { x: toMs(p.t), y: p.price };
          }
          return { x: toMs(p.t), y: lastKnownPrice };
        });
        const now = Date.now();
        const [start, end] =
          timeRange === "7d" ? [getRangeStart(now, 7), now]
          : timeRange === "30d" ? [getRangeStart(now, 30), now]
          : [Number.NEGATIVE_INFINITY, now];
        
        let visible = filterPointsByRange(xyPoints, start, end);
        const lastBase = xyPoints[xyPoints.length - 1];
        if (lastBase) {
          visible = stitchLatest(visible, { t: lastBase.x, price: lastBase.y });
        }
        visible = ensureMinimumPoints(visible, end);
        
        return visible.map((p, idx) => ({
          t: p.x,
          price: p.y,
          posCount: baseData[idx]?.posCount ?? 0,
          carried: baseData[idx]?.carried,
          lastTradeTime: baseData[idx]?.lastTradeTime,
        }));
      })();

  const posDomainMemo = useMemo(() => computePosDomain(posSeries), [posSeries]);
  const posDomain = memoEnabled ? posDomainMemo : computePosDomain(posSeries);

  const glowFilterId = useId().replace(/:/g, '');

  const xDomainMemo = useMemo(() => getDomain(timeRange, chartPoints), [chartPoints, timeRange]);
  const xDomain = memoEnabled ? xDomainMemo : getDomain(timeRange, chartPoints);

  const xTicksMemo = useMemo(() => computeXTicks(timeRange, xDomainMemo), [timeRange, xDomainMemo]);
  const xTicks = memoEnabled ? xTicksMemo : computeXTicks(timeRange, xDomain);

  // Calculate Y domain from chart data
  const yDomainMemo = useMemo(() => {
    const ys = chartData.map(p => p.price ?? 0).filter(Number.isFinite);
    const [domainMin, domainMax] = getPaddedDomain(
      ys.length ? Math.min(...ys) : undefined,
      ys.length ? Math.max(...ys) : undefined,
      { floorAtZero: true }
    );
    
    logDiag("[Chart] domain", { 
      range: timeRange, 
      count: chartData.length, 
      yMin: ys.length ? Math.min(...ys) : 'none',
      yMax: ys.length ? Math.max(...ys) : 'none',
      domainMin, 
      domainMax 
    });
    
    return [domainMin, domainMax] as const;
  }, [chartData, timeRange, logDiag]);
  
  const yDomain = memoEnabled ? yDomainMemo : (() => {
    const ys = chartData.map(p => p.price ?? 0).filter(Number.isFinite);
    return getPaddedDomain(
      ys.length ? Math.min(...ys) : undefined,
      ys.length ? Math.max(...ys) : undefined,
      { floorAtZero: true }
    );
  })();

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

  const latestTradeTimestamp = useMemo(() => {
    if (chartPoints.length === 0) return null;
    const lastPoint = chartPoints[chartPoints.length - 1];
    if (!lastPoint) return null;
    const target = lastPoint.carried ? lastPoint.lastTradeTime ?? lastPoint.t : lastPoint.t;
    return Number.isFinite(target) ? toMs(target) : null;
  }, [chartPoints]);

  const [statusLabel, statusClass, dotClass] = useMemo(() => {
    const now = Date.now();
    const STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

    if (isFetching) {
      return ['Syncing…', 'bg-primary/10 text-primary border border-primary/20', 'bg-primary'];
    }

    if (latestTradeTimestamp && now - latestTradeTimestamp <= STALE_THRESHOLD) {
      return ['Live', 'bg-emerald-100 text-emerald-900 border border-emerald-200', 'bg-emerald-500'];
    }

    if (latestTradeTimestamp) {
      const formatted = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(new Date(latestTradeTimestamp));
      return [
        `Last Trade ${formatted}`,
        'bg-amber-50 text-amber-900 border border-amber-200',
        'bg-amber-400',
      ];
    }

    return ['Awaiting trades', 'bg-muted text-muted-foreground border border-border/60', 'bg-muted-foreground/50'];
  }, [isFetching, latestTradeTimestamp]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="pointer-events-none absolute right-4 top-4 z-10">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm',
            statusClass,
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', dotClass)} />
          {statusLabel}
        </span>
      </div>
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
            domain={[yDomain[0], yDomain[1]]}
            allowDataOverflow
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
