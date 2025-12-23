import { memo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShareModal } from './ShareModal';
import type { Workout } from '@/types';

interface ShareButtonProps {
    workout: Workout;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
    imageUrl?: string;
    athleteProfileUrl?: string;
    className?: string;
    size?: 'sm' | 'md';
}

/**
 * Share button that opens the share modal
 */
export const ShareButton = memo(function ShareButton({
    workout,
    athleteName,
    athleteHandle,
    athleteAvatar,
    imageUrl,
    athleteProfileUrl,
    className,
    size = 'md',
}: ShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

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
                aria-label="Share workout"
                title="Share"
            >
                <Share2 className={cn(iconSize, 'transition-all duration-200')} />
            </button>

            <ShareModal
                open={isOpen}
                onOpenChange={setIsOpen}
                workout={workout}
                athleteName={athleteName}
                athleteHandle={athleteHandle}
                athleteAvatar={athleteAvatar}
                imageUrl={imageUrl}
                athleteProfileUrl={athleteProfileUrl}
            />
        </>
    );
});
