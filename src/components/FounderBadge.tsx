/**
 * FounderBadge Component
 * Displays a premium Founder badge for early adopters
 */

import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FounderBadgeProps {
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

export function FounderBadge({ size = 'md', showLabel = true, className }: FounderBadgeProps) {
    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5 gap-0.5',
        md: 'text-xs px-2 py-1 gap-1',
        lg: 'text-sm px-3 py-1.5 gap-1.5',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-3.5 w-3.5',
        lg: 'h-4 w-4',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center font-semibold rounded-full',
                'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
                'border border-amber-500/30',
                'text-amber-400',
                'shadow-[0_0_10px_rgba(245,158,11,0.15)]',
                sizeClasses[size],
                className
            )}
        >
            <Crown className={cn(iconSizes[size], 'text-amber-400')} />
            {showLabel && <span>Founder</span>}
        </span>
    );
}

/**
 * Check if a badges array contains the founder badge
 */
export function hasFounderBadge(badges?: Array<{ badge_type: string }> | null): boolean {
    return badges?.some(b => b.badge_type === 'founder') ?? false;
}
