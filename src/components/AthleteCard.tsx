import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Athlete } from '@/types';
import type { MarketplaceChartPoint } from '@/hooks/useMarketplaceCharts';
import { formatMoney, formatNumber } from '@/lib/format';
import { getAvatarAsset, resolveAvatarUrl } from '@/utils/avatar';
import { format } from 'date-fns';
import { OptimizedImage } from '@/components/OptimizedImage';
import { motion } from 'framer-motion';
import { CountUp } from '@/components/ui/count-up';
import { cn } from '@/lib/utils';
import { use3DTilt } from '@/hooks/use3DTilt';
import { WatchlistButton } from '@/components/WatchlistButton';
import { usePriceFlash } from '@/hooks/usePriceFlash';

const SPORT_COLORS: Record<string, string> = {
  Running: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20',
  HYROX: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20',
  Cycling: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20',
  Triathlon: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20',
  CrossFit: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20',
  Swimming: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 border-cyan-500/20',
  'Trail Run': 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20',
  Rowing: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border-indigo-500/20',
};

interface AthleteCardProps {
  athlete: Athlete;
  chartData: MarketplaceChartPoint[];
  holdersCount?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export const AthleteCard = memo(({ athlete, chartData, holdersCount, onClick, onMouseEnter }: AthleteCardProps) => {
  const isPositive = athlete.change24h >= 0;
  const lineColor = isPositive ? '#7CFF6B' : '#EF4444';

  // Use the optimized tilt hook which returns the ref
  const cardRef = use3DTilt<HTMLDivElement>({
    maxTilt: 10,
    scale: 1.02,
    speed: 400
  });

  // Price flash animation
  const { flashClass } = usePriceFlash(athlete.price);

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

  const hasAvatar = Boolean(athlete.avatar && athlete.avatar.trim().length > 0);
  const avatarUrl = resolveAvatarUrl(athlete.avatar, { size: 320 });
  const fallbackInitials = useMemo(() => {
    if (!athlete.name) return 'PX';
    const letters = athlete.name
      .split(' ')
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
    return letters || 'PX';
  }, [athlete.name]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className="cursor-pointer"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <Card
        className="glass-card glass-card-hover group overflow-hidden relative transition-all duration-300"
        onMouseEnter={onMouseEnter}
      >
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden">
            {hasAvatar ? (
              <OptimizedImage
                src={avatarUrl}
                webpSrc={getAvatarAsset(athlete.avatar)?.webp}
                alt={athlete.name}
                width={320}
                height={320}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                eager={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/70 to-muted text-3xl font-semibold text-muted-foreground">
                {fallbackInitials}
              </div>
            )}

            {/* Overlay with View Profile Button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2"
              >
                View Profile <ArrowUpRight className="w-4 h-4" />
              </motion.div>
            </div>

            {/* Watchlist Button - Top Right */}
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <WatchlistButton
                athleteId={athlete.id}
                size="sm"
                className="bg-black/40 backdrop-blur-sm hover:bg-black/60"
              />
            </div>
          </div>

          <div className="p-3">
            {/* Name & Sport */}
            <div className="mb-2 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate text-base mb-1">{athlete.name}</h3>
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] px-1.5 py-0", SPORT_COLORS[athlete.sport] || "bg-secondary text-secondary-foreground")}
                >
                  {athlete.sport}
                </Badge>
              </div>
            </div>

            {/* Price & Change - On same line */}
            <div className="mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={cn("text-2xl font-bold tracking-tight rounded px-1 -mx-1 transition-colors", flashClass)}>
                  $<CountUp value={athlete.price} decimalPlaces={2} duration={1.5} />
                </div>
                <span className="text-muted-foreground text-sm">·</span>
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-sm font-semibold",
                    athlete.change24h === 0
                      ? 'text-muted-foreground'
                      : isPositive
                        ? 'text-emerald-400'
                        : 'text-red-400'
                  )}
                >
                  {athlete.change24h !== 0 && (
                    isPositive ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )
                  )}
                  {athlete.change24h !== 0 && isPositive ? '+' : ''}
                  {formatNumber(athlete.change24h)}%
                </div>
              </div>
              {/* Card Holders Count */}
              {holdersCount !== undefined && (
                <div className="text-xs text-muted-foreground mt-1">
                  {holdersCount} card holder{holdersCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Chart - Compact */}
            <div className="mb-3 h-[100px] rounded-lg overflow-hidden">
              {hasChartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sortedChartData}
                    margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id={`gradient-${athlete.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity={0.4} />
                        <stop offset="50%" stopColor={lineColor} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="timestamp" hide />
                    <YAxis hide domain={priceDomain ?? ['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px',
                        padding: '6px 10px'
                      }}
                      cursor={{ stroke: lineColor, strokeWidth: 1, opacity: 0.2 }}
                      formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Price']}
                      labelFormatter={(value) => format(new Date(value), 'MMM d, h:mm a')}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={lineColor}
                      strokeWidth={2}
                      fill={`url(#gradient-${athlete.id})`}
                      fillOpacity={1}
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border">
                  No price history yet
                </div>
              )}
            </div>

            {/* Stats - Compact */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Market Cap</div>
                <div className="font-semibold truncate">{formatMoney(athlete.marketCap)}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Supply</div>
                <div className="font-semibold truncate">{formatNumber(athlete.supply)}</div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Holographic shine effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(255,255,255,0.15), transparent 40%)`,
          }}
        />
      </Card>
    </div>
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
