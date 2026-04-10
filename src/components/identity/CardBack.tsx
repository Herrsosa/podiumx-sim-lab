import { Flame, Calendar, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IdentityKernel } from '@/hooks/useIdentityKernel';
import { ARCHETYPE_ACCENTS } from './PremiumIdentityComponents';

interface CardBackProps {
  kernel: IdentityKernel;
  className?: string;
}

export function CardBack({ kernel, className }: CardBackProps) {
  const accent = ARCHETYPE_ACCENTS[kernel.archetype];

  const TrendIcon =
    kernel.progressDelta.direction === 'up'
      ? TrendingUp
      : kernel.progressDelta.direction === 'down'
        ? TrendingDown
        : Minus;

  return (
    <div
      className={cn(
        'relative flex flex-col h-full w-full px-6 pt-6 pb-5 select-none',
        className
      )}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-extrabold">
            Score Breakdown
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{kernel.archetypeIcon}</span>
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider"
            style={{ color: accent.color }}
          >
            {kernel.archetype}
          </span>
        </div>
      </div>

      {/* ---- Three metric wells (larger, more detailed) ---- */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <DetailedWell
          label="Discipline"
          value={kernel.scoreBreakdown.discipline.score}
          detail={kernel.scoreBreakdown.discipline.detail}
          color={accent.color}
          weight="50%"
        />
        <DetailedWell
          label="Momentum"
          value={kernel.scoreBreakdown.momentum.score}
          detail={kernel.scoreBreakdown.momentum.detail}
          color="hsl(188, 95%, 50%)"
          weight="30%"
        />
        <DetailedWell
          label="Output"
          value={kernel.scoreBreakdown.output.score}
          detail={kernel.scoreBreakdown.output.detail}
          color="hsl(38, 92%, 50%)"
          weight="20%"
        />
      </div>

      {/* ---- Vitals row ---- */}
      <div
        className="rounded-xl border border-white/[0.06] p-4 mb-6"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.25) 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Streak */}
          <div className="flex flex-col items-center flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-lg font-bold text-white tabular-nums">
                {kernel.streak}d
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
              Streak
            </span>
          </div>

          <div className="w-px h-8 bg-white/[0.06]" />

          {/* This week */}
          <div className="flex flex-col items-center flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-lg font-bold text-white tabular-nums">
                {kernel.thisWeek.sessions}
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
              {Math.round(kernel.thisWeek.minutes / 60)}h this wk
            </span>
          </div>

          <div className="w-px h-8 bg-white/[0.06]" />

          {/* Progress vs 30d */}
          <div className="flex flex-col items-center flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendIcon
                className={cn(
                  'w-4 h-4',
                  kernel.progressDelta.direction === 'up'
                    ? 'text-emerald-400'
                    : kernel.progressDelta.direction === 'down'
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                )}
              />
              <span
                className={cn(
                  'text-lg font-bold tabular-nums',
                  kernel.progressDelta.direction === 'up'
                    ? 'text-emerald-400'
                    : kernel.progressDelta.direction === 'down'
                      ? 'text-rose-400'
                      : 'text-white'
                )}
              >
                {kernel.progressDelta.direction === 'flat'
                  ? '—'
                  : `${kernel.progressDelta.percent}%`}
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
              vs 30d
            </span>
          </div>
        </div>
      </div>

      {/* ---- Formula explanation ---- */}
      <div className="mt-auto rounded-xl border border-white/[0.04] p-3" style={{
        background: 'rgba(0,0,0,0.2)',
      }}>
        <span className="text-[9px] text-zinc-500 block mb-1 font-bold uppercase tracking-wider">
          Aura Formula
        </span>
        <span className="text-[10px] text-zinc-400 leading-relaxed block">
          (Discipline × 50%) + (Momentum × 30%) + (Output × 20%)
        </span>
      </div>

      {/* ---- Watermark ---- */}
      <div className="flex justify-center mt-4 mb-0.5">
        <span className="text-[7px] text-zinc-700 uppercase tracking-[0.4em] font-bold">
          A T H L Y S T
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailedWell — Score breakdown tile for the back face
// ---------------------------------------------------------------------------
function DetailedWell({
  label,
  value,
  detail,
  color,
  weight,
}: {
  label: string;
  value: number;
  detail: string;
  color: string;
  weight: string;
}) {
  return (
    <div
      className="rounded-xl p-3.5 border border-white/[0.06] overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.3) 100%)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -1px 4px rgba(0,0,0,0.3), 0 2px 6px -2px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-400 text-[9px] uppercase tracking-wider font-bold">
          {label}
        </span>
        <span className="text-zinc-600 text-[8px] font-medium">
          {weight}
        </span>
      </div>
      <span
        className="font-black text-2xl block mb-1 leading-none tabular-nums"
        style={{
          color,
          textShadow: `0 0 16px ${color}40`,
        }}
      >
        {value}
      </span>
      <span className="text-zinc-500 text-[9px] leading-tight block">
        {detail}
      </span>
    </div>
  );
}
