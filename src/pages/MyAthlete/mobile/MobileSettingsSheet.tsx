import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Compass, BookOpen, User, CheckCircle2, LogOut, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { startTour } from '@/components/OnboardingTour';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface MobileSettingsSheetProps {
    onEditProfile?: () => void;
    className?: string;
}

/**
 * Settings sheet accessible from the mobile header.
 * Contains: Push Notifications, Onboarding Tour, Help, Edit Profile, Logout.
 */
export function MobileSettingsSheet({ onEditProfile, className }: MobileSettingsSheetProps) {
    const [open, setOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();
    const { tourCompleted, isLoading: tourLoading } = useOnboardingTour();
    const signOut = useAuthStore((s) => s.signOut);

    const handleStartTour = () => {
        setOpen(false);
        startTour(navigate);
    };

    const handleEditProfile = () => {
        setOpen(false);
        onEditProfile?.();
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut();
        } finally {
            setIsLoggingOut(false);
            setOpen(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-10 w-10 rounded-full bg-muted/40 hover:bg-muted/60", className)}
                >
                    <Settings className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
                <SheetHeader className="pb-4">
                    <SheetTitle className="text-lg">Settings</SheetTitle>
                </SheetHeader>

                <div className="space-y-4">
                    {/* Edit Profile */}
                    {onEditProfile && (
                        <button
                            onClick={handleEditProfile}
                            className="flex items-center gap-3 w-full p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Edit Profile</p>
                                <p className="text-xs text-muted-foreground">Update your info and avatar</p>
                            </div>
                        </button>
                    )}

                    {/* Push Notifications */}
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Notifications</h3>
                        <PushNotificationPrompt variant="card" />
                    </div>

                    {/* Onboarding Tour */}
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Onboarding</h3>
                        <button
                            onClick={handleStartTour}
                            disabled={tourLoading}
                            className="flex items-center justify-between w-full p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Compass className="h-5 w-5 text-primary" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-sm">Guided Tour</p>
                                    <p className="text-xs text-muted-foreground">
                                        {tourCompleted ? 'Completed' : 'Learn how Athlyst works'}
                                    </p>
                                </div>
                            </div>
                            {tourCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        </button>
                    </div>

                    {/* Help & Feedback */}
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Help & Feedback</h3>
                        <div className="space-y-2">
                            <Link to="/learn" onClick={() => setOpen(false)}>
                                <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-sm">Learn About Athlyst</p>
                                        <p className="text-xs text-muted-foreground">Guides and tutorials</p>
                                    </div>
                                </button>
                            </Link>
                            <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSdH36iuEIlfB6ysZTGNhMl11VKWw5i6_v-UBibzclErHIoRxg/viewform"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-3 w-full p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                    <MessageSquare className="h-5 w-5 text-yellow-500" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-sm">Send Feedback</p>
                                    <p className="text-xs text-muted-foreground">Report bugs or suggest features</p>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Logout */}
                    <div className="pt-2 border-t border-white/10">
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="flex items-center gap-3 w-full p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 transition-colors text-left"
                        >
                            <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                                <LogOut className="h-5 w-5 text-rose-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm text-rose-500">
                                    {isLoggingOut ? 'Logging out...' : 'Log Out'}
                                </p>
                                <p className="text-xs text-muted-foreground">Sign out of your account</p>
                            </div>
                        </button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
