import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProps } from '@/hooks/useProps';
import { featureFlags } from '@/lib/config/featureFlags';
import { useUser } from '@/store/auth';

interface PropButtonProps {
    postId: string;
    className?: string;
    showCount?: boolean;
    size?: 'sm' | 'md';
}

/**
 * Heart button for "propping" (liking) a proof of sweat post
 * Shows filled heart when propped, outline when not
 */
export function PropButton({
    postId,
    className,
    showCount = true,
    size = 'md',
}: PropButtonProps) {
    const user = useUser();
    const { hasProp, propsCount, isPending, toggleProp } = useProps(postId);

    if (!featureFlags.enableProps) {
        return null;
    }

    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (user) {
            toggleProp();
        }
    };

    return (
        <button
            type="button"
            data-tour="props-button"
            onClick={handleClick}
            disabled={isPending || !user}
            className={cn(
                'inline-flex items-center gap-1.5 transition-all duration-200',
                'hover:scale-110 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                hasProp ? 'text-red-500' : 'text-muted-foreground hover:text-red-400',
                className
            )}
            aria-label={hasProp ? 'Remove prop' : 'Give prop'}
            title={user ? (hasProp ? 'Remove prop' : 'Give prop') : 'Sign in to prop'}
        >
            <Heart
                className={cn(
                    iconSize,
                    'transition-all duration-200',
                    hasProp && 'fill-current',
                    isPending && 'animate-pulse'
                )}
            />
            {showCount && (
                <span className={cn(textSize, 'font-medium tabular-nums min-w-[1ch]')}>
                    {propsCount > 0 ? propsCount : ''}
                </span>
            )}
        </button>
    );
}
