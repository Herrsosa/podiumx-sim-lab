import { memo, useMemo, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Athlete } from '@/types';
import type { MarketplaceChartPoint } from '@/hooks/useMarketplaceCharts';
import { formatMoney, formatNumber } from '@/lib/format';
import { getAvatarAsset, resolveAvatarUrl } from '@/utils/avatar';
import { format } from 'date-fns';
import { OptimizedImage } from '@/components/OptimizedImage';
import { motion } from 'framer-motion';
import { CountUp } from '@/components/ui/count-up';
import { cn } from '@/lib/utils';

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
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export const AthleteCard = memo(({ athlete, chartData, onClick, onMouseEnter }: AthleteCardProps) => {
  const isPositive = athlete.change24h >= 0;
  const lineColor = isPositive ? '#7CFF6B' : '#EF4444';
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 });

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg tilt
    const rotateY = ((x - centerX) / centerX) * 10;
    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, glowX, glowY });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(1.02)`,
          transition: 'transform 0.1s ease-out',
        }}
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
          </div>

          <div className="p-6">
            {/* Avatar & Name */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1">
                <h3 className="font-semibold truncate">{athlete.name}</h3>
                <Badge
                  variant="secondary"
                  className={cn("text-xs mt-1 border", SPORT_COLORS[athlete.sport] || "bg-secondary text-secondary-foreground")}
                >
                  {athlete.sport}
                </Badge>
              </div>
            </div>

            {/* Price */}
            <div className="mb-2">
              <div className="text-2xl font-bold tracking-tight">
                $<CountUp value={athlete.price} decimalPlaces={2} duration={1.5} />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis
                        dataKey="timestamp"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => format(new Date(value), 'MMM d')}
                        minTickGap={16}
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
                        width={42}
                        domain={priceDomain ?? ['auto', 'auto']}
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        cursor={{ stroke: lineColor, strokeWidth: 1, opacity: 0.2 }}
                        formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Price']}
                        labelFormatter={(value) => format(new Date(value), 'PPP p')}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke={lineColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                    No trade history
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3 border-border/50">
              <div>
                <div className="text-muted-foreground mb-0.5">Supply</div>
                <div className="font-medium">{formatNumber(athlete.supply)}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Market Cap</div>
                <div className="font-medium">{formatMoney(athlete.marketCap)}</div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Holographic shine effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${tilt.glowX}% ${tilt.glowY}%, rgba(255,255,255,0.15), transparent 40%)`,
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
