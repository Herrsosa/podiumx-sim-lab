import { forwardRef, useRef, useImperativeHandle } from 'react';
import { Flame, Zap, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import type { IdentityKernel, Archetype } from '@/hooks/useIdentityKernel';

export interface ShareableIdentityReceiptRef {
    getElement: () => HTMLDivElement | null;
}

export interface ShareableIdentityReceiptProps {
    kernel: IdentityKernel;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
    workoutType?: string;
}

// Archetype gradient themes
const ARCHETYPE_THEMES: Record<Archetype, { primary: string; secondary: string }> = {
    'Runner': { primary: '#10b981', secondary: '#34d399' },
    'Lifter': { primary: '#a855f7', secondary: '#c084fc' },
    'Triathlete': { primary: '#06b6d4', secondary: '#22d3ee' },
    'HYROX Athlete': { primary: '#f97316', secondary: '#fb923c' },
    'Hybrid': { primary: '#eab308', secondary: '#facc15' },
    'Endurance': { primary: '#f43f5e', secondary: '#fb7185' },
    'Emerging': { primary: '#71717a', secondary: '#a1a1aa' },
};

/**
 * Shareable Identity Receipt card for Instagram Stories (9:16 ratio)
 * Designed to "mint identity" after each Proof of Sweat
 */
export const ShareableIdentityReceipt = forwardRef<ShareableIdentityReceiptRef, ShareableIdentityReceiptProps>(
    function ShareableIdentityReceipt(
        { kernel, athleteName, athleteHandle, athleteAvatar, workoutType = 'Workout' },
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

        const isPositiveAura = kernel.auraChange.delta >= 0;

        return (
            <div
                ref={cardRef}
                className="relative w-[540px] h-[960px] overflow-hidden"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />

                {/* Animated gradient orbs */}
                <div
                    className="absolute top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-40"
                    style={{ background: `radial-gradient(circle, ${theme.primary}33, transparent)` }}
                />
                <div
                    className="absolute bottom-40 -right-20 w-96 h-96 rounded-full blur-3xl opacity-30"
                    style={{ background: `radial-gradient(circle, ${theme.secondary}22, transparent)` }}
                />

                {/* Grain texture */}
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* Main content */}
                <div className="relative flex flex-col h-full p-8" style={{ zIndex: 10 }}>
                    {/* Header: Proof of Sweat Badge */}
                    <div className="flex items-center justify-center gap-2 mb-12">
                        <div
                            className="flex items-center gap-2 px-4 py-2 rounded-full"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <span className="text-xl">🔥</span>
                            <span className="text-sm font-semibold text-white uppercase tracking-widest">
                                Proof of Sweat
                            </span>
                        </div>
                    </div>

                    {/* Aura Score Hero */}
                    <div className="text-center mb-10">
                        <div className="text-xs text-zinc-500 uppercase tracking-[0.3em] mb-3">
                            Aura Score
                        </div>
                        <div className="relative inline-block">
                            <span
                                className="text-9xl font-bold tracking-tight"
                                style={{
                                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.2))',
                                }}
                            >
                                {kernel.auraScore}
                            </span>
                        </div>

                        {/* Aura Change */}
                        <div className="mt-4">
                            <span
                                className={`text-2xl font-bold ${isPositiveAura ? 'text-emerald-400' : 'text-rose-400'}`}
                            >
                                {isPositiveAura ? '+' : ''}{kernel.auraChange.delta}
                            </span>
                            <p className="text-sm text-zinc-400 mt-1">
                                {kernel.auraChange.reason}
                            </p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div
                        className="grid grid-cols-3 gap-4 p-5 rounded-2xl mb-8"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        {/* Streak */}
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Flame className="w-5 h-5 text-orange-400" />
                                <span className="text-2xl font-bold text-white">{kernel.streak}d</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Streak</span>
                        </div>

                        {/* This Week */}
                        <div className="text-center border-x border-white/10">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Zap className="w-5 h-5" style={{ color: theme.primary }} />
                                <span className="text-2xl font-bold text-white">{kernel.thisWeek.sessions}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                This week • {Math.round(kernel.thisWeek.minutes / 60)}h
                            </span>
                        </div>

                        {/* Progress Delta */}
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <TrendIcon className={`w-5 h-5 ${kernel.progressDelta.direction === 'up' ? 'text-emerald-400' :
                                        kernel.progressDelta.direction === 'down' ? 'text-rose-400' : 'text-zinc-400'
                                    }`} />
                                <span className={`text-2xl font-bold ${kernel.progressDelta.direction === 'up' ? 'text-emerald-400' :
                                        kernel.progressDelta.direction === 'down' ? 'text-rose-400' : 'text-white'
                                    }`}>
                                    {kernel.progressDelta.direction === 'flat' ? '—' : `${kernel.progressDelta.percent}%`}
                                </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">vs 30d</span>
                        </div>
                    </div>

                    {/* Archetype Badge */}
                    <div className="flex justify-center mb-8">
                        <div
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl"
                            style={{
                                background: `linear-gradient(135deg, ${theme.primary}22, ${theme.secondary}11)`,
                                border: `1px solid ${theme.primary}44`,
                            }}
                        >
                            <span className="text-2xl">{kernel.archetypeIcon}</span>
                            <span
                                className="text-lg font-bold uppercase tracking-wider"
                                style={{ color: theme.primary }}
                            >
                                {kernel.archetype}
                            </span>
                        </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Profile Card */}
                    <div
                        className="p-5 rounded-2xl mb-6"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <img
                                src={athleteAvatar || '/placeholder.svg'}
                                alt={athleteName}
                                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/20"
                            />
                            <div className="flex-1">
                                <p className="text-lg font-bold text-white">{athleteName}</p>
                                <p className="text-sm text-zinc-400">@{athleteHandle}</p>
                            </div>
                            <div className="flex items-center gap-1 text-zinc-400 text-sm">
                                <ExternalLink className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                            <Zap className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-emerald-400">Athlyst</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-sm text-zinc-500">athlyst.fun/@{athleteHandle}</span>
                    </div>
                </div>
            </div>
        );
    }
);

export default ShareableIdentityReceipt;
