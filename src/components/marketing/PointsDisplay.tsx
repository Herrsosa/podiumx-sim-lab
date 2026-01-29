/**
 * PointsDisplay Component
 * Shows user's Sweat Score (points) with animated counter
 */

import { useState, useEffect } from 'react';
import { Flame, TrendingUp, Award, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PointsData {
    total_points: number;
    weekly_points: number;
    current_streak: number;
    longest_streak: number;
    rank: number;
    badges: Array<{ badge_type: string; earned_at: string }>;
}

interface PointsDisplayProps {
    userId?: string;
    variant?: 'full' | 'compact' | 'mini';
    className?: string;
}

export function PointsDisplay({ userId, variant = 'full', className }: PointsDisplayProps) {
    const [data, setData] = useState<PointsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPoints() {
            try {
                setLoading(true);

                const { data: session } = await supabase.auth.getSession();
                if (!session?.session) {
                    setError('Not authenticated');
                    return;
                }

                const response = await supabase.functions.invoke('award-points', {
                    body: { action: 'get_points' },
                });

                if (response.error) {
                    throw response.error;
                }

                setData(response.data);
            } catch (err) {
                console.error('Error fetching points:', err);
                setError('Failed to load points');
            } finally {
                setLoading(false);
            }
        }

        fetchPoints();
    }, [userId]);

    if (loading) {
        return <PointsDisplaySkeleton variant={variant} className={className} />;
    }

    if (error || !data) {
        return null; // Gracefully hide if there's an error
    }

    if (variant === 'mini') {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{data.total_points.toLocaleString()}</span>
                {data.current_streak > 0 && (
                    <Badge variant="secondary" className="text-xs">
                        <Flame className="h-3 w-3 mr-1 text-orange-500" />
                        {data.current_streak}d
                    </Badge>
                )}
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <Card className={cn("bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20", className)}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Zap className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Sweat Score</p>
                                <p className="text-xl font-bold">{data.total_points.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Rank</p>
                            <p className="text-lg font-semibold">#{data.rank}</p>
                        </div>
                    </div>
                    {data.current_streak > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span>{data.current_streak} day streak</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Full variant
    return (
        <Card className={cn("bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-yellow-500/20 rounded-xl">
                            <Zap className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Your Sweat Score</p>
                            <p className="text-3xl font-bold">{data.total_points.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Global Rank</p>
                        <p className="text-2xl font-bold">#{data.rank}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-background/50 rounded-lg">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">This Week</p>
                        <p className="font-semibold">+{data.weekly_points}</p>
                    </div>
                    <div className="text-center p-3 bg-background/50 rounded-lg">
                        <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                        <p className="text-xs text-muted-foreground">Streak</p>
                        <p className="font-semibold">{data.current_streak}d</p>
                    </div>
                    <div className="text-center p-3 bg-background/50 rounded-lg">
                        <Award className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Best Streak</p>
                        <p className="font-semibold">{data.longest_streak}d</p>
                    </div>
                </div>

                {data.badges.length > 0 && (
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Badges</p>
                        <div className="flex flex-wrap gap-2">
                            {data.badges.map((badge, idx) => (
                                <Badge key={idx} variant="outline" className="capitalize">
                                    {badge.badge_type.replace(/_/g, ' ')}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function PointsDisplaySkeleton({ variant, className }: { variant: string; className?: string }) {
    if (variant === 'mini') {
        return <Skeleton className={cn("h-6 w-24", className)} />;
    }

    if (variant === 'compact') {
        return (
            <Card className={className}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div>
                                <Skeleton className="h-3 w-16 mb-1" />
                                <Skeleton className="h-6 w-20" />
                            </div>
                        </div>
                        <div className="text-right">
                            <Skeleton className="h-3 w-10 mb-1" />
                            <Skeleton className="h-5 w-8" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    </div>
                    <div className="text-right">
                        <Skeleton className="h-4 w-16 mb-2" />
                        <Skeleton className="h-7 w-12" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default PointsDisplay;
