import { useState, useMemo, useCallback, useEffect, useRef, useId } from 'react';
import { Plus, TrendingUp, Edit, Trash2, MessageSquare, DollarSign, Activity, Share2, MessageCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Bar, type TooltipProps } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { StackedCircles, POS_NEON_COLOR } from '@/components/charts/StackedCircles';
import { aggregatePosByDay, startOfUtcDay } from '@/utils/chartData';

import { supabase } from '@/integrations/supabase/client';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import { StravaCard } from '@/components/strava/StravaCard';
import TokengatedChat from '@/components/TokengatedChat';
import { useQueryClient } from '@tanstack/react-query';
import { MobileActionBar } from '@/components/MobileActionBar';
import { resolveImageUrl } from '@/utils/avatar';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MobileMyAthletes from '@/pages/my-athletes/MobileMyAthletes';
import { ProfileDetailsCard } from '@/components/my-athlete/ProfileDetailsCard';
import type { EditableProfile } from '@/pages/my-athletes/types';
import { PersonalConsole } from '@/pages/MyAthlete/PersonalConsole';
import { LockerView } from '@/pages/MyAthlete/LockerView';
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
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workouts' | 'community' | 'messages' | 'earnings'>('workouts');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  
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

  const workouts = useMemo(() => {
    const allPosts = pages.flatMap(p => p?.athlete?.posts ?? []);
    return allPosts.map(post => ({
      id: post.id,
      ...(post.workout_json as Workout),
      mediaUrl: post.image_url ?? undefined,
      mediaType: post.image_url ? ('image' as const) : undefined,
    }));
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

  const priceHistory = useMemo(() => {
    const athlete = myAthletePage?.athlete;
    if (!user?.id || !athleteTrades || !athlete) return [];

    const tradesByDay = new Map<number, { t: number; price: number }>();

    for (const trade of athleteTrades) {
      const rawTimestamp = trade.timestamp;
      const t = new Date(rawTimestamp).getTime();
      if (!Number.isFinite(t)) {
        continue;
      }

      const price =
        typeof trade.price_after === 'number'
          ? trade.price_after
          : Number(trade.price_after);

      const resolvedPrice = Number.isFinite(price) ? price : athlete.price;
      const dayStart = startOfUtcDay(t);
      const existing = tradesByDay.get(dayStart);

      if (!existing || t > existing.t) {
        tradesByDay.set(dayStart, {
          t,
          price: resolvedPrice,
        });
      }
    }

    const nowMs = Date.now();
    const nowDay = startOfUtcDay(nowMs);
    const latestForToday = tradesByDay.get(nowDay);
    if (!latestForToday || nowMs > latestForToday.t) {
      tradesByDay.set(nowDay, {
        t: nowMs,
        price: athlete.price,
      });
    }

    return Array.from(tradesByDay.values()).sort((a, b) => a.t - b.t);
  }, [user?.id, athleteTrades, myAthletePage]);

  const posDailyPoints = useMemo(
    () => aggregatePosByDay(myAthletePage?.athlete?.posts, 'all'),
    [myAthletePage?.athlete?.posts],
  );

  const posCountByDay = useMemo(
    () => new Map(posDailyPoints.map((point) => [startOfUtcDay(point.dateMs), point.posCount])),
    [posDailyPoints],
  );

  const chartData = useMemo(() => {
    const dayWithPrice = new Set<number>();

    const baseData = priceHistory.map((point) => {
      const dayStart = startOfUtcDay(point.t);
      dayWithPrice.add(dayStart);

      return {
        t: point.t,
        price: point.price,
        posCount: posCountByDay.get(dayStart) ?? 0,
      };
    });

    const posOnlyData = posDailyPoints
      .filter((posPoint) => !dayWithPrice.has(posPoint.dateMs))
      .map((posPoint) => ({
        t: posPoint.dateMs,
        price: null,
        posCount: posPoint.posCount,
      }));

    return [...baseData, ...posOnlyData].sort((a, b) => a.t - b.t);
  }, [posCountByDay, posDailyPoints, priceHistory]);

  const posDomain = useMemo<[number, number]>(() => {
    const maxPos = posDailyPoints.reduce((max, point) => Math.max(max, point.posCount), 0);
    const upper = maxPos > 0 ? maxPos + 1 : 1;
    return [0, upper];
  }, [posDailyPoints]);

  const xDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      return [now - dayMs, now + dayMs];
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const min = chartData[0].t;
    const max = chartData[chartData.length - 1].t;
    return [min - dayMs * 0.5, max + dayMs * 0.75];
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
    const dateLabel = formatTooltipLabel(label);
    const dayStart = startOfUtcDay(label);
    const posCount =
      typeof posEntry?.value === 'number' ? posEntry.value : posCountByDay.get(dayStart) ?? 0;

    return (
      <div className="rounded-lg border border-border/60 bg-card/90 px-3 py-2 shadow-lg">
        <div className="text-xs text-muted-foreground">{dateLabel}</div>
        {typeof price === 'number' && (
          <div className="text-sm font-semibold text-foreground">${price.toFixed(4)}</div>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          PoS: <span className="font-medium text-foreground">{posCount}</span>
        </div>
      </div>
    );
  }, [formatTooltipLabel, posCountByDay]);

  const handleAvatarFileSelected = useCallback(
    (file: File | null) => {
      if (!file) return;
      setNewAvatarFile(file);
      updateEditedProfile({ avatar: URL.createObjectURL(file) });
    },
    [updateEditedProfile],
  );

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

  const handleWorkoutSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-athlete', user?.id] });
    setAddWorkoutOpen(false);
  }, [queryClient, user?.id]);

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
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['my-athlete', user?.id] });
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to delete workout');
    } finally {
      setDeleteDialogOpen(false);
      setWorkoutToDelete(null);
    }
  };

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

  const modalStack = (
    <>
      {user && (
        <AddWorkoutModal
          open={addWorkoutOpen}
          onOpenChange={setAddWorkoutOpen}
          athleteId={user.id}
          onSuccess={handleWorkoutSuccess}
        />
      )}

      {normalizedEditingWorkout && (
        <EditWorkoutModal
          open={open}
          onOpenChange={setOpen}
          workoutPost={normalizedEditingWorkout}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['my-athlete', user?.id] });
            setOpen(false);
          }}
        />
      )}

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
    </>
  );

  if (!isDesktop) {
    return (
      <>
        <MobileMyAthletes
          athlete={myAthletePage?.athlete}
          workouts={workouts}
          posts={myAthletePage?.athlete?.posts ?? []}
          chartData={chartData}
          renderTooltip={renderTooltip}
          posDomain={posDomain}
          xDomain={xDomain}
          glowFilterId={glowFilterId}
          trades={athleteTrades ?? []}
          onAddWorkout={() => setAddWorkoutOpen(true)}
          editedProfile={editedProfile}
          isEditingProfile={isEditing}
          onStartEditProfile={handleStartEditProfile}
          onCancelEditProfile={handleCancelEditProfile}
          onSaveProfile={handleSaveProfile}
          onProfileFieldChange={updateEditedProfile}
          onAvatarSelect={handleAvatarFileSelected}
          savingProfile={savingProfile}
          isLoading={isMyAthleteLoading}
          hasNextPage={Boolean(hasNextPage)}
          fetchNextPage={hasNextPage ? () => { void fetchNextPage(); } : undefined}
          isFetchingNextPage={isFetchingNextPage}
        />
        {modalStack}
      </>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 pb-32 pt-8 md:pb-8 overflow-x-hidden">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">My Athlete Profile</h1>
        <p className="text-muted-foreground">Manage your profile and workout timeline</p>
      </div>

      {/* Top-level tabs: Personal vs View Locker */}
      <Tabs value={currentTab} onValueChange={(v) => setTab(v as 'personal' | 'locker')} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="locker">View Locker</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <PersonalConsole
            athlete={myAthletePage?.athlete}
            workouts={workouts}
            posts={myAthletePage?.athlete?.posts ?? []}
            athleteTrades={athleteTrades ?? []}
            priceHistory={priceHistory}
            editedProfile={editedProfile}
            isEditing={isEditing}
            savingProfile={savingProfile}
            onStartEditProfile={handleStartEditProfile}
            onCancelEditProfile={handleCancelEditProfile}
            onSaveProfile={handleSaveProfile}
            onProfileFieldChange={updateEditedProfile}
            onAvatarSelect={handleAvatarFileSelected}
            onWorkoutEdit={handleEditWorkout}
            onWorkoutDelete={(id) => {
              setWorkoutToDelete(id);
              setDeleteDialogOpen(true);
            }}
            onAddWorkout={() => setAddWorkoutOpen(true)}
            hasNextPage={Boolean(hasNextPage)}
            fetchNextPage={hasNextPage ? () => { void fetchNextPage(); } : undefined}
            isFetchingNextPage={isFetchingNextPage}
          />
        </TabsContent>

        <TabsContent value="locker" className="mt-6">
          <LockerView athleteId={user?.id} athleteName={myAthletePage?.athlete?.name} />
        </TabsContent>
      </Tabs>

      <MobileActionBar
        actions={[
          {
            id: 'my-athlete-log-pos',
            label: 'Log PoS',
            icon: <Activity className="h-4 w-4" aria-hidden="true" />,
            variant: 'primary',
            onPress: handleMobileLogPos,
            ariaLabel: 'Log proof-of-sweat workout',
          },
          {
            id: 'my-athlete-share',
            label: 'Share',
            icon: <Share2 className="h-4 w-4" aria-hidden="true" />,
            variant: 'secondary',
            onPress: handleMobileShare,
            ariaLabel: 'Share your athlete profile',
          },
          {
            id: 'my-athlete-message',
            label: 'Message',
            icon: <MessageCircle className="h-4 w-4" aria-hidden="true" />,
            variant: 'ghost',
            onPress: handleMobileMessage,
            ariaLabel: 'Open messages',
          },
        ]}
      />
    </div>
      {modalStack}
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
