import React, { useState, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { Plus, TrendingUp, MessageSquare, DollarSign, Share2, Mail, Globe } from 'lucide-react';
import type { TimeRangeKey } from '@/utils/chartData';
import { formatNumber } from '@/lib/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EarningsSection } from '@/components/EarningsSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Athlete, Workout, Post } from '@/types';
import { useUser } from '@/store/auth';
import TokengatedChat from '@/components/TokengatedChat';
const LockerMessages = lazy(() => import('@/components/myathlete/LockerMessages').then(module => ({ default: module.LockerMessages })));
const LockerGlobe = lazy(() => import('@/components/myathlete/LockerGlobe').then(module => ({ default: module.LockerGlobe })));
import { useQueryClient } from '@tanstack/react-query';
import { ProfileDetailsCard } from '@/components/myathlete/ProfileDetailsCard';
import { ProfileStatsCard } from '@/components/myathlete/ProfileStatsCard';
import type { EditableProfile } from '@/pages/MyAthlete/mobile/types';
import ProofOfSweat from '@/components/ProofOfSweat';
import { StravaCard } from '@/components/strava/StravaCard';
import ConnectXButton from '@/components/social/ConnectXButton';
import { useXConnection } from '@/hooks/useXConnection';
import { Skeleton } from '@/components/ui/skeleton';
import type { AthleteTrade } from '@/hooks/useAthleteTrades';
import { featureFlags } from '@/lib/config/featureFlags';
import AthletePriceChart from '@/components/charts/AthletePriceChart';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import { getWindowUTC } from '@/lib/charting/engine';
import { useChartPosts } from '@/hooks/useChartPosts';
import { ShareChartModal } from '@/components/share/ShareChartModal';
import { DatePickerWithRange } from '@/components/DatePickerWithRange';
import { DateRange } from 'react-day-picker';
import { useWorkouts } from '@/hooks/useWorkouts';

interface PersonalConsoleProps {
  athlete?: Athlete;
  workouts: Workout[];
  posts: Post[];
  athleteTrades: AthleteTrade[];
  priceSeries: PriceSeriesPoint[];
  priceSeriesLoading?: boolean;
  editedProfile: EditableProfile;
  isEditing: boolean;
  savingProfile: boolean;
  onStartEditProfile: () => void;
  onCancelEditProfile: () => void;
  onSaveProfile: () => void;
  onProfileFieldChange: (updates: Partial<EditableProfile>) => void;
  onAvatarSelect: (file: File | null) => void;
  onWorkoutEdit: (workout: Workout) => void;
  onWorkoutDelete: (id: string) => void;
  onAddWorkout: () => void;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  timeRange?: TimeRangeKey;
  onTimeRangeChange?: (range: TimeRangeKey) => void;
  /** Optional Aura Score card to render alongside the profile (desktop only) */
  auraCard?: React.ReactNode;
  /** Callback to navigate to the Inner Circle tab (for Group Chat/DMs buttons) */
  onNavigateToInnerCircle?: () => void;
}

export function PersonalConsole({
  athlete,
  workouts,
  posts,
  athleteTrades,
  priceSeries,
  priceSeriesLoading = false,
  editedProfile,
  isEditing,
  savingProfile,
  onStartEditProfile,
  onCancelEditProfile,
  onSaveProfile,
  onProfileFieldChange,
  onAvatarSelect,
  onWorkoutEdit,
  onWorkoutDelete,
  onAddWorkout,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
  timeRange: externalTimeRange,
  onTimeRangeChange,
  auraCard,
  onNavigateToInnerCircle,
}: PersonalConsoleProps) {
  const user = useUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'workouts' | 'community' | 'messages' | 'earnings'>('workouts');
  const [chartShareOpen, setChartShareOpen] = useState(false);
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const [dmsOpen, setDmsOpen] = useState(false);
  const [globeOpen, setGlobeOpen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const availableRanges = useMemo<TimeRangeKey[]>(() => {
    const ranges: TimeRangeKey[] = ['7d'];
    if (featureFlags.show30d) ranges.push('30d');
    if (featureFlags.showAll) ranges.push('all');
    return ranges;
  }, []);

  const [internalTimeRange, setInternalTimeRange] = useState<TimeRangeKey>('7d');
  const activeTimeRange = useMemo<TimeRangeKey>(() => {
    const candidate = externalTimeRange ?? internalTimeRange;
    return availableRanges.includes(candidate) ? candidate : availableRanges[0];
  }, [availableRanges, externalTimeRange, internalTimeRange]);

  const handleTimeRangeChange = useCallback((value: TimeRangeKey) => {
    if (!availableRanges.includes(value)) return;
    const setter = onTimeRangeChange ?? setInternalTimeRange;
    setter(value);
  }, [availableRanges, onTimeRangeChange]);
  const messagesSectionRef = useRef<HTMLDivElement | null>(null);
  const { isConnected: xConnected, loading: xLoading } = useXConnection();

  const hasRealTrades = useMemo(() => priceSeries.some((point) => !point.carried), [priceSeries]);
  const chartWindow = useMemo(() => getWindowUTC(activeTimeRange), [activeTimeRange]);
  const chartStartDate = chartWindow.start;

  const {
    data: chartPosts = [],
    isLoading: isLoadingChartPosts,
    isFetching: isFetchingChartPosts,
  } = useChartPosts(athlete?.id, chartStartDate);

  const chartIsLoading = useMemo(
    () =>
      priceSeriesLoading ||
      (priceSeries.length === 0 && athleteTrades.length === 0) ||
      isLoadingChartPosts,
    [athleteTrades.length, isLoadingChartPosts, priceSeries.length, priceSeriesLoading],
  );

  const formatXAxisTick = useCallback((value: number) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Fetch workouts with date range filter
  // Fetch workouts with date range filter
  const {
    workouts: lockerWorkouts,
    isLoading: isWorkoutsLoading,
    hasNextPage: localHasNextPage,
    fetchNextPage: localFetchNextPage,
    isFetchingNextPage: localIsFetchingNextPage
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

  return (
    <>
      <div className="space-y-6" data-tour="profile-section">
        {/* Desktop: Profile (larger) + Market Cap + Aura Score */}
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
          <ProfileDetailsCard
            athlete={athlete}
            editedProfile={editedProfile}
            isEditing={isEditing}
            savingProfile={savingProfile}
            onStartEdit={onStartEditProfile}
            onCancelEdit={onCancelEditProfile}
            onSave={onSaveProfile}
            onFieldChange={onProfileFieldChange}
            onAvatarSelect={onAvatarSelect}
          />

          {/* Market Cap Card - center on desktop (enhanced design) */}
          <Card className="glass-card hidden md:flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardContent className="p-6 flex flex-col justify-between h-full relative">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Your Market Cap</p>
                <div className="text-4xl font-bold tracking-tight tabular-nums bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  ${formatNumber(athlete?.marketCap || 0)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded ${(athlete?.change24h || 0) > 0 ? 'bg-success/10 text-success' : (athlete?.change24h || 0) < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                    {(athlete?.change24h || 0) !== 0 && (
                      <TrendingUp className={`inline h-3.5 w-3.5 mr-0.5 ${(athlete?.change24h || 0) < 0 ? 'rotate-180' : ''}`} />
                    )}
                    {(athlete?.change24h || 0) > 0 ? '+' : ''}{(athlete?.change24h || 0).toFixed(2)}%
                  </span>
                  <span className="text-sm text-muted-foreground">24h</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Price</p>
                  <p className="text-lg font-semibold">${formatNumber(athlete?.price || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Cards</p>
                  <p className="text-lg font-semibold">{formatNumber(athlete?.supply || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Earnings</p>
                  <p className="text-lg font-semibold">${formatNumber(athlete?.athleteRevenue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aura Card - right side on desktop */}
          {auraCard && (
            <div className="hidden md:block">
              {auraCard}
            </div>
          )}
        </div>

        {/* Mobile: Market Cap + Aura Card below profile */}
        <div className="md:hidden space-y-4">
          {/* Mobile Market Cap Card */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Your Market Cap</p>
                  <div className="text-2xl font-bold tracking-tight tabular-nums">
                    ${formatNumber(athlete?.marketCap || 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 text-sm font-medium ${(athlete?.change24h || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {(athlete?.change24h || 0) >= 0 ? '+' : ''}{(athlete?.change24h || 0).toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(athlete?.supply || 0)} holders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {auraCard}
        </div>

        {/* Inner Circle Card */}
        <Card className="glass-card" data-tour="inner-circle">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🔐</span>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Inner Circle</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Button variant="outline" className="flex flex-col items-center gap-1.5 h-auto py-4" onClick={() => setGroupChatOpen(true)}>
                <MessageSquare className="h-5 w-5" />
                <span className="text-sm font-medium">Group Chat</span>
                <span className="text-xs text-muted-foreground">{formatNumber(athlete?.supply || 0)} members</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-1.5 h-auto py-4" onClick={() => setDmsOpen(true)}>
                <Mail className="h-5 w-5" />
                <span className="text-sm font-medium">DMs</span>
                <span className="text-xs text-muted-foreground">No new messages</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-1.5 h-auto py-4" onClick={() => setGlobeOpen(true)}>
                <Globe className="h-5 w-5" />
                <span className="text-sm font-medium">Globe</span>
                <span className="text-xs text-muted-foreground">View locations</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Strava Card */}
        <StravaCard />

        {/* Stats Card - fetches its own data */}
        <ProfileStatsCard className="glass-card" />

        {/* X.com Integration Card */}
        {xLoading ? (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>X.com Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-full max-w-xs" />
            </CardContent>
          </Card>
        ) : !xConnected ? (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>X.com Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your X account to display your handle and increase credibility.
              </p>
              <ConnectXButton />
            </CardContent>
          </Card>
        ) : null}

        {/* Price Chart */}
        {priceSeries.length > 0 && (
          <Card className="glass-card" data-tour="card-chart">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Athlete Card Chart
              </CardTitle>
              <button
                onClick={() => setChartShareOpen(true)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Share Chart"
              >
                <Share2 className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTimeRange} onValueChange={(value) => handleTimeRangeChange(value as TimeRangeKey)} className="mb-4">
                <TabsList className="flex w-full max-w-md gap-1">
                  <TabsTrigger value="7d" className="flex-1">7D</TabsTrigger>
                  {featureFlags.show30d ? (
                    <TabsTrigger value="30d" className="flex-1">30D</TabsTrigger>
                  ) : null}
                  {featureFlags.showAll ? (
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                  ) : null}
                </TabsList>
              </Tabs>
              <div ref={chartContainerRef} className="h-72 bg-background rounded-lg">
                <AthletePriceChart
                  chartPoints={priceSeries}
                  hasRealTrades={hasRealTrades}
                  timeRange={activeTimeRange}
                  formatXAxisTick={formatXAxisTick}
                  formatTooltipLabel={formatTooltipLabel}
                  isLoading={chartIsLoading}
                  posts={chartPosts}
                  isFetching={isFetchingChartPosts}
                  syncId="myathlete-chart"
                />
              </div>

              {/* Token Stats - Compact list style below chart */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Stats</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">${formatNumber(athlete?.price || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">24h Change</span>
                    <span className={`font-medium ${(athlete?.change24h || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {(athlete?.change24h || 0) >= 0 ? '+' : ''}{(athlete?.change24h || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">${formatNumber(athlete?.marketCap || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Card Holders</span>
                    <span className="font-medium">{formatNumber(athlete?.supply || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reserve</span>
                    <span className="font-medium">${formatNumber(athlete?.reserve || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Earnings</span>
                    <span className="font-medium">${formatNumber(athlete?.athleteRevenue || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Workouts and Earnings (Community/Messages hidden but accessible via Inner Circle) */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="workouts">Proof of Sweat</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Earnings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" data-tour="proof-of-sweat">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Proof of Sweat</CardTitle>
                  <Button className="gap-2" onClick={onAddWorkout}>
                    <Plus className="h-4 w-4" />
                    Add Workout
                  </Button>
                </div>
                <div className="mt-4 flex justify-end">
                  <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
              </CardHeader>
              <CardContent>
                {!filteredWorkouts || (filteredWorkouts.length === 0 && !isWorkoutsLoading) ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No workouts found
                  </div>
                ) : (
                  <div className="space-y-6">
                    <ProofOfSweat
                      athleteId={athlete?.id || ''}
                      athleteName={athlete?.name || ''}
                      athleteHandle={athlete?.slug}
                      athleteAvatar={athlete?.avatar}
                      workouts={filteredWorkouts}
                      posts={filteredPosts}
                      isLoading={isWorkoutsLoading}
                      viewerHoldings={Number.MAX_SAFE_INTEGER}
                      onWorkoutDeleted={onWorkoutDelete}
                    />
                    {localHasNextPage && (
                      <div className="flex justify-center py-6">
                        <Button onClick={() => localFetchNextPage()} disabled={localIsFetchingNextPage} variant="outline">
                          {localIsFetchingNextPage ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="community">
            {user && (
              <TokengatedChat
                athleteId={user.id}
                athleteName={athlete?.name || ''}
                userHoldings={1}
                onBuyClick={() => { }}
              />
            )}
          </TabsContent>

          <TabsContent value="messages">
            <div ref={messagesSectionRef}>
              <Suspense
                fallback={(
                  <Card className="glass-card p-6">
                    <Skeleton className="h-64 w-full" />
                  </Card>
                )}
              >
                <LockerMessages
                  athleteId={user?.id}
                  athleteName={athlete?.name}
                />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Athlete Earnings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track your earnings from trading fees on your Athlete Card
                </p>
              </CardHeader>
              <CardContent>
                <EarningsSection athleteId={user?.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Chart Modal - rendered at root level for proper portal behavior */}
      {athlete && (
        <ShareChartModal
          open={chartShareOpen}
          onOpenChange={setChartShareOpen}
          chartRef={chartContainerRef}
          athleteName={athlete.name}
          athleteHandle={athlete.slug || ''}
          athleteProfileUrl={`${window.location.origin}/athlete/${athlete.id}`}
        />
      )}

      {/* Group Chat Sheet */}
      <Sheet open={groupChatOpen} onOpenChange={setGroupChatOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Group Chat
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {user && (
              <TokengatedChat
                athleteId={user.id}
                athleteName={athlete?.name || ''}
                userHoldings={1}
                onBuyClick={() => { }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* DMs Sheet */}
      <Sheet open={dmsOpen} onOpenChange={setDmsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Direct Messages
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-auto p-4">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <LockerMessages
                athleteId={user?.id}
                athleteName={athlete?.name}
                mode="embedded"
              />
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>

      {/* Globe Sheet */}
      <Sheet open={globeOpen} onOpenChange={setGlobeOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Proof-of-Sweat Globe
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-auto">
            <Suspense fallback={<Skeleton className="h-96 w-full m-4" />}>
              {user && (
                <LockerGlobe
                  athleteId={user.id}
                  athleteName={athlete?.name || ''}
                />
              )}
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
