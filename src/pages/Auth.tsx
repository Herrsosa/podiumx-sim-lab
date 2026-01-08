import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Instagram, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Waitlist State
  const [isWaitlistMode, setIsWaitlistMode] = useState(true);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { level: 'weak' | 'medium' | 'strong'; score: number } => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 'weak', score };
    if (score <= 4) return { level: 'medium', score };
    return { level: 'strong', score };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const redirectTarget = useMemo(() => {
    const sanitizePath = (value?: string | null) => {
      if (!value) return null;
      if (!value.startsWith('/') || value.startsWith('//')) return null;
      if (value === '/auth') return null;
      return value;
    };

    const stateRedirect = sanitizePath(
      ((location.state as { redirectTo?: string } | null)?.redirectTo) ?? undefined,
    );
    const queryRedirect = sanitizePath(new URLSearchParams(location.search).get('redirect'));

    return stateRedirect ?? queryRedirect ?? '/onboarding';
  }, [location]);

  useEffect(() => {
    // Check for invite code
    const params = new URLSearchParams(location.search);
    const inviteCode = params.get('invite');
    if (inviteCode === 'ATHLYST2025') {
      setIsWaitlistMode(false);
    }

    let isMounted = true;

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        if (!session.user.email_confirmed_at) {
          navigate('/verify-email');
        } else {
          navigate(redirectTarget, { replace: true });
        }
      }
    });

    // Listen for auth changes (sign-up or sign-in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        if (!session.user.email_confirmed_at) {
          navigate('/verify-email');
        } else {
          navigate(redirectTarget, { replace: true });
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, redirectTarget, location.search]);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistError("");

    if (!waitlistEmail || !isValidEmail(waitlistEmail)) {
      setWaitlistError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      // Table definition added to types.ts
      const { error } = await supabase.from('waitlist').insert({
        email: waitlistEmail,
      });

      if (error) {
        if (error.code === '23505') { // Unique violation
          setWaitlistSuccess(true); // Treat duplicate as success to not leak info/annoy user
          return;
        }
        throw error;
      }

      setWaitlistSuccess(true);
      setWaitlistEmail(""); // Clear email on success
    } catch (error: unknown) {
      console.error('Waitlist error:', error);
      setWaitlistError("Something went wrong – please try again in a moment to build that Athlete Identity.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure both passwords match.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      toast({
        title: "Check your email!",
        description: "We've sent you a verification link to complete your signup.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Sign up failed',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Sign in failed',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      setIsResettingPassword(false);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send reset email',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements - Gritty Warehouse Style (Same as Landing) */}
      <div className="absolute inset-0 bg-background">
        <div
          className="absolute inset-0 bg-cover bg-[65%_center] md:bg-center bg-no-repeat opacity-50"
          style={{ backgroundImage: "url('/gym-background-v2.png')" }}
        />
        {/* Subtle overlay to ensure text readability without hiding the image */}
        <div className="absolute inset-0 bg-background/30" />
        {/* Gradient to fade into the next section */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Athlyst</CardTitle>
          <CardDescription className="text-center">
            Join and build that Athlete Identity!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResettingPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-center">Reset Password</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsResettingPassword(false)}
                  disabled={loading}
                >
                  Back to Sign In
                </Button>
              </form>
            </div>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setIsResettingPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-background/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {isWaitlistMode ? (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        {waitlistSuccess ? "✅ You’re in." : "🔒 Founding Athlysts Only (For Now)"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {waitlistSuccess
                          ? "You’re now on the Founding Athlysts list."
                          : "We’re opening Athlyst in waves so the first athletes on the platform actually feel early."}
                      </p>
                    </div>

                    {waitlistSuccess ? (
                      <div className="space-y-6 text-center">
                        <p className="text-muted-foreground text-sm">
                          Watch your inbox – your invite link drops soon.
                          <br />
                          In the meantime, follow us on Instagram: <span className="text-primary">@athlyst.fun</span>
                        </p>
                        <Button
                          className="w-full gap-2"
                          onClick={() => window.open('https://www.instagram.com/athlyst.fun/', '_blank')}
                        >
                          <Instagram className="w-4 h-4" />
                          Follow on Instagram
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleJoinWaitlist} className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground text-center mb-4">
                            Drop your email to get into the next wave of Founding Athlysts.
                          </p>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={waitlistEmail}
                            onChange={(e) => setWaitlistEmail(e.target.value)}
                            required
                            className="bg-background/50"
                          />
                          {waitlistError && (
                            <p className="text-xs text-destructive text-center">{waitlistError}</p>
                          )}
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Get on the Founding List
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                          No spam. Just your invite link when doors open.
                        </p>
                      </form>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="bg-background/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {/* Password strength indicator */}
                      {passwordStrength && (
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3].map((bar) => (
                              <div
                                key={bar}
                                className={cn(
                                  "h-1 flex-1 rounded-full transition-colors",
                                  bar === 1 && passwordStrength.level !== 'weak' ? "bg-green-500" :
                                    bar === 1 ? "bg-red-500" :
                                      bar === 2 && passwordStrength.level === 'strong' ? "bg-green-500" :
                                        bar === 2 && passwordStrength.level === 'medium' ? "bg-yellow-500" :
                                          "bg-muted"
                                )}
                              />
                            ))}
                          </div>
                          <p className={cn(
                            "text-xs capitalize",
                            passwordStrength.level === 'weak' && "text-red-500",
                            passwordStrength.level === 'medium' && "text-yellow-500",
                            passwordStrength.level === 'strong' && "text-green-500"
                          )}>
                            {passwordStrength.level} password
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          className="bg-background/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign Up
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
