import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Flame, Route } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAthleteStats } from '@/hooks/useAthleteStats';

interface ProfileStatsCardProps {
    className?: string;
}

/**
 * Minimal stats card showing all-time athlete metrics
 */
export function ProfileStatsCard({ className }: ProfileStatsCardProps) {
    const { data: stats, isLoading } = useAthleteStats();

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">All-Time Stats</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col items-center">
                                <Skeleton className="h-4 w-4 mb-1" />
                                <Skeleton className="h-6 w-10 mb-1" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!stats || stats.totalWorkouts === 0) {
        return null;
    }

    const statItems = [
        { icon: Activity, label: 'Workouts', value: stats.totalWorkouts },
        { icon: Route, label: 'Distance', value: `${stats.totalDistance} km` },
        { icon: TrendingUp, label: 'Hours', value: stats.totalHours },
        { icon: Flame, label: 'Streak', value: `${stats.streak}d` },
    ];

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">All-Time Stats</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-4 gap-2">
                    {statItems.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex flex-col items-center text-center">
                            <Icon className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-lg font-semibold">{value}</span>
                            <span className="text-xs text-muted-foreground">{label}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
