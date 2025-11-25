import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sport, Workout } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/utils/avatar";
import type { Database } from '@/integrations/supabase/types';
import { Upload, Dumbbell, Trophy, Eye, TrendingUp, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLocalStore } from "@/store/useLocalStore";
import { FaucetButton } from "@/components/FaucetButton";
import { useTrade } from "@/hooks/useTrade";
import { usePaginatedAthletes } from "@/hooks/usePaginatedAthletes";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useUser } from "@/store/auth";

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

type OnboardingStep =
  | 'ROLE_SELECTION'
  | 'FAN_PROFILE'
  | 'FAN_WALLET'
  | 'FAN_EXPLORE'
  | 'FAN_DONE'
  | 'ATHLETE_PROFILE'
  | 'ATHLETE_WORKOUT'
  | 'ATHLETE_TOKEN'
  | 'ATHLETE_DONE';

export default function Onboarding() {
  const navigate = useNavigate();
  const user = useUser();
  const queryClient = useQueryClient();
  const onboardingStatus = useOnboardingStatus();
  const { onboardingRole, setOnboardingRole } = useLocalStore();
  const [step, setStep] = useState<OnboardingStep>('ROLE_SELECTION');
  const [submitting, setSubmitting] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false);

  // Common profile fields
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Fan-specific
  const [hasBoughtToken, setHasBoughtToken] = useState(false);

  // Athlete-specific
  const [handle, setHandle] = useState("");
  const [sport, setSport] = useState<Sport>("Running");
  const [bio, setBio] = useState("");
  const [workoutType, setWorkoutType] = useState<Workout['type']>("Run");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  const [notes, setNotes] = useState("");
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);

  // Handle validation
  const [handleValidationStatus, setHandleValidationStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [handleValidationError, setHandleValidationError] = useState<string | null>(null);

  // Fan name validation - not needed for fans, just check if filled
  const isFanNameValid = name.trim().length > 0;

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (handle.length > 2) {
        setHandleValidationStatus('checking');
        const safeUsername = handle.toLowerCase().replace(/\s+/g, '').slice(0, 24);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', safeUsername)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setHandleValidationStatus('taken');
            setHandleValidationError('This handle is already taken or very similar to another.');
          } else {
            setHandleValidationStatus('available');
            setHandleValidationError(null);
          }
        } catch (error) {
          setHandleValidationStatus('idle');
          console.error('Error checking handle', error);
        }
      } else {
        setHandleValidationStatus('idle');
        setHandleValidationError(null);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [handle]);

  const { data: athletes } = usePaginatedAthletes();
  const trade = useTrade();

  const profileQueryKey = user ? ['onboarding-status', user.id] : ['onboarding-status'];

  const persistRoleSelection = async (role: 'fan' | 'athlete') => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      const fallbackHandleBase = user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '') || `user-${user.id.slice(0, 6)}`;
      const fallbackUsername = `${fallbackHandleBase}-${user.id.slice(0, 4)}`.toLowerCase();

      const payload: ProfileInsert = {
        id: user.id,
        role,
        onboarding_completed: false,
        username: existing?.username || fallbackUsername,
      };

      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) {
        console.error('Failed to persist onboarding role:', error);
      } else {
        await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      }
    } catch (error) {
      console.error('Failed to persist onboarding role:', error);
    }
  };

  const markOnboardingComplete = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    }
  };

  // Simple initialization - don't check for existing profile here
  // The ProtectedRoute component handles that logic now
  useEffect(() => {
    if (!user) {
      setCheckingProfile(false);
      return;
    }
    setCheckingProfile(false);
  }, [user]);

  const persistedRole = onboardingStatus.data?.role;

  useEffect(() => {
    if (!user || !persistedRole) return;
    if (step !== 'ROLE_SELECTION') return;

    setOnboardingRole(persistedRole as 'fan' | 'athlete');
    setStep(persistedRole === 'fan' ? 'FAN_PROFILE' : 'ATHLETE_PROFILE');
  }, [user, persistedRole, step, setOnboardingRole]);

  // Restore role selection from localStorage only if user has started onboarding
  useEffect(() => {
    if (onboardingRole && step === 'ROLE_SELECTION' && hasStartedOnboarding) {
      if (onboardingRole === 'fan') {
        setStep('FAN_PROFILE');
      } else {
        setStep('ATHLETE_PROFILE');
      }
    }
  }, [onboardingRole, hasStartedOnboarding, step]);

  const handleRoleSelection = (role: 'fan' | 'athlete') => {
    setHasStartedOnboarding(true);
    setOnboardingRole(role);
    void persistRoleSelection(role);
    if (role === 'fan') {
      setStep('FAN_PROFILE');
    } else {
      setStep('ATHLETE_PROFILE');
    }
  };

  // Fan Flow Handlers
  const handleFanProfileNext = async () => {
    if (!name) {
      toast.error("Please enter your name");
      return;
    }

    setSubmitting(true);
    try {
      if (!user) throw new Error('You must be signed in');

      let avatarUrl = avatar;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) {
          const message = uploadError.message?.toLowerCase() ?? '';
          if (message.includes('bucket not found') || message.includes('not found')) {
            console.warn('[onboarding] avatars bucket missing, skipping upload');
          } else {
            throw uploadError;
          }
        } else if (uploadData) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
          avatarUrl = urlData.publicUrl;
        }
      }

      const safeUsername = name.toLowerCase().replace(/\s+/g, '').slice(0, 24);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: name,
          username: safeUsername || `fan-${user.id.slice(0, 6)}`,
          avatar_url: avatarUrl || null,
          role: 'fan',
          onboarding_completed: false,
        });

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      setStep('FAN_WALLET');
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyToken = async (athleteId: string) => {
    try {
      await trade.mutateAsync({ athleteId, quantity: 1, side: 'BUY' });
      setHasBoughtToken(true);
      toast.success("Token purchased! You're now a supporter.");
    } catch (error) {
      // Error already handled by useTrade hook
    }
  };

  // Athlete Flow Handlers
  const handleAthleteProfileNext = () => {
    if (!name || !handle || !sport) {
      toast.error("Please fill in all required fields");
      return;
    }
    setStep('ATHLETE_WORKOUT');
  };



  const handleAthleteWorkoutNext = () => {
    if (!duration || !notes || !workoutDate) {
      toast.error("Please add your first workout details");
      return;
    }
    setStep('ATHLETE_TOKEN');
  };

  const handleSkipWorkout = () => {
    setStep('ATHLETE_TOKEN');
  };

  const handleAthleteComplete = async () => {
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        throw new Error('You must be logged in to complete onboarding');
      }

      const uid = authData.user.id;

      let avatarUrl: string | null = null;
      if (avatar && !avatar.startsWith('blob:')) {
        avatarUrl = avatar;
      }

      if (avatarFile) {
        try {
          const key = `${uid}/profile.jpg`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(key, avatarFile, {
            upsert: true,
            contentType: avatarFile.type || 'image/jpeg',
          });

          if (uploadError) {
            const message = uploadError.message?.toLowerCase() ?? '';
            if (message.includes('bucket not found') || message.includes('not found')) {
              console.warn('[onboarding] avatars bucket missing, continuing without upload');
            } else {
              throw uploadError;
            }
          } else {
            const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(key);
            avatarUrl = publicData.publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Avatar upload failed, continuing with default.', uploadErr);
        }
      }

      // 1. Upsert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: uid,
          display_name: name,
          username: handle.replace('@', ''),
          sport,
          bio,
          avatar_url: avatarUrl,
          role: 'athlete',
          onboarding_completed: false,
        });

      if (profileError) throw profileError;

      // 2. Create athlete token
      const { error: tokenError } = await supabase
        .from('athlete_tokens')
        .insert({
          athlete_id: uid,
          symbol: handle.replace('@', '').toUpperCase(),
          supply: 0,
          a: 0.0002,
          b: 0.02,
          c: 1,
          treasury_balance: 0,
          athlete_earnings: 0,
        });

      if (tokenError) throw tokenError;

      // 3. Create wallet if it doesn't exist
      const { error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_id: uid,
          balance: 1000,
        });

      if (walletError) {
        // Ignore 409/23505 (unique violation) if wallet already exists
        if (walletError.code !== '23505' && walletError.code !== '409') {
          throw walletError;
        }
      }

      // 4. Create first workout post (if not skipped)
      if (duration && notes) {
        const workoutData = {
          date: workoutDate,
          type: workoutType,
          distance: distance ? parseFloat(distance) : undefined,
          duration: parseInt(duration),
          notes,
          rpe: 7,
        };

        const { error: postError } = await supabase
          .from('posts')
          .insert({
            author_id: uid,
            text: notes,
            workout_json: workoutData,
          });

        if (postError) throw postError;
      }

      await markOnboardingComplete();

      setOnboardingRole(null);

      // Trigger confetti
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Show large welcome overlay instead of toast
      setStep('ATHLETE_DONE' as OnboardingStep); // New step for welcome

      // Delay navigation to let user see the welcome screen
      setTimeout(() => {
        navigate('/portfolio', { replace: true });
      }, 3000);

    } catch (error: unknown) {
      console.error('Onboarding error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const topAthletes = useMemo(() => {
    if (!athletes) return [];
    const filtered = user ? athletes.filter((athlete) => athlete.id !== user.id) : athletes;
    return filtered.slice(0, 3);
  }, [athletes, user]);

  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          {step !== 'ROLE_SELECTION' && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {onboardingRole === 'fan' && ['FAN_PROFILE', 'FAN_WALLET', 'FAN_EXPLORE'].map((s, i) => (
                  <div
                    key={s}
                    className={`w-12 h-1 rounded-full transition-colors ${['FAN_PROFILE', 'FAN_WALLET', 'FAN_EXPLORE'].indexOf(step) >= i ? "bg-primary" : "bg-muted"
                      }`}
                  />
                ))}
                {onboardingRole === 'athlete' && ['ATHLETE_PROFILE', 'ATHLETE_WORKOUT', 'ATHLETE_TOKEN'].map((s, i) => (
                  <div
                    key={s}
                    className={`w-12 h-1 rounded-full transition-colors ${['ATHLETE_PROFILE', 'ATHLETE_WORKOUT', 'ATHLETE_TOKEN'].indexOf(step) >= i ? "bg-primary" : "bg-muted"
                      }`}
                  />
                ))}
              </div>
            </div>
          )}

          <CardTitle className="text-3xl">
            {step === 'ROLE_SELECTION' && "Welcome to Athlyst"}
            {step === 'FAN_PROFILE' && "Create Your Profile"}
            {step === 'FAN_WALLET' && "Setup Your Wallet"}
            {step === 'FAN_EXPLORE' && "Discover Athletes"}
            {step === 'FAN_DONE' && "You're All Set!"}
            {step === 'ATHLETE_PROFILE' && "Create Your Profile"}
            {step === 'ATHLETE_WORKOUT' && "Share Your First Workout"}
            {step === 'ATHLETE_TOKEN' && "Launch Your Athlete Card"}
            {step === 'ATHLETE_DONE' && "Welcome to Athlyst!"}
          </CardTitle>

          <CardDescription>
            {step === 'ROLE_SELECTION' && "Choose how you want to participate"}
            {step === 'FAN_PROFILE' && "Tell us a bit about yourself"}
            {step === 'FAN_WALLET' && "Get some test funds to start trading"}
            {step === 'FAN_EXPLORE' && "Support your favorite athletes"}
            {step === 'ATHLETE_PROFILE' && "Tell us about yourself as an athlete"}
            {step === 'ATHLETE_WORKOUT' && "Show proof of grit with your first training"}
            {step === 'ATHLETE_TOKEN' && "Create your athlete token"}
            {step === 'ATHLETE_DONE' && "Your athlete identity is now live."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ROLE SELECTION */}
          {step === 'ROLE_SELECTION' && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleRoleSelection('fan')}
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <Eye className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">I'm a Fan</h3>
                    <p className="text-sm text-muted-foreground">
                      Explore athletes, buy tokens, and support your favorites
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleRoleSelection('athlete')}
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <Trophy className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">I'm an Athlete</h3>
                    <p className="text-sm text-muted-foreground">
                      Create your Athlete Card token and monetize your journey
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* FAN FLOW - PROFILE */}
          {step === 'FAN_PROFILE' && (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatar} className="object-cover" />
                    <AvatarFallback>{name?.charAt(0) || "F"}</AvatarFallback>
                  </Avatar>
                  <Label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-primary-foreground" />
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatar(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <Button onClick={handleFanProfileNext} disabled={submitting} className="w-full">
                {submitting ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          )}

          {/* FAN FLOW - WALLET */}
          {step === 'FAN_WALLET' && (
            <div className="space-y-6">
              <div className="p-6 bg-card border rounded-lg space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Your Wallet</h3>
                    <p className="text-sm text-muted-foreground">Funded with test USDC</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">1,000 USDC</div>
              </div>

              <FaucetButton />

              <Button onClick={() => setStep('FAN_EXPLORE')} className="w-full">
                Start Exploring
              </Button>
            </div>
          )}

          {/* FAN FLOW - EXPLORE */}
          {step === 'FAN_EXPLORE' && (
            <div className="space-y-6">
              <div className="grid gap-4">
                {topAthletes.map((athlete) => (
                  <div key={athlete.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={resolveAvatarUrl(athlete.avatar)} />
                        <AvatarFallback>{athlete.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{athlete.name}</p>
                        <p className="text-sm text-muted-foreground">{athlete.sport}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleBuyToken(athlete.id)}>
                      Buy
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={() => navigate('/marketplace')} className="w-full">
                Go to Marketplace
              </Button>
            </div>
          )}

          {/* ATHLETE FLOW - PROFILE */}
          {step === 'ATHLETE_PROFILE' && (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatar} className="object-cover" />
                    <AvatarFallback>{name?.charAt(0) || "A"}</AvatarFallback>
                  </Avatar>
                  <Label
                    htmlFor="athlete-avatar-upload"
                    className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-primary-foreground" />
                    <Input
                      id="athlete-avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatar(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Handle</Label>
                <div className="relative">
                  <Input
                    placeholder="@username"
                    value={handle}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setHandle(val);
                    }}
                    className={
                      handleValidationStatus === 'taken' ? 'border-destructive' :
                        handleValidationStatus === 'available' ? 'border-green-500' : ''
                    }
                  />
                  {handleValidationStatus === 'checking' && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
                {handleValidationError && (
                  <p className="text-xs text-destructive">{handleValidationError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sport</Label>
                <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Running">Running</SelectItem>
                    <SelectItem value="Cycling">Cycling</SelectItem>
                    <SelectItem value="Swimming">Swimming</SelectItem>
                    <SelectItem value="Triathlon">Triathlon</SelectItem>
                    <SelectItem value="CrossFit">CrossFit</SelectItem>
                    <SelectItem value="Hyrox">Hyrox</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  placeholder="Tell us about your athletic journey..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <Button onClick={handleAthleteProfileNext} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {/* ATHLETE FLOW - WORKOUT */}
          {step === 'ATHLETE_WORKOUT' && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={workoutType} onValueChange={(v) => setWorkoutType(v as Workout['type'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Run">Run</SelectItem>
                        <SelectItem value="Lift">Lift</SelectItem>
                        <SelectItem value="Cycle">Cycle</SelectItem>
                        <SelectItem value="Swim">Swim</SelectItem>
                        <SelectItem value="HIIT">HIIT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      placeholder="45"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes / Description</Label>
                  <Textarea
                    placeholder="How did it feel? What did you achieve?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('ATHLETE_PROFILE')} className="w-full">
                  Back
                </Button>
                <Button variant="ghost" onClick={handleSkipWorkout} className="w-full">
                  Skip for now
                </Button>
                <Button onClick={handleAthleteWorkoutNext} className="w-full">
                  Next
                </Button>
              </div>
            </>
          )}

          {/* ATHLETE FLOW - TOKEN */}
          {step === 'ATHLETE_TOKEN' && (
            <>
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <Trophy className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-semibold">Your Athlete Token</p>
                  <p className="text-sm text-muted-foreground">
                    Create tradeable shares in your athletic journey
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-6 bg-card border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Token Name</span>
                  <span className="font-semibold">{name || "Your Name"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Symbol</span>
                  <span className="font-semibold">{handle || "@handle"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Initial Supply</span>
                  <span className="font-semibold">0 (grows with trades)</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Starting Balance</span>
                  <span className="font-semibold text-primary">1,000 USDC</span>
                </div>
              </div>

              <FaucetButton />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('ATHLETE_WORKOUT')} className="w-full">
                  Back
                </Button>
                <Button onClick={handleAthleteComplete} disabled={submitting} className="w-full">
                  {submitting ? 'Creating...' : 'Launch Athlete Card 🚀'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
