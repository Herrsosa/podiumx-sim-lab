import { useState, memo } from 'react';
import { MessageCircle, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCommentCount } from '@/hooks/useComments';
import { CommentSection } from './CommentSection';

interface CommentButtonWithModalProps {
    postId: string;
    className?: string;
    showCount?: boolean;
    size?: 'sm' | 'md';
}

/**
 * Comment button that opens a modal with the full comment section
 */
export const CommentButtonWithModal = memo(function CommentButtonWithModal({
    postId,
    className,
    showCount = true,
    size = 'md',
}: CommentButtonWithModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { data: count = 0 } = useCommentCount(postId);

    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(true);
    };

    return (
        <>
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

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent
                    className="max-w-md max-h-[80vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            Comments {count > 0 && `(${count})`}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <CommentSection postId={postId} maxHeight="50vh" />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
});
