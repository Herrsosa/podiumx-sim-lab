import { lazy, Suspense, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Plus, Minus, Edit, ShoppingCart, TrendingDown, MessageCircle, Activity, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAthlete } from '@/hooks/useAthlete';
import { useWallet } from '@/hooks/useWallet';
import { useTrades } from '@/hooks/useTrades';
import { useTrade } from '@/hooks/useTrade';
import { useAthleteTradeHistory } from '@/hooks/useAthleteTradeHistory';
import { priceAt, costToBuy, payoutToSell, FEE, type Curve } from '@/utils/pricing';
import ProofOfSweat from '@/components/ProofOfSweat';
import TokengatedChat from '@/components/TokengatedChat';
import WorkoutPosts from '@/components/WorkoutPosts';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import { LockerGate } from '@/components/myathlete/LockerGate';
import { LockerView, type LockerTab } from '@/pages/MyAthlete/LockerView';
import LockerMessages from '@/components/myathlete/LockerMessages';
import { useQueryClient } from '@tanstack/react-query';
import AthleteDetailSkeleton from '@/components/skeletons/AthleteDetailSkeleton';
import { ChartSkeleton } from '@/components/ui/skeletons';
import { SectionTitle, Body, Small } from '@/components/ui/typography';
import { formatMoney, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getAvatarAsset, resolveAvatarUrl } from '@/utils/avatar';
import { useUser } from '@/store/auth';
import { MobileActionBar } from '@/components/MobileActionBar';
import { OptimizedImage } from '@/components/OptimizedImage';
import { SelfMobileProfile } from '@/pages/AthleteDetailSelfMobile';
import { fillPriceGaps } from '@/utils/chartData';

const AthletePriceChart = lazy(() => import('@/components/charts/AthletePriceChart'));


type TimeRange = '24h' | '7d' | '30d' | 'all';

export default function AthleteDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const user = useUser();
  const queryClient = useQueryClient();
  
  // All hooks must be called before any conditional returns
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [, setShowTradeModal] = useState(false);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'locker'>('overview');
  const [lockerInitialTab, setLockerInitialTab] = useState<LockerTab>('workouts');
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const timeRanges: TimeRange[] = ['24h', '7d', '30d', 'all'];
  const tradeSectionRef = useRef<HTMLDivElement | null>(null);
  const chatSectionRef = useRef<HTMLDivElement | null>(null);
  
  const { data: athlete, isLoading: athleteLoading } = useAthlete(slug!);
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: trades, isLoading: tradesLoading } = useTrades(athlete?.id, {
    enabled: Boolean(athlete?.id),
  });
  const tradeMutation = useTrade();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  useEffect(() => {
    setInitialLoadComplete(false);
  }, [slug]);


  const position = useMemo(() => {
    if (!athlete?.id || !wallet) return null;
    return wallet.positions[athlete.id] || null;
  }, [athlete?.id, wallet]);

  const athleteTrades = useMemo(() => {
    if (!trades || !athlete?.id) return [];
    return trades.filter((t) => t.athleteId === athlete.id).slice(0, 100);
  }, [trades, athlete?.id]);

  // Fetch real trade history data
  const { data: tradeHistory, isLoading: historyLoading } = useAthleteTradeHistory(athlete?.id, timeRange);

  const rawChartData = useMemo(() => {
    if (!tradeHistory?.data || tradeHistory.data.length === 0) {
      return [];
    }

    return tradeHistory.data
      .map((point) => {
        const t = new Date(point.timestamp).getTime();
        if (!Number.isFinite(t)) {
          return null;
        }
        return {
          t,
          price: point.price,
        };
      })
      .filter((point): point is { t: number; price: number } => point !== null);
  }, [tradeHistory]);

  const chartPoints = useMemo(() => {
    if (!athlete?.price) return [];
    
    // Convert rawChartData to trade format for gap filling
    const tradeFormat = rawChartData.map(point => ({
      created_at: new Date(point.t).toISOString(),
      timestamp: point.t,
      price_after: point.price,
    }));
    
    // Use fillPriceGaps to ensure continuous data
    return fillPriceGaps(tradeFormat, athlete.price, timeRange);
  }, [rawChartData, athlete?.price, timeRange]);

  const hasRealTrades = (tradeHistory?.volume ?? 0) > 0 || rawChartData.length > 1;
  const displayChartPoints = chartPoints;

  const formatXAxisTick = useCallback(
    (value: number) => {
      const date = new Date(value);
      if (timeRange === '24h') {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
      }

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    },
    [timeRange]
  );

  const formatTooltipLabel = useCallback((value: number) => {
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const impact = useMemo(() => {
    if (!athlete || quantity <= 0) return null;
    
    // Get curve parameters from athlete token (use defaults if not available)
    const curve: Curve = {
      a: 0.0002,
      b: 0.02,
      c: 1,
    };
    
    const oldPrice = priceAt(athlete.supply, curve);
    
    if (tradeType === 'buy') {
      const grossCost = costToBuy(athlete.supply, quantity, curve);
      const fee = grossCost * FEE;
      const total = grossCost + fee;
      const newSupply = athlete.supply + quantity;
      const newPrice = priceAt(newSupply, curve);
      const avgPrice = grossCost / quantity;
      const priceImpact = ((newPrice - oldPrice) / oldPrice) * 100;
      const newReserve = athlete.reserve + grossCost;
      
      return {
        oldPrice,
        newPrice,
        avgPrice,
        priceImpact,
        quantity,
        subtotal: grossCost,
        fee,
        total,
        newSupply,
        newReserve,
      };
    } else {
      const grossPayout = payoutToSell(athlete.supply, quantity, curve);
      const fee = grossPayout * FEE;
      const total = grossPayout - fee;
      const newSupply = Math.max(0, athlete.supply - quantity);
      const newPrice = priceAt(newSupply, curve);
      const avgPrice = grossPayout / quantity;
      const priceImpact = -Math.abs(((newPrice - oldPrice) / oldPrice) * 100);
      const newReserve = Math.max(0, athlete.reserve - grossPayout);
      
      return {
        oldPrice,
        newPrice,
        avgPrice,
        priceImpact,
        quantity,
        subtotal: grossPayout,
        fee,
        total,
        newSupply,
        newReserve,
      };
    }
  }, [tradeType, quantity, athlete]);

  const isSelfBuy = user?.id === athlete?.id && tradeType === 'buy';

  const canTrade = 
    !isSelfBuy &&
    quantity > 0 && 
    !quantityError &&
    impact && 
    wallet &&
    athlete &&
    (tradeType === 'buy' ? wallet.usdc >= impact.total : position && position.quantity >= quantity);

  const userHoldings = position?.quantity || 0;

  const handleTrade = async () => {
    if (isSelfBuy) {
      return;
    }
    if (!canTrade || !athlete || !impact) return;
    // Possible spot for optimistic updates if we wire in a client-side store
    await tradeMutation.mutateAsync({
      athleteId: athlete.id,
      athleteSlug: athlete.slug,
      quantity,
      side: tradeType === 'buy' ? 'BUY' : 'SELL',
    });
    
    setQuantity(1);
    setShowTradeModal(false);
  };

  const handleWorkoutSuccess = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['athlete', slug] });
  }, [queryClient, slug]);

  const isOwnProfile = user?.id === athlete?.id;

  const isBootstrapping = athleteLoading || walletLoading || tradesLoading;

  const scrollToTrade = useCallback(
    (type: 'buy' | 'sell') => {
      setTradeType(type);
      setTimeout(() => {
        tradeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    },
    [],
  );

  const scrollToChat = useCallback(() => {
    if (!isOwnProfile) {
      setLockerInitialTab('messages');
      setActiveTab('locker');
      return;
    }

    setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [isOwnProfile, setActiveTab, setLockerInitialTab]);

  useEffect(() => {
    if (activeTab === 'overview') {
      setLockerInitialTab('workouts');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isBootstrapping && !initialLoadComplete) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      setInitialLoadComplete(true);
    }
  }, [initialLoadComplete, isBootstrapping]);

  const showInitialSkeleton = !initialLoadComplete && isBootstrapping;

  // Now check loading and not found states
  if (showInitialSkeleton) {
    return <AthleteDetailSkeleton />;
  }

  if (!athlete) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Athlete not found</h1>
        <Button onClick={() => navigate('/')}>Back to Marketplace</Button>
      </div>
    );
  }

  const desktopContent = (
    <div className="container mx-auto px-4 pb-32 pt-8 md:pb-8 overflow-x-hidden">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Profile */}
        <Card className="glass-card">
          <CardContent className="p-6">
            {/* Instagram-style profile picture */}
            <div className="relative mx-auto mb-4 h-32 w-32">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-1">
                <div className="h-full w-full rounded-full bg-background p-1">
                  <OptimizedImage
                    src={resolveAvatarUrl(athlete.avatar, { size: 160 })}
                    webpSrc={getAvatarAsset(athlete.avatar)?.webp}
                    alt={athlete.name}
                    width={160}
                    height={160}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              </div>
            </div>
            <SectionTitle className="mb-2 text-center text-2xl">{athlete.name}</SectionTitle>
            <div className="mb-4 flex justify-center">
              <Badge>{athlete.sport}</Badge>
            </div>
            <Body className="mb-4 text-center text-sm text-muted-foreground">{athlete.bio}</Body>
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{athlete.location}</span>
              </div>
              {athlete.socials.instagram && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instagram</span>
                  <span className="font-medium">{athlete.socials.instagram}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Center: Chart & Stats */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">Price Chart</CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Time Range Selector */}
                <div className="flex gap-1 rounded-lg border border-border p-1 w-full sm:w-auto">
                  {timeRanges.map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTimeRange(range)}
                      className="h-7 text-xs flex-1 sm:flex-none"
                    >
                      {range === 'all' ? 'All' : range}
                    </Button>
                  ))}
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <SectionTitle className="text-2xl sm:text-3xl">{formatMoney(athlete.price)}</SectionTitle>
                  <Small
                    className={cn(
                      'font-semibold',
                      athlete.change24h >= 0 ? 'text-success' : 'text-destructive'
                    )}
                  >
                    {athlete.change24h >= 0 ? '+' : ''}
                    {formatNumber(athlete.change24h)}% 24h
                  </Small>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chart */}
            <div className="h-48 sm:h-64">
              <Suspense fallback={<ChartSkeleton className="h-full" />}>
                <AthletePriceChart
                  chartPoints={displayChartPoints}
                  hasRealTrades={hasRealTrades}
                  timeRange={timeRange}
                  formatXAxisTick={formatXAxisTick}
                  formatTooltipLabel={formatTooltipLabel}
                  isLoading={historyLoading}
                  posts={athlete.posts}
                />
              </Suspense>
            </div>

            {/* Stats - Compact list style below chart */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Stats</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{formatMoney(athlete.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">24h Vol</span>
                  <span className="font-medium">{formatMoney(athlete.volume24h)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-medium">{formatMoney(athlete.marketCap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supply</span>
                  <span className="font-medium">{formatNumber(athlete.supply)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reserve</span>
                  <span className="font-medium">{formatMoney(athlete.reserve)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">24h Change</span>
                  <span className={`font-medium ${athlete.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {athlete.change24h >= 0 ? '+' : ''}{formatNumber(athlete.change24h)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'locker')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="locker">Locker</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Trade Panel */}
              <Card className="glass-card" ref={tradeSectionRef}>
                <CardHeader>
                  <CardTitle>Trade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!user ? (
                    <div className="text-center space-y-4 py-8">
                      <p className="text-muted-foreground">Sign up to start trading</p>
                      <Button onClick={() => navigate('/auth')} className="w-full">
                        Sign Up to Trade
                      </Button>
                    </div>
                  ) : (
                    <>
                  <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="buy">Buy</TabsTrigger>
                      <TabsTrigger value="sell">Sell</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Quantity Input */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">Quantity</label>
                    <div className="flex gap-2 mb-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newQty = Math.max(1, quantity - 1);
                          setQuantity(newQty);
                          setQuantityError(null);
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        value={quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          
                          // Allow empty input temporarily
                          if (value === '') {
                            setQuantity(1);
                            setQuantityError("Minimum quantity is 1");
                            return;
                          }
                          
                          const parsed = parseInt(value);
                          
                          if (isNaN(parsed)) {
                            setQuantityError("Please enter a valid number");
                            return;
                          }
                          
                          if (value.includes('.')) {
                            setQuantityError("Quantity must be a whole number");
                            return;
                          }
                          
                          if (parsed < 1) {
                            setQuantityError("Minimum quantity is 1");
                            setQuantity(1);
                            return;
                          }
                          
                          if (parsed > 1000) {
                            setQuantityError("Maximum quantity is 1,000 tokens per trade");
                            return;
                          }
                          
                          setQuantityError(null);
                          setQuantity(parsed);
                        }}
                        className={`text-center ${quantityError ? 'border-destructive' : ''}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newQty = quantity + 1;
                          if (newQty > 1000) {
                            setQuantityError("Maximum quantity is 1,000 tokens per trade");
                            return;
                          }
                          setQuantity(newQty);
                          setQuantityError(null);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Validation error or helper text */}
                    {quantityError ? (
                      <p className="mb-2 text-xs text-destructive">{quantityError}</p>
                    ) : isSelfBuy ? (
                      <p className="mb-2 text-xs text-muted-foreground">
                        Athletes cannot buy their own tokens.
                      </p>
                    ) : impact && wallet && (
                      <p className="mb-2 text-xs text-muted-foreground">
                        {tradeType === 'buy' 
                          ? `You can buy up to ${Math.floor(wallet.usdc / impact.avgPrice)} tokens with your balance`
                          : position 
                            ? `You have ${position.quantity} token${position.quantity !== 1 ? 's' : ''}`
                            : "You don't own any tokens"}
                      </p>
                    )}
                    
                    {/* Quick quantity buttons */}
                    <div className="flex gap-2">
                      {[1, 5, 10].map((q) => (
                        <Button
                          key={q}
                          variant={quantity === q ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setQuantity(q);
                            setQuantityError(null);
                          }}
                          className="flex-1"
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Impact Preview */}
                  {impact && (
                    <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Price</span>
                          <span className="font-medium">${impact.oldPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Price</span>
                          <span className="font-medium">${impact.newPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Fill Price</span>
                          <span className="font-medium">${impact.avgPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Price Impact</span>
                          <span
                            className={
                              Math.abs(impact.priceImpact) > 5
                                ? 'font-medium text-destructive'
                                : 'font-medium text-muted-foreground'
                            }
                          >
                            {impact.priceImpact > 0 ? '+' : ''}
                            {impact.priceImpact.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Market Cap</span>
                          <span className="font-medium">
                            ${((impact.newPrice * impact.newSupply) / 1000).toFixed(2)}k
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-border pt-2 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="font-medium">${impact.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Fee (1.5% → Athlete)</span>
                          <span className="text-muted-foreground">${(impact.fee / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Fee (1.5% → Treasury)</span>
                          <span className="text-muted-foreground">${(impact.fee / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 font-bold">
                          <span>Total {tradeType === 'buy' ? 'Cost' : 'Proceeds'}</span>
                          <span>${impact.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wallet Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your USDC</span>
                      <span className="font-medium">${wallet?.usdc.toFixed(2) || '0.00'}</span>
                    </div>
                    {position && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Your Tokens</span>
                          <span className="font-medium">{position.quantity.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Cost</span>
                          <span className="font-medium">${position.avgCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Unrealized P&L</span>
                          <span className={`font-medium ${position.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${position.pnl.toFixed(2)} ({position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    disabled={!canTrade || tradeMutation.isPending}
                    onClick={handleTrade}
                  >
                    {tradeMutation.isPending
                      ? 'Processing...'
                      : !wallet
                      ? 'Connect Wallet'
                      : !impact
                      ? 'Enter Quantity'
                      : quantityError
                      ? 'Invalid Quantity'
                      : isSelfBuy
                      ? 'Self-purchase not allowed'
                      : tradeType === 'buy'
                      ? wallet.usdc < impact.total
                        ? `Need $${(impact.total - wallet.usdc).toFixed(2)} more USDC`
                        : `Buy for $${impact.total.toFixed(2)}`
                      : !position || position.quantity < quantity
                      ? `Need ${quantity - (position?.quantity || 0)} more token${quantity - (position?.quantity || 0) !== 1 ? 's' : ''}`
                      : `Sell for $${impact.total.toFixed(2)}`
                    }
                  </Button>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full gap-2">
                          <Info className="h-4 w-4" />
                          What is this curve?
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          This uses a quadratic bonding curve where Price = (Supply²) / K. As more
                          tokens are bought, the price increases exponentially. This is a simulation
                          for educational purposes only.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  </>
                  )}
                </CardContent>
              </Card>

              {/* Proof of Sweat & Training */}
              <div className="lg:col-span-2 space-y-6">
                <ProofOfSweat
                  workouts={athlete.workouts} 
                  posts={athlete.posts || []}
                  athleteId={athlete.id}
                  athleteName={athlete.name}
                  viewerHoldings={userHoldings}
                  onUnlock={async () => {
                    await tradeMutation.mutateAsync({
                      athleteId: athlete.id,
                      athleteSlug: athlete.slug,
                      quantity: 1,
                      side: 'BUY',
                    });
                  }}
                  onWorkoutDeleted={handleWorkoutSuccess}
                  onConnectStrava={isOwnProfile ? () => navigate('/my-athlete') : undefined}
                />
                
                {isOwnProfile && (
                  <>
                    {/* Workout Posts Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Training Feed</h2>
                        <Button onClick={() => setShowAddWorkout(true)} size="sm" className="gap-2">
                          <Edit className="h-4 w-4" />
                          Add Workout
                        </Button>
                      </div>
                      <WorkoutPosts
                        athleteId={athlete.id}
                        userHoldings={userHoldings}
                        posts={athlete.posts || []}
                        isLoading={showInitialSkeleton}
                        onUnlockClick={async () => {
                          await tradeMutation.mutateAsync({
                            athleteId: athlete.id,
                            athleteSlug: athlete.slug,
                            quantity: 1,
                            side: 'BUY',
                          });
                        }}
                        onConnectStrava={() => navigate('/my-athlete')}
                      />
                    </div>

                    <div ref={chatSectionRef}>
                      <TokengatedChat
                        athleteId={athlete.id}
                        athleteName={athlete.name}
                        userHoldings={userHoldings}
                        onBuyClick={async () => {
                          await tradeMutation.mutateAsync({
                            athleteId: athlete.id,
                            athleteSlug: athlete.slug,
                            quantity: 1,
                            side: 'BUY',
                          });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Locker Tab */}
          <TabsContent value="locker">
            <LockerGate
              athleteId={athlete.id}
              athleteName={athlete.name}
              onBuyClick={() => {
                setActiveTab('overview');
                scrollToTrade('buy');
              }}
            >
              <LockerView 
                athleteId={athlete.id} 
                athleteName={athlete.name}
                athleteSlug={athlete.slug}
                initialTab={lockerInitialTab}
              />
            </LockerGate>
          </TabsContent>
        </Tabs>
      </div>

      {/* Trading Activity Feed */}
      <div className="mt-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {athleteTrades.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No trades yet
                </div>
              ) : (
                athleteTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.type === 'buy' ? 'default' : 'secondary'}>
                        {trade.type}
                      </Badge>
                      <span>
                        {trade.quantity.toFixed(2)} tokens @ ${trade.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${trade.total.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const sharedWorkoutModal = (
    <AddWorkoutModal
      open={showAddWorkout}
      onOpenChange={setShowAddWorkout}
      athleteId={athlete.id}
      onSuccess={handleWorkoutSuccess}
    />
  );

  const addProofOfSweatModal =
    isOwnProfile && user ? (
      <AddWorkoutModal
        open={addWorkoutOpen}
        onOpenChange={setAddWorkoutOpen}
        athleteId={user.id}
        onSuccess={() => {
          queryClient.refetchQueries({ queryKey: ['athlete', slug] });
          setAddWorkoutOpen(false);
        }}
      />
    ) : null;

  const mobileActionBar = (
    <MobileActionBar
      className={isOwnProfile ? 'max-[480px]:hidden' : undefined}
      actions={
        isOwnProfile
          ? [
              {
                id: 'add-pos',
                label: 'Add Proof of Sweat',
                icon: <Activity className="h-5 w-5" />,
                onPress: () => setAddWorkoutOpen(true),
                variant: 'primary',
                ariaLabel: 'Add proof of sweat workout',
              },
            ]
          : [
              {
                id: 'buy',
                label: 'Buy',
                icon: <TrendingUp className="h-4 w-4" />,
                onPress: () => {
                  setActiveTab('overview');
                  scrollToTrade('buy');
                },
                variant: 'primary',
                ariaLabel: 'Buy athlete tokens',
              },
              {
                id: 'sell',
                label: 'Sell',
                icon: <TrendingDown className="h-4 w-4" />,
                onPress: () => {
                  setActiveTab('overview');
                  scrollToTrade('sell');
                },
                variant: 'secondary',
                ariaLabel: 'Sell athlete tokens',
              },
              {
                id: 'message',
                label: 'Message',
                icon: <MessageCircle className="h-4 w-4" />,
                onPress: scrollToChat,
                variant: 'ghost',
                ariaLabel: 'Open community chat',
              },
            ]
      }
    />
  );

  if (isOwnProfile) {
    return (
      <>
        <div className="hidden max-[480px]:block">
          <SelfMobileProfile
            athlete={athlete}
            userHoldings={userHoldings}
            onAddProof={() => setAddWorkoutOpen(true)}
            onConnectStrava={() => navigate('/my-athlete')}
            isLoadingPosts={showInitialSkeleton}
            lockerInitialTab={lockerInitialTab}
            avatarUrl={resolveAvatarUrl(athlete.avatar, { size: 96 })}
            components={{
              workoutPosts: WorkoutPosts,
              tokengatedChat: TokengatedChat,
              lockerMessages: LockerMessages,
              lockerView: LockerView,
            }}
          />
        </div>
        <div className="max-[480px]:hidden">{desktopContent}</div>
        {sharedWorkoutModal}
        {addProofOfSweatModal}
        {mobileActionBar}
      </>
    );
  }

  return (
    <>
      {desktopContent}
      {sharedWorkoutModal}
      {addProofOfSweatModal}
      {mobileActionBar}
    </>
  );
}
