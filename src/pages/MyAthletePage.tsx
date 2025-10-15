import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Camera, Upload, Plus, X, Edit2, Save, Link as LinkIcon, TrendingUp, Link2, Edit, Trash2, MessageSquare, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
import { useAuth } from '@/hooks/useAuth';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import { useAthleteTrades } from '@/hooks/useAthleteTrades';
import { useWorkoutEditor } from '@/hooks/useWorkoutEditor';

import { supabase } from '@/integrations/supabase/client';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import { StravaCard } from '@/components/strava/StravaCard';
import { DirectMessages } from '@/components/DirectMessages';
import TokengatedChat from '@/components/TokengatedChat';
import { useQueryClient } from '@tanstack/react-query';
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
  const { user } = useAuth();
  const { data: myAthletePage, pages, fetchNextPage, hasNextPage, isFetchingNextPage } = useMyAthlete();
  const { data: athleteTrades } = useAthleteTrades(user?.id || '');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const priceHistory = useMemo(() => {
    const athlete = myAthletePage?.athlete;
    if (!user?.id || !athleteTrades || !athlete) return [];
    const history = athleteTrades.map((trade: any) => ({
      timestamp: trade.timestamp,
      price: trade.price_after as number,
      date: new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })).reverse();
    history.push({
      timestamp: Date.now(),
      price: athlete.price,
      date: 'Now',
    });
    return history;
  }, [user?.id, athleteTrades, myAthletePage]);

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

  return (
    <div className="container mx-auto px-4 py-8">
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
                    src={editedProfile.avatar || myAthletePage?.athlete?.avatar}
                    alt={editedProfile.displayName}
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
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Workouts, Community Chat, Messages, and Earnings */}
      <Tabs defaultValue="workouts" className="w-full">
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
          <DirectMessages />
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
      {editingWorkout && (
        <EditWorkoutModal
          open={open}
          onOpenChange={setOpen}
          workoutPost={{
            ...editingWorkout,
            workout_json: editingWorkout.workout_json as any as Workout
          }}
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
                  src={workout.mediaUrl}
                  alt="Workout"
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
