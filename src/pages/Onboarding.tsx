import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sport, Workout } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Dumbbell, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Profile
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [sport, setSport] = useState<Sport>("Running");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");

  // Step 2: First Workout
  const [workoutType, setWorkoutType] = useState<Workout['type']>("Run");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  // Step 3: Token
  const [tokenSupply, setTokenSupply] = useState("10000");
  const [additionalTokens, setAdditionalTokens] = useState("0");

  const handleStep1Next = () => {
    if (!name || !handle || !sport) {
      toast.error("Please fill in all required fields");
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!duration || !notes) {
      toast.error("Please add your first workout details");
      return;
    }
    setStep(3);
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error("You must be logged in to complete onboarding");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upsert profile (create or update)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: name,
          username: handle.replace('@', ''),
          sport,
          bio,
          avatar_url: avatar || null,
        })
        .select()
        .single();

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
          balance: 1000, // Starting balance
        })
        .select()
        .single();

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

      toast.success("Welcome to PodiumX! 🎉");
      navigate("/marketplace");
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-12 h-1 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              Step {step} of 3
            </span>
          </div>
          <CardTitle className="text-3xl">
            {step === 1 && "Create Your Profile"}
            {step === 2 && "Share Your First Workout"}
            {step === 3 && "Launch Your PodiumPass"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Tell us about yourself as an athlete"}
            {step === 2 && "Show proof of grit with your first training"}
            {step === 3 && "Create your athlete token"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
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
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
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

              <Button onClick={handleStep1Next} className="w-full">
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
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
                <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                  Back
                </Button>
                <Button onClick={handleStep2Next} className="w-full">
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
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
                  <span className="font-semibold">{tokenSupply}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Initial Price</span>
                  <span className="font-semibold">$0.10</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">You'll receive</span>
                  <span className="font-semibold text-primary">1 token (FREE)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supply">Token Supply</Label>
                <Input
                  id="supply"
                  type="number"
                  value={tokenSupply}
                  onChange={(e) => setTokenSupply(e.target.value)}
                  placeholder="10000"
                />
                <p className="text-xs text-muted-foreground">
                  More tokens = lower initial price and easier for fans to buy in
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="w-full">
                  Back
                </Button>
                <Button onClick={handleComplete} disabled={submitting} className="w-full">
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
