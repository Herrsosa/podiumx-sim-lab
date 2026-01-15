import { useState, useMemo } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Flame, Zap, TrendingUp, Users } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import AthletePriceChart from '@/components/charts/AthletePriceChart';
import { featureFlags } from '@/lib/config/featureFlags';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import type { TimeRangeKey } from '@/utils/chartData';
import type { Post } from '@/types';
import type { AthleteTrade } from '@/hooks/useAthleteTrades';

interface MarketDetailSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    athleteId: string;
    athleteName: string;
    marketCap: number;
    price: number;
    priceChange: number;
    priceSeries: PriceSeriesPoint[];
    posts?: Post[];
    trades?: AthleteTrade[];
    holdersCount?: number;
    auraScore?: number;
    auraBreakdown?: {
        discipline: { score: number; detail: string };
        momentum: { score: number; detail: string };
        output: { score: number; detail: string };
    };
    streak?: number;
    timeRange: TimeRangeKey;
    onTimeRangeChange?: (range: TimeRangeKey) => void;
    isLoading?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

/**
 * Expanded detail view showing chart, Aura breakdown, trades, and holders.
 * Opens when user taps the Market Hero Card.
 */
export function MarketDetailSheet({
    open,
    onOpenChange,
    athleteId,
    athleteName,
    marketCap,
    price,
    priceChange,
    priceSeries,
    posts = [],
    trades = [],
    holdersCount = 0,
    auraScore = 0,
    auraBreakdown,
    streak = 0,
    timeRange,
    onTimeRangeChange,
    isLoading = false,
}: MarketDetailSheetProps) {
    const isPriceUp = priceChange >= 0;
    const PriceChangeIcon = isPriceUp ? ArrowUpRight : ArrowDownRight;

    // Chart range options based on feature flags
    const chartRangeOptions = ['7d'];
    if (featureFlags.show30d) chartRangeOptions.push('30d');
    if (featureFlags.showAll) chartRangeOptions.push('all');

    const safeChartRange = chartRangeOptions.includes(timeRange) ? timeRange : '7d';

    // Show recent trades (last 5)
    const recentTrades = useMemo(() => trades.slice(0, 5), [trades]);

    // Get unique traders as "holders" from trade data
    const uniqueTraders = useMemo(() => {
        const tradersMap = new Map<string, { name: string; avatar?: string; total: number }>();
        trades.forEach(trade => {
            // Group by user_id (the trader), not athlete_id
            const traderId = trade.user_id;
            if (!traderId) return;
            const existing = tradersMap.get(traderId);
            const qty = trade.qty ?? 0;
            const isBuy = trade.side === 'BUY';
            if (existing) {
                existing.total += isBuy ? qty : -qty;
                // Update name/avatar if we didn't have it before
                if (!existing.name && trade.userName) {
                    existing.name = trade.userName;
                }
                if (!existing.avatar && trade.userAvatar) {
                    existing.avatar = trade.userAvatar;
                }
            } else {
                tradersMap.set(traderId, {
                    name: trade.userName || 'Holder',
                    avatar: trade.userAvatar,
                    total: isBuy ? qty : -qty
                });
            }
        });
        // Filter to only those with positive holdings
        return Array.from(tradersMap.entries())
            .filter(([_, v]) => v.total > 0)
            .map(([id, v]) => ({ id, name: v.name, avatar: v.avatar }));
    }, [trades]);

    const displayHoldersCount = holdersCount > 0 ? holdersCount : uniqueTraders.length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Market Cap Header */}
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            Your Market Cap
                        </p>
                        <p className="text-4xl font-bold">
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

                    {/* Price Chart with Time Range Selector */}
                    <Card className="border-white/10 bg-card/60">
                        <CardContent className="p-4">
                            {/* Time Range Tabs */}
                            {onTimeRangeChange && (
                                <Tabs
                                    value={safeChartRange}
                                    onValueChange={(value) => {
                                        const next = value as TimeRangeKey;
                                        if (!chartRangeOptions.includes(next)) return;
                                        onTimeRangeChange(next);
                                    }}
                                    className="mb-4"
                                >
                                    <TabsList className="flex w-full gap-1">
                                        <TabsTrigger value="7d" className="flex-1">7D</TabsTrigger>
                                        {featureFlags.show30d && (
                                            <TabsTrigger value="30d" className="flex-1">30D</TabsTrigger>
                                        )}
                                        {featureFlags.showAll && (
                                            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                                        )}
                                    </TabsList>
                                </Tabs>
                            )}

                            {isLoading ? (
                                <Skeleton className="h-44 w-full" />
                            ) : priceSeries.length === 0 ? (
                                <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
                                    No price data yet
                                </div>
                            ) : (
                                <div className="h-44 w-full">
                                    <AthletePriceChart
                                        chartPoints={priceSeries}
                                        hasRealTrades={trades.length > 0}
                                        timeRange={safeChartRange}
                                        formatXAxisTick={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        formatTooltipLabel={(value) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        isLoading={false}
                                        isFetching={false}
                                        posts={posts}
                                        syncId="market-detail-chart"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Aura Score Breakdown */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide">Aura Score</h3>
                            <Badge variant="outline" className="ml-auto">{auraScore}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Card className="border-white/10 bg-card/40">
                                <CardContent className="p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">📅 Discipline</p>
                                    <p className="text-xl font-bold text-emerald-400">
                                        {auraBreakdown?.discipline.score ?? 0}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {auraBreakdown?.discipline.detail ?? '-'}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="border-white/10 bg-card/40">
                                <CardContent className="p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">🔥 Momentum</p>
                                    <p className="text-xl font-bold text-orange-400">
                                        {auraBreakdown?.momentum.score ?? 0}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                                        {streak}d <Flame className="h-3 w-3 text-orange-500" />
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="border-white/10 bg-card/40">
                                <CardContent className="p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">💪 Output</p>
                                    <p className="text-xl font-bold text-purple-400">
                                        {auraBreakdown?.output.score ?? 0}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {auraBreakdown?.output.detail ?? '-'}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Recent Trades */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide">Recent Trades</h3>
                        </div>
                        {recentTrades.length > 0 ? (
                            <div className="space-y-2">
                                {recentTrades.map((trade) => {
                                    const isBuy = trade.side === 'BUY';
                                    const timeAgo = getTimeAgo(trade.timestamp);
                                    // Handle NaN values - use gross_amount if valid, otherwise calculate from qty * price
                                    const amount = Number.isFinite(trade.gross_amount)
                                        ? trade.gross_amount
                                        : (Number.isFinite(trade.qty) && Number.isFinite(trade.price_after)
                                            ? (trade.qty ?? 0) * (trade.price_after ?? 0)
                                            : 0);
                                    return (
                                        <div
                                            key={trade.id}
                                            className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-xs',
                                                        isBuy
                                                            ? 'text-emerald-500 border-emerald-500/30'
                                                            : 'text-rose-500 border-rose-500/30'
                                                    )}
                                                >
                                                    {isBuy ? 'Buy' : 'Sell'}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {timeAgo}
                                                </span>
                                            </div>
                                            <span
                                                className={cn(
                                                    'text-sm font-medium',
                                                    isBuy ? 'text-emerald-500' : 'text-rose-500'
                                                )}
                                            >
                                                {isBuy ? '+' : '-'}
                                                {currencyFormatter.format(amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No trades yet
                            </p>
                        )}
                    </div>

                    {/* Holders */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide">
                                Card Holders ({displayHoldersCount})
                            </h3>
                        </div>
                        {uniqueTraders.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {uniqueTraders.slice(0, 8).map((holder) => (
                                    <div
                                        key={holder.id}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30"
                                    >
                                        <Avatar className="h-6 w-6">
                                            {holder.avatar && (
                                                <AvatarImage src={holder.avatar} alt={holder.name} />
                                            )}
                                            <AvatarFallback className="text-[10px]">
                                                {holder.name.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium">{holder.name}</span>
                                    </div>
                                ))}
                                {uniqueTraders.length > 8 && (
                                    <div className="flex items-center px-3 py-1.5 rounded-full bg-muted/30">
                                        <span className="text-xs text-muted-foreground">
                                            +{uniqueTraders.length - 8} more
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No card holders yet
                            </p>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}
