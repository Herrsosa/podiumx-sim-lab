import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Athlete } from '@/types';
import type { MarketplaceChartPoint } from '@/hooks/useMarketplaceCharts';
import { formatMoney, formatNumber } from '@/lib/format';
import { getAvatarAsset, resolveAvatarUrl } from '@/utils/avatar';
import { format } from 'date-fns';
import { OptimizedImage } from '@/components/OptimizedImage';

interface AthleteCardProps {
  athlete: Athlete;
  chartData: MarketplaceChartPoint[];
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export const AthleteCard = memo(({ athlete, chartData, onClick, onMouseEnter }: AthleteCardProps) => {
  const isPositive = athlete.change24h >= 0;
  const lineColor = isPositive ? '#7CFF6B' : '#EF4444';

  const sortedChartData = useMemo(
    () => chartData.slice().sort((a, b) => a.timestamp - b.timestamp),
    [chartData]
  );

  const hasChartData = sortedChartData.length > 0;

  const priceDomain = useMemo<[number, number] | undefined>(() => {
    if (!hasChartData) {
      return undefined;
    }

    const prices = sortedChartData.map((point) => point.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return undefined;
    }

    if (min === max) {
      const padding = min === 0 ? 0.5 : Math.abs(min) * 0.05;
      const lower = Math.max(0, min - padding);
      return [lower, max + padding];
    }

    const padding = (max - min) * 0.1 || 0.5;
    const lower = Math.max(0, min - padding);
    return [lower, max + padding];
  }, [hasChartData, sortedChartData]);

  return (
    <Card
      className="glass-card group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-primary/30"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <CardContent className="p-0">
        <div className="aspect-w-1 aspect-h-1">
          <OptimizedImage
            src={resolveAvatarUrl(athlete.avatar, { size: 320 })}
            webpSrc={getAvatarAsset(athlete.avatar)?.webp}
            alt={athlete.name}
            width={320}
            height={320}
            className="h-48 w-full object-cover"
            eager={false}
          />
        </div>
        <div className="p-6">
          {/* Avatar & Name */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1">
              <h3 className="font-semibold">{athlete.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {athlete.sport}
              </Badge>
            </div>
          </div>

          {/* Price */}
          <div className="mb-2">
            <div className="text-2xl font-bold">
              {formatMoney(athlete.price)}
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${
                isPositive ? 'text-success' : 'text-destructive'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? '+' : ''}
              {formatNumber(athlete.change24h)}% 24h
            </div>
          </div>

          {/* Price Trend */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <span>Price (7d)</span>
            </div>
            <div className="h-20">
              {hasChartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sortedChartData}
                    margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                      minTickGap={16}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
                      width={42}
                      domain={priceDomain ?? ['auto', 'auto']}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      cursor={{ stroke: lineColor, strokeWidth: 1, opacity: 0.2 }}
                      formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Price']}
                      labelFormatter={(value) => format(new Date(value), 'PPP p')}
                    />
                    <Line type="monotone" dataKey="price" stroke={lineColor} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No trade history
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Supply</div>
              <div className="font-medium">{formatNumber(athlete.supply)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Market Cap</div>
              <div className="font-medium">{formatMoney(athlete.marketCap)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prev, next) => {
  if (prev.athlete.id !== next.athlete.id) return false;
  if (prev.athlete.price !== next.athlete.price) return false;
  if (prev.athlete.change24h !== next.athlete.change24h) return false;
  if (prev.chartData.length !== next.chartData.length) return false;

  if (prev.chartData.length === 0) {
    return true;
  }

  const prevLast = prev.chartData[prev.chartData.length - 1];
  const nextLast = next.chartData[next.chartData.length - 1];

  return (
    prevLast.price === nextLast.price &&
    prevLast.timestamp === nextLast.timestamp
  );
});

AthleteCard.displayName = 'AthleteCard';
