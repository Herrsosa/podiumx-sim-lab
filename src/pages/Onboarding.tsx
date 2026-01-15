import { useState, useEffect } from "react";
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
import type { Database } from '@/integrations/supabase/types';
import { Upload, Trophy, ShoppingBag, Dumbbell, Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useUser } from "@/store/auth";
import { WORKOUT_TYPES, DISTANCE_WORKOUT_TYPES, WorkoutTypeValue } from "@/constants/workoutTypes";

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

type OnboardingStep =
  | 'PROFILE'
  | 'WALLET'
  | 'WORKOUT'
  | 'CARD_DECISION'
  | 'TOKEN_LAUNCH'
  | 'DONE';

export default function Onboarding() {
  const navigate = useNavigate();
  const user = useUser();
  const queryClient = useQueryClient();
  const onboardingStatus = useOnboardingStatus();
  const [step, setStep] = useState<OnboardingStep>('PROFILE');
  const [submitting, setSubmitting] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Profile fields
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [sport, setSport] = useState<Sport>("Running");
  const [bio, setBio] = useState("");

  // Workout fields
  const [workoutType, setWorkoutType] = useState<WorkoutTypeValue>("Run");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState("5");
  const [notes, setNotes] = useState("");
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);

  // Token launch fields
  const [handle, setHandle] = useState("");
  const [handleValidationStatus, setHandleValidationStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [handleValidationError, setHandleValidationError] = useState<string | null>(null);

  const profileQueryKey = user ? ['onboarding-status', user.id] : ['onboarding-status'];

  // Handle validation
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
            setHandleValidationError('This handle is already taken.');
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

    return () => clearTimeout(handler);
  }, [handle]);

  // Check if user is already onboarded
  useEffect(() => {
    if (!user) {
      setCheckingProfile(false);
      return;
    }

    if (onboardingStatus.data?.onboardingCompleted) {
      navigate('/marketplace', { replace: true });
      return;
    }

    setCheckingProfile(false);
  }, [user, onboardingStatus.data, navigate]);

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

  // Step 1: Profile
  const handleProfileNext = async () => {
    if (!name || !sport) {
      toast.error("Please fill in all required fields");
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
          if (!message.includes('bucket not found') && !message.includes('not found')) {
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
          username: safeUsername || `athlete-${user.id.slice(0, 6)}`,
          avatar_url: avatarUrl || null,
          sport,
          bio: bio || null,
          role: 'athlete', // Everyone is an athlete
          onboarding_completed: false,
        });

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      setStep('WALLET');
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Wallet (just show, continue)
  const handleWalletNext = () => {
    setStep('WORKOUT');
  };

  // Step 3: Workout (optional)
  const handleWorkoutNext = () => {
    setStep('CARD_DECISION');
  };

  const handleSkipWorkout = () => {
    setStep('CARD_DECISION');
  };

  // Step 4: Card Decision
  const handleLaunchCard = () => {
    setStep('TOKEN_LAUNCH');
  };

  const handleSkipCard = async () => {
    await saveWorkoutAndComplete(false);
  };

  // Step 5: Token Launch
  const handleTokenLaunch = async () => {
    await saveWorkoutAndComplete(true);
  };

  const saveWorkoutAndComplete = async (launchToken: boolean) => {
    setSubmitting(true);
    try {
      if (!user) throw new Error('You must be logged in');

      const uid = user.id;

      // 1. Create or update wallet with 1000 USDC starting balance
      const { error: walletError } = await supabase
        .from('wallets')
        .upsert(
          { user_id: uid, balance: 1000 },
          { onConflict: 'user_id' }
        );

      if (walletError) {
        console.error('Wallet upsert error:', walletError);
        throw walletError;
      }

      // 2. Create workout post if filled
      if (duration && notes) {
        const workoutData = {
          date: workoutDate,
          type: workoutType,
          distance: distance ? parseFloat(distance) : undefined,
          duration: parseInt(duration),
          notes,
          rpe: parseInt(rpe),
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

      // 3. Create athlete token if launching
      if (launchToken) {
        if (!handle || handleValidationStatus !== 'available') {
          toast.error("Please choose a valid handle");
          setSubmitting(false);
          return;
        }

        const safeHandle = handle.replace('@', '').toLowerCase();

        // Update profile with handle
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username: safeHandle })
          .eq('id', uid);

        if (profileError) throw profileError;

        // Create token
        const { error: tokenError } = await supabase
          .from('athlete_tokens')
          .insert({
            athlete_id: uid,
            symbol: safeHandle.toUpperCase(),
            supply: 0,
            a: 0.0002,
            b: 0.02,
            c: 1,
            treasury_balance: 0,
            athlete_earnings: 0,
          });

        if (tokenError) throw tokenError;
      }

      // 4. Mark onboarding complete
      await markOnboardingComplete();

      // Trigger confetti
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setStep('DONE');

      // Redirect after delay
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

  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1 h-1 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-20 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 bg-muted rounded animate-pulse mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressSteps = ['PROFILE', 'WALLET', 'WORKOUT', 'CARD_DECISION', 'TOKEN_LAUNCH'];
  const currentStepIndex = progressSteps.indexOf(step);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          {step !== 'DONE' && (
            <div className="flex gap-2 mb-4">
              {progressSteps.map((s, i) => (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full transition-colors ${i <= currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                />
              ))}
            </div>
          )}

          <CardTitle className="text-3xl">
            {step === 'PROFILE' && "Welcome to Athlyst"}
            {step === 'WALLET' && "Setup Your Wallet"}
            {step === 'WORKOUT' && "Share Your First Workout"}
            {step === 'CARD_DECISION' && "Launch Your Athlete Card?"}
            {step === 'TOKEN_LAUNCH' && "Choose Your Handle"}
            {step === 'DONE' && "Welcome to Athlyst!"}
          </CardTitle>

          <CardDescription>
            {step === 'PROFILE' && "Tell us about yourself"}
            {step === 'WALLET' && "Get test funds to start trading"}
            {step === 'WORKOUT' && "Optional: Show your first proof of sweat"}
            {step === 'CARD_DECISION' && "Create your athlete token or do it later"}
            {step === 'TOKEN_LAUNCH' && "Pick a unique handle for your athlete card"}
            {step === 'DONE' && "Your athlete journey starts now"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* PROFILE STEP */}
          {step === 'PROFILE' && (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatar} className="object-cover" />
                    <AvatarFallback>{name?.charAt(0) || "A"}</AvatarFallback>
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
                <Label>Display Name *</Label>
                <Input
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Primary Sport *</Label>
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
                    <SelectItem value="HYROX">HYROX</SelectItem>
                    <SelectItem value="Trail Run">Trail Run</SelectItem>
                    <SelectItem value="Rowing">Rowing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bio (optional)</Label>
                <Textarea
                  placeholder="Tell us about your athletic journey..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <Button onClick={handleProfileNext} disabled={submitting} className="w-full">
                {submitting ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          )}

          {/* WALLET STEP */}
          {step === 'WALLET' && (
            <div className="space-y-6">
              <div className="p-6 bg-card border rounded-lg space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Your Wallet</h3>
                    <p className="text-sm text-muted-foreground">You're all set to start trading</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-primary">1,000 USDC</div>
                <p className="text-sm text-muted-foreground">
                  This is test currency for exploring the platform. Use it to buy Athlete Cards!
                </p>
              </div>

              <Button onClick={handleWalletNext} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {/* WORKOUT STEP */}
          {step === 'WORKOUT' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Dumbbell className="inline w-4 h-4 mr-1" />
                  Add your first workout to show proof of sweat (you can skip this)
                </p>
              </div>

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
                  <Select value={workoutType} onValueChange={(v) => setWorkoutType(v as WorkoutTypeValue)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKOUT_TYPES.map((wt) => (
                        <SelectItem key={wt.value} value={wt.value}>{wt.label}</SelectItem>
                      ))}
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

              {DISTANCE_WORKOUT_TYPES.includes(workoutType) && (
                <div className="space-y-2">
                  <Label>Distance (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="10.5"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>RPE (Rate of Perceived Exertion: 1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="How did it feel? What did you achieve?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('WALLET')} className="w-full">
                  Back
                </Button>
                <Button variant="ghost" onClick={handleSkipWorkout} className="w-full">
                  Skip
                </Button>
                <Button onClick={handleWorkoutNext} className="w-full">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* CARD DECISION STEP */}
          {step === 'CARD_DECISION' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                  onClick={handleLaunchCard}
                >
                  <CardContent className="pt-6 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 bg-primary/10 rounded-full">
                        <Rocket className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Launch My Card</h3>
                      <p className="text-sm text-muted-foreground">
                        Create your athlete token and start building your community
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                  onClick={handleSkipCard}
                >
                  <CardContent className="pt-6 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 bg-muted/30 rounded-full">
                        <Trophy className="w-8 h-8 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">I'll Do This Later</h3>
                      <p className="text-sm text-muted-foreground">
                        Explore the marketplace and launch your card when ready
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button variant="outline" onClick={() => setStep('WORKOUT')} className="w-full">
                Back
              </Button>
            </div>
          )}

          {/* TOKEN LAUNCH STEP */}
          {step === 'TOKEN_LAUNCH' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <Trophy className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-semibold">Your Athlete Token</p>
                  <p className="text-sm text-muted-foreground">
                    Pick a unique handle for your athlete card
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Handle *</Label>
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
                {handleValidationStatus === 'available' && (
                  <p className="text-xs text-green-600">Handle is available!</p>
                )}
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
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('CARD_DECISION')} className="w-full">
                  Back
                </Button>
                <Button onClick={handleTokenLaunch} disabled={submitting || handleValidationStatus !== 'available'} className="w-full">
                  {submitting ? 'Launching...' : 'Launch Athlete Card 🚀'}
                </Button>
              </div>
            </div>
          )}

          {/* DONE STEP */}
          {step === 'DONE' && (
            <div className="text-center space-y-6 py-8">
              <div className="flex justify-center">
                <div className="p-6 bg-primary/10 rounded-full">
                  <Trophy className="w-16 h-16 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
                <p className="text-muted-foreground">
                  Your athlete journey starts now. Redirecting...
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
