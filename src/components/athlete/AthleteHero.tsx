import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/OptimizedImage';
import { getAvatarAsset, resolveAvatarUrl } from '@/utils/avatar';
import { formatMoney, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Athlete } from '@/types';
import { TrendingUp, TrendingDown, MapPin, Instagram } from 'lucide-react';
import { CountUp } from '@/components/ui/count-up';
import { WatchlistButton } from '@/components/WatchlistButton';

interface AthleteHeroProps {
    athlete: Athlete;
    /** Optional Aura Score card to render on the right side (desktop only) */
    auraCard?: React.ReactNode;
}

const SPORT_COLORS: Record<string, string> = {
    Running: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-500',
    HYROX: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 text-yellow-500',
    Cycling: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-500',
    Triathlon: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-500',
    CrossFit: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-500',
    Swimming: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-500',
    'Trail Run': 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-500',
    Rowing: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-500',
};

const SPORT_BG_GLOW: Record<string, string> = {
    Running: 'bg-orange-500',
    HYROX: 'bg-yellow-500',
    Cycling: 'bg-blue-500',
    Triathlon: 'bg-purple-500',
    CrossFit: 'bg-red-500',
    Swimming: 'bg-cyan-500',
    'Trail Run': 'bg-emerald-500',
    Rowing: 'bg-indigo-500',
};

export function AthleteHero({ athlete, auraCard }: AthleteHeroProps) {
    const isPositive = athlete.change24h >= 0;

    const sportStyle = SPORT_COLORS[athlete.sport] || 'from-primary/20 to-primary/5 border-primary/20 text-primary';
    const glowColor = SPORT_BG_GLOW[athlete.sport] || 'bg-primary';

    return (
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
            {/* Dynamic Background Glow */}
            <div className={cn("absolute -top-[50%] -left-[10%] h-[150%] w-[60%] opacity-20 blur-[120px] rounded-full pointer-events-none", glowColor)} />

            {/* Desktop: 3-column grid | Mobile: stacked */}
            <div className={cn(
                "relative z-10 p-6 md:p-8",
                "grid gap-6 md:gap-8",
                // Mobile: single column, Desktop: avatar(220px) | content(1fr) | aura(auto)
                auraCard
                    ? "md:grid-cols-[220px_1fr_auto]"
                    : "md:grid-cols-[220px_1fr]"
            )}>
                {/* Column 1: Avatar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl md:h-full md:aspect-auto md:min-h-[280px]"
                >
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30", sportStyle)} />
                    <OptimizedImage
                        src={resolveAvatarUrl(athlete.avatar, { size: 480 })}
                        webpSrc={getAvatarAsset(athlete.avatar)?.webp}
                        alt={athlete.name}
                        width={480}
                        height={640}
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                    />

                    {/* Sport Badge Overlay */}
                    <div className="absolute bottom-3 left-3">
                        <Badge variant="secondary" className="backdrop-blur-md bg-black/50 border-white/10 text-white px-2.5 py-0.5 text-xs font-medium">
                            {athlete.sport}
                        </Badge>
                    </div>

                    {/* Watchlist Button - Top Right */}
                    <div className="absolute top-3 right-3">
                        <WatchlistButton
                            athleteId={athlete.id}
                            size="sm"
                            className="bg-black/40 backdrop-blur-sm hover:bg-black/60"
                        />
                    </div>
                </motion.div>

                {/* Column 2: Identity + Market Stats */}
                <div className="flex flex-col justify-center space-y-5">

                    {/* Header Info: Name, Location, Bio */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="space-y-3"
                    >
                        <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl glow-text">
                            {athlete.name}
                        </h1>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {athlete.location}
                            </div>
                            {athlete.socials.instagram && (
                                <div className="flex items-center gap-1.5">
                                    <Instagram className="h-4 w-4" />
                                    {athlete.socials.instagram}
                                </div>
                            )}
                        </div>

                        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground/90 md:text-base">
                            {athlete.bio}
                        </p>
                    </motion.div>

                    {/* Market Stats: 4-tile row */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3"
                    >
                        {/* Price Tile */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-sm transition-all hover:bg-white/10">
                            <div className="mb-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Price</div>
                            <div className="text-xl font-bold text-white md:text-2xl">
                                $<CountUp value={athlete.price} decimalPlaces={2} duration={1.5} />
                            </div>
                            <div className={cn("mt-0.5 flex items-center gap-1 text-[10px] font-medium", isPositive ? "text-success" : "text-destructive")}>
                                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {isPositive ? '+' : ''}{formatNumber(athlete.change24h)}%
                            </div>
                        </div>

                        {/* Market Cap Tile */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-sm transition-all hover:bg-white/10">
                            <div className="mb-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Market Cap</div>
                            <div className="text-lg font-bold text-white md:text-xl">
                                {formatMoney(athlete.marketCap)}
                            </div>
                        </div>

                        {/* Supply Tile */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-sm transition-all hover:bg-white/10">
                            <div className="mb-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Supply</div>
                            <div className="text-lg font-bold text-white md:text-xl">
                                {formatNumber(athlete.supply)}
                            </div>
                        </div>

                        {/* Volume Tile */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-sm transition-all hover:bg-white/10">
                            <div className="mb-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">24h Vol</div>
                            <div className="text-lg font-bold text-white md:text-xl">
                                {formatMoney(athlete.volume24h)}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Column 3: Aura Card (desktop only, if provided) */}
                {auraCard && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="hidden md:flex md:items-stretch"
                    >
                        <div className="w-full min-w-[280px] max-w-[320px]">
                            {auraCard}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Mobile: Aura Card below hero content */}
            {auraCard && (
                <div className="md:hidden px-6 pb-6">
                    {auraCard}
                </div>
            )}
        </div>
    );
}

