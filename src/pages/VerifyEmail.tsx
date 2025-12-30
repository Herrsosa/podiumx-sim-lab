import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/store/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function VerifyEmail() {
    const navigate = useNavigate();
    const user = useUser();
    const { toast } = useToast();
    const [resending, setResending] = useState(false);

    const handleResend = async () => {
        if (!user?.email) return;

        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth`,
                }
            });

            if (error) throw error;

            toast({
                title: "Email sent",
                description: "Check your inbox for a new verification link.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to resend email. Please try again.",
                variant: "destructive",
            });
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-background">
                <div
                    className="absolute inset-0 bg-cover bg-[65%_center] md:bg-center bg-no-repeat opacity-50"
                    style={{ backgroundImage: "url('/gym-background-v2.png')" }}
                />
                <div className="absolute inset-0 bg-background/30" />
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <Card className="w-full max-w-md relative z-10 border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                        <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Check your email</CardTitle>
                    <CardDescription>
                        We've sent a verification link to <span className="font-medium text-foreground">{user?.email}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-center text-muted-foreground">
                        Click the link in the email to verify your account and continue setting up your profile.
                    </p>

                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleResend}
                            disabled={resending}
                        >
                            {resending ? "Sending..." : "Resend email"}
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => navigate('/auth')}
                        >
                            Back to Sign In
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
