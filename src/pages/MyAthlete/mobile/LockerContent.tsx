import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import TokengatedChat from '@/components/TokengatedChat';
import { LockerWorkouts } from '@/components/myathlete/LockerWorkouts';

interface LockerContentProps {
    athleteId: string;
    athleteName: string;
}

export function LockerContent({ athleteId, athleteName }: LockerContentProps) {
    const [activeTab, setActiveTab] = useState<'workouts' | 'chat'>('workouts');

    return (
        <div className="flex flex-col">
            <div className="p-4 pb-0">
                <div className="flex p-1 bg-muted/30 rounded-full relative">
                    {/* Animated Background Pill */}
                    <div className="absolute inset-1 pointer-events-none">
                        <div className="w-full h-full flex">
                            <div className={cn("w-1/2 transition-all duration-300 ease-out", activeTab === 'chat' && "translate-x-full")} />
                        </div>
                    </div>

                    <button
                        onClick={() => setActiveTab('workouts')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-full relative z-10 transition-colors duration-200",
                            activeTab === 'workouts' ? "text-foreground bg-background shadow-sm" : "text-muted-foreground hover:text-foreground/70"
                        )}
                    >
                        {activeTab === 'workouts' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-background rounded-full shadow-sm -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <Dumbbell className="w-4 h-4" />
                        Workouts
                    </button>

                    <button
                        onClick={() => setActiveTab('chat')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-full relative z-10 transition-colors duration-200",
                            activeTab === 'chat' ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
                        )}
                    >
                        {activeTab === 'chat' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-background rounded-full shadow-sm -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <MessageSquare className="w-4 h-4" />
                        Community Chat
                    </button>
                </div>
            </div>

            <div className="p-4 min-h-[300px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'workouts' ? (
                        <motion.div
                            key="workouts"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <LockerWorkouts />
                        </motion.div>
                    ) : (
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
                </AnimatePresence>
            </div>
        </div>
    );
}
