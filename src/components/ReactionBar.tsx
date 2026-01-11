import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useReactions, type ReactionEmoji, REACTION_EMOJIS } from '@/hooks/useReactions';
import { useUser } from '@/store/auth';
import { motion, AnimatePresence } from 'framer-motion';

interface ReactionBarProps {
    postId: string;
    className?: string;
    compact?: boolean;
}

const EMOJI_LABELS: Record<ReactionEmoji, string> = {
    '🔥': 'Fire',
    '💪': 'Strong',
    '👏': 'Applause',
};

/**
 * Reaction bar component for toggling emoji reactions on posts.
 * Shows counts and allows authenticated users to toggle reactions.
 */
export const ReactionBar = memo(function ReactionBar({
    postId,
    className,
    compact = false,
}: ReactionBarProps) {
    const user = useUser();
    const { reactionCounts, toggleReaction, isToggling } = useReactions(postId);

    // Only show emojis with reactions or all if user can interact
    const visibleReactions = user
        ? reactionCounts
        : reactionCounts.filter((r) => r.count > 0);

    if (visibleReactions.length === 0 && !user) {
        return null;
    }

    return (
        <div className={cn('flex items-center gap-1', className)}>
            {(user ? REACTION_EMOJIS : visibleReactions.map((r) => r.emoji)).map((emoji) => {
                const reaction = reactionCounts.find((r) => r.emoji === emoji);
                const count = reaction?.count ?? 0;
                const hasReacted = reaction?.hasReacted ?? false;

                return (
                    <Tooltip key={emoji}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={!user || isToggling}
                                onClick={() => toggleReaction(emoji as ReactionEmoji)}
                                className={cn(
                                    'h-7 gap-1 px-2 text-xs transition-all',
                                    hasReacted && 'bg-primary/10 border border-primary/20',
                                    compact && 'h-6 px-1.5 text-[10px]'
                                )}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={hasReacted ? 'active' : 'inactive'}
                                        initial={{ scale: 0.5 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.5 }}
                                        transition={{ duration: 0.15 }}
                                        className={cn('text-sm', compact && 'text-xs')}
                                    >
                                        {emoji}
                                    </motion.span>
                                </AnimatePresence>
                                {count > 0 && (
                                    <motion.span
                                        key={count}
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-muted-foreground"
                                    >
                                        {count}
                                    </motion.span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                            {EMOJI_LABELS[emoji as ReactionEmoji]}
                            {!user && ' • Sign in to react'}
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
});
