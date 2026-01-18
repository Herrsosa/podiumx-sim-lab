import { useState, useMemo, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import type { TimeRangeKey } from '@/utils/chartData';
import { Plus, TrendingUp, Edit, Trash2, MessageSquare, DollarSign, Activity, Share2, MessageCircle, Settings } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EarningsSection } from '@/components/EarningsSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Workout, Sport, Post } from '@/types';
import { toast } from 'sonner';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import { useAthleteTrades } from '@/hooks/useAthleteTrades';
import { useWorkoutEditor } from '@/hooks/useWorkoutEditor';
import { useUser } from '@/store/auth';
import { supabase } from '@/integrations/supabase/client';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import { StravaCard } from '@/components/strava/StravaCard';
import TokengatedChat from '@/components/TokengatedChat';
import { useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { MobileActionBar } from '@/components/MobileActionBar';
import { SupabaseResponsiveImage } from '@/components/SupabaseResponsiveImage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MobileMyAthletes from '@/pages/MyAthlete/mobile/MobileMyAthletes';
import { ProfileDetailsCard } from '@/components/myathlete/ProfileDetailsCard';
import type { EditableProfile } from '@/pages/MyAthlete/mobile/types';
import { PersonalConsole } from '@/pages/MyAthlete/PersonalConsole';
import { LockerView } from '@/pages/MyAthlete/LockerView';
import { usePriceSeries } from '@/hooks/usePriceSeries';
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
import type { MyAthletePageResult } from '@/hooks/useMyAthlete';
import type { WorkoutMutationResult } from '@/hooks/useWorkouts';
import { AthleteIdentityCard } from '@/components/identity';
import { LaunchTokenPrompt } from '@/components/LaunchTokenPrompt';
import { Skeleton } from '@/components/ui/skeleton';
const LockerSettings = lazy(() => import('@/components/myathlete/LockerSettings').then(m => ({ default: m.LockerSettings })));

export default function MyAthletePage() {
  const user = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: myAthletePage,
    pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isMyAthleteLoading,
  } = useMyAthlete();
  const { data: athleteTrades } = useAthleteTrades(user?.id || '');
  const queryClient = useQueryClient();
  const updateMyAthleteCache = useCallback(
    (mutator: (prev: MyAthletePageResult['athlete']) => MyAthletePageResult['athlete']) => {
      if (!user?.id) return;
      queryClient.setQueryData<InfiniteData<MyAthletePageResult> | undefined>(
        ['my-athlete', user.id],
        (current) => {
          if (!current) return current;
          const pages = current.pages.map((page) =>
            page?.athlete
              ? {
                ...page,
                athlete: mutator(page.athlete),
              }
              : page,
          );

          return {
            ...current,
            pages,
          };
        },
      );
    },
    [queryClient, user?.id],
  );
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'workouts' | 'community' | 'messages' | 'earnings'>('workouts');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [chartTimeRange, setChartTimeRange] = useState<TimeRangeKey>('7d');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Tab management: "personal" or "locker"
  const currentTab = searchParams.get('tab') || 'personal';
  const setTab = (tab: 'personal' | 'locker') => {
    setSearchParams({ tab });
  };
  const messagesSectionRef = useRef<HTMLDivElement | null>(null);

  const [editedProfile, setEditedProfile] = useState<EditableProfile>({
    displayName: '',
    sport: 'Running' as Sport,
    location: '',
    bio: '',
    avatar: '',
    socials: {},
  });

  const resetEditedProfile = useCallback(() => {
    const athlete = myAthletePage?.athlete;
    if (!athlete) {
      setEditedProfile((prev) => ({
        ...prev,
        displayName: '',
        sport: 'Running',
        location: '',
        bio: '',
        avatar: '',
        socials: {},
      }));
      return;
    }

    setEditedProfile({
      displayName: athlete.name || '',
      sport: (athlete.sport || 'Running') as Sport,
      location: athlete.location || '',
      bio: athlete.bio || '',
      avatar: athlete.avatar || '',
      socials: athlete.socials || {},
    });
  }, [myAthletePage?.athlete]);

  useEffect(() => {
    if (myAthletePage?.athlete) {
      resetEditedProfile();
    }
  }, [myAthletePage?.athlete, resetEditedProfile]);

  const updateEditedProfile = useCallback(
    (updates: Partial<EditableProfile>) => {
      setEditedProfile((prev) => ({
        ...prev,
        ...updates,
        socials: {
          ...prev.socials,
          ...(updates.socials ?? {}),
        },
      }));
    },
    [],
  );

  const handleAvatarFileSelected = useCallback(
    (file: File | null) => {
      if (!file) {
        setNewAvatarFile(null);
        updateEditedProfile({ avatar: myAthletePage?.athlete?.avatar ?? '' });
        return;
      }

      setNewAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      updateEditedProfile({ avatar: previewUrl });
    },
    [myAthletePage?.athlete?.avatar, updateEditedProfile],
  );

  const workouts = useMemo(() => {
    const allPosts = pages.flatMap(p => p?.athlete?.posts ?? []);
    return allPosts.map(post => ({
      id: post.id,
      ...(post.workout_json as Workout),
      mediaUrl: post.image_url ?? undefined,
      mediaType: post.image_url ? ('image' as const) : undefined,
    }));
  }, [pages]);

  const posts = useMemo(() => {
    return pages.flatMap(p => p?.athlete?.posts ?? []);
  }, [pages]);

  const findPostById = useCallback<(id: string) => Post | undefined>((id) => {
    const posts = pages.flatMap(p => p?.athlete?.posts ?? []);
    return posts.find((p) => p.id === id);
  }, [pages]);

  const { editingWorkout, setEditingWorkout, open, setOpen, handleEditWorkout } = useWorkoutEditor(findPostById);
  const normalizedEditingWorkout = useMemo(() => {
    if (!editingWorkout || !editingWorkout.workout_json || Array.isArray(editingWorkout.workout_json)) {
      return null;
    }

    return {
      ...editingWorkout,
      workout_json: editingWorkout.workout_json as Workout,
    };
  }, [editingWorkout]);

  const fallbackTimestamp = useMemo(() => {
    if (!myAthletePage?.athlete?.priceUpdatedAt) return null;
    const parsed = Date.parse(myAthletePage.athlete.priceUpdatedAt);
    return Number.isFinite(parsed) ? parsed : null;
  }, [myAthletePage?.athlete?.priceUpdatedAt]);
  const {
    data: priceSeries = [],
    isLoading: priceSeriesLoading,
  } = usePriceSeries(myAthletePage?.athlete?.id, chartTimeRange, {
    fallbackPrice: myAthletePage?.athlete?.price ?? null,
    fallbackTimestamp,
  });
  const hasRealPriceHistory = useMemo(() => priceSeries.some((point) => !point.carried), [priceSeries]);

  const handleStartEditProfile = useCallback(() => {
    resetEditedProfile();
    setIsEditing(true);
  }, [resetEditedProfile]);

  const handleCancelEditProfile = useCallback(() => {
    resetEditedProfile();
    setIsEditing(false);
  }, [resetEditedProfile]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);

    try {
      let avatarUrl = editedProfile.avatar;

      if (newAvatarFile) {
        // If there was an old avatar, delete it
        if (myAthletePage?.athlete?.avatar && myAthletePage.athlete.avatar.includes('avatars')) {
          const oldImageKey = myAthletePage.athlete.avatar.split('/avatars/').pop();
          if (oldImageKey) {
            await supabase.storage.from('avatars').remove([oldImageKey]);
          }
        }

        const fileExt = newAvatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, newAvatarFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editedProfile.displayName,
          sport: editedProfile.sport,
          bio: editedProfile.bio,
          avatar_url: avatarUrl || null,
          instagram_url: editedProfile.socials.instagram || null,
          strava_url: editedProfile.socials.strava || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // After saving, reset the new avatar file state
      setNewAvatarFile(null);
      queryClient.invalidateQueries({ queryKey: ['my-athlete', user?.id] });

      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleWorkoutCreated = useCallback(
    async (result: WorkoutMutationResult) => {
      updateMyAthleteCache((prev) => {
        const workoutData = result.workout.workout;
        const nextWorkouts = workoutData
          ? [workoutData, ...prev.workouts.filter((workout) => workout.id !== workoutData.id)]
          : prev.workouts;
        const nextPosts = [result.post, ...prev.posts.filter((post) => post.id !== result.post.id)];
        return {
          ...prev,
          workouts: nextWorkouts,
          posts: nextPosts,
        };
      });
      setAddWorkoutOpen(false);

      // Invalidate identity kernel so Aura Score updates
      await queryClient.invalidateQueries({
        queryKey: ['identity-kernel'],
      });
    },
    [queryClient, updateMyAthleteCache],
  );

  const handleMobileLogPos = useCallback(() => {
    setActiveTab('workouts');
    setAddWorkoutOpen(true);
  }, []);

  const handleMobileShare = useCallback(async () => {
    const shareTitle = myAthletePage?.athlete?.name
      ? `${myAthletePage.athlete.name} | Build Your Athlete Aura`
      : 'Build Your Athlete Aura';
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    try {
      const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
      if (canShare && shareUrl) {
        await navigator.share({
          title: shareTitle,
          text: 'Proof-of-Sweat meets markets.',
          url: shareUrl,
        });
        return;
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }

    const canCopy = typeof navigator !== 'undefined' && navigator.clipboard?.writeText;
    if (shareUrl && canCopy) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
        return;
      } catch (error) {
        console.error('Clipboard copy failed:', error);
      }
    }

    toast.info('Sharing not supported on this device yet.');
  }, [myAthletePage?.athlete?.name]);

  const handleMobileMessage = useCallback(() => {
    setActiveTab('messages');
    setTimeout(() => {
      messagesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const isMobile = !isDesktop;

  const modalStack = (
    <>
      {user && (
        <AddWorkoutModal
          open={addWorkoutOpen}
          onOpenChange={setAddWorkoutOpen}
          athleteId={user.id}
          onSuccess={handleWorkoutCreated}
        />
      )}

      {normalizedEditingWorkout && (
        <EditWorkoutModal
          open={open}
          onOpenChange={setOpen}
          workoutPost={normalizedEditingWorkout}
          onSuccess={(result) => {
            updateMyAthleteCache((prev) => {
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
            setOpen(false);
          }}
        />
      )}
    </>
  );

  if (!isDesktop) {
    return (
      <>
        <MobileMyAthletes
          athlete={myAthletePage?.athlete}
          workouts={workouts}
          posts={myAthletePage?.athlete?.posts ?? []}
          priceSeries={priceSeries}
          hasRealTrades={hasRealPriceHistory}
          trades={athleteTrades ?? []}
          timeRange={chartTimeRange}
          onTimeRangeChange={setChartTimeRange}
          onAddWorkout={() => setAddWorkoutOpen(true)}
          editedProfile={editedProfile}
          isEditingProfile={isEditing}
          onStartEditProfile={handleStartEditProfile}
          onCancelEditProfile={handleCancelEditProfile}
          onSaveProfile={handleSaveProfile}
          onProfileFieldChange={updateEditedProfile}
          onAvatarSelect={handleAvatarFileSelected}
          savingProfile={savingProfile}
          isLoading={isMyAthleteLoading || priceSeriesLoading}
          hasNextPage={Boolean(hasNextPage)}
          fetchNextPage={hasNextPage ? () => { void fetchNextPage(); } : undefined}
          isFetchingNextPage={isFetchingNextPage}
          onRefetchWorkouts={() => {
            if (user?.id) {
              void queryClient.invalidateQueries({ queryKey: ['my-athlete', user.id] });
            }
          }}
          hasToken={myAthletePage?.hasToken ?? true}
        />
        {modalStack}
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 pb-32 pt-8 md:pb-8 overflow-x-hidden">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold">My Athlete Profile</h1>
            <p className="text-muted-foreground">Manage your profile and workout timeline</p>
          </div>
          {isDesktop && (
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="h-10 w-10">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          )}
        </div>

        {/* Show launch token prompt if user hasn't created a token */}
        {myAthletePage && !myAthletePage.hasToken && (
          <div className="mb-6 max-w-md">
            <LaunchTokenPrompt />
          </div>
        )}

        {/* Desktop: Single unified view (no tabs) */}
        {isDesktop ? (
          <PersonalConsole
            athlete={myAthletePage?.athlete}
            workouts={workouts}
            posts={posts}
            athleteTrades={athleteTrades ?? []}
            priceSeries={priceSeries}
            priceSeriesLoading={priceSeriesLoading}
            editedProfile={editedProfile}
            isEditing={isEditing}
            savingProfile={savingProfile}
            onStartEditProfile={handleStartEditProfile}
            onCancelEditProfile={handleCancelEditProfile}
            onSaveProfile={handleSaveProfile}
            onProfileFieldChange={updateEditedProfile}
            onAvatarSelect={handleAvatarFileSelected}
            onWorkoutEdit={handleEditWorkout}
            onWorkoutDelete={() => { }}
            onAddWorkout={() => setAddWorkoutOpen(true)}
            hasNextPage={Boolean(hasNextPage)}
            fetchNextPage={hasNextPage ? () => { void fetchNextPage(); } : undefined}
            isFetchingNextPage={isFetchingNextPage}
            timeRange={chartTimeRange}
            onTimeRangeChange={setChartTimeRange}
            auraCard={<AthleteIdentityCard />}
          />
        ) : (
          /* Mobile: Keep tabs for Personal vs Inner Circle */
          <Tabs value={currentTab} onValueChange={(v) => setTab(v as 'personal' | 'locker')} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="locker" data-tour="locker-tab">Inner Circle</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-6">
              <PersonalConsole
                athlete={myAthletePage?.athlete}
                workouts={workouts}
                posts={posts}
                athleteTrades={athleteTrades ?? []}
                priceSeries={priceSeries}
                priceSeriesLoading={priceSeriesLoading}
                editedProfile={editedProfile}
                isEditing={isEditing}
                savingProfile={savingProfile}
                onStartEditProfile={handleStartEditProfile}
                onCancelEditProfile={handleCancelEditProfile}
                onSaveProfile={handleSaveProfile}
                onProfileFieldChange={updateEditedProfile}
                onAvatarSelect={handleAvatarFileSelected}
                onWorkoutEdit={handleEditWorkout}
                onWorkoutDelete={() => { }}
                onAddWorkout={() => setAddWorkoutOpen(true)}
                hasNextPage={Boolean(hasNextPage)}
                fetchNextPage={hasNextPage ? () => { void fetchNextPage(); } : undefined}
                isFetchingNextPage={isFetchingNextPage}
                timeRange={chartTimeRange}
                onTimeRangeChange={setChartTimeRange}
                auraCard={<AthleteIdentityCard />}
                onNavigateToInnerCircle={() => setTab('locker')}
              />
            </TabsContent>

            <TabsContent value="locker" className="mt-6">
              <LockerView athleteId={user?.id} athleteName={myAthletePage?.athlete?.name} />
            </TabsContent>
          </Tabs>
        )}

        {isMobile && (
          <MobileActionBar
            actions={[
              {
                id: 'add-pos',
                label: 'Add Proof of Sweat',
                icon: <Activity className="h-5 w-5" aria-hidden="true" />,
                variant: 'primary',
                onPress: handleMobileLogPos,
                ariaLabel: 'Add proof-of-sweat workout',
              },
            ]}
          />
        )}
      </div>
      {modalStack}

      {/* Settings Sheet (Desktop) */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </SheetTitle>
          </SheetHeader>
          <Suspense fallback={<Skeleton className="h-64 w-full mt-4" />}>
            <LockerSettings />
          </Suspense>
        </SheetContent>
      </Sheet>
    </>
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
    <div className="group rounded-xl border border-white/5 bg-card/40 backdrop-blur-sm p-5 transition-all hover:border-primary/30 hover:bg-card/60 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
              {workout.type}
            </Badge>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {new Date(workout.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            {workout.distance && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Distance</div>
                <div className="font-semibold text-foreground">{workout.distance} km</div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Duration</div>
              <div className="font-semibold text-foreground">{workout.duration} min</div>
            </div>
            {workout.pace && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Pace</div>
                <div className="font-semibold text-foreground">{workout.pace}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">RPE</div>
              <div className="font-semibold text-foreground">{workout.rpe}/10</div>
            </div>
          </div>

          {workout.notes && (
            <p className="mb-2 text-sm text-muted-foreground">{workout.notes}</p>
          )}

          {workout.mediaUrl && (
            <div className="mt-2">
              {workout.mediaType === 'image' ? (
                <SupabaseResponsiveImage
                  src={workout.mediaUrl}
                  alt={`${workout.type} workout media`}
                  widths={[200, 320, 480]}
                  sizes="(max-width: 768px) 60vw, 192px"
                  aspectRatio={3 / 2}
                  className="w-48 overflow-hidden rounded-lg border border-border/40 bg-muted/30"
                />
              ) : (
                <div
                  className="w-48 overflow-hidden rounded-lg border border-border/40 bg-muted/30"
                  style={{ aspectRatio: 3 / 2 }}
                >
                  <video
                    src={workout.mediaUrl}
                    className="h-full w-full object-cover"
                    controls
                    preload="metadata"
                  />
                </div>
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
