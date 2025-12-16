import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import { toast } from 'sonner';

const MAX_PINNED_POSTS = 3;

/**
 * Hook to toggle pin status of a post.
 * Athletes can pin up to 3 posts to show at the top of their profile.
 */
export function usePinPost() {
    const user = useUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ postId, pin }: { postId: string; pin: boolean }) => {
            if (!user?.id) throw new Error('Not authenticated');

            // If pinning, check if user already has max pinned posts
            if (pin) {
                const { count, error: countError } = await supabase
                    .from('posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('author_id', user.id)
                    .eq('is_pinned', true);

                if (countError) throw countError;

                if ((count ?? 0) >= MAX_PINNED_POSTS) {
                    throw new Error(`You can only pin up to ${MAX_PINNED_POSTS} workouts. Unpin one first.`);
                }
            }

            const { error } = await supabase
                .from('posts')
                .update({ is_pinned: pin })
                .eq('id', postId)
                .eq('author_id', user.id); // Ensure user owns this post

            if (error) throw error;

            return { postId, pin };
        },
        onSuccess: ({ pin }) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['my-athlete'] });
            queryClient.invalidateQueries({ queryKey: ['athlete'] });

            toast.success(pin ? 'Workout pinned to profile' : 'Workout unpinned');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update pin status');
        },
    });
}
