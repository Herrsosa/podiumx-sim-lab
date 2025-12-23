import { memo, useCallback } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWatchlistToggle } from '@/hooks/useWatchlist';
import { useUser } from '@/store/auth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { motion, AnimatePresence } from 'framer-motion';

interface WatchlistButtonProps {
    athleteId: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'ghost' | 'default';
    showLabel?: boolean;
}

const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
};

const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
};

export const WatchlistButton = memo(({
    athleteId,
    className,
    size = 'md',
    variant = 'ghost',
    showLabel = false,
}: WatchlistButtonProps) => {
    const user = useUser();
    const { isWatched, toggle, isLoading } = useWatchlistToggle(athleteId);
    const { requireAuth, authDialog } = useAuthPrompt({
        description: 'Sign in to add athletes to your watchlist.',
        ctaLabel: 'Sign in',
    });

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent triggering card navigation
            e.preventDefault();

            if (!user) {
                requireAuth();
                return;
            }

            toggle();
        },
        [user, requireAuth, toggle]
    );

    return (
        <>
            <Button
                variant={variant}
                size="icon"
                className={cn(
                    'rounded-full transition-all duration-200',
                    sizeClasses[size],
                    isWatched
                        ? 'text-yellow-400 hover:text-yellow-500'
                        : 'text-muted-foreground hover:text-foreground',
                    className
                )}
                onClick={handleClick}
                disabled={isLoading}
                aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                aria-pressed={isWatched}
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={isWatched ? 'filled' : 'outline'}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <Star
                            className={cn(
                                iconSizes[size],
                                isWatched && 'fill-yellow-400'
                            )}
                        />
                    </motion.div>
                </AnimatePresence>
                {showLabel && (
                    <span className="ml-1.5 text-sm">
                        {isWatched ? 'Watching' : 'Watch'}
                    </span>
                )}
            </Button>
            {authDialog}
        </>
    );
});

WatchlistButton.displayName = 'WatchlistButton';
