import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Athlete } from '@/types';
import { formatMoney } from '@/lib/format';
import { resolveAvatarUrl } from '@/utils/avatar';
import { cn } from '@/lib/utils';

interface TrendingHeroProps {
    athletes: Athlete[];
    onAthleteClick: (slug: string) => void;
}

const SPORT_COLORS: Record<string, string> = {
    Running: 'from-orange-500/20 to-transparent',
    HYROX: 'from-yellow-500/20 to-transparent',
    Cycling: 'from-blue-500/20 to-transparent',
    Triathlon: 'from-purple-500/20 to-transparent',
    CrossFit: 'from-red-500/20 to-transparent',
    Swimming: 'from-cyan-500/20 to-transparent',
    'Trail Run': 'from-emerald-500/20 to-transparent',
    Rowing: 'from-indigo-500/20 to-transparent',
};

export function TrendingHero({ athletes, onAthleteClick }: TrendingHeroProps) {
    // Get top 3 athletes by highest 24h change
    const trendingAthletes = useMemo(() => {
        return [...athletes]
            .filter(athlete => athlete.change24h > 0)
            .sort((a, b) => b.change24h - a.change24h)
            .slice(0, 3);
    }, [athletes]);

    if (trendingAthletes.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Trending Now</h2>
                    <p className="text-sm text-muted-foreground">Top performing athletes in the last 24h</p>
                </div>
            </div>

            {/* Cards Grid - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trendingAthletes.map((athlete, index) => (
                    <TrendingCard
                        key={athlete.id}
                        athlete={athlete}
                        rank={index + 1}
                        onClick={() => athlete.slug && onAthleteClick(athlete.slug)}
                    />
                ))}
            </div>
        </div>
    );
}

interface TrendingCardProps {
    athlete: Athlete;
    rank: number;
    onClick: () => void;
}

function TrendingCard({ athlete, rank, onClick }: TrendingCardProps) {
    const avatarUrl = resolveAvatarUrl(athlete.avatar, { size: 400 });
    const hasAvatar = Boolean(athlete.avatar?.trim());
    const sportGradient = SPORT_COLORS[athlete.sport] || 'from-primary/20 to-transparent';

    return (
        <motion.div
            className="cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
        >
            <div className="relative h-[220px] rounded-xl overflow-hidden border border-border/50 bg-card">
                {/* Background Image */}
                {hasAvatar ? (
                    <img
                        src={avatarUrl}
                        alt={athlete.name}
                        className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className={cn("absolute inset-0 bg-gradient-to-br", sportGradient, "opacity-50")} />

                {/* Rank Badge */}
                <div className="absolute top-4 left-4">
                    <Badge
                        variant="secondary"
                        className="bg-black/60 backdrop-blur-sm text-white border-white/20 px-3 py-1"
                    >
                        #{rank} Trending
                    </Badge>
                </div>

                {/* Percentage Badge */}
                <div className="absolute top-3 right-3 md:top-4 md:right-4">
                    <div className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-emerald-500/90 text-white font-bold text-sm md:text-lg">
                        <TrendingUp className="h-3 w-3 md:h-5 md:w-5" />
                        +{athlete.change24h.toFixed(1)}%
                    </div>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5">
                    <div className="flex items-end justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-xl font-bold text-white truncate mb-1">
                                {athlete.name}
                            </h3>
                            <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20 text-xs">
                                {athlete.sport}
                            </Badge>
                        </div>

                        <div className="text-right ml-2 md:ml-4">
                            <div className="text-xl md:text-3xl font-bold text-white">
                                ${athlete.price.toFixed(2)}
                            </div>
                            <div className="text-[10px] md:text-xs text-white/60">
                                MCap: {formatMoney(athlete.marketCap)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2">
                        Trade Now <ArrowUpRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
