import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Flame, TrendingUp, TrendingDown, Minus, Zap, Calendar } from 'lucide-react';
import type { IdentityKernel, Archetype } from '@/hooks/useIdentityKernel';

interface ShareableAuraCardProps {
    kernel: IdentityKernel;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
}

export interface ShareableAuraCardRef {
    getElement: () => HTMLDivElement | null;
}

// Archetype color themes - matching AthleteIdentityCard exactly
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
 * Shareable Aura Card - EXACTLY matches AthleteIdentityCard styling
 * Scaled up for Instagram Stories (9:16 ratio) with athlete info at bottom
 */
export const ShareableAuraCard = forwardRef<ShareableAuraCardRef, ShareableAuraCardProps>(
    function ShareableAuraCard(
        { kernel, athleteName, athleteHandle, athleteAvatar },
        ref
    ) {
        const cardRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            getElement: () => cardRef.current,
        }));

        const theme = ARCHETYPE_THEMES[kernel.archetype];
        const TrendIcon = kernel.progressDelta.direction === 'up'
            ? TrendingUp
            : kernel.progressDelta.direction === 'down'
                ? TrendingDown
                : Minus;

        return (
            <div
                ref={cardRef}
                className="relative w-[540px] h-[960px] overflow-hidden bg-zinc-900"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
                {/* Background gradient orbs - matching platform */}
                <div
                    className={`absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-60 bg-gradient-to-br ${theme.gradient}`}
                />
                <div
                    className="absolute bottom-40 -left-20 w-96 h-96 rounded-full blur-3xl opacity-40"
                    style={{ background: 'radial-gradient(circle, rgba(161, 98, 7, 0.3) 0%, transparent 70%)' }}
                />

                {/* Main content - centered card matching AthleteIdentityCard */}
                <div className="relative h-full flex flex-col p-8" style={{ zIndex: 10 }}>

                    {/* Card container - matching AthleteIdentityCard exactly */}
                    <div
                        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-zinc-950/90 backdrop-blur-xl p-8 shadow-lg ${theme.glow}`}
                    >
                        {/* Background gradient orb inside card */}
                        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-60 bg-gradient-to-br ${theme.gradient}`} />

                        {/* Content */}
                        <div className="relative z-10">
                            {/* Top row: Aura Score + Archetype Badge */}
                            <div className="flex items-start justify-between mb-6">
                                {/* Aura Score */}
                                <div>
                                    <div className="text-sm text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Zap className="w-4 h-4" />
                                        Aura Score
                                    </div>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-7xl font-bold text-white tracking-tight">
                                            {kernel.auraScore}
                                        </span>
                                        {kernel.auraChange.delta !== 0 && (
                                            <span className={`text-xl font-medium ${kernel.auraChange.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {kernel.auraChange.delta > 0 ? '+' : ''}{kernel.auraChange.delta}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Archetype Badge */}
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 ${theme.text}`}>
                                    <span className="text-xl">{kernel.archetypeIcon}</span>
                                    <span className="text-sm font-medium uppercase tracking-wide">
                                        {kernel.archetype}
                                    </span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

                            {/* Stats row: Streak, This Week, Progress */}
                            <div className="grid grid-cols-3 gap-6 mb-6">
                                {/* Streak */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Flame className="w-5 h-5 text-orange-400" />
                                        <span className="text-2xl font-semibold text-white">{kernel.streak}d</span>
                                    </div>
                                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Streak</span>
                                </div>

                                {/* This Week */}
                                <div className="text-center border-x border-white/5">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Calendar className="w-5 h-5 text-cyan-400" />
                                        <span className="text-2xl font-semibold text-white">
                                            {kernel.thisWeek.sessions}
                                        </span>
                                    </div>
                                    <span className="text-xs text-zinc-500 uppercase tracking-wider">
                                        This week • {Math.round(kernel.thisWeek.minutes / 60)}h
                                    </span>
                                </div>

                                {/* Progress Delta */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <TrendIcon className={`w-5 h-5 ${kernel.progressDelta.direction === 'up' ? 'text-emerald-400' :
                                            kernel.progressDelta.direction === 'down' ? 'text-rose-400' : 'text-zinc-400'
                                            }`} />
                                        <span className={`text-2xl font-semibold ${kernel.progressDelta.direction === 'up' ? 'text-emerald-400' :
                                            kernel.progressDelta.direction === 'down' ? 'text-rose-400' : 'text-white'
                                            }`}>
                                            {kernel.progressDelta.direction === 'flat' ? '—' : `${kernel.progressDelta.percent}%`}
                                        </span>
                                    </div>
                                    <span className="text-xs text-zinc-500 uppercase tracking-wider">vs 30d</span>
                                </div>
                            </div>

                            {/* Score Breakdown Section */}
                            <div className="pt-6 border-t border-white/5">
                                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4 text-center">
                                    Score Breakdown
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col items-center p-4 rounded-xl bg-white/5">
                                        <span className="text-zinc-400 text-sm mb-1">📅 Discipline</span>
                                        <span className="text-emerald-400 font-bold text-xl mb-1">{kernel.scoreBreakdown.discipline.score}</span>
                                        <span className="text-zinc-600 text-xs text-center leading-tight">
                                            {kernel.scoreBreakdown.discipline.detail}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center p-4 rounded-xl bg-white/5">
                                        <span className="text-zinc-400 text-sm mb-1">🔥 Momentum</span>
                                        <span className="text-orange-400 font-bold text-xl mb-1">{kernel.scoreBreakdown.momentum.score}</span>
                                        <span className="text-zinc-600 text-xs text-center leading-tight">
                                            {kernel.scoreBreakdown.momentum.detail}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center p-4 rounded-xl bg-white/5">
                                        <span className="text-zinc-400 text-sm mb-1">💪 Output</span>
                                        <span className="text-purple-400 font-bold text-xl mb-1">{kernel.scoreBreakdown.output.score}</span>
                                        <span className="text-zinc-600 text-xs text-center leading-tight">
                                            {kernel.scoreBreakdown.output.detail}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Small spacer */}
                    <div className="mt-6" />

                    {/* Bottom: Athlete profile + Athlyst branding */}
                    <div
                        className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 mb-4"
                    >
                        <img
                            src={athleteAvatar || '/placeholder.svg'}
                            alt={athleteName}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-white/20"
                        />
                        <div className="flex-1">
                            <p className="text-lg font-bold text-white">{athleteName}</p>
                            <p className="text-sm text-white/50">@{athleteHandle}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 rounded-full px-4 py-2 bg-white/5 border border-white/10 ${theme.text}`}>
                            <span className="text-base">{kernel.archetypeIcon}</span>
                            <span className="text-sm font-semibold">{kernel.archetype}</span>
                        </div>
                    </div>

                    {/* Athlyst branding */}
                    <div className="flex items-center justify-center gap-2 pb-2">
                        <div className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                <Zap className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-emerald-400">Athlyst</span>
                        </div>
                        <span className="text-white/30">•</span>
                        <span className="text-sm text-white/50">Athlete Identity</span>
                        <span className="text-white/30">•</span>
                        <span className="text-sm text-white/40">athlyst.fun/{athleteHandle?.slice(0, 6).toUpperCase() || 'ATHLETE'}</span>
                    </div>
                </div>
            </div>
        );
    }
);

export default ShareableAuraCard;
