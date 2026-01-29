/**
 * Rewards Page
 * Shows user's points, leaderboard, and referral dashboard
 */

import { useEffect } from 'react';
import { Gift, Trophy, Users, Zap, Flame, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Leaderboard, ReferralDashboard } from '@/components/marketing';
import { H1 } from '@/components/ui/typography';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CountUp } from '@/components/ui/count-up';
import { trackPageView } from '@/lib/analytics';
import { useMyPoints } from '@/hooks/usePoints';
import { cn } from '@/lib/utils';
import { FounderBadge, hasFounderBadge } from '@/components/FounderBadge';

export default function Rewards() {
    const { data: pointsData, isLoading, error } = useMyPoints();

    useEffect(() => {
        trackPageView('/rewards');
    }, []);

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header - matches Portfolio style */}
            <div className="px-4 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                    <H1 className="flex items-center gap-2">
                        <Gift className="h-6 w-6 text-yellow-500" />
                        Rewards
                    </H1>
                </div>

                {/* Hero Stats Card */}
                <Card className="glass-card overflow-hidden mb-6">
                    <CardContent className="p-6">
                        <div className="text-center mb-6">
                            <p className="text-sm text-muted-foreground mb-1">Your Sweat Score</p>
                            {isLoading ? (
                                <Skeleton className="h-12 w-32 mx-auto" />
                            ) : error ? (
                                <p className="text-3xl font-bold text-muted-foreground">--</p>
                            ) : (
                                <p className="text-4xl font-bold text-yellow-500">
                                    <CountUp value={pointsData?.total_points || 0} duration={1} />
                                </p>
                            )}
                            {!isLoading && !error && pointsData && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Rank #{pointsData.rank || '--'}
                                </p>
                            )}
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
                                <p className="text-xs text-muted-foreground">This Week</p>
                                {isLoading ? (
                                    <Skeleton className="h-5 w-12 mx-auto mt-1" />
                                ) : (
                                    <p className="font-semibold">+{pointsData?.weekly_points || 0}</p>
                                )}
                            </div>
                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                                <p className="text-xs text-muted-foreground">Streak</p>
                                {isLoading ? (
                                    <Skeleton className="h-5 w-12 mx-auto mt-1" />
                                ) : (
                                    <p className="font-semibold">{pointsData?.current_streak || 0}d</p>
                                )}
                            </div>
                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                <Award className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                                <p className="text-xs text-muted-foreground">Best Streak</p>
                                {isLoading ? (
                                    <Skeleton className="h-5 w-12 mx-auto mt-1" />
                                ) : (
                                    <p className="font-semibold">{pointsData?.longest_streak || 0}d</p>
                                )}
                            </div>
                        </div>

                        {/* Badges */}
                        {pointsData?.badges && pointsData.badges.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-muted-foreground mb-2">Your Badges</p>
                                <div className="flex flex-wrap gap-2">
                                    {/* Show Founder badge first and prominently */}
                                    {hasFounderBadge(pointsData.badges) && (
                                        <FounderBadge size="md" />
                                    )}
                                    {/* Show other badges */}
                                    {pointsData.badges
                                        .filter(badge => badge.badge_type !== 'founder')
                                        .map((badge, idx) => (
                                            <Badge key={idx} variant="secondary" className="capitalize">
                                                {badge.badge_type.replace(/_/g, ' ')}
                                            </Badge>
                                        ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs Content */}
            <div className="px-4">
                <Tabs defaultValue="earn" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="earn" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span className="hidden sm:inline">Earn</span>
                        </TabsTrigger>
                        <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            <span className="hidden sm:inline">Ranks</span>
                        </TabsTrigger>
                        <TabsTrigger value="referrals" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Invite</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="earn" className="space-y-4">
                        {/* How to earn points */}
                        <Card className="glass-card">
                            <CardContent className="p-4">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    How to Earn Points
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { points: 200, label: 'Connect Strava', icon: '🔗' },
                                        { points: 100, label: 'Complete your profile', icon: '👤' },
                                        { points: 150, label: 'Post your first workout', icon: '🎯' },
                                        { points: 50, label: 'Daily workout post (1x/day)', icon: '💪' },
                                        { points: 25, label: 'Share to social (3x/day)', icon: '📤' },
                                        { points: 500, label: 'Refer a friend who signs up', icon: '👥' },
                                        { points: 200, label: '7-day workout streak', icon: '🔥' },
                                        { points: 100, label: 'Buy an athlete token (5x/day)', icon: '💰' },
                                    ].map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{item.icon}</span>
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                            <span className="font-mono text-sm font-semibold text-yellow-500">
                                                +{item.points}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="leaderboard">
                        <Leaderboard showTabs={true} limit={25} />
                    </TabsContent>

                    <TabsContent value="referrals">
                        <ReferralDashboard />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
