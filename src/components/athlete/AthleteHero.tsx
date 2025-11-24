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

interface AthleteHeroProps {
    athlete: Athlete;
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

export function AthleteHero({ athlete }: AthleteHeroProps) {
    const isPositive = athlete.change24h >= 0;

    const sportStyle = SPORT_COLORS[athlete.sport] || 'from-primary/20 to-primary/5 border-primary/20 text-primary';
    const glowColor = SPORT_BG_GLOW[athlete.sport] || 'bg-primary';

    return (
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
            {/* Dynamic Background Glow */}
            <div className={cn("absolute -top-[50%] -left-[10%] h-[150%] w-[60%] opacity-20 blur-[120px] rounded-full pointer-events-none", glowColor)} />

            <div className="relative z-10 grid gap-8 p-6 md:grid-cols-[300px_1fr] md:p-8 lg:gap-12">
                {/* Left Column: Avatar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl md:h-full md:aspect-auto"
                >
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30", sportStyle)} />
                    <OptimizedImage
                        src={resolveAvatarUrl(athlete.avatar, { size: 640 })}
                        webpSrc={getAvatarAsset(athlete.avatar)?.webp}
                        alt={athlete.name}
                        width={640}
                        height={853}
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                        priority={true}
                    />

                    {/* Sport Badge Overlay */}
                    <div className="absolute bottom-4 left-4">
                        <Badge variant="secondary" className="backdrop-blur-md bg-black/50 border-white/10 text-white px-3 py-1 text-sm font-medium">
                            {athlete.sport}
                        </Badge>
                    </div>
                </motion.div>

                {/* Right Column: Info & HUD Stats */}
                <div className="flex flex-col justify-center space-y-8">

                    {/* Header Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="space-y-4"
                    >
                        <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl glow-text">
                            {athlete.name}
                        </h1>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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

                        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground/90 md:text-lg">
                            {athlete.bio}
                        </p>
                    </motion.div>

                    {/* HUD Stats Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4"
                    >
                        {/* Price Pill */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/10">
                            <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Price</div>
                            <div className="text-2xl font-bold text-white md:text-3xl">
                                $<CountUp value={athlete.price} decimalPlaces={2} duration={1.5} />
                            </div>
                            <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium", isPositive ? "text-success" : "text-destructive")}>
                                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {isPositive ? '+' : ''}{formatNumber(athlete.change24h)}%
                            </div>
                        </div>

                        {/* Market Cap Pill */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/10">
                            <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Market Cap</div>
                            <div className="text-xl font-bold text-white md:text-2xl">
                                {formatMoney(athlete.marketCap)}
                            </div>
                        </div>

                        {/* Supply Pill */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/10">
                            <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Supply</div>
                            <div className="text-xl font-bold text-white md:text-2xl">
                                {formatNumber(athlete.supply)}
                            </div>
                        </div>

                        {/* Volume Pill */}
                        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/10">
                            <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">24h Volume</div>
                            <div className="text-xl font-bold text-white md:text-2xl">
                                {formatMoney(athlete.volume24h)}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
