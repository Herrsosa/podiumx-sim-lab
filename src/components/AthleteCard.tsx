import { memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { Athlete } from '@/types';
import { formatMoney, formatNumber } from '@/lib/format';

interface AthleteCardProps {
  athlete: Athlete;
  chartData: number[];
  onClick: () => void;
}

export const AthleteCard = memo(({ athlete, chartData, onClick }: AthleteCardProps) => {
  const isPositive = athlete.change24h >= 0;

  return (
    <Card
      className="glass-card group cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Avatar & Name */}
        <div className="mb-4 flex items-center gap-3">
          {/* Instagram-style avatar */}
          <div className="relative h-12 w-12 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
              <div className="h-full w-full rounded-full bg-background p-0.5">
                <img
                  src={`${athlete.avatar}?width=100`}
                  alt={athlete.name}
                  loading="lazy"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            </div>
          </div>
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

        {/* Sparkline */}
        <div className="mb-4 h-12">
          {chartData.length > 0 ? (
            <Sparklines data={chartData} width={200} height={48}>
              <SparklinesLine
                color={isPositive ? '#7CFF6B' : '#EF4444'}
                style={{ strokeWidth: 2, fill: 'none' }}
              />
            </Sparklines>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No trade history
            </div>
          )}
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
      </CardContent>
    </Card>
  );
}, (prev, next) => {
  return prev.athlete.id === next.athlete.id && 
         prev.athlete.price === next.athlete.price &&
         prev.chartData.length === next.chartData.length;
});

AthleteCard.displayName = 'AthleteCard';
