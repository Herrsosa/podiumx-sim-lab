import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Athlete } from '@/types';
import { formatMoney, formatNumber } from '@/lib/format';
import { getAvatarAsset, resolveAvatarUrl } from '@/utils/avatar';
import { OptimizedImage } from '@/components/OptimizedImage';
import { cn } from '@/lib/utils';

const SPORT_COLORS: Record<string, string> = {
    Running: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    HYROX: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Cycling: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Triathlon: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    CrossFit: 'bg-red-500/10 text-red-500 border-red-500/20',
    Swimming: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    'Trail Run': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Rowing: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
};

interface CompactAthleteCardProps {
    athlete: Athlete;
    onClick?: () => void;
}

/**
 * Compact athlete card for mobile 2-column grid.
 * Shows: square photo, name, sport, price, % change.
 * No charts, supply, or market cap.
 */
export const CompactAthleteCard = memo(({ athlete, onClick }: CompactAthleteCardProps) => {
    const isPositive = (athlete.change24h ?? 0) >= 0;
    const changeValue = athlete.change24h ?? 0;

    const hasAvatar = Boolean(athlete.avatar && athlete.avatar.trim().length > 0);
    const avatarUrl = resolveAvatarUrl(athlete.avatar, { size: 200 });

    const fallbackInitials = useMemo(() => {
        if (!athlete.name) return 'PX';
        return athlete.name
            .split(' ')
            .map((part) => part.trim()[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'PX';
    }, [athlete.name]);

    // Truncate name if too long
    const displayName = useMemo(() => {
        if (!athlete.name) return 'Unknown';
        if (athlete.name.length <= 12) return athlete.name;
        // Try to show first name + last initial
        const parts = athlete.name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0]} ${parts[parts.length - 1][0]}.`;
        }
        return athlete.name.slice(0, 11) + '…';
    }, [athlete.name]);

    return (
        <Card
            onClick={onClick}
            className="glass-card overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.98] hover:bg-muted/50"
        >
            <CardContent className="p-0">
                {/* Square Photo */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                    {hasAvatar ? (
                        <OptimizedImage
                            src={avatarUrl}
                            webpSrc={getAvatarAsset(athlete.avatar)?.webp}
                            alt={athlete.name}
                            width={200}
                            height={200}
                            className="h-full w-full object-cover"
                            eager={false}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/70 to-muted text-xl font-semibold text-muted-foreground">
                            {fallbackInitials}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-2.5 space-y-1.5">
                    {/* Name */}
                    <h3 className="font-semibold text-sm truncate leading-tight">
                        {displayName}
                    </h3>

                    {/* Sport Badge */}
                    <Badge
                        variant="secondary"
                        className={cn(
                            "text-[9px] px-1.5 py-0 h-4",
                            SPORT_COLORS[athlete.sport] || "bg-secondary text-secondary-foreground"
                        )}
                    >
                        {athlete.sport}
                    </Badge>

                    {/* Price */}
                    <div className="text-base font-bold tracking-tight">
                        {formatMoney(athlete.price)}
                    </div>

                    {/* Change */}
                    <div
                        className={cn(
                            "flex items-center gap-0.5 text-xs font-medium",
                            isPositive ? 'text-emerald-500' : 'text-red-500'
                        )}
                    >
                        {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        {isPositive ? '+' : ''}
                        {formatNumber(changeValue)}%
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

CompactAthleteCard.displayName = 'CompactAthleteCard';
