import React, { useState, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { Plus, TrendingUp, Edit, Trash2, MessageSquare, DollarSign, Activity, Share2, MessageCircle } from 'lucide-react';
import type { TimeRangeKey } from '@/utils/chartData';
import { formatNumber } from '@/lib/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EarningsSection } from '@/components/EarningsSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Athlete, Workout, Post } from '@/types';
import { toast } from 'sonner';
import { useUser } from '@/store/auth';
import { supabase } from '@/integrations/supabase/client';
import TokengatedChat from '@/components/TokengatedChat';
const LockerMessages = lazy(() => import('@/components/myathlete/LockerMessages'));
import { useQueryClient } from '@tanstack/react-query';
import { SupabaseResponsiveImage } from '@/components/SupabaseResponsiveImage';
import { ProfileDetailsCard } from '@/components/my-athlete/ProfileDetailsCard';
import type { EditableProfile } from '@/pages/my-athletes/types';
import ProofOfSweat from '@/components/ProofOfSweat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
}: PersonalConsoleProps) {
  const user = useUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'workouts' | 'community' | 'messages' | 'earnings'>('workouts');
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
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

  const handleDeleteClick = (workoutId: string) => {
    setWorkoutToDelete(workoutId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteWorkout = async () => {
    if (!workoutToDelete) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', workoutToDelete);

      if (error) throw error;

      toast.success('Workout deleted');
      
      queryClient.invalidateQueries({ queryKey: ['my-athlete', user?.id] });
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to delete workout');
    } finally {
      setDeleteDialogOpen(false);
      setWorkoutToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
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
        <Card className="glass-card">
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Athlete Card Chart
              </CardTitle>
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
            <div className="h-72">
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
                  <span className="text-muted-foreground">Supply</span>
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

      {/* Tabs for Workouts, Community Chat, Messages, and Earnings */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workouts">Workout Timeline</TabsTrigger>
          <TabsTrigger value="community" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Community Chat
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Earnings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workouts">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Workout Timeline</CardTitle>
                <Button className="gap-2" onClick={onAddWorkout}>
                  <Plus className="h-4 w-4" />
                  Add Workout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!workouts || workouts.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No workouts yet. Add your first workout to get started!
                </div>
              ) : (
                <>
                  <ProofOfSweat
                    athleteId={athlete?.id || ''}
                    athleteName={athlete?.name || ''}
                    workouts={workouts}
                    posts={posts}
                    viewerHoldings={Number.MAX_SAFE_INTEGER}
                    onWorkoutDeleted={onWorkoutDelete}
                  />
                  {hasNextPage && (
                    <div className="flex justify-center py-6">
                      <Button onClick={fetchNextPage} disabled={isFetchingNextPage} variant="outline">
                        {isFetchingNextPage ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <StravaCard className="mt-4" />
        </TabsContent>

        <TabsContent value="community">
          {user && (
            <TokengatedChat
              athleteId={user.id}
              athleteName={athlete?.name || ''}
              userHoldings={1}
              onBuyClick={() => {}}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this workout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
