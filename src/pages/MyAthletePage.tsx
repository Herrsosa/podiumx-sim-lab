import { useState, useRef, useMemo, useCallback, useEffect, useId } from 'react';
import { Camera, Upload, Plus, X, Edit2, Save, Link as LinkIcon, TrendingUp, Link2, Edit, Trash2, MessageSquare, DollarSign, Activity, Share2, MessageCircle } from 'lucide-react';
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
import { resolveAvatarUrl, resolveImageUrl } from '@/utils/avatar';
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
  const { data: myAthletePage, pages, fetchNextPage, hasNextPage, isFetchingNextPage } = useMyAthlete();
  const { data: athleteTrades } = useAthleteTrades(user?.id || '');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workouts' | 'community' | 'messages' | 'earnings'>('workouts');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const messagesSectionRef = useRef<HTMLDivElement | null>(null);

  const [editedProfile, setEditedProfile] = useState<{
    displayName: string;
    sport: Sport;
    location: string;
    bio: string;
    avatar: string;
    socials: { instagram?: string; strava?: string; twitter?: string };
  }>({
    displayName: '',
    sport: 'Running' as Sport,
    location: '',
    bio: '',
    avatar: '',
    socials: {},
  });

  useEffect(() => {
    const athlete = myAthletePage?.athlete;
    if (athlete) {
      setEditedProfile({
        displayName: athlete.name || '',
        sport: athlete.sport || 'Running',
        location: athlete.location || '',
        bio: athlete.bio || '',
        avatar: athlete.avatar || '',
        socials: athlete.socials || {},
      });
    }
  }, [myAthletePage]);

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewAvatarFile(file);
      setEditedProfile({ ...editedProfile, avatar: URL.createObjectURL(file) });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

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

  return (
    <div className="container mx-auto px-4 pb-32 pt-8 md:pb-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">My Athlete Profile</h1>
        <p className="text-muted-foreground">Manage your profile and workout timeline</p>
      </div>

      {/* Profile Card */}
      <Card className="glass-card mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-primary/20">
                {(editedProfile.avatar || myAthletePage?.athlete?.avatar) ? (
                  <img
                    src={resolveAvatarUrl(editedProfile.avatar || myAthletePage?.athlete?.avatar, { size: 192 })}
                    alt={editedProfile.displayName}
                    width={96}
                    height={96}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      console.error('Failed to load avatar:', editedProfile.avatar);
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="flex h-full w-full items-center justify-center bg-muted"><svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              {isEditing && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Display Name</Label>
                      <Input
                        value={editedProfile.displayName}
                        onChange={(e) =>
                          setEditedProfile({ ...editedProfile, displayName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Sport</Label>
                      <Select
                        value={editedProfile.sport}
                        onValueChange={(sport) =>
                          setEditedProfile({ ...editedProfile, sport: sport as Sport })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Running">Running</SelectItem>
                          <SelectItem value="HYROX">HYROX</SelectItem>
                          <SelectItem value="Cycling">Cycling</SelectItem>
                          <SelectItem value="Triathlon">Triathlon</SelectItem>
                          <SelectItem value="CrossFit">CrossFit</SelectItem>
                          <SelectItem value="Swimming">Swimming</SelectItem>
                          <SelectItem value="Trail Run">Trail Run</SelectItem>
                          <SelectItem value="Rowing">Rowing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={editedProfile.location}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, location: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Bio</Label>
                    <Textarea
                      value={editedProfile.bio}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, bio: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>Instagram</Label>
                      <Input
                        value={editedProfile.socials.instagram || ''}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            socials: { ...editedProfile.socials, instagram: e.target.value },
                          })
                        }
                        placeholder="@username"
                      />
                    </div>
                    <div>
                      <Label>Strava</Label>
                      <Input
                        value={editedProfile.socials.strava || ''}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            socials: { ...editedProfile.socials, strava: e.target.value },
                          })
                        }
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <Label>Twitter</Label>
                      <Input
                        value={editedProfile.socials.twitter || ''}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            socials: { ...editedProfile.socials, twitter: e.target.value },
                          })
                        }
                        placeholder="@username"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold">{myAthletePage?.athlete?.name || 'No name'}</h2>
                    <div className="mt-2 flex gap-2">
                      <Badge>{myAthletePage?.athlete?.sport || 'Sport'}</Badge>
                      {myAthletePage?.athlete?.location && <Badge variant="outline">{myAthletePage.athlete.location}</Badge>}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{myAthletePage?.athlete?.bio || 'No bio'}</p>
                  {(myAthletePage?.athlete?.socials?.instagram || myAthletePage?.athlete?.socials?.strava) && (
                    <div className="flex gap-4 text-sm">
                      {myAthletePage?.athlete?.socials?.instagram && (
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {myAthletePage.athlete.socials.instagram}
                        </span>
                      )}
                      {myAthletePage?.athlete?.socials?.strava && (
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {myAthletePage.athlete.socials.strava}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveProfile} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditedProfile({
                          displayName: myAthletePage?.athlete?.name || '',
                          sport: (myAthletePage?.athlete?.sport || 'Running') as Sport,
                          location: myAthletePage?.athlete?.location || '',
                          bio: myAthletePage?.athlete?.bio || '',
                          avatar: myAthletePage?.athlete?.avatar || '',
                          socials: myAthletePage?.athlete?.socials || {},
                        });
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} className="gap-2">
                    <Edit2 className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Chart - Only for Athletes */}
      {myAthletePage?.athlete && priceHistory.length > 0 && (
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              PodiumPass Price Chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold">${myAthletePage?.athlete?.price.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="text-2xl font-bold">${myAthletePage?.athlete?.marketCap.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">24h Volume</p>
                <p className="text-2xl font-bold">${myAthletePage?.athlete?.volume24h.toFixed(2)}</p>
              </div>
            </div>
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
                  padding={{ right: 18 }}
                  tickFormatter={formatXAxisTick}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  width={60}
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
          </CardContent>
        </Card>
      )}

      {/* Tabs for Workouts, Community Chat, Messages, and Earnings */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'workouts' | 'community' | 'messages' | 'earnings')}
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

        {/* Workouts Tab */}
        <TabsContent value="workouts">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Workout Timeline</CardTitle>
                <Button className="gap-2" onClick={() => setAddWorkoutOpen(true)}>
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
                      onEdit={() => handleEditWorkout(workout)}
                      onDelete={() => handleDeleteClick(workout.id)}
                    />
                  ))}
                </div>
              )}
              {hasNextPage && (
                <div className="flex justify-center py-6">
                  <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <StravaCard className="mt-4" />
        </TabsContent>

        {/* Community Chat Tab */}
        <TabsContent value="community">
          {myAthletePage && user && (
            <TokengatedChat
              athleteId={user.id}
              athleteName={myAthletePage?.athlete?.name || ''}
              userHoldings={1}
              onBuyClick={() => {}}
            />
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <div ref={messagesSectionRef}>
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Direct messages feature coming soon!</p>
            </Card>
          </div>
        </TabsContent>

        {/* Earnings Tab */}
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

      {/* Add Workout Modal */}
      {user && (
        <AddWorkoutModal
          open={addWorkoutOpen}
          onOpenChange={setAddWorkoutOpen}
          athleteId={user.id}
          onSuccess={handleWorkoutSuccess}
        />
      )}

      {/* Edit Workout Modal */}
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

      {/* Delete Confirmation Dialog */}
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
