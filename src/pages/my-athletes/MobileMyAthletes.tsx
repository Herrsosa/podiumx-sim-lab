import { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Athlete, Workout, Post } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TimeRangeKey } from '@/utils/chartData';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProofOfSweat from '@/components/ProofOfSweat';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Activity, ArrowDownRight, ArrowUpRight, Plus, TrendingUp, MessageSquare, Dumbbell } from 'lucide-react';
import { MOBILE_TAB_KEYS } from './mobile-config';
import { ProfileDetailsCard } from '@/components/my-athlete/ProfileDetailsCard';
import type { EditableProfile } from '@/pages/my-athletes/types';
import ConnectXButton from '@/components/social/ConnectXButton';
import { useXConnection } from '@/hooks/useXConnection';
import { StravaCard } from '@/components/strava/StravaCard';
import { MobileActionBar } from '@/components/MobileActionBar';
import TokengatedChat from '@/components/TokengatedChat';
import LockerMessages from '@/components/myathlete/LockerMessages';
import LockerWorkouts from '@/components/myathlete/LockerWorkouts';
import { featureFlags } from '@/lib/config/featureFlags';
import AthletePriceChart from '@/components/charts/AthletePriceChart';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import { getWindowUTC } from '@/lib/charting/engine';
import { useChartPosts } from '@/hooks/useChartPosts';

interface LockerContentProps {
  athleteId: string;
  athleteName: string;
}

function LockerContent({ athleteId, athleteName }: LockerContentProps) {
  const [activeTab, setActiveTab] = useState<'workouts' | 'chat'>('workouts');

  return (
    <div className="flex flex-col">
      <div className="p-4 pb-0">
        <div className="flex p-1 bg-muted/30 rounded-full relative">
          {/* Animated Background Pill */}
          <div className="absolute inset-1 pointer-events-none">
            <div className="w-full h-full flex">
              <div className={cn("w-1/2 transition-all duration-300 ease-out", activeTab === 'chat' && "translate-x-full")} />
            </div>
          </div>

          <button
            onClick={() => setActiveTab('workouts')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-full relative z-10 transition-colors duration-200",
              activeTab === 'workouts' ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {activeTab === 'workouts' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-background rounded-full shadow-sm -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Dumbbell className="w-4 h-4" />
            Workouts
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-full relative z-10 transition-colors duration-200",
              activeTab === 'chat' ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {activeTab === 'chat' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-background rounded-full shadow-sm -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <MessageSquare className="w-4 h-4" />
            Team Chat
          </button>
        </div>
      </div>

      <div className="p-4 min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === 'workouts' ? (
            <motion.div
              key="workouts"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <LockerWorkouts />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TokengatedChat
                athleteId={athleteId}
                athleteName={athleteName}
                userHoldings={1}
                onBuyClick={() => { }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface MobileMyAthletesProps {
  athlete?: Athlete;
  workouts: Workout[];
  posts: Post[];
  priceSeries: PriceSeriesPoint[];
  hasRealTrades: boolean;
  trades?: Array<Record<string, unknown>>;
  onAddWorkout: () => void;
  editedProfile: EditableProfile;
  isEditingProfile: boolean;
  onStartEditProfile: () => void;
  onCancelEditProfile: () => void;
  onSaveProfile: () => void;
  onProfileFieldChange: (updates: Partial<EditableProfile>) => void;
  onAvatarSelect: (file: File | null) => void;
  savingProfile: boolean;
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  timeRange?: TimeRangeKey;
  onTimeRangeChange?: (range: TimeRangeKey) => void;
  onRefetchWorkouts?: () => void;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});


export default function MobileMyAthletes({
  athlete,
  workouts,
  posts,
  priceSeries,
  hasRealTrades,
  trades = [],
  onAddWorkout,
  editedProfile,
  isEditingProfile,
  onStartEditProfile,
  onCancelEditProfile,
  onSaveProfile,
  onProfileFieldChange,
  onAvatarSelect,
  savingProfile,
  isLoading = false,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
  timeRange = '7d',
  onTimeRangeChange,
  onRefetchWorkouts,
}: MobileMyAthletesProps) {
  const [activeTab, setActiveTab] = useState<(typeof MOBILE_TAB_KEYS)[number]>('overview');
  const [consoleTab, setConsoleTab] = useState<'personal' | 'locker'>('personal');
  const { isConnected: xConnected, loading: xLoading } = useXConnection();

  const chartRangeOptions = useMemo<TimeRangeKey[]>(() => {
    const ranges: TimeRangeKey[] = ['7d'];
    if (featureFlags.show30d) ranges.push('30d');
    if (featureFlags.showAll) ranges.push('all');
    return ranges;
  }, []);

  const safeChartRange = chartRangeOptions.includes(timeRange) ? timeRange : '7d';

  const chartWindow = useMemo(() => getWindowUTC(safeChartRange), [safeChartRange]);
  const chartStartDate = chartWindow.start;
  const {
    data: chartPosts = [],
    isLoading: isLoadingChartPosts,
    isFetching: isFetchingChartPosts,
  } = useChartPosts(athlete?.id, chartStartDate);

  const priceChange = athlete?.change24h ?? 0;
  const isPriceUp = priceChange >= 0;
  const PriceChangeIcon = isPriceUp ? ArrowUpRight : ArrowDownRight;

  const stickyHeaderContent = useMemo(() => {
    if (!athlete) return null;

    return (
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 ring-4 ring-primary/20">
          <AvatarImage src={athlete.avatar} alt={athlete.name} />
          <AvatarFallback>{athlete.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{athlete.name}</h1>
          <p className="text-sm text-muted-foreground">{athlete.sport}</p>
        </div>
      </div>
    );
  }, [athlete]);

  const latestWorkout = useMemo(() => {
    if (workouts.length === 0) return null;
    return workouts[0];
  }, [workouts]);

  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToContent = () => {
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const overviewContent = useMemo(() => {
    if (!athlete) return null;

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1
        }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 100,
          damping: 15
        }
      }
    };

    return (
      <motion.div
        className="space-y-4 pb-24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Market Stats Card */}
        <motion.div variants={itemVariants}>
          <Card className="border-white/5 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm relative overflow-hidden">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Market Stats</h3>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Price</p>
                  <p className="text-lg font-bold">{currencyFormatter.format(athlete.price ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">24h Change</p>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={isPriceUp ? 'default' : 'secondary'}
                      className={cn(
                        'gap-1',
                        isPriceUp ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
                      )}
                    >
                      <PriceChangeIcon className="h-3 w-3" />
                      {percentFormatter.format((priceChange || 0) / 100)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                  <p className="text-sm font-semibold">{currencyFormatter.format(athlete.marketCap ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Volume 24h</p>
                  <p className="text-sm font-semibold">{currencyFormatter.format(athlete.volume24h ?? 0)}</p>
                </div>
              </div>
            </CardContent>

            {/* Sparkline Chart Background */}
            <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceSeries}>
                  <defs>
                    <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPriceUp ? "#10b981" : "#f43f5e"} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={isPriceUp ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isPriceUp ? "#10b981" : "#f43f5e"}
                    strokeWidth={2}
                    fill="url(#sparklineGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <Card
            className="border-white/5 bg-card/60 backdrop-blur-sm cursor-pointer transition-all hover:bg-card/80 active:scale-95"
            onClick={() => {
              setConsoleTab('personal');
              onStartEditProfile();
              scrollToContent();
            }}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Settings</p>
              <p className="text-xs text-muted-foreground mt-1">Edit profile</p>
            </CardContent>
          </Card>

          <Card
            className="border-white/5 bg-card/60 backdrop-blur-sm cursor-pointer transition-all hover:bg-card/80 active:scale-95"
            onClick={() => {
              setConsoleTab('locker');
              scrollToContent();
            }}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Locker</p>
              <p className="text-xs text-muted-foreground mt-1">View workouts</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <Card className="border-white/5 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Profile</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sport</span>
                  <Badge variant="outline">{athlete.sport}</Badge>
                </div>
                {athlete.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{athlete.location}</span>
                  </div>
                )}
                {athlete.bio && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm">{athlete.bio}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Card */}
        <motion.div variants={itemVariants}>
          <Card className="border-white/5 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
              {latestWorkout ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{latestWorkout.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(latestWorkout.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {latestWorkout.distance && (
                      <div className="rounded bg-muted/40 px-2 py-1.5">
                        <p className="text-muted-foreground">Distance</p>
                        <p className="font-medium">{latestWorkout.distance} km</p>
                      </div>
                    )}
                    <div className="rounded bg-muted/40 px-2 py-1.5">
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{latestWorkout.duration} min</p>
                    </div>
                    <div className="rounded bg-muted/40 px-2 py-1.5">
                      <p className="text-muted-foreground">RPE</p>
                      <p className="font-medium">{latestWorkout.rpe}/10</p>
                    </div>
                  </div>
                  {latestWorkout.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{latestWorkout.notes}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No workouts yet</p>
                  <Button onClick={onAddWorkout} size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Log First Workout
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings/Locker Modal Content */}
        <div ref={contentRef} className="scroll-mt-20">
          {consoleTab === 'personal' && (
            <Card className="border-white/5 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <ProfileDetailsCard
                  variant="mobile"
                  className="shadow-none"
                  athlete={athlete}
                  editedProfile={editedProfile}
                  isEditing={isEditingProfile}
                  savingProfile={savingProfile}
                  onStartEdit={onStartEditProfile}
                  onCancelEdit={onCancelEditProfile}
                  onSave={onSaveProfile}
                  onFieldChange={onProfileFieldChange}
                  onAvatarSelect={onAvatarSelect}
                />
              </CardContent>
            </Card>
          )}

          {consoleTab === 'locker' && (
            <Card className="border-white/5 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                <LockerContent athleteId={athlete.id} athleteName={athlete.name} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* X.com Integration */}
        {
          !xLoading && !xConnected && (
            <Card className="border-white/5 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4 space-y-2">
                <h4 className="text-sm font-medium">X.com Integration</h4>
                <p className="text-xs text-muted-foreground">
                  Connect your X account to display your handle and increase credibility.
                </p>
                <ConnectXButton />
              </CardContent>
            </Card>
          )
        }
      </motion.div >
    );
  }, [
    athlete,
    consoleTab,
    editedProfile,
    isEditingProfile,
    onStartEditProfile,
    onCancelEditProfile,
    onSaveProfile,
    onProfileFieldChange,
    onAvatarSelect,
    savingProfile,
    onAddWorkout,
    latestWorkout,
    xConnected,
    xLoading,
    isPriceUp,
    priceChange,
    PriceChangeIcon,
    setConsoleTab,
    priceSeries,
  ]);

  if (!athlete) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 border-b bg-background/80 px-4 py-4 backdrop-blur">
          <Skeleton className="h-10 w-32" />
        </header>
        <main className="flex-1 space-y-4 px-4 py-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-4 backdrop-blur-xl">
        {stickyHeaderContent}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground/80">Current Price</span>
            <p className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {currencyFormatter.format(athlete.price ?? 0)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isPriceUp ? 'default' : 'secondary'}
              className={cn(
                'gap-1.5 px-3 py-1.5 text-sm font-semibold',
                isPriceUp
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
              )}
            >
              <PriceChangeIcon className="h-4 w-4" />
              {percentFormatter.format((priceChange || 0) / 100)}
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pb-24">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4 px-4 py-4">
          <TabsList className="grid w-full grid-cols-5 gap-1 rounded-2xl bg-muted/40 p-1">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
            <TabsTrigger value="trades" className="text-xs">Trades</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs">Posts</TabsTrigger>
            <TabsTrigger value="dm" className="text-xs">DM</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="min-w-0">
            {overviewContent}
          </TabsContent>

          <TabsContent value="chart" className="min-w-0 space-y-4">
            <Card>
              <CardContent className="p-4">
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
                      {featureFlags.show30d ? (
                        <TabsTrigger value="30d" className="flex-1">30D</TabsTrigger>
                      ) : null}
                      {featureFlags.showAll ? (
                        <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                      ) : null}
                    </TabsList>
                  </Tabs>
                )}

                {priceSeries.length === 0 ? (
                  <div className="space-y-3 p-6 text-center text-sm text-muted-foreground">
                    <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p>Add workouts and trades to see your progress charted here.</p>
                  </div>
                ) : (
                  <div className="h-[260px] w-full">
                    <AthletePriceChart
                      chartPoints={priceSeries}
                      hasRealTrades={hasRealTrades}
                      timeRange={safeChartRange}
                      formatXAxisTick={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      formatTooltipLabel={(value) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      isLoading={isLoading || isLoadingChartPosts}
                      isFetching={isFetchingChartPosts}
                      posts={chartPosts}
                      syncId="myathlete-chart"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">PoS Momentum</p>
                  <p className="text-muted-foreground">Keep logging workouts to push your Proof-of-Sweat higher.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades" className="min-w-0 space-y-4">
            {trades.length === 0 ? (
              <Card>
                <CardContent className="space-y-2 p-6 text-center text-sm text-muted-foreground">
                  <p>No trades yet. Share your profile to kickstart activity.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                {trades.map((trade, index) => {
                  const side = (trade.side as string) ?? 'buy';
                  const isBuy = side === 'buy';
                  const qty = Number(trade.qty ?? 0);
                  const gross = Number(trade.gross_amount ?? 0);
                  const price = Number(trade.price_after ?? 0);
                  const timestamp = typeof trade.created_at === 'string' ? new Date(trade.created_at) : new Date(Number(trade.created_at ?? Date.now()));

                  return (
                    <Card key={`${trade.id ?? index}`} className="border border-border/60">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant={isBuy ? 'default' : 'secondary'} className="uppercase">
                            {isBuy ? 'Buy' : 'Sell'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <Metric label="Quantity" value={`${qty}`} />
                          <Metric label="Price" value={currencyFormatter.format(price)} />
                          <Metric label="Notional" value={currencyFormatter.format(gross)} />
                          <Metric label="Fee" value={currencyFormatter.format(Number(trade.fee ?? 0))} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Workout Timeline</h2>
              <Button onClick={onAddWorkout} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : workouts.length === 0 ? (
              <Card>
                <CardContent className="space-y-4 p-6 text-center text-sm text-muted-foreground">
                  <p>No workouts yet. Add your first session to begin your Proof-of-Sweat streak.</p>
                  <Button onClick={onAddWorkout} className="w-full">
                    Log Workout
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <ProofOfSweat
                  athleteId={athlete.id}
                  athleteName={athlete.name}
                  workouts={workouts}
                  posts={posts}
                  viewerHoldings={Number.MAX_SAFE_INTEGER}
                  onWorkoutDeleted={() => { }}
                  onWorkoutUpdated={() => {
                    // Trigger a refetch to update the UI with the new image
                    if (onRefetchWorkouts) {
                      onRefetchWorkouts();
                    }
                  }}
                />
                {hasNextPage && (
                  <Button onClick={fetchNextPage} disabled={isFetchingNextPage} variant="outline" className="w-full">
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                )}
                <StravaCard className="mt-4" />
              </>
            )}
          </TabsContent>

          <TabsContent value="dm" className="min-w-0">
            <LockerMessages
              athleteId={athlete.id}
              athleteName={athlete.name}
              mode="embedded"
            />
          </TabsContent>
        </Tabs>
      </main>

      <MobileActionBar
        actions={[
          {
            id: 'add-pos',
            label: 'Add Proof of Sweat',
            icon: <Activity className="h-5 w-5" />,
            onPress: onAddWorkout,
            variant: 'primary',
            ariaLabel: 'Add proof-of-sweat workout',
          },
        ]}
      />
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string | number;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
