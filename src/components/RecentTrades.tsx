import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentTrade {
    id: string;
    side: 'BUY' | 'SELL';
    qty: number;
    created_at: string;
    athlete: {
        display_name: string;
        username: string;
        avatar_url: string | null;
    };
}

export function RecentTrades() {
    const { data: trades, isLoading } = useQuery({
        queryKey: ['recent-trades'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trades')
                .select(`
                    id,
                    side,
                    qty,
                    created_at,
                    athlete:profiles!trades_athlete_id_profiles_id_fk(
                        display_name,
                        username,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data as unknown as RecentTrade[];
        },
        refetchInterval: 5000, // Refetch every 5 seconds to show new simulation trades
    });

    if (isLoading) {
        return (
            <Card className="glass-panel">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="h-10 w-10 rounded-full bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 rounded bg-muted" />
                                    <div className="h-3 w-24 rounded bg-muted" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!trades || trades.length === 0) {
        return (
            <Card className="glass-panel">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No recent trades yet. Be the first!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-panel">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {trades.map((trade) => {
                        const athleteName = trade.athlete?.display_name || trade.athlete?.username || 'Unknown';
                        const isBuy = trade.side === 'BUY';

                        return (
                            <div
                                key={trade.id}
                                className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/50 transition-colors"
                            >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isBuy ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                                    }`}>
                                    {isBuy ? (
                                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-rose-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        <span className={isBuy ? 'text-emerald-500' : 'text-rose-500'}>
                                            {isBuy ? 'BUY' : 'SELL'}
                                        </span>
                                        {' '}
                                        {trade.qty} token{trade.qty !== 1 ? 's' : ''} of {athleteName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
