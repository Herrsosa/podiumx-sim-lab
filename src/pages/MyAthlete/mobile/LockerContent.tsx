import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, MessageSquare, Settings, Compass, CheckCircle2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import TokengatedChat from '@/components/TokengatedChat';
import { LockerWorkouts } from '@/components/myathlete/LockerWorkouts';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { startTour } from '@/components/OnboardingTour';
import { Link } from 'react-router-dom';

interface LockerContentProps {
    athleteId: string;
    athleteName: string;
}

export function LockerContent({ athleteId, athleteName }: LockerContentProps) {
    const [activeTab, setActiveTab] = useState<'workouts' | 'chat' | 'settings'>('workouts');
    const navigate = useNavigate();
    const { tourCompleted, isLoading: tourLoading } = useOnboardingTour();

    const handleStartTour = () => {
        startTour(navigate);
    };

    return (
        <div className="flex flex-col">
            <div className="p-4 pb-0">
                <div className="flex p-1 bg-muted/30 rounded-full relative">
                    <button
                        onClick={() => setActiveTab('workouts')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-full relative z-10 transition-colors duration-200",
                            activeTab === 'workouts' ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground/70"
                        )}
                    >
                        <Dumbbell className="w-4 h-4" />
                        Workouts
                    </button>

                    <button
                        onClick={() => setActiveTab('chat')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-full relative z-10 transition-colors duration-200",
                            activeTab === 'chat' ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground/70"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-full relative z-10 transition-colors duration-200",
                            activeTab === 'settings' ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground/70"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>
                </div>
            </div>

            <div className="p-4 min-h-[300px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'workouts' && (
                        <motion.div
                            key="workouts"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <LockerWorkouts />
                        </motion.div>
                    )}

                    {activeTab === 'chat' && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TokengatedChat
                                athleteId={athleteId}
                                athleteName={athleteName}
                                userHoldings={1}
                                onBuyClick={() => { }}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'settings' && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div>
                                <h3 className="text-base font-semibold mb-3">Onboarding</h3>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Compass className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="font-medium text-sm">Guided Tour</p>
                                            <p className="text-xs text-muted-foreground">
                                                {tourCompleted ? 'Completed' : 'Learn how Athlyst works'}
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
                                            disabled={tourLoading}
                                            className="gap-2"
                                        >
                                            <Compass className="h-4 w-4" />
                                            {tourCompleted ? 'Retake' : 'Start'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-base font-semibold mb-3">Help</h3>
                                <Link to="/learn">
                                    <Button variant="outline" className="gap-2 w-full">
                                        <BookOpen className="h-4 w-4" />
                                        Learn About Athlyst
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

