import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Compass, X } from 'lucide-react';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useUser } from '@/store/auth';
import { OnboardingTour } from '@/components/OnboardingTour';

/**
 * First-run modal that asks user if they want a guided tour
 * Only shows AFTER onboarding is complete and NOT on onboarding/auth routes
 */
export function TourPromptModal() {
    const user = useUser();
    const location = useLocation();
    const { tourCompleted, isLoading: tourLoading, markTourCompleted } = useOnboardingTour();
    const { onboardingCompleted, isLoading: onboardingLoading, data: onboardingData } = useOnboardingStatus();
    const [showTour, setShowTour] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Never show on onboarding, auth, or verify routes
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');
    const isAuthRoute = location.pathname.startsWith('/auth') || location.pathname === '/verify-email';

    // Must have a profile and onboarding_completed = true
    const hasCompletedOnboarding = Boolean(onboardingData?.profile?.onboarding_completed);

    // Don't show if: no user, on auth/onboarding routes, onboarding not complete, tour completed, still loading, or dismissed
    const shouldShow = user
        && !isOnboardingRoute
        && !isAuthRoute
        && hasCompletedOnboarding
        && !tourCompleted
        && !tourLoading
        && !onboardingLoading
        && !dismissed;

    const handleStartTour = () => {
        setDismissed(true);
        setShowTour(true);
    };

    const handleSkip = () => {
        markTourCompleted();
        setDismissed(true);
    };

    const handleTourComplete = () => {
        setShowTour(false);
    };

    if (showTour) {
        return <OnboardingTour onComplete={handleTourComplete} onSkip={handleTourComplete} />;
    }

    return (
        <Dialog open={shouldShow} onOpenChange={(open) => !open && handleSkip()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Compass className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center">Welcome to Athlyst! 🎉</DialogTitle>
                    <DialogDescription className="text-center">
                        Want a quick 30-second tour to learn how everything works?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button onClick={handleStartTour} className="w-full gap-2">
                        <Compass className="h-4 w-4" />
                        Start the Tour
                    </Button>
                    <Button variant="ghost" onClick={handleSkip} className="w-full">
                        Skip for now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
