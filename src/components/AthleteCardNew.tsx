import { memo, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Athlete } from '@/types';
import type { MarketplaceChartPoint } from '@/hooks/useMarketplaceCharts';
import { formatMoney, formatNumber } from '@/lib/format';
import { Link } from 'react-router-dom';

interface AthleteCardNewProps {
  athlete: Athlete;
  chartData: MarketplaceChartPoint[];
}

export const AthleteCardNew = memo(({ athlete, chartData }: AthleteCardNewProps) => {
  const isPositive = athlete.change24h >= 0;
  const lineColor = isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))';

  const sortedChartData = useMemo(
    () => chartData.slice().sort((a, b) => a.timestamp - b.timestamp),
    [chartData]
  );

  const hasChartData = sortedChartData.length > 0;

  return (
    <Link to={`/athlete/${athlete.slug}`}>
      <Card className="group relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
        <CardContent className="p-0">
          {/* Cover Image */}
          <div className="relative h-40 overflow-hidden">
            <img
              src={athlete.avatar}
              alt={athlete.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            
            {/* 24h Change Badge */}
            {athlete.change24h !== 0 && (
              <div className="absolute top-3 right-3">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                  isPositive 
                    ? 'bg-success/20 text-success border border-success/30' 
                    : 'bg-destructive/20 text-destructive border border-destructive/30'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  {athlete.change24h > 0 ? '+' : ''}{formatNumber(athlete.change24h)}%
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Name & Sport */}
            <div className="mb-3">
              <h3 className="font-semibold text-lg mb-1 truncate">{athlete.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {athlete.sport}
              </Badge>
            </div>

            {/* Price */}
            <div className="mb-3">
              <div className="text-2xl font-bold tracking-tight">
                {formatMoney(athlete.price)}
              </div>
              <div className="text-xs text-muted-foreground">per token</div>
            </div>

            {/* Mini Chart */}
            {hasChartData && (
              <div className="h-12 mb-3 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke={lineColor} 
                      strokeWidth={1.5} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-xs pt-3 border-t border-border/30">
              <div>
                <div className="text-muted-foreground mb-0.5">Supply</div>
                <div className="font-semibold">{formatNumber(athlete.supply)}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground mb-0.5">Market Cap</div>
                <div className="font-semibold">{formatMoney(athlete.marketCap)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

AthleteCardNew.displayName = 'AthleteCardNew';
