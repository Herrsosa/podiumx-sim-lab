import { Flame, TrendingUp, TrendingDown, Minus, Zap, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIdentityKernel, type Archetype } from '@/hooks/useIdentityKernel';
import { Skeleton } from '@/components/ui/skeleton';

interface AthleteIdentityCardProps {
    className?: string;
    athleteId?: string;
}

// Archetype color themes
const ARCHETYPE_THEMES: Record<Archetype, { gradient: string; glow: string; text: string }> = {
    'Runner': {
        gradient: 'from-emerald-500/20 via-green-500/10 to-transparent',
        glow: 'shadow-emerald-500/20',
        text: 'text-emerald-400',
    },
    'Lifter': {
        gradient: 'from-purple-500/20 via-violet-500/10 to-transparent',
        glow: 'shadow-purple-500/20',
        text: 'text-purple-400',
    },
    'Triathlete': {
        gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
        glow: 'shadow-cyan-500/20',
        text: 'text-cyan-400',
    },
    'HYROX Athlete': {
        gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
        glow: 'shadow-orange-500/20',
        text: 'text-orange-400',
    },
    'Hybrid': {
        gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent',
        glow: 'shadow-yellow-500/20',
        text: 'text-yellow-400',
    },
    'Endurance': {
        gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
        glow: 'shadow-rose-500/20',
        text: 'text-rose-400',
    },
    'Emerging': {
        gradient: 'from-zinc-500/20 via-gray-500/10 to-transparent',
        glow: 'shadow-zinc-500/20',
        text: 'text-zinc-400',
    },
};

/**
 * Premium Athlete Identity Card displaying the 5-metric Identity Kernel:
 * - Aura Score (hero number)
 * - Archetype (badge)
 * - Streak (days)
 * - This Week (sessions + minutes)
 * - Progress Delta (vs last 30d)
 */
export function AthleteIdentityCard({ className, athleteId }: AthleteIdentityCardProps) {
    const { data: kernel, isLoading } = useIdentityKernel(athleteId);

    if (isLoading) {
        return <IdentityCardSkeleton className={className} />;
    }

    if (!kernel) {
        return null;
    }

    const theme = ARCHETYPE_THEMES[kernel.archetype];
    const TrendIcon = kernel.progressDelta.direction === 'up'
        ? TrendingUp
        : kernel.progressDelta.direction === 'down'
            ? TrendingDown
            : Minus;

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border border-white/10',
                'bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-zinc-950/90',
                'backdrop-blur-xl p-5 h-full',
                `shadow-lg ${theme.glow}`,
                className
            )}
        >
            {/* Background gradient orb */}
            <div className={cn(
                'absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-60',
                `bg-gradient-to-br ${theme.gradient}`
            )} />

            {/* Content */}
            <div className="relative z-10">
                {/* Top row: Aura Score + Archetype Badge */}
                <div className="flex items-start justify-between mb-4">
                    {/* Aura Score */}
                    <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Aura Score
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold text-white tracking-tight">
                                {kernel.auraScore}
                            </span>
                            {kernel.auraChange.delta !== 0 && (
                                <span className={cn(
                                    'text-sm font-medium',
                                    kernel.auraChange.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                                )}>
                                    {kernel.auraChange.delta > 0 ? '+' : ''}{kernel.auraChange.delta}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 max-w-[180px]">
                            {kernel.auraChange.reason}
                        </p>
                    </div>

                    {/* Archetype Badge */}
                    <div className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                        'bg-white/5 border border-white/10',
                        theme.text
                    )}>
                        <span className="text-base">{kernel.archetypeIcon}</span>
                        <span className="text-xs font-medium uppercase tracking-wide">
                            {kernel.archetype}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

                {/* Bottom row: Streak, This Week, Progress */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Streak */}
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Flame className="w-4 h-4 text-orange-400" />
                            <span className="text-lg font-semibold text-white">{kernel.streak}d</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Streak</span>
                    </div>

                    {/* This Week */}
                    <div className="text-center border-x border-white/5">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Calendar className="w-4 h-4 text-cyan-400" />
                            <span className="text-lg font-semibold text-white">
                                {kernel.thisWeek.sessions}
                            </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                            This week • {Math.round(kernel.thisWeek.minutes / 60)}h
                        </span>
                    </div>

                    {/* Progress Delta */}
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendIcon className={cn(
                                'w-4 h-4',
                                kernel.progressDelta.direction === 'up' ? 'text-emerald-400' :
                                    kernel.progressDelta.direction === 'down' ? 'text-rose-400' : 'text-zinc-400'
                            )} />
                            <span className={cn(
                                'text-lg font-semibold',
                                kernel.progressDelta.direction === 'up' ? 'text-emerald-400' :
                                    kernel.progressDelta.direction === 'down' ? 'text-rose-400' : 'text-white'
                            )}>
                                {kernel.progressDelta.direction === 'flat' ? '—' : `${kernel.progressDelta.percent}%`}
                            </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">vs 30d</span>
                    </div>
                </div>

                {/* Score Breakdown Section */}
                <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 text-center">
                        Score Breakdown
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="flex flex-col items-center p-2 rounded-lg bg-white/5">
                            <span className="text-zinc-400">📅 Discipline</span>
                            <span className="text-emerald-400 font-bold">{kernel.scoreBreakdown.discipline.score}</span>
                            <span className="text-zinc-600 text-center leading-tight">
                                {kernel.scoreBreakdown.discipline.detail}
                            </span>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-lg bg-white/5">
                            <span className="text-zinc-400">🔥 Momentum</span>
                            <span className="text-orange-400 font-bold">{kernel.scoreBreakdown.momentum.score}</span>
                            <span className="text-zinc-600 text-center leading-tight">
                                {kernel.scoreBreakdown.momentum.detail}
                            </span>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-lg bg-white/5">
                            <span className="text-zinc-400">💪 Output</span>
                            <span className="text-purple-400 font-bold">{kernel.scoreBreakdown.output.score}</span>
                            <span className="text-zinc-600 text-center leading-tight">
                                {kernel.scoreBreakdown.output.detail}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function IdentityCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            'rounded-2xl border border-white/10 bg-zinc-900/80 p-5',
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-12 w-20 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <div className="h-px bg-white/5 mb-4" />
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex flex-col items-center">
                        <Skeleton className="h-6 w-10 mb-1" />
                        <Skeleton className="h-2 w-12" />
                    </div>
                ))}
            </div>
        </div>
    );
}
