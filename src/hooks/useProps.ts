import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import { featureFlags } from '@/lib/config/featureFlags';

interface PropState {
    hasProp: boolean;
    propsCount: number;
}

interface UsePropsResult extends PropState {
    isPending: boolean;
    toggleProp: () => void;
}

/**
 * Hook to manage props (likes) on a post
 * Provides optimistic UI updates with rollback on error
 */
export function useProps(postId: string | undefined): UsePropsResult {
    const user = useUser();
    const queryClient = useQueryClient();
    const queryKey = ['props', postId, user?.id];

    // Fetch current prop state
    const { data, isLoading } = useQuery({
        queryKey,
        enabled: !!postId && !!user?.id && featureFlags.enableProps,
        staleTime: 30_000,
        queryFn: async (): Promise<PropState> => {
            if (!postId || !user?.id) {
                return { hasProp: false, propsCount: 0 };
            }

            // Fetch props count from cached column
            const [propsCountResult, userPropResult] = await Promise.all([
                supabase
                    .from('posts')
                    .select('props_count')
                    .eq('id', postId)
                    .single(),
                supabase
                    .from('props')
                    .select('id')
                    .eq('actor_user_id', user.id)
                    .eq('target_type', 'proof')
                    .eq('target_id', postId)
                    .maybeSingle(),
            ]);

            const propsCount = propsCountResult.data?.props_count ?? 0;
            const hasProp = !!userPropResult.data;

            return { hasProp, propsCount };
        },
    });

    // Optimistic state for immediate UI feedback
    const [optimisticState, setOptimisticState] = useState<PropState | null>(null);

    // Reset optimistic state when server data changes
    useEffect(() => {
        setOptimisticState(null);
    }, [data]);

    const currentState = useMemo(
        () => optimisticState ?? data ?? { hasProp: false, propsCount: 0 },
        [optimisticState, data]
    );

    // Toggle prop mutation
    const mutation = useMutation({
        mutationFn: async (action: 'add' | 'remove') => {
            if (!postId || !user?.id) throw new Error('Not authenticated');

            if (action === 'add') {
                const { error } = await supabase.from('props').insert({
                    actor_user_id: user.id,
                    target_type: 'proof',
                    target_id: postId,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('props')
                    .delete()
                    .eq('actor_user_id', user.id)
                    .eq('target_type', 'proof')
                    .eq('target_id', postId);
                if (error) throw error;
            }

            return action;
        },
        onMutate: async (action) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });

            // Snapshot previous value
            const previousState = queryClient.getQueryData<PropState>(queryKey);

            // Optimistically update
            const newState: PropState = {
                hasProp: action === 'add',
                propsCount: Math.max(
                    0,
                    (previousState?.propsCount ?? 0) + (action === 'add' ? 1 : -1)
                ),
            };
            setOptimisticState(newState);

            return { previousState };
        },
        onError: (_err, _action, context) => {
            // Rollback on error
            if (context?.previousState) {
                setOptimisticState(context.previousState);
            }
        },
        onSettled: () => {
            // Refetch to ensure consistency
            void queryClient.invalidateQueries({ queryKey });
            // Also invalidate feed queries that might include props_count
            void queryClient.invalidateQueries({ queryKey: ['proof-of-sweat-feed'] });
        },
    });

    const toggleProp = useCallback(() => {
        if (!featureFlags.enableProps || !postId || !user?.id || mutation.isPending) {
            return;
        }
        mutation.mutate(currentState.hasProp ? 'remove' : 'add');
    }, [currentState.hasProp, mutation, postId, user?.id]);

    return {
        hasProp: currentState.hasProp,
        propsCount: currentState.propsCount,
        isPending: isLoading || mutation.isPending,
        toggleProp,
    };
}
