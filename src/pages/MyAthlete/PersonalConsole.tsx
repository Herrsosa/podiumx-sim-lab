import React, { useState, useMemo, useCallback, useRef, useId } from 'react';
import { Plus, TrendingUp, Edit, Trash2, MessageSquare, DollarSign, Activity, Share2, MessageCircle } from 'lucide-react';
import type { TimeRangeKey } from '@/utils/chartData';
import { fillPriceGaps, getRangeWindow, dailyTicks, startOfUtcDay, endOfUtcDay } from '@/utils/chartData';
import { formatNumber } from '@/lib/format';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Bar, type TooltipProps } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EarningsSection } from '@/components/EarningsSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Athlete, Workout, Post } from '@/types';
import { toast } from 'sonner';
import { useUser } from '@/store/auth';
import { StackedCircles, POS_NEON_COLOR } from '@/components/charts/StackedCircles';
import { aggregatePosByDay } from '@/utils/chartData';
import { supabase } from '@/integrations/supabase/client';
import TokengatedChat from '@/components/TokengatedChat';
import { useQueryClient } from '@tanstack/react-query';
import { resolveImageUrl } from '@/utils/avatar';
import { ProfileDetailsCard } from '@/components/my-athlete/ProfileDetailsCard';
import type { EditableProfile } from '@/pages/my-athletes/types';
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
import { useXIdentity } from '@/hooks/useXIdentity';
import XBadge from '@/components/social/XBadge';
import type { AthleteTrade } from '@/hooks/useAthleteTrades';

interface PriceHistoryPoint {
  t: number;
  price: number;
  posCount?: number;
  carried?: boolean;
  lastTradeTime?: number;
}

interface PersonalConsoleProps {
  athlete?: Athlete;
  workouts: Workout[];
  posts: Post[];
  athleteTrades: AthleteTrade[];
  priceHistory: PriceHistoryPoint[];
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
  priceHistory,
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
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRangeKey>('7d');
  const activeTimeRange = externalTimeRange ?? internalTimeRange;
  const handleTimeRangeChange = onTimeRangeChange ?? setInternalTimeRange;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const messagesSectionRef = useRef<HTMLDivElement | null>(null);
  const xIdentity = useXIdentity();

  const posDailyPoints = useMemo(
    () => aggregatePosByDay(posts, 'all'),
    [posts],
  );

  const posCountByDay = useMemo(
    () => new Map(posDailyPoints.map((point) => [startOfUtcDay(point.dateMs), point.posCount])),
    [posDailyPoints],
  );

  const filledPricePoints = useMemo(() => {
    if (!athlete?.price) return [];
    
    // Convert priceHistory to trade-like format for fillPriceGaps
    const tradeFormat = priceHistory.map(point => ({
      created_at: new Date(point.t).toISOString(),
      timestamp: point.t,
      price_after: point.price,
    }));
    
    return fillPriceGaps(tradeFormat, athlete.price, activeTimeRange);
  }, [priceHistory, athlete?.price, activeTimeRange]);

  const chartData = useMemo(() => {
    const { start: windowStart, end: windowEnd } = getRangeWindow(activeTimeRange);
    const dayWithPrice = new Set<number>();

    const baseData = filledPricePoints.map((point) => {
      const dayStart = startOfUtcDay(point.t);
      dayWithPrice.add(dayStart);

      return {
        t: point.t,
        price: point.price,
        posCount: posCountByDay.get(dayStart) ?? 0,
        carried: point.carried,
        lastTradeTime: point.lastTradeTime,
      };
    });

    // Calculate domain for PoS filtering
    const pricePoints = baseData.filter(p => p.price != null && !p.carried).sort((a,b)=>a.t-b.t);
    let domainStart: number;
    let domainEnd: number;
    
    if (pricePoints.length === 0) {
      domainStart = windowStart ?? Date.now() - 86_400_000;
      domainEnd = windowEnd;
    } else {
      const firstTradeT = pricePoints[0].t;
      const lastTradeT = pricePoints[pricePoints.length - 1].t;
      
      if (activeTimeRange === 'all') {
        domainStart = startOfUtcDay(firstTradeT);
        domainEnd = Math.max(lastTradeT, Date.now());
      } else {
        domainStart = windowStart!;
        domainEnd = windowEnd;
      }
    }

    // Filter PoS to domain range only
    const posOnlyData = posDailyPoints
      .filter((posPoint) => !dayWithPrice.has(posPoint.dateMs))
      .filter((posPoint) => posPoint.dateMs >= domainStart && posPoint.dateMs <= domainEnd)
      .map((posPoint) => ({
        t: posPoint.dateMs,
        price: null,
        posCount: posPoint.posCount,
        carried: undefined,
        lastTradeTime: undefined,
      }));

    // Combine and sort strictly by timestamp (ascending)
    return [...baseData, ...posOnlyData].sort((a, b) => a.t - b.t);
  }, [filledPricePoints, posCountByDay, posDailyPoints, activeTimeRange]);

  const posDomain = useMemo<[number, number]>(() => {
    const maxPos = posDailyPoints.reduce((max, point) => Math.max(max, point.posCount), 0);
    const upper = maxPos > 0 ? maxPos + 1 : 1;
    return [0, upper];
  }, [posDailyPoints]);

  const xDomain = useMemo<[number, number]>(() => {
    const DAY = 86_400_000;
    const now = Date.now();
    const { start: windowStart, end: windowEnd } = getRangeWindow(activeTimeRange, now);
    
    // Filter for price points only (price != null && !carried)
    const pricePoints = chartData.filter((d) => d.price != null && !d.carried).sort((a,b)=>a.t-b.t);
    
    if (pricePoints.length === 0) {
      return activeTimeRange === 'all' ? [now - DAY, now] : [windowStart || now - DAY, windowEnd];
    }
    
    const firstPriceT = pricePoints[0].t;
    const lastPriceT = pricePoints[pricePoints.length - 1].t;
    
    if (activeTimeRange === 'all') {
      // ALL: start at first trade day, end at max(lastTrade, now)
      const domainStart = startOfUtcDay(firstPriceT);
      const domainEnd = Math.max(lastPriceT, now);
      console.debug('[ChartDomain]', { page: 'PersonalConsole', range: activeTimeRange, domainStart, domainEnd, firstPriceT, lastPriceT, priceCount: pricePoints.length });
      return [domainStart, domainEnd];
    }
    
    // 30D: if first trade is within window, start at that trade day
    if (activeTimeRange === '30d' && firstPriceT >= windowStart!) {
      const domainStart = startOfUtcDay(firstPriceT);
      const domainEnd = windowEnd;
      console.debug('[ChartDomain]', { page: 'PersonalConsole', range: activeTimeRange, domainStart, domainEnd, firstPriceT, lastPriceT, priceCount: pricePoints.length });
      return [domainStart, domainEnd];
    }
    
    // 7d/30d: use full window range (UTC-aligned)
    console.debug('[ChartDomain]', { page: 'PersonalConsole', range: activeTimeRange, domainStart: windowStart, domainEnd: windowEnd, firstPriceT, lastPriceT, priceCount: pricePoints.length });
    return [windowStart!, windowEnd];
  }, [chartData, activeTimeRange]);
  
  const yDomain = useMemo<[number, number]>(() => {
    // Filter for actual price points (not carried, not null)
    const pricePoints = chartData.filter((d) => d.price != null && !d.carried);
    
    if (pricePoints.length === 0) return [0, 1];
    
    const prices = pricePoints.map(p => p.price).filter(p => Number.isFinite(p)) as number[];
    if (prices.length === 0) return [0, 1];
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || max * 0.1 || 0.1;
    
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  const glowFilterId = useId().replace(/:/g, '');

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

  const renderTooltip = useCallback(({ active, label, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0 || typeof label !== 'number') {
      return null;
    }

    const priceEntry = payload.find((item) => item && item.dataKey === 'price');
    const posEntry = payload.find((item) => item && item.dataKey === 'posCount');

    const price = typeof priceEntry?.value === 'number' ? priceEntry.value : undefined;
    const dataPoint = chartData.find(d => d.t === label);
    const dateLabel = formatTooltipLabel(label);
    const dayStart = startOfUtcDay(label);
    const posCount =
      typeof posEntry?.value === 'number' ? posEntry.value : posCountByDay.get(dayStart) ?? 0;

    return (
      <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-xl">
        <div className="text-xs font-medium text-muted-foreground mb-1">{dateLabel}</div>
        {typeof price === 'number' && (
          <div className="text-base font-bold text-foreground mb-1">${price.toFixed(4)}</div>
        )}
        {dataPoint?.carried && dataPoint.lastTradeTime && (
          <div className="text-xs text-muted-foreground italic mb-1">
            No trades — price carried from {new Date(dataPoint.lastTradeTime).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-2 w-2 rounded-full bg-primary/80" />
          <span className="text-muted-foreground">PoS:</span>
          <span className="font-semibold text-foreground">{posCount}</span>
        </div>
      </div>
    );
  }, [formatTooltipLabel, posCountByDay, chartData]);

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
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>X.com Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {xIdentity ? (
            <div className="flex items-center justify-between">
              <XBadge />
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your X account to display your handle and increase credibility.
              </p>
              <ConnectXButton />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Chart */}
      {priceHistory.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              PodiumPass Price Chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTimeRange} onValueChange={(value) => handleTimeRangeChange(value as TimeRangeKey)} className="mb-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="7d">7D</TabsTrigger>
                <TabsTrigger value="30d">30D</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 24, right: 24, bottom: 56, left: 16 }}>
                <defs>
                  <filter id={`posGlow-${glowFilterId}`} x="-200%" y="-200%" width="500%" height="500%">
                    <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.18} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={xDomain}
                  ticks={dailyTicks(xDomain[0], xDomain[1])}
                  allowDataOverflow
                  padding={{ right: 18 }}
                  tickFormatter={formatXAxisTick}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  width={64}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis yAxisId="pos" domain={posDomain} hide />
                <RechartsTooltip content={renderTooltip} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }} />
                <Bar
                  dataKey="posCount"
                  yAxisId="pos"
                  fill="transparent"
                  barSize={56}
                  shape={
                    <StackedCircles
                      color={POS_NEON_COLOR}
                      filterId={`posGlow-${glowFilterId}`}
                      maxCircles={6}
                      gap={8}
                      radius={11}
                      hitboxSize={56}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={POS_NEON_COLOR}
                  strokeWidth={2}
                  strokeOpacity={0.65}
                  dot={false}
                  connectNulls
                  strokeLinecap="round"
                />
              </ComposedChart>
            </ResponsiveContainer>
            
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
                <div className="space-y-4">
                  {workouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      onEdit={() => onWorkoutEdit(workout)}
                      onDelete={() => handleDeleteClick(workout.id)}
                    />
                  ))}
                </div>
              )}
              {hasNextPage && (
                <div className="flex justify-center py-6">
                  <Button onClick={fetchNextPage} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
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
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Direct messages feature coming soon!</p>
            </Card>
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
                Track your earnings from trading fees on your PodiumPass
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

function WorkoutCard({ 
  workout, 
  onEdit, 
  onDelete 
}: { 
  workout: Workout; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-lg border border-border/50 p-4 transition-all hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge>{workout.type}</Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(workout.date).toLocaleDateString()}
            </span>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {workout.distance && (
              <div>
                <div className="text-muted-foreground">Distance</div>
                <div className="font-medium">{workout.distance} km</div>
              </div>
            )}
            <div>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-medium">{workout.duration} min</div>
            </div>
            {workout.pace && (
              <div>
                <div className="text-muted-foreground">Pace</div>
                <div className="font-medium">{workout.pace}</div>
              </div>
            )}
            <div>
              <div className="text-muted-foreground">RPE</div>
              <div className="font-medium">{workout.rpe}/10</div>
            </div>
          </div>

          {workout.notes && (
            <p className="mb-2 text-sm text-muted-foreground">{workout.notes}</p>
          )}

          {workout.mediaUrl && (
            <div className="mt-2">
              {workout.mediaType === 'image' ? (
                <img
                  src={resolveImageUrl(workout.mediaUrl, { width: 360 })}
                  alt="Workout"
                  width={360}
                  height={240}
                  loading="lazy"
                  className="h-32 w-48 rounded-lg object-cover"
                />
              ) : (
                <video
                  src={workout.mediaUrl}
                  className="h-32 w-48 rounded-lg object-cover"
                  controls
                />
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
