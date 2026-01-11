import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';

export type ReactionEmoji = '🔥' | '💪' | '👏';

export const REACTION_EMOJIS: ReactionEmoji[] = ['🔥', '💪', '👏'];

export interface ReactionCount {
    emoji: ReactionEmoji;
    count: number;
    hasReacted: boolean;
}

interface ReactionRow {
    emoji: string;
    user_id: string;
}

/**
 * Hook to fetch and manage reactions for a post.
 * 
 * @param postId - The ID of the post to manage reactions for
 */
export function useReactions(postId: string) {
    const queryClient = useQueryClient();
    const user = useUser();
    const userId = user?.id;

    // Fetch all reactions for this post
    const { data: reactions = [], isLoading } = useQuery({
        queryKey: ['post-reactions', postId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('post_reactions')
                .select('emoji, user_id')
                .eq('post_id', postId);

            if (error) throw error;
            return (data || []) as ReactionRow[];
        },
        enabled: !!postId,
        staleTime: 30_000,
    });

    // Calculate counts and user's reactions
    const reactionCounts: ReactionCount[] = REACTION_EMOJIS.map((emoji) => {
        const matchingReactions = reactions.filter((r) => r.emoji === emoji);
        return {
            emoji,
            count: matchingReactions.length,
            hasReacted: userId ? matchingReactions.some((r) => r.user_id === userId) : false,
        };
    });

    // Toggle reaction mutation
    const toggleMutation = useMutation({
        mutationFn: async (emoji: ReactionEmoji) => {
            if (!userId) throw new Error('Must be logged in to react');

            const hasReacted = reactions.some((r) => r.emoji === emoji && r.user_id === userId);

            if (hasReacted) {
                // Remove reaction
                const { error } = await supabase
                    .from('post_reactions')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', userId)
                    .eq('emoji', emoji);

                if (error) throw error;
                return { action: 'removed', emoji };
            } else {
                // Add reaction
                const { error } = await supabase
                    .from('post_reactions')
                    .insert({
                        post_id: postId,
                        user_id: userId,
                        emoji,
                    });

                if (error) throw error;
                return { action: 'added', emoji };
            }
        },
        onMutate: async (emoji) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['post-reactions', postId] });

            // Snapshot previous data
            const previousReactions = queryClient.getQueryData<ReactionRow[]>(['post-reactions', postId]);

            // Optimistically update
            if (previousReactions && userId) {
                const hasReacted = previousReactions.some((r) => r.emoji === emoji && r.user_id === userId);

                const nextReactions = hasReacted
                    ? previousReactions.filter((r) => !(r.emoji === emoji && r.user_id === userId))
                    : [...previousReactions, { emoji, user_id: userId }];

                queryClient.setQueryData(['post-reactions', postId], nextReactions);
            }

            return { previousReactions };
        },
        onError: (_err, _emoji, context) => {
            // Rollback on error
            if (context?.previousReactions) {
                queryClient.setQueryData(['post-reactions', postId], context.previousReactions);
            }
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['post-reactions', postId] });
        },
    });

    return {
        reactionCounts,
        isLoading,
        toggleReaction: toggleMutation.mutate,
        isToggling: toggleMutation.isPending,
    };
}
