import { memo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { ChartSkeleton } from '@/components/ui/skeletons';
import { PoSDotsLayer } from './PoSDotsLayer';

type ChartPoint = {
  timestamp: number;
  price: number;
};

interface AthletePriceChartProps {
  chartPoints: ChartPoint[];
  firstTradePoint: ChartPoint | null;
  hasRealTrades: boolean;
  timeRange: '24h' | '7d' | '30d' | 'all';
  formatXAxisTick: (value: number) => string;
  formatTooltipLabel: (value: number) => string;
  isLoading: boolean;
  athleteId?: string;
}

const AthletePriceChart = memo(({
  chartPoints,
  firstTradePoint,
  hasRealTrades,
  timeRange,
  formatXAxisTick,
  formatTooltipLabel,
  isLoading,
  athleteId,
}: AthletePriceChartProps) => {
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });

  if (isLoading) {
    return <ChartSkeleton className="h-full" />;
  }

  if (chartPoints.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No trades yet
      </div>
    );
  }

  const xDomain: [number, number] = [
    Math.min(...chartPoints.map(p => p.timestamp)),
    Math.max(...chartPoints.map(p => p.timestamp)),
  ];

  return (
    <ResponsiveContainer width="100%" height="100%" onResize={(width, height) => {
      setChartDimensions({ width: width || 0, height: height || 0 });
    }}>
      <LineChart data={chartPoints}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={['auto', 'auto']}
          tickFormatter={formatXAxisTick}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(value) => `$${value.toFixed(2)}`}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
          labelFormatter={formatTooltipLabel}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        {hasRealTrades && firstTradePoint && chartPoints.length > 0 && (
          <ReferenceDot
            x={firstTradePoint.timestamp}
            y={firstTradePoint.price}
            r={5}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            label={{
              value: 'First trade',
              position: 'top',
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 12,
            }}
          />
        )}
        
        {/* PoS Dots Layer */}
        {athleteId && chartDimensions.width > 0 && (
          <PoSDotsLayer
            athleteId={athleteId}
            timeRange={timeRange}
            chartWidth={chartDimensions.width}
            chartHeight={chartDimensions.height}
            xDomain={xDomain}
            yPosition={chartDimensions.height - 30}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
});

export default AthletePriceChart;
