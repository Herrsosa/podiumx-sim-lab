import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PriceSeriesPoint } from '@/lib/charting/engine';

interface OtherAthleteHeroCardProps {
    marketCap: number;
    price: number;
    priceChange: number;
    holdersCount: number;
    priceSeries: PriceSeriesPoint[];
    onBuyClick: () => void;
    onSellClick: () => void;
    canSell: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
});

/**
 * Market cap hero card for viewing other athlete's profile.
 * Shows market cap, price change, holders, mini sparkline, and Buy/Sell buttons.
 */
export function OtherAthleteHeroCard({
    marketCap,
    price,
    priceChange,
    holdersCount,
    priceSeries,
    onBuyClick,
    onSellClick,
    canSell,
}: OtherAthleteHeroCardProps) {
    const isPriceUp = priceChange >= 0;
    const TrendIcon = isPriceUp ? TrendingUp : TrendingDown;

    // Mini sparkline data - just use last 20 points for compact view
    const sparklinePoints = useMemo(() => {
        if (priceSeries.length === 0) return [];
        const points = priceSeries.slice(-20);
        if (points.length < 2) return [];

        const prices = points.map(p => p.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;

        return points.map((p, i) => ({
            x: (i / (points.length - 1)) * 100,
            y: 100 - ((p.price - min) / range) * 100,
        }));
    }, [priceSeries]);

    const sparklinePath = useMemo(() => {
        if (sparklinePoints.length < 2) return '';
        return sparklinePoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');
    }, [sparklinePoints]);

    return (
        <Card className="border-white/10 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-5">
                {/* Market Cap Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            Market Cap
                        </p>
                        <p className="text-3xl font-bold tracking-tight">
                            {currencyFormatter.format(marketCap)}
                        </p>
                    </div>

                    {/* Change & Holders */}
                    <div className="text-right">
                        <div className={cn(
                            'flex items-center justify-end gap-1 text-sm font-medium',
                            priceChange === 0
                                ? 'text-muted-foreground'
                                : isPriceUp
                                    ? 'text-emerald-500'
                                    : 'text-rose-500'
                        )}>
                            {priceChange !== 0 && <TrendIcon className="h-3.5 w-3.5" />}
                            <span>{priceChange !== 0 && isPriceUp ? '+' : ''}{priceChange.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mt-1">
                            <Users className="h-3 w-3" />
                            <span>{holdersCount} card holders</span>
                        </div>
                    </div>
                </div>

                {/* Mini Sparkline */}
                {sparklinePoints.length > 1 && (
                    <div className="h-12 mb-4">
                        <svg
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            className="w-full h-full"
                        >
                            <defs>
                                <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={isPriceUp ? '#10b981' : '#f43f5e'} stopOpacity="0.3" />
                                    <stop offset="100%" stopColor={isPriceUp ? '#10b981' : '#f43f5e'} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {/* Area fill */}
                            <path
                                d={`${sparklinePath} L 100 100 L 0 100 Z`}
                                fill="url(#sparkline-gradient)"
                            />
                            {/* Line */}
                            <path
                                d={sparklinePath}
                                fill="none"
                                stroke={isPriceUp ? '#10b981' : '#f43f5e'}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                )}

                {/* Buy / Sell Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={onBuyClick}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11"
                    >
                        Buy
                    </Button>
                    <Button
                        onClick={onSellClick}
                        variant="outline"
                        disabled={!canSell}
                        className={cn(
                            'font-semibold h-11',
                            canSell
                                ? 'border-rose-500/50 text-rose-500 hover:bg-rose-500/10'
                                : 'opacity-50'
                        )}
                    >
                        Sell
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
