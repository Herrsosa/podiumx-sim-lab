import { useState, useCallback, memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/UserAvatar';
import { useComments, useAddComment, useDeleteComment } from '@/hooks/useComments';
import { useUser } from '@/store/auth';
import { cn } from '@/lib/utils';

interface CommentSectionProps {
    postId: string;
    className?: string;
    maxHeight?: string;
}

/**
 * Expandable comment section with list and input
 */
export const CommentSection = memo(function CommentSection({
    postId,
    className,
    maxHeight = '300px',
}: CommentSectionProps) {
    const user = useUser();
    const [newComment, setNewComment] = useState('');

    const {
        data,
        isLoading,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    } = useComments(postId);

    const addMutation = useAddComment();
    const deleteMutation = useDeleteComment();

    const comments = data?.pages.flatMap((page) => page.comments) ?? [];

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!newComment.trim() || addMutation.isPending) return;

            addMutation.mutate(
                { postId, text: newComment },
                {
                    onSuccess: () => setNewComment(''),
                }
            );
        },
        [postId, newComment, addMutation]
    );

    const handleDelete = useCallback(
        (commentId: string) => {
            if (deleteMutation.isPending) return;
            deleteMutation.mutate({ commentId, postId });
        },
        [postId, deleteMutation]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        },
        [handleSubmit]
    );

    return (
        <div className={cn('space-y-3', className)}>
            {/* Comments List */}
            <div
                className="space-y-3 overflow-y-auto pr-1"
                style={{ maxHeight }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : comments.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                        No comments yet. Be the first!
                    </p>
                ) : (
                    <>
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2 group">
                                <UserAvatar
                                    src={comment.author?.avatar_url}
                                    alt={comment.author?.display_name ?? comment.author?.username ?? 'User'}
                                    size={32}
                                    className="shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-medium text-sm truncate">
                                            {comment.author?.display_name ?? comment.author?.username ?? 'User'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/90 break-words">
                                        {comment.text}
                                    </p>
                                </div>
                                {user?.id === comment.author_id && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(comment.id)}
                                        disabled={deleteMutation.isPending}
                                        aria-label="Delete comment"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        {/* Load More */}
                        {hasNextPage && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground"
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                            >
                                {isFetchingNextPage ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Load more comments
                            </Button>
                        )}
                    </>
                )}
            </div>

            {/* Comment Input */}
            {user ? (
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <UserAvatar
                        src={user.user_metadata?.avatar_url}
                        alt="You"
                        size={32}
                        className="shrink-0"
                    />
                    <div className="flex-1 flex gap-2">
                        <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Add a comment..."
                            className="min-h-[40px] max-h-[100px] resize-none text-sm"
                            maxLength={500}
                            disabled={addMutation.isPending}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="shrink-0 h-10 w-10"
                            disabled={!newComment.trim() || addMutation.isPending}
                            aria-label="Send comment"
                        >
                            {addMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </form>
            ) : (
                <p className="text-center text-sm text-muted-foreground py-2">
                    Sign in to comment
                </p>
            )}

            {/* Character count */}
            {newComment.length > 400 && (
                <p className={cn(
                    'text-xs text-right',
                    newComment.length > 500 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                    {newComment.length}/500
                </p>
            )}
        </div>
    );
});
