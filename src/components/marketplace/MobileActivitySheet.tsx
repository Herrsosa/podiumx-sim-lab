import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Activity, X } from 'lucide-react';
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

interface MobileActivitySheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Bottom sheet showing recent trading activity for mobile marketplace.
 */
export function MobileActivitySheet({ open, onOpenChange }: MobileActivitySheetProps) {
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
                .limit(20);

            if (error) throw error;
            return data as unknown as RecentTrade[];
        },
        refetchInterval: 10000,
        enabled: open, // Only fetch when sheet is open
    });

    const formatTime = (dateStr: string) => {
        return formatDistanceToNow(new Date(dateStr), { addSuffix: false })
            .replace('about ', '')
            .replace(' minutes', 'm')
            .replace(' minute', 'm')
            .replace(' hours', 'h')
            .replace(' hour', 'h')
            .replace(' days', 'd')
            .replace(' day', 'd')
            .replace(' seconds', 's')
            .replace(' second', 's');
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                    </SheetTitle>
                </SheetHeader>

                <div className="overflow-y-auto h-[calc(100%-60px)] -mx-6 px-6">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="h-3 w-3 rounded-full bg-muted" />
                                    <div className="flex-1 h-4 rounded bg-muted" />
                                    <div className="h-3 w-8 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    ) : !trades || trades.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <Activity className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No recent trades yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {trades.map((trade) => {
                                const athleteName = trade.athlete?.display_name || trade.athlete?.username || 'Unknown';
                                const shortName = athleteName.split(' ')[0];
                                const isBuy = trade.side === 'BUY';

                                return (
                                    <div
                                        key={trade.id}
                                        className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
                                    >
                                        {/* Buy/Sell Indicator */}
                                        <div
                                            className={cn(
                                                "w-2.5 h-2.5 rounded-full shrink-0",
                                                isBuy ? "bg-emerald-500" : "bg-red-500"
                                            )}
                                        />

                                        {/* Trade Info */}
                                        <div className="flex-1 min-w-0 text-sm">
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
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {formatTime(trade.created_at)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
