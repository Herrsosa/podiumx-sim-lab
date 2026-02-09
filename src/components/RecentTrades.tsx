import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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
                .eq('is_on_chain', true)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data as unknown as RecentTrade[];
        },
        refetchInterval: 5000,
    });

    if (isLoading) {
        return (
            <Card className="glass-panel">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Activity className="h-4 w-4" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-2 animate-pulse">
                                <div className="h-6 w-6 rounded-full bg-muted" />
                                <div className="flex-1 h-4 rounded bg-muted" />
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
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Activity className="h-4 w-4" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                        No recent trades yet
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-panel">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-1">
                    {trades.map((trade) => {
                        const athleteName = trade.athlete?.display_name || trade.athlete?.username || 'Unknown';
                        const shortName = athleteName.split(' ')[0];
                        const isBuy = trade.side === 'BUY';
                        const timeAgo = formatDistanceToNow(new Date(trade.created_at), { addSuffix: false });

                        return (
                            <div
                                key={trade.id}
                                className="flex items-center gap-2 py-1.5 text-xs"
                            >
                                {/* Buy/Sell Indicator */}
                                <div
                                    className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        isBuy ? "bg-emerald-500" : "bg-red-500"
                                    )}
                                />

                                {/* Trade Info */}
                                <div className="flex-1 min-w-0 truncate">
                                    <span className={cn(
                                        "font-semibold",
                                        isBuy ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        {isBuy ? 'BUY' : 'SELL'}
                                    </span>
                                    {' '}
                                    <span className="text-muted-foreground">
                                        {trade.qty} of{' '}
                                    </span>
                                    <span className="text-foreground font-medium">
                                        {shortName}
                                    </span>
                                </div>

                                {/* Time */}
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                    {timeAgo.replace('about ', '').replace(' minutes', 'm').replace(' minute', 'm').replace(' hours', 'h').replace(' hour', 'h').replace(' days', 'd').replace(' day', 'd').replace(' seconds', 's').replace(' second', 's')}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
