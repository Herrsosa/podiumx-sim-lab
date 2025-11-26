import { useMemo, useState, useRef, lazy, Suspense } from 'react';
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
import { Activity, ArrowDownRight, ArrowUpRight, Plus, LogOut } from 'lucide-react';
import { MOBILE_TAB_KEYS } from './mobile-config';
import type { EditableProfile } from './types';
import { StravaCard } from '@/components/strava/StravaCard';
import { MobileActionBar } from '@/components/MobileActionBar';
import { LockerMessages } from '@/components/myathlete/LockerMessages';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import { getWindowUTC } from '@/lib/charting/engine';
import { useChartPosts } from '@/hooks/useChartPosts';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';

import { OverviewTab } from './OverviewTab';
import { ChartsTab } from './ChartsTab';
import { TradesTab } from './TradesTab';
import { LockerGlobe } from '@/components/myathlete/LockerGlobe';
import { useXConnection } from '@/hooks/useXConnection';

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
  const [postsView, setPostsView] = useState<'feed' | 'globe'>('feed');
  const { isConnected: xConnected, loading: xLoading } = useXConnection();
  const signOut = useAuthStore((s) => s.signOut);
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: "Sign out failed",
        description: message || "Unable to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const chartWindow = useMemo(() => getWindowUTC(timeRange || '7d'), [timeRange]);
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
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="h-10 w-10 rounded-full bg-muted/40 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
        </Button>
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
          <TabsList className="flex w-full gap-1 rounded-2xl bg-muted/40 p-1 overflow-x-auto no-scrollbar">
            <TabsTrigger value="overview" className="text-xs px-3 flex-shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="chart" className="text-xs px-3 flex-shrink-0">Chart</TabsTrigger>
            <TabsTrigger value="trades" className="text-xs px-3 flex-shrink-0">Trades</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs px-3 flex-shrink-0">Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="min-w-0">
            <OverviewTab
              athlete={athlete}
              priceSeries={priceSeries}
              priceChange={priceChange}
              isPriceUp={isPriceUp}
              onStartEditProfile={onStartEditProfile}
              onCancelEditProfile={onCancelEditProfile}
              onSaveProfile={onSaveProfile}
              onProfileFieldChange={onProfileFieldChange}
              onAvatarSelect={onAvatarSelect}
              savingProfile={savingProfile}
              onAddWorkout={onAddWorkout}
              latestWorkout={latestWorkout}
              xConnected={xConnected}
              xLoading={xLoading}
              editedProfile={editedProfile}
              isEditingProfile={isEditingProfile}
              consoleTab={consoleTab}
              setConsoleTab={setConsoleTab}
              scrollToContent={scrollToContent}
              contentRef={contentRef}
            />
          </TabsContent>

          <TabsContent value="chart" className="min-w-0 space-y-4">
            <ChartsTab
              priceSeries={priceSeries}
              hasRealTrades={hasRealTrades}
              timeRange={timeRange || '7d'}
              onTimeRangeChange={onTimeRangeChange}
              isLoading={isLoading}
              chartPosts={chartPosts}
              isLoadingChartPosts={isLoadingChartPosts}
              isFetchingChartPosts={isFetchingChartPosts}
            />
          </TabsContent>

          <TabsContent value="trades" className="min-w-0 space-y-4">
            <TradesTab trades={trades} />
          </TabsContent>

          <TabsContent value="posts" className="min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Activity</h2>
                <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
                  <Button
                    variant={postsView === 'feed' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setPostsView('feed')}
                  >
                    Feed
                  </Button>
                  <Button
                    variant={postsView === 'globe' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setPostsView('globe')}
                  >
                    Globe
                  </Button>
                </div>
              </div>
              {postsView === 'feed' && (
                <Button onClick={onAddWorkout} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              )}
            </div>

            {postsView === 'globe' ? (
              <Card className="border-white/5 bg-card/60 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  <Suspense fallback={<div className="p-8"><Skeleton className="h-64 w-full" /></div>}>
                    <LockerGlobe athleteId={athlete.id} athleteName={athlete.name} />
                  </Suspense>
                </CardContent>
              </Card>
            ) : (
              <>
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
              </>
            )}
          </TabsContent>


        </Tabs>
      </main>

      <MobileActionBar
        className="bottom-16"
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
