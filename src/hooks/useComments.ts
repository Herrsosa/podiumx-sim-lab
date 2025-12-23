import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import { toast } from 'sonner';

export interface Comment {
    id: string;
    created_at: string;
    updated_at: string;
    post_id: string;
    author_id: string;
    text: string;
    author?: {
        id: string;
        display_name: string | null;
        username: string;
        avatar_url: string | null;
    };
}

interface CommentsPage {
    comments: Comment[];
    nextCursor: string | null;
}

const PAGE_SIZE = 10;

/**
 * Hook to fetch comments for a post with pagination
 */
export function useComments(postId: string | undefined) {
    return useInfiniteQuery<CommentsPage>({
        queryKey: ['comments', postId],
        enabled: !!postId,
        staleTime: 30_000,
        initialPageParam: null as string | null,
        queryFn: async ({ pageParam }) => {
            if (!postId) return { comments: [], nextCursor: null };

            let query = supabase
                .from('comments')
                .select(`
          id,
          created_at,
          updated_at,
          post_id,
          author_id,
          text,
          author:profiles(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
                .eq('post_id', postId)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE + 1);

            if (pageParam) {
                query = query.lt('created_at', pageParam);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching comments:', error);
                throw error;
            }

            const comments = (data ?? []).slice(0, PAGE_SIZE).map((row) => ({
                ...row,
                author: Array.isArray(row.author) ? row.author[0] : row.author,
            })) as Comment[];

            const hasMore = (data?.length ?? 0) > PAGE_SIZE;
            const nextCursor = hasMore ? comments[comments.length - 1]?.created_at : null;

            return { comments, nextCursor };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });
}

/**
 * Hook to get comment count for a post
 */
export function useCommentCount(postId: string | undefined) {
    return useQuery({
        queryKey: ['comment-count', postId],
        enabled: !!postId,
        staleTime: 30_000,
        queryFn: async () => {
            if (!postId) return 0;

            const { data, error } = await supabase
                .from('posts')
                .select('comments_count')
                .eq('id', postId)
                .single();

            if (error) {
                console.error('Error fetching comment count:', error);
                return 0;
            }

            return data?.comments_count ?? 0;
        },
    });
}

/**
 * Hook to add a comment
 */
export function useAddComment() {
    const user = useUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
            if (!user?.id) {
                throw new Error('Must be logged in to comment');
            }

            const trimmedText = text.trim();
            if (trimmedText.length === 0) {
                throw new Error('Comment cannot be empty');
            }
            if (trimmedText.length > 500) {
                throw new Error('Comment too long (max 500 characters)');
            }

            const { data, error } = await supabase
                .from('comments')
                .insert({
                    post_id: postId,
                    author_id: user.id,
                    text: trimmedText,
                })
                .select(`
          id,
          created_at,
          updated_at,
          post_id,
          author_id,
          text,
          author:profiles(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
                .single();

            if (error) throw error;

            return {
                ...data,
                author: Array.isArray(data.author) ? data.author[0] : data.author,
            } as Comment;
        },
        onSuccess: (newComment) => {
            // Optimistically add to comments list
            queryClient.setQueryData(['comments', newComment.post_id], (old: { pages: CommentsPage[] } | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page, index) =>
                        index === 0
                            ? { ...page, comments: [newComment, ...page.comments] }
                            : page
                    ),
                };
            });

            // Increment count
            queryClient.setQueryData(['comment-count', newComment.post_id], (old: number | undefined) => (old ?? 0) + 1);

            // Invalidate to ensure consistency
            void queryClient.invalidateQueries({ queryKey: ['comments', newComment.post_id] });
            void queryClient.invalidateQueries({ queryKey: ['comment-count', newComment.post_id] });
        },
        onError: (error) => {
            console.error('Failed to add comment:', error);
            toast.error('Failed to add comment');
        },
    });
}

/**
 * Hook to delete a comment
 */
export function useDeleteComment() {
    const user = useUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
            if (!user?.id) {
                throw new Error('Must be logged in');
            }

            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId)
                .eq('author_id', user.id);

            if (error) throw error;

            return { commentId, postId };
        },
        onSuccess: ({ commentId, postId }) => {
            // Remove from comments list
            queryClient.setQueryData(['comments', postId], (old: { pages: CommentsPage[] } | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        comments: page.comments.filter((c) => c.id !== commentId),
                    })),
                };
            });

            // Decrement count
            queryClient.setQueryData(['comment-count', postId], (old: number | undefined) => Math.max(0, (old ?? 1) - 1));

            // Invalidate
            void queryClient.invalidateQueries({ queryKey: ['comments', postId] });
            void queryClient.invalidateQueries({ queryKey: ['comment-count', postId] });

            toast.success('Comment deleted');
        },
        onError: (error) => {
            console.error('Failed to delete comment:', error);
            toast.error('Failed to delete comment');
        },
    });
}

/**
 * Convenience hook for comment functionality on a single post
 */
export function usePostComments(postId: string | undefined) {
    const { data: countData } = useCommentCount(postId);
    const addMutation = useAddComment();
    const deleteMutation = useDeleteComment();

    const addComment = useCallback(
        (text: string) => {
            if (!postId) return;
            addMutation.mutate({ postId, text });
        },
        [postId, addMutation]
    );

    const deleteComment = useCallback(
        (commentId: string) => {
            if (!postId) return;
            deleteMutation.mutate({ commentId, postId });
        },
        [postId, deleteMutation]
    );

    return {
        count: countData ?? 0,
        addComment,
        deleteComment,
        isAdding: addMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
