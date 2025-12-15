import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, RotateCcw, BookOpen, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { startTour } from '@/components/OnboardingTour';

/**
 * Settings tab content for the Locker
 */
export function LockerSettings() {
    const navigate = useNavigate();
    const { tourCompleted, resetTour, isLoading } = useOnboardingTour();

    const handleStartTour = () => {
        startTour(navigate);
    };

    const handleResetTour = () => {
        resetTour();
    };

    return (
        <CardContent className="p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Onboarding</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Compass className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-medium">Guided Tour</p>
                                <p className="text-sm text-muted-foreground">
                                    {tourCompleted ? 'You\'ve completed the tour' : 'Learn how Athlyst works'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {tourCompleted && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStartTour}
                                disabled={isLoading}
                                className="gap-2"
                            >
                                <Compass className="h-4 w-4" />
                                {tourCompleted ? 'Retake Tour' : 'Start Tour'}
                            </Button>
                        </div>
                    </div>

                    {tourCompleted && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetTour}
                            disabled={isLoading}
                            className="gap-2 text-muted-foreground"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset Tour Progress
                        </Button>
                    )}
                </div>
            </div>

            <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Help & Resources</h3>
                <Link to="/learn">
                    <Button variant="outline" className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        Learn About Athlyst
                    </Button>
                </Link>
            </div>
        </CardContent>
    );
}
