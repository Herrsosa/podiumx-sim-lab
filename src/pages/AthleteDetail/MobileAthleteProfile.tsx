import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { ArrowLeft, Zap, TrendingUp, Users, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { OtherAthleteHeroCard } from './OtherAthleteHeroCard';
import { OtherAthleteInnerCircle } from './OtherAthleteInnerCircle';
import { MobileTradeModal } from './MobileTradeModal';
import WorkoutPosts from '@/components/WorkoutPosts';
import TokengatedChat from '@/components/TokengatedChat';
import { LockerMessages } from '@/components/myathlete/LockerMessages';
import { LockerGlobe } from '@/components/myathlete/LockerGlobe';
import { ChartSkeleton } from '@/components/ui/skeletons';
import { FounderBadge } from '@/components/FounderBadge';
import { useIsFounder } from '@/hooks/useUserBadges';
import type { Athlete, Trade, Position } from '@/types';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import type { TimeRangeKey } from '@/utils/chartData';

const AthletePriceChart = lazy(() => import('@/components/charts/AthletePriceChart'));

interface MobileAthleteProfileProps {
    athlete: Athlete;
    priceSeries: PriceSeriesPoint[];
    trades: Trade[];
    position: Position | null;
    userBalance: number;
    timeRange: TimeRangeKey;
    onTimeRangeChange: (range: TimeRangeKey) => void;
    onBack: () => void;
    onTrade: (athleteId: string, quantity: number, side: 'BUY' | 'SELL') => Promise<void>;
    isTradePending: boolean;
    isLoading: boolean;
    holdersCount: number;
    auraScore?: number;
    auraBreakdown?: {
        discipline: { score: number; detail: string };
        momentum: { score: number; detail: string };
        output: { score: number; detail: string };
    };
    streak?: number;
    userId?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
});

/**
 * Simplified mobile profile view for viewing OTHER athletes.
 * Focused on conversion with prominent Buy/Sell buttons and Inner Circle FOMO.
 */
export function MobileAthleteProfile({
    athlete,
    priceSeries,
    trades,
    position,
    userBalance,
    timeRange,
    onTimeRangeChange,
    onBack,
    onTrade,
    isTradePending,
    isLoading,
    holdersCount,
    auraScore = 0,
    auraBreakdown,
    streak = 0,
    userId,
}: MobileAthleteProfileProps) {
    const [activeTab, setActiveTab] = useState<'pos' | 'stats' | 'globe'>('pos');
    const [tradeModalOpen, setTradeModalOpen] = useState(false);
    const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
    const [showChat, setShowChat] = useState(false);
    const [showDM, setShowDM] = useState(false);

    const isHolder = (position?.quantity ?? 0) > 0;
    const userHoldings = position?.quantity ?? 0;
    const isSelfBuy = userId === athlete.id;

    const priceChange = athlete.change24h ?? 0;

    // Check if athlete is a founder
    const { isFounder } = useIsFounder(athlete.id);

    // Recent trades for Stats tab
    const recentTrades = useMemo(() => trades.slice(0, 5), [trades]);

    const handleBuyClick = useCallback(() => {
        setTradeMode('buy');
        setTradeModalOpen(true);
    }, []);

    const handleSellClick = useCallback(() => {
        setTradeMode('sell');
        setTradeModalOpen(true);
    }, []);

    const handleTradeConfirm = useCallback(async (quantity: number) => {
        await onTrade(athlete.id, quantity, tradeMode === 'buy' ? 'BUY' : 'SELL');
    }, [onTrade, athlete.id, tradeMode]);

    const handleEnterChat = useCallback(() => {
        setShowChat(true);
    }, []);

    const handleSendDM = useCallback(() => {
        setShowDM(true);
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-white/10 bg-background/95 backdrop-blur-xl px-4 py-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="gap-2 -ml-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
            </header>

            <main className="flex-1 px-4 py-4 space-y-4 pb-20">
                {/* Profile Section */}
                <div className="text-center">
                    <Avatar className="h-20 w-20 mx-auto mb-3 ring-2 ring-primary/30">
                        <AvatarImage src={athlete.avatar} alt={athlete.name} />
                        <AvatarFallback className="text-xl">
                            {athlete.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <h1 className="text-xl font-bold flex items-center justify-center gap-2">
                        {athlete.name}
                        {isFounder && <FounderBadge size="sm" showLabel={false} />}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        @{athlete.slug} · {athlete.sport}
                        {athlete.location && ` · ${athlete.location}`}
                    </p>
                </div>

                {/* Market Cap Hero Card */}
                <OtherAthleteHeroCard
                    marketCap={athlete.marketCap}
                    price={athlete.price}
                    priceChange={priceChange}
                    holdersCount={holdersCount}
                    priceSeries={priceSeries}
                    onBuyClick={handleBuyClick}
                    onSellClick={handleSellClick}
                    canSell={userHoldings > 0}
                />

                {/* Inner Circle Card */}
                <OtherAthleteInnerCircle
                    athleteName={athlete.name}
                    isHolder={isHolder}
                    holdersCount={holdersCount}
                    lastActiveText="Active now"
                    onlineCount={isHolder ? Math.max(1, Math.floor(holdersCount * 0.3)) : 0}
                    onBuyToUnlock={handleBuyClick}
                    onEnterChat={handleEnterChat}
                    onSendDM={handleSendDM}
                />

                {/* Tabs: Proof of Sweat | Stats | Globe */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pos' | 'stats' | 'globe')}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pos">Proof of Sweat</TabsTrigger>
                        <TabsTrigger value="stats">Stats</TabsTrigger>
                        <TabsTrigger value="globe">Globe</TabsTrigger>
                    </TabsList>

                    {/* Proof of Sweat Tab */}
                    <TabsContent value="pos" className="mt-4 space-y-4">
                        <WorkoutPosts
                            athleteId={athlete.id}
                            userHoldings={userHoldings}
                            posts={athlete.posts || []}
                            isLoading={isLoading}
                            onUnlockClick={handleBuyClick}
                            onConnectStrava={() => { }} // Not applicable for other athletes
                        />
                    </TabsContent>

                    {/* Stats Tab */}
                    <TabsContent value="stats" className="mt-4 space-y-5">
                        {/* Price Chart */}
                        <Card className="border-white/10 bg-card/60">
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3">
                                    Price History
                                </h3>

                                {/* Time Range Selector */}
                                <div className="flex gap-1 mb-4">
                                    {(['7d', '30d', 'all'] as TimeRangeKey[]).map((range) => (
                                        <Button
                                            key={range}
                                            variant={timeRange === range ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => onTimeRangeChange(range)}
                                            className="flex-1 h-8 text-xs"
                                        >
                                            {range === 'all' ? 'All' : range.toUpperCase()}
                                        </Button>
                                    ))}
                                </div>

                                <div className="h-40">
                                    <Suspense fallback={<ChartSkeleton className="h-full" />}>
                                        <AthletePriceChart
                                            chartPoints={priceSeries}
                                            hasRealTrades={trades.length > 0}
                                            timeRange={timeRange}
                                            formatXAxisTick={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            formatTooltipLabel={(v) => new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            isLoading={isLoading}
                                            isFetching={false}
                                            posts={[]}
                                            syncId="mobile-athlete-chart"
                                        />
                                    </Suspense>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Aura Score */}
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
                                            {streak > 0 ? (
                                                <>{streak}d <Flame className="h-3 w-3 text-orange-500" /></>
                                            ) : (
                                                'No streak'
                                            )}
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
                                        const isBuy = trade.type === 'buy';
                                        const time = new Date(trade.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                        const amount = Number.isFinite(trade.total) ? trade.total : trade.quantity * trade.price;
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
                                                    <span className="text-xs text-muted-foreground">{time}</span>
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
                                    Card Holders ({holdersCount})
                                </h3>
                            </div>
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {holdersCount > 0
                                    ? `${holdersCount} people are supporting this athlete`
                                    : 'Be the first to support this athlete!'
                                }
                            </p>
                        </div>
                    </TabsContent>

                    {/* Globe Tab */}
                    <TabsContent value="globe" className="mt-4">
                        <Card className="border-white/10 bg-card/60">
                            <CardContent className="p-0">
                                <LockerGlobe
                                    athleteId={athlete.id}
                                    athleteName={athlete.name}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Trade Modal */}
            <MobileTradeModal
                open={tradeModalOpen}
                onOpenChange={setTradeModalOpen}
                athleteName={athlete.name}
                athleteSlug={athlete.slug}
                mode={tradeMode}
                currentPrice={athlete.price}
                supply={athlete.supply}
                reserve={athlete.reserve}
                userBalance={userBalance}
                userTokens={userHoldings}
                onConfirm={handleTradeConfirm}
                isPending={isTradePending}
                isSelfBuy={isSelfBuy}
            />

            {/* Group Chat Sheet */}
            <Sheet open={showChat} onOpenChange={setShowChat}>
                <SheetContent side="right" className="w-full sm:max-w-lg p-0">
                    <SheetHeader className="px-4 py-3 border-b border-white/10">
                        <SheetTitle>Inner Circle Chat</SheetTitle>
                    </SheetHeader>
                    <div className="h-[calc(100vh-60px)]">
                        <TokengatedChat
                            athleteId={athlete.id}
                            athleteName={athlete.name}
                            userHoldings={userHoldings}
                            onBuyClick={handleBuyClick}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* DM Sheet */}
            <Sheet open={showDM} onOpenChange={setShowDM}>
                <SheetContent side="right" className="w-full sm:max-w-lg p-0">
                    <SheetHeader className="px-4 py-3 border-b border-white/10">
                        <SheetTitle>Message {athlete.name}</SheetTitle>
                    </SheetHeader>
                    <div className="h-[calc(100vh-60px)]">
                        <LockerMessages
                            athleteId={athlete.id}
                            athleteName={athlete.name}
                            mode="embedded"
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
