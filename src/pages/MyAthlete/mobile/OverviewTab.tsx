import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, MessageSquare, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProfileDetailsCard } from '@/components/myathlete/ProfileDetailsCard';
import ConnectXButton from '@/components/social/ConnectXButton';
import { LockerContent } from './LockerContent';
import type { Athlete, Workout } from '@/types';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import type { EditableProfile } from './types';

interface OverviewTabProps {
    athlete: Athlete;
    priceSeries: PriceSeriesPoint[];
    priceChange: number;
    isPriceUp: boolean;
    onStartEditProfile: () => void;
    onCancelEditProfile: () => void;
    onSaveProfile: () => void;
    onProfileFieldChange: (updates: Partial<EditableProfile>) => void;
    onAvatarSelect: (file: File | null) => void;
    savingProfile: boolean;
    onAddWorkout: () => void;
    latestWorkout: Workout | null;
    xConnected: boolean;
    xLoading: boolean;
    isEditingProfile: boolean;
    editedProfile: EditableProfile;
    consoleTab: 'personal' | 'locker';
    setConsoleTab: (tab: 'personal' | 'locker') => void;
    scrollToContent: () => void;
    contentRef: React.RefObject<HTMLDivElement>;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function OverviewTab({
    athlete,
    priceSeries,
    priceChange,
    isPriceUp,
    onStartEditProfile,
    onCancelEditProfile,
    onSaveProfile,
    onProfileFieldChange,
    onAvatarSelect,
    isEditingProfile,
    savingProfile,
    onAddWorkout,
    latestWorkout,
    xConnected,
    xLoading,
    editedProfile,
    consoleTab,
    setConsoleTab,
    scrollToContent,
    contentRef,
}: OverviewTabProps) {
    const PriceChangeIcon = isPriceUp ? ArrowUpRight : ArrowDownRight;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0
        }
    };

    return (
        <motion.div
            className="space-y-4 pb-24"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Market Stats Card */}
            <motion.div variants={itemVariants}>
                <Card className="border-white/5 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm relative overflow-hidden">
                    <CardContent className="p-4 relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-foreground">Market Stats</h3>
                            <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Price</p>
                                <p className="text-lg font-bold">{currencyFormatter.format(athlete.price ?? 0)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">24h Change</p>
                                <div className="flex items-center gap-1">
                                    <Badge
                                        variant={priceChange === 0 ? 'secondary' : isPriceUp ? 'default' : 'secondary'}
                                        className={cn(
                                            'gap-1',
                                            priceChange === 0
                                                ? 'bg-muted text-muted-foreground'
                                                : isPriceUp
                                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
                                        )}
                                    >
                                        {priceChange !== 0 && <PriceChangeIcon className="h-3 w-3" />}
                                        {percentFormatter.format((priceChange || 0) / 100)}
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                                <p className="text-sm font-semibold">{currencyFormatter.format(athlete.marketCap ?? 0)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Volume 24h</p>
                                <p className="text-sm font-semibold">{currencyFormatter.format(athlete.volume24h ?? 0)}</p>
                            </div>
                        </div>
                    </CardContent>

                    {/* Sparkline Chart Background */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20 pointer-events-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={priceSeries}>
                                <defs>
                                    <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isPriceUp ? "#10b981" : "#f43f5e"} stopOpacity={0.5} />
                                        <stop offset="100%" stopColor={isPriceUp ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isPriceUp ? "#10b981" : "#f43f5e"}
                                    strokeWidth={2}
                                    fill="url(#sparklineGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>

            {/* Quick Actions Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                <Card
                    className="border-white/5 bg-card/60 backdrop-blur-sm cursor-pointer transition-all hover:bg-card/80 active:scale-95"
                    onClick={() => {
                        setConsoleTab('personal');
                        onStartEditProfile();
                        scrollToContent();
                    }}
                >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm font-medium">Edit Profile</p>
                        <p className="text-xs text-muted-foreground mt-1">Update your info</p>
                    </CardContent>
                </Card>

                <Card
                    className="border-white/5 bg-card/60 backdrop-blur-sm cursor-pointer transition-all hover:bg-card/80 active:scale-95"
                    onClick={() => {
                        setConsoleTab('locker');
                        scrollToContent();
                    }}
                >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm font-medium">Locker</p>
                        <p className="text-xs text-muted-foreground mt-1">View workouts</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Profile Card */}
            <motion.div variants={itemVariants}>
                <Card className="border-white/5 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <h3 className="text-sm font-semibold mb-3">Profile</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Sport</span>
                                <Badge variant="outline">{athlete.sport}</Badge>
                            </div>
                            {athlete.location && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Location</span>
                                    <span className="font-medium">{athlete.location}</span>
                                </div>
                            )}
                            {athlete.bio && (
                                <div className="pt-2 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground mb-1">Bio</p>
                                    <p className="text-sm">{athlete.bio}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Recent Activity Card */}
            <motion.div variants={itemVariants}>
                <Card className="border-white/5 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
                        {latestWorkout ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{latestWorkout.type}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(latestWorkout.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    {latestWorkout.distance && (
                                        <div className="rounded bg-muted/40 px-2 py-1.5">
                                            <p className="text-muted-foreground">Distance</p>
                                            <p className="font-medium">{latestWorkout.distance} km</p>
                                        </div>
                                    )}
                                    <div className="rounded bg-muted/40 px-2 py-1.5">
                                        <p className="text-muted-foreground">Duration</p>
                                        <p className="font-medium">{latestWorkout.duration} min</p>
                                    </div>
                                    <div className="rounded bg-muted/40 px-2 py-1.5">
                                        <p className="text-muted-foreground">RPE</p>
                                        <p className="font-medium">{latestWorkout.rpe}/10</p>
                                    </div>
                                </div>
                                {latestWorkout.notes && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">{latestWorkout.notes}</p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground mb-3">No workouts yet</p>
                                <Button onClick={onAddWorkout} size="sm" className="w-full">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Log First Workout
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Settings/Locker Modal Content */}
            <div ref={contentRef} className="scroll-mt-20">
                {consoleTab === 'personal' && (
                    <Card className="border-white/5 bg-card/60 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <ProfileDetailsCard
                                variant="mobile"
                                className="shadow-none"
                                athlete={athlete}
                                editedProfile={editedProfile}
                                isEditing={isEditingProfile}
                                savingProfile={savingProfile}
                                onStartEdit={onStartEditProfile}
                                onCancelEdit={onCancelEditProfile}
                                onSave={onSaveProfile}
                                onFieldChange={onProfileFieldChange}
                                onAvatarSelect={onAvatarSelect}
                            />
                        </CardContent>
                    </Card>
                )}

                {consoleTab === 'locker' && (
                    <Card className="border-white/5 bg-card/60 backdrop-blur-sm overflow-hidden">
                        <CardContent className="p-0">
                            <LockerContent athleteId={athlete.id} athleteName={athlete.name} />
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* X.com Integration */}
            {
                !xLoading && !xConnected && (
                    <Card className="border-white/5 bg-card/60 backdrop-blur-sm">
                        <CardContent className="p-4 space-y-2">
                            <h4 className="text-sm font-medium">X.com Integration</h4>
                            <p className="text-xs text-muted-foreground">
                                Connect your X account to display your handle and increase credibility.
                            </p>
                            <ConnectXButton />
                        </CardContent>
                    </Card>
                )
            }
        </motion.div >
    );
}
