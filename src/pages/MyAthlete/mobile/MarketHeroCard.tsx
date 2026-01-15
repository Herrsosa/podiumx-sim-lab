import { ArrowUpRight, ArrowDownRight, Flame, ChevronRight, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MarketHeroCardProps {
    marketCap: number;
    priceChange: number;
    holders: number;
    auraScore: number;
    streak: number;
    onTap: () => void;
    onShareAura?: () => void;
    className?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

/**
 * Hero card showing Market Cap as the primary metric
 * with holders, Aura, and streak on a single line.
 * Tapping opens the detailed market view.
 * Optional share button for sharing the Aura card.
 */
export function MarketHeroCard({
    marketCap,
    priceChange,
    holders,
    auraScore,
    streak,
    onTap,
    onShareAura,
    className,
}: MarketHeroCardProps) {
    const isPriceUp = priceChange >= 0;
    const PriceChangeIcon = isPriceUp ? ArrowUpRight : ArrowDownRight;

    const handleShareClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onShareAura?.();
    };

    return (
        <Card
            className={cn(
                'border-white/10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm cursor-pointer transition-all hover:bg-primary/15 active:scale-[0.98]',
                className
            )}
            onClick={onTap}
        >
            <CardContent className="p-5">
                {/* Market Cap - Primary metric */}
                <div className="text-center mb-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Your Market Cap
                    </p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                        {currencyFormatter.format(marketCap)}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                        {priceChange !== 0 && (
                            <PriceChangeIcon
                                className={cn(
                                    'h-4 w-4',
                                    isPriceUp ? 'text-emerald-500' : 'text-rose-500'
                                )}
                            />
                        )}
                        <span
                            className={cn(
                                'text-sm font-medium',
                                priceChange === 0
                                    ? 'text-muted-foreground'
                                    : isPriceUp
                                        ? 'text-emerald-500'
                                        : 'text-rose-500'
                            )}
                        >
                            {percentFormatter.format(priceChange / 100)} this week
                        </span>
                    </div>
                </div>

                {/* Stats row - compact single line */}
                <div className="flex items-center justify-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{holders}</span> card holders
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{auraScore}</span> Aura
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="font-semibold text-foreground">{streak}d</span>
                        <Flame className="h-4 w-4 text-orange-500" />
                    </span>
                </div>

                {/* Tap hint + Share button */}
                <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="flex items-center gap-1 text-xs text-primary/70">
                        <span>tap for details</span>
                        <ChevronRight className="h-3 w-3" />
                    </div>
                    {onShareAura && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            onClick={handleShareClick}
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            Share Aura
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
