import { useMemo, useState, Suspense, useCallback } from 'react';
import { Athlete, Workout, Post } from '@/types';
import type { AthleteTrade } from '@/hooks/useAthleteTrades';
import type { TimeRangeKey } from '@/utils/chartData';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProofOfSweat from '@/components/ProofOfSweat';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Activity, Share2, Plus } from 'lucide-react';
import type { EditableProfile } from './types';
import { StravaCard } from '@/components/strava/StravaCard';
import { MobileActionBar } from '@/components/MobileActionBar';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import { getWindowUTC } from '@/lib/charting/engine';
import { useChartPosts } from '@/hooks/useChartPosts';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';

import { AthleteIdentityCard } from '@/components/identity';
import { LaunchTokenPrompt } from '@/components/LaunchTokenPrompt';
import { MobileSettingsSheet } from './MobileSettingsSheet';
import { MarketHeroCard } from './MarketHeroCard';
import { MarketDetailSheet } from './MarketDetailSheet';
import { InnerCircleCard } from './InnerCircleCard';
import TokengatedChat from '@/components/TokengatedChat';
import { ProfileDetailsCard } from '@/components/myathlete/ProfileDetailsCard';
import { useIdentityKernel } from '@/hooks/useIdentityKernel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LockerMessages } from '@/components/myathlete/LockerMessages';

interface MobileMyAthletesProps {
  athlete?: Athlete;
  workouts: Workout[];
  posts: Post[];
  priceSeries: PriceSeriesPoint[];
  hasRealTrades: boolean;
  trades?: AthleteTrade[];
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
  hasToken?: boolean;
}

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
  hasToken = true,
}: MobileMyAthletesProps) {
  const [showMarketDetail, setShowMarketDetail] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDMs, setShowDMs] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const { toast } = useToast();

  // Identity kernel for Aura score
  const { data: kernel } = useIdentityKernel();

  const chartWindow = useMemo(() => getWindowUTC(timeRange || '7d'), [timeRange]);
  const chartStartDate = chartWindow.start;
  const {
    data: chartPosts = [],
    isLoading: isLoadingChartPosts,
    isFetching: isFetchingChartPosts,
  } = useChartPosts(athlete?.id, chartStartDate);

  const handleEditProfile = useCallback(() => {
    setShowProfileEdit(true);
    onStartEditProfile();
  }, [onStartEditProfile]);

  const handleCloseProfileEdit = useCallback(() => {
    setShowProfileEdit(false);
    onCancelEditProfile();
  }, [onCancelEditProfile]);

  const handleSaveProfile = useCallback(() => {
    onSaveProfile();
    setShowProfileEdit(false);
  }, [onSaveProfile]);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    toast({
      title: 'Share',
      description: 'Share feature coming soon!',
    });
  }, [toast]);

  // Calculate holders from trades - count unique traders with positive net holdings
  // NOTE: Must be before any early returns to maintain consistent hooks order
  const holdersCount = useMemo(() => {
    const holdings = new Map<string, number>();
    trades.forEach(trade => {
      // Group by user_id (the trader), not athlete_id
      const traderId = trade.user_id;
      if (!traderId) return;
      const current = holdings.get(traderId) ?? 0;
      const qty = trade.qty ?? 0;
      const isBuy = trade.side === 'BUY';
      holdings.set(traderId, current + (isBuy ? qty : -qty));
    });
    return Array.from(holdings.values()).filter(qty => qty > 0).length;
  }, [trades]);

  if (!athlete) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 border-b bg-background/80 px-4 py-4 backdrop-blur">
          <Skeleton className="h-10 w-32" />
        </header>
        <main className="flex-1 space-y-4 px-4 py-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  const priceChange = athlete.change24h ?? 0;
  const auraScore = kernel?.auraScore ?? 82;
  const streak = kernel?.streak ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header: Settings (left) + Share (right) */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <MobileSettingsSheet onEditProfile={handleEditProfile} />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-10 w-10 rounded-full bg-muted/40 hover:bg-muted/60"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pb-32 px-4 space-y-4 pt-4">
        {/* Show launch token prompt if user hasn't created a token */}
        {!hasToken && (
          <LaunchTokenPrompt />
        )}

        {/* Market Cap Hero Card - tappable */}
        <MarketHeroCard
          marketCap={athlete.marketCap ?? 0}
          priceChange={priceChange}
          holders={holdersCount}
          auraScore={auraScore}
          streak={streak}
          onTap={() => setShowMarketDetail(true)}
        />

        {/* Inner Circle (Group Chat + DMs) */}
        <InnerCircleCard
          groupChatMembers={holdersCount}
          unreadDMs={3} // TODO: Get from actual data
          onGroupChatClick={() => setShowChat(true)}
          onDMsClick={() => setShowDMs(true)}
        />

        {/* Strava Integration */}
        <StravaCard />

        {/* Proof of Sweat Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Proof of Sweat
            </h2>
            <Button onClick={onAddWorkout} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : workouts.length === 0 ? (
            <Card className="border-white/10 bg-card/60">
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
                athleteHandle={athlete.slug}
                athleteAvatar={athlete.avatar}
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
            </>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
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

      {/* Market Detail Sheet */}
      <MarketDetailSheet
        open={showMarketDetail}
        onOpenChange={setShowMarketDetail}
        athleteId={athlete.id}
        athleteName={athlete.name}
        marketCap={athlete.marketCap ?? 0}
        price={athlete.price ?? 0}
        priceChange={priceChange}
        priceSeries={priceSeries}
        posts={chartPosts}
        trades={trades}
        holdersCount={holdersCount}
        auraScore={auraScore}
        auraBreakdown={kernel?.scoreBreakdown}
        streak={streak}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        isLoading={isLoadingChartPosts || isFetchingChartPosts}
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
              userHoldings={1}
              onBuyClick={() => { }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* DMs Sheet */}
      <Sheet open={showDMs} onOpenChange={setShowDMs}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="px-4 py-3 border-b border-white/10">
            <SheetTitle>Direct Messages</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-60px)] overflow-y-auto">
            <LockerMessages
              athleteId={athlete.id}
              athleteName={athlete.name}
              mode="embedded"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Profile Edit Sheet */}
      <Sheet open={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetHeader>
          <ProfileDetailsCard
            variant="mobile"
            className="shadow-none"
            athlete={athlete}
            editedProfile={editedProfile}
            isEditing={isEditingProfile}
            savingProfile={savingProfile}
            onStartEdit={onStartEditProfile}
            onCancelEdit={handleCloseProfileEdit}
            onSave={handleSaveProfile}
            onFieldChange={onProfileFieldChange}
            onAvatarSelect={onAvatarSelect}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
