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
import { useAthleteHolderCounts } from '@/hooks/useAthleteHolderCounts';
import { priceAt, costToBuy, payoutToSell, FEE, type Curve } from '@/utils/pricing';
import type { Post } from '@/types';
import ProofOfSweat from '@/components/ProofOfSweat';
import TokengatedChat from '@/components/TokengatedChat';
import WorkoutPosts from '@/components/WorkoutPosts';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import { LockerGate } from '@/components/myathlete/LockerGate';
import { LockerView, type LockerTab } from '@/pages/MyAthlete/LockerView';
import { LockerMessages } from '@/components/myathlete/LockerMessages';
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
import { getWindowUTC } from '@/lib/charting/engine';
import type { Athlete, Workout } from '@/types';
import type { WorkoutMutationResult } from '@/hooks/useWorkouts';
import { useChartPosts } from '@/hooks/useChartPosts';
import { usePriceSeries } from '@/hooks/usePriceSeries';

import { AthleteHero } from '@/components/athlete/AthleteHero';
import { AthleteIdentityCard } from '@/components/identity';
import { MobileAthleteProfile } from '@/pages/AthleteDetail/MobileAthleteProfile';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useIdentityKernel } from '@/hooks/useIdentityKernel';
import { DatePickerWithRange } from '@/components/DatePickerWithRange';
import { DateRange } from 'react-day-picker';
import { useWorkouts } from '@/hooks/useWorkouts';

const AthletePriceChart = lazy(() => import('@/components/charts/AthletePriceChart'));


type TimeRange = '7d' | '30d' | 'all';

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
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'locker'>('overview');
  const [lockerInitialTab, setLockerInitialTab] = useState<LockerTab>('workouts');
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const timeRanges: TimeRange[] = ['7d', '30d', 'all'];
  const tradeSectionRef = useRef<HTMLDivElement | null>(null);
  const chatSectionRef = useRef<HTMLDivElement | null>(null);

  const { data: athlete, isLoading: athleteLoading } = useAthlete(slug!);
  const { data: wallet, isLoading: walletLoading, connect } = useWallet();
  const { data: trades, isLoading: tradesLoading } = useTrades(athlete?.id, {
    enabled: Boolean(athlete?.id),
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Filter workouts based on date range
  // Fetch workouts with date range filter
  const {
    workouts: lockerWorkouts,
    isLoading: isWorkoutsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useWorkouts(athlete?.id, {
    startDate: dateRange?.from,
    endDate: dateRange?.to ? new Date(dateRange.to.getTime() + 86400000) : (dateRange?.from ? new Date(dateRange.from.getTime() + 86400000) : undefined),
  });

  const filteredWorkouts = useMemo(() => {
    return lockerWorkouts?.map(w => w.workout).filter((w): w is Workout => w !== null) || [];
  }, [lockerWorkouts]);

  const filteredPosts = useMemo(() => {
    return lockerWorkouts?.map(w => ({
      id: w.id,
      created_at: w.createdAt,
      author_id: athlete?.id || '',
      workout_json: w.workout,
      image_url: w.imageUrl,
      text: w.notes,
      token_gated: w.visibility !== 'public',
      strava_activity_id: w.stravaActivityId,
      visibility: w.visibility,
      min_tokens_required: w.minTokensRequired,
      is_pinned: w.isPinned,
      strava_map_polyline: w.stravaMapPolyline,
      // Location fields
      location_city: w.locationCity,
      location_country: w.locationCountry,
      location_country_code: w.locationCountryCode,
      location_lat: w.locationLat,
      location_lng: w.locationLng,
    } as Post)) || [];
  }, [lockerWorkouts, athlete?.id]);
  const tradeMutation = useTrade();
  const isMobile = !useMediaQuery('(min-width: 480px)', true);
  const { data: identityKernel } = useIdentityKernel(athlete?.id);
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

  const latestPricePoint = useMemo(() => {
    if (!athlete) return null;
    if (!Number.isFinite(athlete.price)) return null;
    const parsed = athlete.priceUpdatedAt ? Date.parse(athlete.priceUpdatedAt) : Number.NaN;
    const timestamp = Number.isFinite(parsed) ? parsed : Date.now();
    return { price: athlete.price, t: timestamp };
  }, [athlete]);

  const fallbackTimestamp = useMemo(() => {
    if (!athlete?.priceUpdatedAt) return null;
    const parsed = Date.parse(athlete.priceUpdatedAt);
    return Number.isFinite(parsed) ? parsed : null;
  }, [athlete?.priceUpdatedAt]);
  const {
    data: priceSeries = [],
    isLoading: priceSeriesLoading,
  } = usePriceSeries(athlete?.id, timeRange, {
    fallbackPrice: latestPricePoint?.price ?? athlete?.price ?? null,
    fallbackTimestamp: fallbackTimestamp ?? latestPricePoint?.t ?? null,
  });
  const chartWindow = useMemo(() => getWindowUTC(timeRange), [timeRange]);
  const {
    data: chartPosts = [],
    isLoading: isLoadingChartPosts,
    isFetching: isFetchingChartPosts,
  } = useChartPosts(athlete?.id, chartWindow.start);

  const chartPoints = useMemo(() => priceSeries, [priceSeries]);
  const hasRealTrades = useMemo(() => priceSeries.some((point) => !point.carried), [priceSeries]);
  const displayChartPoints = chartPoints;

  const formatXAxisTick = useCallback((value: number) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, []);

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
  const walletMonBalance = Number.isFinite(wallet?.mon) ? wallet.mon : 0;

  const canTrade =
    !isSelfBuy &&
    quantity > 0 &&
    !quantityError &&
    impact &&
    wallet &&
    athlete &&
    (tradeType === 'buy' ? walletMonBalance >= impact.total : position && position.quantity >= quantity);

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

  const updateAthleteCache = useCallback(
    (mutator: (prev: Athlete) => Athlete) => {
      if (!slug) return;
      queryClient.setQueryData<Athlete | null>(['athlete', slug], (current) => {
        if (!current) return current;
        return mutator(current);
      });
    },
    [queryClient, slug],
  );

  const handleWorkoutCreated = useCallback(
    async (result: WorkoutMutationResult) => {
      updateAthleteCache((prev) => {
        const workoutData = result.workout.workout;
        const nextWorkouts = workoutData
          ? [workoutData, ...prev.workouts.filter((item) => item.id !== workoutData.id)]
          : prev.workouts;
        const nextPosts = [result.post, ...prev.posts.filter((post) => post.id !== result.post.id)];
        return {
          ...prev,
          workouts: nextWorkouts,
          posts: nextPosts,
        };
      });

      // Invalidate identity kernel so Aura Score updates
      await queryClient.invalidateQueries({
        queryKey: ['identity-kernel'],
      });
    },
    [queryClient, updateAthleteCache],
  );

  const handleWorkoutUpdated = useCallback(
    (result: WorkoutMutationResult) => {
      updateAthleteCache((prev) => {
        const updatedWorkout = result.workout.workout;
        const nextWorkouts = updatedWorkout
          ? prev.workouts.map((item) => (item.id === updatedWorkout.id ? { ...item, ...updatedWorkout } : item))
          : prev.workouts;
        const nextPosts = prev.posts.map((post) => (post.id === result.post.id ? result.post : post));
        return {
          ...prev,
          workouts: nextWorkouts,
          posts: nextPosts,
        };
      });
    },
    [updateAthleteCache],
  );

  const handleWorkoutDeleted = useCallback(
    (workoutId: string) => {
      updateAthleteCache((prev) => ({
        ...prev,
        workouts: prev.workouts.filter((workout) => workout.id !== workoutId),
        posts: prev.posts.filter((post) => post.id !== workoutId),
      }));
    },
    [updateAthleteCache],
  );

  const isOwnProfile = user?.id === athlete?.id;

  // Fetch holders count from holdings table (covers both on-chain and off-chain trades)
  const athleteIdArr = useMemo(() => athlete?.id ? [athlete.id] : [], [athlete?.id]);
  const { data: holderCountsMap } = useAthleteHolderCounts(athleteIdArr);
  const holdersCount = athlete?.id ? (holderCountsMap?.[athlete.id] ?? 0) : 0;

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

  // Trade handler for mobile profile
  const handleMobileTrade = useCallback(async (athleteId: string, quantity: number, side: 'BUY' | 'SELL') => {
    if (!wallet && connect) {
      connect();
      return;
    }
    if (!athlete) return;
    await tradeMutation.mutateAsync({
      athleteId,
      athleteSlug: athlete.slug,
      quantity,
      side,
    });
  }, [athlete, tradeMutation, wallet, connect]);

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

      <div className="space-y-8">
        {/* Hero Section with Aura Card */}
        <AthleteHero
          athlete={athlete}
          auraCard={<AthleteIdentityCard athleteId={athlete.id} />}
        />

        {/* Chart Section */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">Price History</CardTitle>
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80 min-h-64 sm:min-h-80 w-full">
              <Suspense fallback={<ChartSkeleton className="h-full" />}>
                <AthletePriceChart
                  chartPoints={displayChartPoints}
                  hasRealTrades={hasRealTrades}
                  timeRange={timeRange}
                  formatXAxisTick={formatXAxisTick}
                  formatTooltipLabel={formatTooltipLabel}
                  isLoading={priceSeriesLoading || isLoadingChartPosts}
                  isFetching={isFetchingChartPosts}
                  posts={chartPosts}
                  syncId="athlete-detail-chart"
                />
              </Suspense>
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
                                setQuantityError("Maximum quantity is 1,000 Cards per trade");
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
                                setQuantityError("Maximum quantity is 1,000 Cards per trade");
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
                            Athletes cannot buy their own Cards.
                          </p>
                        ) : impact && wallet && (
                          <p className="mb-2 text-xs text-muted-foreground">
                            {tradeType === 'buy'
                              ? `You can buy up to ${Math.floor(walletMonBalance / impact.avgPrice)} Cards with your balance`
                              : position
                                ? `You have ${position.quantity} Card${position.quantity !== 1 ? 's' : ''}`
                                : "You don't own any Cards"}
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
                              <span className="font-medium">{impact.oldPrice.toFixed(4)} MON</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">New Price</span>
                              <span className="font-medium">{impact.newPrice.toFixed(4)} MON</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Fill Price</span>
                              <span className="font-medium">{impact.avgPrice.toFixed(4)} MON</span>
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
                                {((impact.newPrice * impact.newSupply) / 1000).toFixed(2)}k MON
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-border pt-2 space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span className="font-medium">{impact.subtotal.toFixed(2)} MON</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Fee (1.5% → Athlete)</span>
                              <span className="text-muted-foreground">{(impact.fee / 2).toFixed(2)} MON</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Fee (1.5% → Treasury)</span>
                              <span className="text-muted-foreground">{(impact.fee / 2).toFixed(2)} MON</span>
                            </div>
                            <div className="flex justify-between border-t border-border pt-2 font-bold">
                              <span>Total {tradeType === 'buy' ? 'Cost' : 'Proceeds'}</span>
                              <span>{impact.total.toFixed(2)} MON</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Wallet Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Your MON</span>
                          <span className="font-medium">{walletMonBalance.toFixed(2)} MON</span>
                        </div>
                        {position && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Your Cards</span>
                              <span className="font-medium">{position.quantity.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Cost</span>
                              <span className="font-medium">{position.avgCost.toFixed(2)} MON</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Unrealized P&L</span>
                              <span className={`font-medium ${position.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {position.pnl.toFixed(2)} MON ({position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        disabled={(!wallet && !connect) || (wallet && (!canTrade || tradeMutation.isPending))}
                        onClick={!wallet && connect ? connect : handleTrade}
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
                                    ? walletMonBalance < impact.total
                                      ? `Need ${(impact.total - walletMonBalance).toFixed(2)} more MON`
                                      : `Buy for ${impact.total.toFixed(2)} MON`
                                    : !position || position.quantity < quantity
                                      ? `Need ${quantity - (position?.quantity || 0)} more Card${quantity - (position?.quantity || 0) !== 1 ? 's' : ''}`
                                      : `Sell for ${impact.total.toFixed(2)} MON`
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
                <div className="flex justify-end mb-2">
                  <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
                <ProofOfSweat
                  workouts={filteredWorkouts}
                  posts={filteredPosts}
                  athleteId={athlete.id}
                  athleteName={athlete.name}
                  athleteHandle={athlete.slug}
                  athleteAvatar={athlete.avatar}
                  viewerHoldings={userHoldings}

                  onUnlock={async () => {
                    await tradeMutation.mutateAsync({
                      athleteId: athlete.id,
                      athleteSlug: athlete.slug,
                      quantity: 1,
                      side: 'BUY',
                    });
                  }}
                  onWorkoutDeleted={handleWorkoutDeleted}
                  onWorkoutUpdated={handleWorkoutUpdated}
                  onConnectStrava={isOwnProfile ? () => navigate('/my-athlete') : undefined}
                />

                {hasNextPage && (
                  <div className="flex justify-center py-6">
                    <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
                      {isFetchingNextPage ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}

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
                        {trade.quantity.toFixed(2)} Cards @ ${trade.price.toFixed(2)}
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
      onSuccess={handleWorkoutCreated}
    />
  );

  const addProofOfSweatModal =
    isOwnProfile && user ? (
      <AddWorkoutModal
        open={addWorkoutOpen}
        onOpenChange={setAddWorkoutOpen}
        athleteId={user.id}
        onSuccess={(result) => {
          handleWorkoutCreated(result);
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
              ariaLabel: 'Buy Athlete Card',
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
              ariaLabel: 'Sell Athlete Card',
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

  // Non-own profile: show mobile view on small screens, desktop on larger
  if (isMobile) {
    return (
      <MobileAthleteProfile
        athlete={athlete}
        priceSeries={priceSeries}
        trades={athleteTrades}
        position={position}
        userBalance={walletMonBalance}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onBack={() => navigate(-1)}
        onTrade={handleMobileTrade}
        isTradePending={tradeMutation.isPending}
        isLoading={showInitialSkeleton}
        holdersCount={holdersCount}
        auraScore={identityKernel?.auraScore}
        auraBreakdown={identityKernel?.scoreBreakdown}
        streak={identityKernel?.streak}
        userId={user?.id}
      />
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
