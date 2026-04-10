import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Flame, TrendingUp, TrendingDown, Minus, Zap, Calendar } from 'lucide-react';
import type { IdentityKernel } from '@/hooks/useIdentityKernel';
import { ARCHETYPE_THEMES } from '../identity/PremiumIdentityComponents';
import { cn } from '@/lib/utils';

interface ShareableAuraCardProps {
    kernel: IdentityKernel;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
}

export interface ShareableAuraCardRef {
    getElement: () => HTMLDivElement | null;
}

/**
 * Shareable Aura Card
 * Scaled up for Instagram Stories (9:16 ratio) with athlete info at bottom.
 * Rendered strictly at 540x960 and expected to be captured by html2canvas at scale: 2 (1080x1920 output).
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
                className="relative w-[540px] h-[960px] overflow-hidden bg-zinc-950 flex flex-col justify-center items-center p-10"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
                {/* --- BACKGROUND AMBIENCE (To ensure html2canvas catches it rather than relying purely on backdrop-filter) --- */}
                <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-40 bg-gradient-to-br ${theme.gradient}`} />
                <div className={`absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 bg-gradient-to-br ${theme.gradient}`} />
                <div className="absolute inset-0 bg-zinc-950/60" />

                <div className="relative w-full z-10 flex flex-col items-center">
                    {/* --- MAIN GLASS CARD --- */}
                    <div 
                        className={cn(
                            'w-full relative overflow-hidden rounded-[2.5rem] border border-white/10 p-8',
                            'bg-zinc-950/80 backdrop-blur-3xl shadow-2xl flex flex-col mb-8',
                            theme.glow
                        )}
                        style={{
                            boxShadow: `inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 0 50px rgba(0,0,0,0.8), 0 20px 50px -10px rgba(0,0,0,0.8)`
                        }}
                    >
                        {/* Lighting Specular Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/50 pointer-events-none" />
                        
                        <div className="relative z-10 w-full flex flex-col">
                            {/* SCORE HERO */}
                            <div className="flex flex-col mb-12 mt-4">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="text-sm text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2 font-bold">
                                        <Zap className="w-5 h-5 text-emerald-400" />
                                        Aura Score
                                    </div>
                                    <div className={cn(
                                        'flex items-center gap-2 px-5 py-2 rounded-full border border-white/10',
                                        'shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] bg-black/40',
                                        theme.text
                                    )}>
                                        <span className="text-xl">{kernel.archetypeIcon}</span>
                                        <span className="text-sm font-bold uppercase tracking-widest">{kernel.archetype}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-baseline gap-4">
                                    <span className="text-[120px] font-black text-white tracking-tighter leading-none" style={{ textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                                        {kernel.auraScore} 
                                    </span>
                                    {Math.abs(kernel.auraChange.delta) > 0 && (
                                        <span className={cn(
                                            'text-4xl font-bold tracking-tight',
                                            kernel.auraChange.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                                        )}>
                                            {kernel.auraChange.delta > 0 ? '+' : ''}{kernel.auraChange.delta}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xl text-zinc-400 mt-4 tracking-wide font-medium">
                                    {kernel.auraChange.reason}
                                </p>
                            </div>

                            {/* VITALS PANEL */}
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex items-center justify-between mb-10 shadow-sm">
                                <div className="flex flex-col items-center flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flame className="w-7 h-7 text-orange-400" />
                                        <span className="text-3xl font-bold text-white tracking-tight">{kernel.streak}d</span>
                                    </div>
                                    <span className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Streak</span>
                                </div>

                                <div className="w-px h-14 bg-white/10" />

                                <div className="flex flex-col items-center flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-7 h-7 text-cyan-400" />
                                        <span className="text-3xl font-bold text-white tracking-tight">{kernel.thisWeek.sessions}</span>
                                    </div>
                                    <span className="text-sm text-zinc-500 uppercase tracking-widest font-bold">
                                        {Math.round(kernel.thisWeek.minutes / 60)}h this wk
                                    </span>
                                </div>

                                <div className="w-px h-14 bg-white/10" />

                                <div className="flex flex-col items-center flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendIcon className={cn(
                                            'w-7 h-7',
                                            kernel.progressDelta.direction === 'up' ? 'text-emerald-400' :
                                                kernel.progressDelta.direction === 'down' ? 'text-rose-400' : 'text-zinc-400'
                                        )} />
                                        <span className={cn(
                                            'text-3xl font-bold tracking-tight',
                                            kernel.progressDelta.direction === 'up' ? 'text-emerald-400' :
                                                kernel.progressDelta.direction === 'down' ? 'text-rose-400' : 'text-white'
                                        )}>
                                            {kernel.progressDelta.direction === 'flat' ? '—' : `${kernel.progressDelta.percent}%`}
                                        </span>
                                    </div>
                                    <span className="text-sm text-zinc-500 uppercase tracking-widest font-bold">vs 30d</span>
                                </div>
                            </div>

                            {/* BREAKDOWN ENGINE */}
                            <div>
                                <div className="text-sm text-zinc-500 uppercase tracking-[0.2em] mb-4 text-center font-bold">
                                    Score Breakdown Engine
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Discipline */}
                                    <div className="rounded-2xl bg-black/40 border border-white/5 p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                        <span className="text-zinc-400 text-xs uppercase tracking-wider block mb-2 font-semibold">Discipline</span>
                                        <span className="text-emerald-400 font-bold text-3xl block mb-2 leading-none">{kernel.scoreBreakdown.discipline.score}</span>
                                        <span className="text-zinc-500 text-xs leading-tight block font-medium">
                                            {kernel.scoreBreakdown.discipline.detail}
                                        </span>
                                    </div>
                                    {/* Momentum */}
                                    <div className="rounded-2xl bg-black/40 border border-white/5 p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                        <span className="text-zinc-400 text-xs uppercase tracking-wider block mb-2 font-semibold">Momentum</span>
                                        <span className="text-orange-400 font-bold text-3xl block mb-2 leading-none">{kernel.scoreBreakdown.momentum.score}</span>
                                        <span className="text-zinc-500 text-xs leading-tight block font-medium">
                                            {kernel.scoreBreakdown.momentum.detail}
                                        </span>
                                    </div>
                                    {/* Output */}
                                    <div className="rounded-2xl bg-black/40 border border-white/5 p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                        <span className="text-zinc-400 text-xs uppercase tracking-wider block mb-2 font-semibold">Output</span>
                                        <span className="text-purple-400 font-bold text-3xl block mb-2 leading-none">{kernel.scoreBreakdown.output.score}</span>
                                        <span className="text-zinc-500 text-xs leading-tight block font-medium">
                                            {kernel.scoreBreakdown.output.detail}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ATHLETE FOOTER ATTRIBUTION --- */}
                    <div className="w-full rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img
                                src={athleteAvatar || '/placeholder.svg'}
                                alt={athleteName}
                                className="w-16 h-16 rounded-full object-cover ring-2 ring-white/20 shadow-lg"
                            />
                            <div>
                                <p className="text-2xl font-black text-white">{athleteName}</p>
                                <p className="text-lg text-white/50 font-medium tracking-wide">@{athleteHandle}</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5 opacity-80">
                                <div className="w-5 h-5 rounded-[4px] bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                    <Zap className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-lg font-black text-emerald-400 tracking-tight">Athlyst</span>
                            </div>
                            <span className="text-xs text-white/40 font-medium tracking-widest uppercase">Athlete Identity</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

export default ShareableAuraCard;
