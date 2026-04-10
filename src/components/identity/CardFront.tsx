import { cn } from '@/lib/utils';
import type { IdentityKernel } from '@/hooks/useIdentityKernel';
import type { MotionValue } from 'framer-motion';
import { Zap, Flame, ShieldCheck, Dumbbell } from 'lucide-react';
import { AuraArc, IdentityStrip, MetricTile, IDENTITY_OBJECT_TONES } from './CardLayers';

interface CardFrontProps {
  kernel: IdentityKernel;
  identityLine?: string;
  athleteName?: string;
  athleteHandle?: string;
  athleteAvatar?: string | null;
  isHovering: MotionValue<number>;
  className?: string;
}

export function CardFront({
  kernel,
  identityLine,
  athleteName,
  athleteHandle,
  athleteAvatar,
  isHovering,
  className,
}: CardFrontProps) {
  const headline =
    identityLine ||
    (kernel.streak > 0
      ? `${kernel.streak}-day streak`
      : kernel.auraChange.reason || 'Consistency building visible edge');
  const displayName = athleteName || athleteHandle || 'Athlete';
  const displayHandle = athleteHandle || 'athlete';

  const disciplineDetail = kernel.scoreBreakdown.discipline.detail
    .replace('/30 days active', ' / 30d')
    .replace('days active', 'active days');
  const outputDetail = kernel.scoreBreakdown.output.detail.replace(' this week', ' wk');

  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden px-6 pb-6 pt-7 select-none sm:px-7',
        className
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        className="pointer-events-none absolute inset-x-[-8%] top-[7%] z-0 h-[42%]"
        style={{ transform: 'translateZ(8px)' }}
      >
        <AuraArc
          archetype={kernel.archetype}
          score={kernel.auraScore}
          isHovering={isHovering}
          className="left-0 top-0"
        />
      </div>

      <div className="relative z-20 flex w-full items-center justify-between" style={{ transform: 'translateZ(16px)' }}>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-white/50" />
          <span className="block text-[0.54rem] font-medium uppercase tracking-[0.44em] text-white/[0.6]">
            Aura Score
          </span>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-3 py-[0.18rem] border"
          style={{ 
            borderColor: `${IDENTITY_OBJECT_TONES.amber}50`,
            background: `${IDENTITY_OBJECT_TONES.amber}15`
          }}
        >
          <span className="text-[0.6rem]" style={{ color: IDENTITY_OBJECT_TONES.amber }}>⚡</span>
          <span
            className="block text-[0.55rem] font-bold uppercase tracking-[0.18em]"
            style={{ color: IDENTITY_OBJECT_TONES.amber }}
          >
            {kernel.archetype}
          </span>
        </div>
      </div>

      <div className="relative z-20 max-w-[17rem]" style={{ transform: 'translateZ(16px)' }}>
        <div className="mt-4 flex items-end gap-3">
          <span
            className="text-[7rem] font-black leading-[0.82] tracking-[-0.1em] text-white sm:text-[7.7rem]"
            style={{
              textShadow: [
                '0 18px 34px rgba(0,0,0,0.76)',
                '0 2px 0 rgba(255,255,255,0.05)',
                '0 0 22px rgba(121,216,210,0.06)',
              ].join(', '),
            }}
          >
            {kernel.auraScore}
          </span>

          {kernel.auraChange.delta !== 0 ? (
            <span
              className="mb-5 text-sm font-semibold tracking-[0.18em]"
              style={{ color: IDENTITY_OBJECT_TONES.teal }}
            >
              {kernel.auraChange.delta > 0 ? '+' : ''}
              {kernel.auraChange.delta}
            </span>
          ) : null}
        </div>

        <p className="mt-3 max-w-[15rem] text-[1rem] font-medium leading-relaxed text-white/[0.54]">
          {headline}
        </p>
      </div>

      <div
        className="relative z-20 mt-auto grid grid-cols-3 gap-2.5"
        style={{ transform: 'translateZ(16px)' }}
      >
        <MetricTile
          label="Streak"
          icon={<Flame className="w-3.5 h-3.5 text-orange-500" />}
          value={`${kernel.streak}d`}
          detail={
            kernel.thisWeek.sessions > 0
              ? `${kernel.thisWeek.sessions} this week`
              : 'No sessions logged'
          }
          valueColor="white"
          detailColor="rgba(255,255,255,0.4)"
          accentColor="rgba(196,131,61,0.08)"
        />
        <MetricTile
          label="Discipline"
          icon={<ShieldCheck className="w-3.5 h-3.5 text-[#5be3c8]" />}
          value={kernel.scoreBreakdown.discipline.score}
          detail={disciplineDetail}
          valueColor="#5be3c8"
          detailColor="rgba(91,227,200,0.8)"
          accentColor="rgba(91,227,200,0.18)"
        />
        <MetricTile
          label="Output"
          icon={<Dumbbell className="w-3.5 h-3.5 text-[#ff9d33]" />}
          value={kernel.scoreBreakdown.output.score}
          detail={outputDetail}
          valueColor="#ff9d33"
          detailColor="rgba(255,157,51,0.8)"
          accentColor="rgba(255,157,51,0.16)"
        />
      </div>

      <div className="relative z-20 mt-4" style={{ transform: 'translateZ(16px)' }}>
        <IdentityStrip
          name={displayName}
          handle={displayHandle}
          avatar={athleteAvatar}
          archetype={kernel.archetype}
          archetypeIcon={kernel.archetypeIcon}
        />
      </div>

      <div className="relative z-20 pt-3 text-center" style={{ transform: 'translateZ(8px)' }}>
        <span className="text-[0.42rem] font-medium uppercase tracking-[0.42em] text-white/[0.16]">
          Athlyst
        </span>
      </div>
    </div>
  );
}
