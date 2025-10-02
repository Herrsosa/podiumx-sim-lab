import { useState, useRef, useMemo } from 'react';
import { Camera, Upload, Plus, X, Edit2, Save, Link as LinkIcon, TrendingUp, Link2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import { Workout } from '@/types';
import { toast } from 'sonner';

export default function MyAthlete() {
  const { userProfile, userAthleteId, athletes, trades, updateProfile, addWorkout, deleteWorkout } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(userProfile);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const userAthlete = useMemo(() => 
    athletes.find(a => a.id === userAthleteId),
    [athletes, userAthleteId]
  );

  const priceHistory = useMemo(() => {
    if (!userAthleteId) return [];
    
    // Get trades for this athlete
    const athleteTrades = trades.filter(t => t.athleteId === userAthleteId);
    
    // Generate price history from trades
    const history = athleteTrades.map(trade => ({
      timestamp: trade.timestamp,
      price: trade.price,
      date: new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })).reverse();

    // Add current price
    if (userAthlete) {
      history.push({
        timestamp: Date.now(),
        price: userAthlete.price,
        date: 'Now',
      });
    }

    return history;
  }, [userAthleteId, trades, userAthlete]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedProfile({ ...editedProfile, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    updateProfile(editedProfile);
    setIsEditing(false);
    toast.success('Profile updated!');
  };

  const handleAddWorkout = (workout: Omit<Workout, 'id'>) => {
    addWorkout(workout);
    setAddWorkoutOpen(false);
    toast.success('Workout added!');
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
                {editedProfile.avatar ? (
                  <img
                    src={editedProfile.avatar}
                    alt={editedProfile.displayName}
                    className="h-full w-full object-cover"
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
                          setEditedProfile({ ...editedProfile, sport: sport as any })
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
                    <h2 className="text-2xl font-bold">{userProfile.displayName}</h2>
                    <div className="mt-2 flex gap-2">
                      <Badge>{userProfile.sport}</Badge>
                      <Badge variant="outline">{userProfile.location}</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{userProfile.bio}</p>
                  {(userProfile.socials.instagram ||
                    userProfile.socials.strava ||
                    userProfile.socials.twitter) && (
                    <div className="flex gap-4 text-sm">
                      {userProfile.socials.instagram && (
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {userProfile.socials.instagram}
                        </span>
                      )}
                      {userProfile.socials.strava && (
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {userProfile.socials.strava}
                        </span>
                      )}
                      {userProfile.socials.twitter && (
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {userProfile.socials.twitter}
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
                        setEditedProfile(userProfile);
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

      {/* Price Chart */}
      {userAthlete && priceHistory.length > 0 && (
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
                <p className="text-2xl font-bold">${userAthlete.price.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="text-2xl font-bold">${userAthlete.marketCap.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">24h Volume</p>
                <p className="text-2xl font-bold">${userAthlete.volume24h.toFixed(2)}</p>
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

      {/* Workouts Timeline */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workout Timeline</CardTitle>
            <Dialog open={addWorkoutOpen} onOpenChange={setAddWorkoutOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Workout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Workout</DialogTitle>
                </DialogHeader>
                <AddWorkoutForm onSubmit={handleAddWorkout} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {userProfile.workouts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No workouts yet. Add your first workout to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {userProfile.workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onDelete={() => {
                    deleteWorkout(workout.id);
                    toast.success('Workout deleted');
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddWorkoutForm({ onSubmit }: { onSubmit: (workout: Omit<Workout, 'id'>) => void }) {
  const [importMode, setImportMode] = useState<'manual' | 'strava' | 'garmin' | 'apple'>('manual');
  const [activityUrl, setActivityUrl] = useState('');
  const [workout, setWorkout] = useState<Omit<Workout, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Run',
    duration: 0,
    rpe: 5,
    notes: '',
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        setWorkout({ ...workout, mediaUrl: reader.result as string, mediaType });
      };
      reader.readAsDataURL(file);
    }
  };

  const calculatePace = () => {
    if (workout.distance && workout.duration) {
      const paceMinPerKm = workout.duration / workout.distance;
      const mins = Math.floor(paceMinPerKm);
      const secs = Math.floor((paceMinPerKm - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')} /km`;
    }
    return '';
  };

  const handleSubmit = () => {
    if (importMode !== 'manual' && !activityUrl) {
      toast.error('Please provide an activity URL');
      return;
    }
    if (workout.duration <= 0) {
      toast.error('Duration must be greater than 0');
      return;
    }
    const pace = calculatePace();
    const notes = importMode !== 'manual' 
      ? `${workout.notes}\n\nImported from ${importMode}: ${activityUrl}`
      : workout.notes;
    onSubmit({ ...workout, pace: pace || undefined, notes });
  };

  return (
    <Tabs defaultValue="manual" className="w-full" onValueChange={(v) => setImportMode(v as any)}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="manual">Manual</TabsTrigger>
        <TabsTrigger value="strava">
          <Link2 className="h-4 w-4 mr-1" />
          Strava
        </TabsTrigger>
        <TabsTrigger value="garmin">
          <Link2 className="h-4 w-4 mr-1" />
          Garmin
        </TabsTrigger>
        <TabsTrigger value="apple">
          <Link2 className="h-4 w-4 mr-1" />
          Apple
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="space-y-4 mt-4">
        <ManualWorkoutForm 
          workout={workout}
          setWorkout={setWorkout}
          mediaFile={mediaFile}
          setMediaFile={setMediaFile}
          mediaInputRef={mediaInputRef}
          handleMediaChange={handleMediaChange}
        />
      </TabsContent>

      <TabsContent value="strava" className="space-y-4 mt-4">
        <ImportWorkoutForm
          service="Strava"
          activityUrl={activityUrl}
          setActivityUrl={setActivityUrl}
          workout={workout}
          setWorkout={setWorkout}
          placeholder="https://www.strava.com/activities/..."
        />
      </TabsContent>

      <TabsContent value="garmin" className="space-y-4 mt-4">
        <ImportWorkoutForm
          service="Garmin"
          activityUrl={activityUrl}
          setActivityUrl={setActivityUrl}
          workout={workout}
          setWorkout={setWorkout}
          placeholder="https://connect.garmin.com/modern/activity/..."
        />
      </TabsContent>

      <TabsContent value="apple" className="space-y-4 mt-4">
        <ImportWorkoutForm
          service="Apple Watch"
          activityUrl={activityUrl}
          setActivityUrl={setActivityUrl}
          workout={workout}
          setWorkout={setWorkout}
          placeholder="Export your workout from Apple Health"
        />
      </TabsContent>

      <Button className="w-full" onClick={handleSubmit}>
        Add Workout
      </Button>
    </Tabs>
  );
}

interface ManualWorkoutFormProps {
  workout: Omit<Workout, 'id'>;
  setWorkout: (workout: Omit<Workout, 'id'>) => void;
  mediaFile: File | null;
  setMediaFile: (file: File | null) => void;
  mediaInputRef: React.RefObject<HTMLInputElement>;
  handleMediaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ManualWorkoutForm({ workout, setWorkout, mediaFile, mediaInputRef, handleMediaChange }: ManualWorkoutFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={workout.date}
            onChange={(e) => setWorkout({ ...workout, date: e.target.value })}
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select
            value={workout.type}
            onValueChange={(type) => setWorkout({ ...workout, type: type as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Run">Run</SelectItem>
              <SelectItem value="HYROX">HYROX</SelectItem>
              <SelectItem value="Swim">Swim</SelectItem>
              <SelectItem value="Bike">Bike</SelectItem>
              <SelectItem value="Strength">Strength</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Distance (km)</Label>
          <Input
            type="number"
            step="0.1"
            value={workout.distance || ''}
            onChange={(e) =>
              setWorkout({ ...workout, distance: parseFloat(e.target.value) || undefined })
            }
            placeholder="Optional"
          />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={workout.duration || ''}
            onChange={(e) => setWorkout({ ...workout, duration: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label>RPE (1-10)</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={workout.rpe}
          onChange={(e) =>
            setWorkout({ ...workout, rpe: Math.min(10, Math.max(1, parseInt(e.target.value))) })
          }
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={workout.notes}
          onChange={(e) => setWorkout({ ...workout, notes: e.target.value })}
          rows={3}
          placeholder="How did it feel?"
        />
      </div>

      <div>
        <Label>Media (Image or Video)</Label>
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleMediaChange}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => mediaInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {mediaFile ? mediaFile.name : 'Upload Media'}
        </Button>
      </div>

      {workout.mediaUrl && (
        <div className="relative">
          {workout.mediaType === 'image' ? (
            <img
              src={workout.mediaUrl}
              alt="Workout"
              className="h-48 w-full rounded-lg object-cover"
            />
          ) : (
            <video src={workout.mediaUrl} className="h-48 w-full rounded-lg object-cover" controls />
          )}
          <Button
            size="icon"
            variant="destructive"
            className="absolute right-2 top-2 h-8 w-8 rounded-full"
            onClick={() => {
              setWorkout({ ...workout, mediaUrl: undefined, mediaType: undefined });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface ImportWorkoutFormProps {
  service: string;
  activityUrl: string;
  setActivityUrl: (url: string) => void;
  workout: Omit<Workout, 'id'>;
  setWorkout: (workout: Omit<Workout, 'id'>) => void;
  placeholder: string;
}

function ImportWorkoutForm({ service, activityUrl, setActivityUrl, workout, setWorkout, placeholder }: ImportWorkoutFormProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-primary/10 rounded-lg">
        <p className="text-sm font-medium mb-2">Import from {service}</p>
        <p className="text-xs text-muted-foreground">
          Paste the link to your {service} activity below, then fill in the workout details.
        </p>
      </div>

      <div>
        <Label htmlFor="activityUrl">Activity URL</Label>
        <Input
          id="activityUrl"
          type="url"
          value={activityUrl}
          onChange={(e) => setActivityUrl(e.target.value)}
          placeholder={placeholder}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={workout.date}
            onChange={(e) => setWorkout({ ...workout, date: e.target.value })}
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select
            value={workout.type}
            onValueChange={(type) => setWorkout({ ...workout, type: type as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Run">Run</SelectItem>
              <SelectItem value="HYROX">HYROX</SelectItem>
              <SelectItem value="Swim">Swim</SelectItem>
              <SelectItem value="Bike">Bike</SelectItem>
              <SelectItem value="Strength">Strength</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Distance (km)</Label>
          <Input
            type="number"
            step="0.1"
            value={workout.distance || ''}
            onChange={(e) =>
              setWorkout({ ...workout, distance: parseFloat(e.target.value) || undefined })
            }
            placeholder="Optional"
          />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={workout.duration || ''}
            onChange={(e) => setWorkout({ ...workout, duration: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label>RPE (1-10)</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={workout.rpe}
          onChange={(e) =>
            setWorkout({ ...workout, rpe: Math.min(10, Math.max(1, parseInt(e.target.value))) })
          }
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={workout.notes}
          onChange={(e) => setWorkout({ ...workout, notes: e.target.value })}
          rows={3}
          placeholder="Additional notes about this workout..."
        />
      </div>
    </div>
  );
}

function WorkoutCard({ workout, onDelete }: { workout: Workout; onDelete: () => void }) {
  return (
    <div className="rounded-lg border border-border/50 p-4 transition-all hover:border-primary/30">
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

        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
