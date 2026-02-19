import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HolderCounts {
    [athleteId: string]: number;
}

/**
 * Hook to fetch the number of unique holders for each athlete.
 * Queries trades and aggregates buy/sell quantities per user to determine holders.
 * Includes ALL trades (both on-chain and off-chain).
 */
export function useAthleteHolderCounts(athleteIds: string[]) {
    return useQuery({
        queryKey: ['athlete-holder-counts', athleteIds.sort().join(',')],
        queryFn: async (): Promise<HolderCounts> => {
            if (athleteIds.length === 0) return {};

            // Fetch all trades for the requested athletes (no is_on_chain filter)
            const { data: trades, error } = await supabase
                .from('trades')
                .select('athlete_id, user_id, side, qty')
                .in('athlete_id', athleteIds)
                .eq('is_on_chain', true);

            if (error) throw error;

            // Calculate net holdings per user per athlete
            const holdings = new Map<string, Map<string, number>>();

            for (const trade of trades ?? []) {
                const athleteId = trade.athlete_id;
                const userId = trade.user_id;
                const qty = trade.qty ?? 0;
                const delta = trade.side === 'BUY' ? qty : -qty;

                if (!holdings.has(athleteId)) {
                    holdings.set(athleteId, new Map());
                }
                const athleteHoldings = holdings.get(athleteId)!;
                const current = athleteHoldings.get(userId) ?? 0;
                athleteHoldings.set(userId, current + delta);
            }

            // Count unique holders with positive balance for each athlete
            const result: HolderCounts = {};
            for (const athleteId of athleteIds) {
                const athleteHoldings = holdings.get(athleteId);
                if (!athleteHoldings) {
                    result[athleteId] = 0;
                    continue;
                }

                let count = 0;
                for (const balance of athleteHoldings.values()) {
                    if (balance > 0) count++;
                }
                result[athleteId] = count;
            }

            return result;
        },
        enabled: athleteIds.length > 0,
        staleTime: 60_000, // 1 minute
    });
}
