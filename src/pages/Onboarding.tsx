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
import { Upload, Dumbbell, Trophy, Eye, TrendingUp, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocalStore } from "@/store/useLocalStore";
import { FaucetButton } from "@/components/FaucetButton";
import { useTrade } from "@/hooks/useTrade";
import { useAthletes } from "@/hooks/useAthletes";
import { initWallet } from "@/hooks/useTrade";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

type OnboardingStep = 
  | 'ROLE_SELECTION' 
  | 'FAN_PROFILE' 
  | 'FAN_WALLET' 
  | 'FAN_EXPLORE' 
  | 'FAN_DONE'
  | 'ATHLETE_PROFILE' 
  | 'ATHLETE_WORKOUT' 
  | 'ATHLETE_TOKEN';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: onboardingStatus } = useOnboardingStatus();
  const { onboardingRole, setOnboardingRole } = useLocalStore();
  const [step, setStep] = useState<OnboardingStep>('ROLE_SELECTION');
  const [submitting, setSubmitting] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false);

  // Common profile fields
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");

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

  const { data: athletes } = useAthletes();
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
      const payload: Record<string, unknown> = {
        id: user.id,
        role,
        onboarding_completed: false,
      };

      if (!existing?.username) {
        payload.username = `${fallbackHandleBase}-${user.id.slice(0, 4)}`.toLowerCase();
      }

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

  const persistedRole = onboardingStatus?.role;

  useEffect(() => {
    if (!user || !persistedRole) return;
    if (step !== 'ROLE_SELECTION') return;

    setOnboardingRole(persistedRole as 'fan' | 'athlete');
    setStep(persistedRole === 'fan' ? 'FAN_PROFILE' : 'ATHLETE_PROFILE');
  }, [user, persistedRole, step, setOnboardingRole]);

  // Initialize wallet on mount
  useEffect(() => {
    if (user) {
      initWallet();
    }
  }, [user]);

  // Restore role selection from localStorage only if user has started onboarding
  useEffect(() => {
    if (onboardingRole && step === 'ROLE_SELECTION' && hasStartedOnboarding) {
      if (onboardingRole === 'fan') {
        setStep('FAN_PROFILE');
      } else {
        setStep('ATHLETE_PROFILE');
      }
    }
  }, [onboardingRole, hasStartedOnboarding]);

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

      const safeUsername = name.toLowerCase().replace(/\s+/g, '').slice(0, 24);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: name,
          username: safeUsername || `fan-${user.id.slice(0, 6)}`,
          avatar_url: avatar || null,
          role: 'fan',
          onboarding_completed: false,
        });

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      setStep('FAN_WALLET');
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
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
    if (!duration || !notes) {
      toast.error("Please add your first workout details");
      return;
    }
    setStep('ATHLETE_TOKEN');
  };

  const handleAthleteComplete = async () => {
    if (!user) {
      toast.error("You must be logged in to complete onboarding");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upsert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: name,
          username: handle.replace('@', ''),
          sport,
          bio,
          avatar_url: avatar || null,
          role: 'athlete',
          onboarding_completed: false,
        });

      if (profileError) throw profileError;

      // 2. Create athlete token
      const { error: tokenError } = await supabase
        .from('athlete_tokens')
        .insert({
          athlete_id: user.id,
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
          user_id: user.id,
          balance: 1000,
        });

      if (walletError && walletError.code !== '23505') throw walletError;

      // 4. Create first workout post
      const workoutData = {
        date: new Date().toISOString().split('T')[0],
        type: workoutType,
        distance: distance ? parseFloat(distance) : undefined,
        duration: parseInt(duration),
        notes,
        rpe: 7,
      };

      const { error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          text: notes,
          workout_json: workoutData,
        });

      if (postError) throw postError;

      await markOnboardingComplete();

      // Clear onboarding state from localStorage
      setOnboardingRole(null);

      toast.success("Welcome to PodiumX! 🎉");
      navigate('/portfolio', { replace: true });
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const topAthletes = useMemo(() => {
    if (!athletes) return [];
    const filtered = user ? athletes.filter((athlete) => athlete.id !== user.id) : athletes;
    return filtered.slice(0, 3);
  }, [athletes, user?.id]);

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
                    className={`w-12 h-1 rounded-full transition-colors ${
                      ['FAN_PROFILE', 'FAN_WALLET', 'FAN_EXPLORE'].indexOf(step) >= i ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
                {onboardingRole === 'athlete' && ['ATHLETE_PROFILE', 'ATHLETE_WORKOUT', 'ATHLETE_TOKEN'].map((s, i) => (
                  <div
                    key={s}
                    className={`w-12 h-1 rounded-full transition-colors ${
                      ['ATHLETE_PROFILE', 'ATHLETE_WORKOUT', 'ATHLETE_TOKEN'].indexOf(step) >= i ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <CardTitle className="text-3xl">
            {step === 'ROLE_SELECTION' && "Welcome to PodiumX"}
            {step === 'FAN_PROFILE' && "Create Your Profile"}
            {step === 'FAN_WALLET' && "Setup Your Wallet"}
            {step === 'FAN_EXPLORE' && "Discover Athletes"}
            {step === 'FAN_DONE' && "You're All Set!"}
            {step === 'ATHLETE_PROFILE' && "Create Your Profile"}
            {step === 'ATHLETE_WORKOUT' && "Share Your First Workout"}
            {step === 'ATHLETE_TOKEN' && "Launch Your PodiumPass"}
          </CardTitle>

          <CardDescription>
            {step === 'ROLE_SELECTION' && "Choose how you want to participate"}
            {step === 'FAN_PROFILE' && "Tell us a bit about yourself"}
            {step === 'FAN_WALLET' && "Get some test funds to start trading"}
            {step === 'FAN_EXPLORE' && "Support your favorite athletes"}
            {step === 'ATHLETE_PROFILE' && "Tell us about yourself as an athlete"}
            {step === 'ATHLETE_WORKOUT' && "Show proof of grit with your first training"}
            {step === 'ATHLETE_TOKEN' && "Create your athlete token"}
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
                  <Button className="w-full">Continue as Fan</Button>
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
                      Create your PodiumPass token and monetize your journey
                    </p>
                  </div>
                  <Button className="w-full">Continue as Athlete</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* FAN FLOW - PROFILE */}
          {step === 'FAN_PROFILE' && (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{name[0] || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAvatar(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <Button onClick={handleFanProfileNext} disabled={submitting} className="w-full">
                {submitting ? 'Saving...' : 'Continue'}
              </Button>
            </>
          )}

          {/* FAN FLOW - WALLET */}
          {step === 'FAN_WALLET' && (
            <>
              <div className="space-y-4 p-6 bg-card border rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold">Your Wallet is Ready</p>
                    <p className="text-sm text-muted-foreground">
                      Get some test USDC to start trading
                    </p>
                  </div>
                </div>
                <FaucetButton />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('FAN_PROFILE')} className="w-full">
                  Back
                </Button>
                <Button onClick={() => setStep('FAN_EXPLORE')} className="w-full">
                  Continue
                </Button>
              </div>
            </>
          )}

          {/* FAN FLOW - EXPLORE */}
          {step === 'FAN_EXPLORE' && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold">Suggested Athletes</p>
                    <p className="text-sm text-muted-foreground">
                      Buy 1 token to support an athlete
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {topAthletes.map((athlete) => (
                    <Card key={athlete.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={athlete.avatar} />
                            <AvatarFallback>{athlete.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{athlete.name}</p>
                            <p className="text-sm text-muted-foreground">{athlete.sport}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="font-bold">${athlete.price.toFixed(2)}</p>
                          <Button
                            size="sm"
                            onClick={() => handleBuyToken(athlete.id)}
                            disabled={trade.isPending}
                            className="mt-2"
                          >
                            Buy 1 Token
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('FAN_WALLET')} className="w-full">
                  Back
                </Button>
                <Button
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      await markOnboardingComplete();
                      setOnboardingRole(null);
                      navigate('/portfolio', { replace: true });
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="w-full"
                  disabled={submitting}
                >
                  {hasBoughtToken ? 'Go to Marketplace' : 'Skip for Now'}
                </Button>
              </div>
            </>
          )}

          {/* ATHLETE FLOW - PROFILE */}
          {step === 'ATHLETE_PROFILE' && (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{name[0] || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('athlete-avatar-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                  <input
                    id="athlete-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAvatar(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="athlete-name">Full Name *</Label>
                <Input
                  id="athlete-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handle">Handle *</Label>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@johndoe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sport">Primary Sport *</Label>
                <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
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

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your athletic journey..."
                  rows={4}
                />
              </div>

              <Button onClick={handleAthleteProfileNext} className="w-full">
                Continue
              </Button>
            </>
          )}

          {/* ATHLETE FLOW - WORKOUT */}
          {step === 'ATHLETE_WORKOUT' && (
            <>
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <Dumbbell className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-semibold">Proof of Grit</p>
                  <p className="text-sm text-muted-foreground">
                    Share your latest training session
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workoutType">Workout Type *</Label>
                <Select value={workoutType} onValueChange={(v) => setWorkoutType(v as Workout['type'])}>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="5.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Workout Notes *</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did it feel? What did you accomplish?"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('ATHLETE_PROFILE')} className="w-full">
                  Back
                </Button>
                <Button onClick={handleAthleteWorkoutNext} className="w-full">
                  Continue
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
                  {submitting ? 'Creating...' : 'Launch PodiumPass 🚀'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
