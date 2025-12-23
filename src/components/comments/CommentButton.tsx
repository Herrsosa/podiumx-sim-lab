import { memo } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommentCount } from '@/hooks/useComments';

interface CommentButtonProps {
    postId: string;
    className?: string;
    showCount?: boolean;
    size?: 'sm' | 'md';
    onClick?: () => void;
}

/**
 * Comment button displaying comment icon + count
 */
export const CommentButton = memo(function CommentButton({
    postId,
    className,
    showCount = true,
    size = 'md',
    onClick,
}: CommentButtonProps) {
    const { data: count = 0 } = useCommentCount(postId);

    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                'inline-flex items-center gap-1.5 transition-all duration-200',
                'hover:scale-110 active:scale-95',
                'text-muted-foreground hover:text-primary',
                className
            )}
            aria-label={`${count} comment${count !== 1 ? 's' : ''}`}
            title="View comments"
        >
            <MessageCircle className={cn(iconSize, 'transition-all duration-200')} />
            {showCount && (
                <span className={cn(textSize, 'font-medium tabular-nums min-w-[1ch]')}>
                    {count > 0 ? count : ''}
                </span>
            )}
        </button>
    );
});
