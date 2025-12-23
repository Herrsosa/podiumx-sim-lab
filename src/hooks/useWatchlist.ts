import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import { toast } from 'sonner';

export interface WatchlistItem {
    athlete_id: string;
    created_at: string;
}

/**
 * Hook to get the current user's watchlist
 */
export function useWatchlist() {
    const user = useUser();

    return useQuery<WatchlistItem[]>({
        queryKey: ['watchlist', user?.id],
        enabled: !!user?.id,
        staleTime: 30_000,
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('watchlist')
                .select('athlete_id, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching watchlist:', error);
                throw error;
            }

            return data ?? [];
        },
    });
}

/**
 * Hook to get a Set of watched athlete IDs for efficient lookups
 */
export function useWatchedAthleteIds() {
    const { data: watchlist } = useWatchlist();

    return useMemo(() => {
        if (!watchlist) return new Set<string>();
        return new Set(watchlist.map((item) => item.athlete_id));
    }, [watchlist]);
}

/**
 * Hook to check if a specific athlete is watched
 */
export function useIsWatched(athleteId: string | undefined) {
    const watchedIds = useWatchedAthleteIds();
    return athleteId ? watchedIds.has(athleteId) : false;
}

/**
 * Hook to toggle watchlist status for an athlete
 */
export function useToggleWatchlist() {
    const user = useUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            athleteId,
            isCurrentlyWatched,
        }: {
            athleteId: string;
            isCurrentlyWatched: boolean;
        }) => {
            if (!user?.id) {
                throw new Error('Must be logged in to manage watchlist');
            }

            if (isCurrentlyWatched) {
                // Remove from watchlist
                const { error } = await supabase
                    .from('watchlist')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('athlete_id', athleteId);

                if (error) throw error;
                return { action: 'removed' as const, athleteId };
            } else {
                // Add to watchlist
                const { error } = await supabase
                    .from('watchlist')
                    .insert({
                        user_id: user.id,
                        athlete_id: athleteId,
                    });

                if (error) throw error;
                return { action: 'added' as const, athleteId };
            }
        },
        // Optimistic update
        onMutate: async ({ athleteId, isCurrentlyWatched }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['watchlist', user?.id] });

            // Snapshot previous value
            const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>([
                'watchlist',
                user?.id,
            ]);

            // Optimistically update
            queryClient.setQueryData<WatchlistItem[]>(
                ['watchlist', user?.id],
                (old) => {
                    if (!old) return [];
                    if (isCurrentlyWatched) {
                        return old.filter((item) => item.athlete_id !== athleteId);
                    } else {
                        return [
                            { athlete_id: athleteId, created_at: new Date().toISOString() },
                            ...old,
                        ];
                    }
                }
            );

            return { previousWatchlist };
        },
        onError: (err, _variables, context) => {
            // Rollback on error
            if (context?.previousWatchlist) {
                queryClient.setQueryData(
                    ['watchlist', user?.id],
                    context.previousWatchlist
                );
            }
            console.error('Watchlist error:', err);
            toast.error('Failed to update watchlist');
        },
        onSuccess: (data) => {
            if (data.action === 'added') {
                toast.success('Added to watchlist');
            } else {
                toast.success('Removed from watchlist');
            }
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
        },
    });
}

/**
 * Convenience hook that provides the toggle function with automatic state detection
 */
export function useWatchlistToggle(athleteId: string | undefined) {
    const isWatched = useIsWatched(athleteId);
    const toggleMutation = useToggleWatchlist();

    const toggle = useCallback(() => {
        if (!athleteId) return;
        toggleMutation.mutate({ athleteId, isCurrentlyWatched: isWatched });
    }, [athleteId, isWatched, toggleMutation]);

    return {
        isWatched,
        toggle,
        isLoading: toggleMutation.isPending,
    };
}
