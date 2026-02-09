/**
 * Leaderboard Component
 * Shows top users by Sweat Score (points)
 */

import { useState, useEffect } from 'react';
import { Trophy, Medal, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { trackLeaderboardViewed } from '@/lib/analytics';
import { FounderBadge } from '@/components/FounderBadge';
import { UserAvatar } from '@/components/UserAvatar';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    points: number;
    badge_type: string | null;
}

interface LeaderboardProps {
    limit?: number;
    showTabs?: boolean;
    className?: string;
}

export function Leaderboard({ limit = 10, showTabs = true, className }: LeaderboardProps) {
    const navigate = useNavigate();
    const [timeframe, setTimeframe] = useState<'all' | 'weekly'>('all');
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                setLoading(true);

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUserId(user?.id || null);

                const response = await supabase.functions.invoke('award-points', {
                    body: {
                        action: 'get_leaderboard',
                        timeframe,
                        limit,
                    },
                });

                if (response.error) {
                    throw response.error;
                }

                setData(response.data.leaderboard || []);

                // Track view
                trackLeaderboardViewed(timeframe);
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
                setError('Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        }

        fetchLeaderboard();
    }, [timeframe, limit]);

    const handleUserClick = (username: string) => {
        if (username) {
            navigate(`/athlete/${username}`);
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="h-5 w-5 text-yellow-500" />;
            case 2:
                return <Medal className="h-5 w-5 text-gray-400" />;
            case 3:
                return <Medal className="h-5 w-5 text-amber-600" />;
            default:
                return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
        }
    };

    const content = (
        <div className="space-y-2">
            {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                    </div>
                ))
            ) : error ? (
                <p className="text-center text-muted-foreground py-4">{error}</p>
            ) : data.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No data yet</p>
            ) : (
                data.map((entry) => (
                    <div
                        key={entry.user_id}
                        onClick={() => handleUserClick(entry.username)}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                            "hover:bg-muted/50",
                            entry.user_id === currentUserId && "bg-primary/10 border border-primary/20"
                        )}
                    >
                        <div className="w-6 flex justify-center">
                            {getRankIcon(entry.rank)}
                        </div>
                        <UserAvatar
                            src={entry.avatar_url}
                            seed={entry.username ?? entry.user_id}
                            alt={entry.display_name || entry.username || 'User'}
                            size={40}
                        />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                                {entry.display_name || entry.username}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                                @{entry.username}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {entry.badge_type === 'founder' ? (
                                <FounderBadge size="sm" showLabel={true} />
                            ) : entry.badge_type && (
                                <Badge variant="secondary" className="text-xs capitalize">
                                    {entry.badge_type.replace(/_/g, ' ')}
                                </Badge>
                            )}
                            <div className="flex items-center gap-1 text-yellow-500">
                                <Zap className="h-4 w-4" />
                                <span className="font-semibold">{entry.points.toLocaleString()}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    if (!showTabs) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Leaderboard
                    </CardTitle>
                </CardHeader>
                <CardContent>{content}</CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as 'all' | 'weekly')}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="all">All Time</TabsTrigger>
                        <TabsTrigger value="weekly">This Week</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">{content}</TabsContent>
                    <TabsContent value="weekly">{content}</TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

export default Leaderboard;
