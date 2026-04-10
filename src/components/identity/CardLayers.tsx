import { cn } from '@/lib/utils';
import type { MotionValue } from 'framer-motion';
import { motion, useMotionTemplate, useTransform } from 'framer-motion';
import type { Archetype } from '@/hooks/useIdentityKernel';

export const IDENTITY_OBJECT_TONES = {
  bg1: '#06070a',
  bg2: '#0c0e12',
  bg3: '#15181c',
  base: '#06070a',
  surface: '#0c0e12',
  shell: '#15181c',
  teal: '#79d8d2',
  tealDim: 'rgba(121,216,210,0.2)',
  tealSoft: 'rgba(121,216,210,0.2)',
  tealFaint: 'rgba(121,216,210,0.1)',
  amber: '#c4833d',
  amberDim: 'rgba(196,131,61,0.14)',
  amberSoft: 'rgba(196,131,61,0.14)',
  amberFaint: 'rgba(196,131,61,0.06)',
  whiteSoft: 'rgba(255,255,255,0.06)',
  whiteFaint: 'rgba(255,255,255,0.025)',
};

const ARCHETYPE_TONE_MAP: Record<Archetype, { cool: string; warm: string }> = {
  Runner: { cool: IDENTITY_OBJECT_TONES.teal, warm: IDENTITY_OBJECT_TONES.amber },
  Lifter: { cool: IDENTITY_OBJECT_TONES.teal, warm: IDENTITY_OBJECT_TONES.amber },
  Triathlete: { cool: IDENTITY_OBJECT_TONES.teal, warm: IDENTITY_OBJECT_TONES.amber },
  'HYROX Athlete': { cool: IDENTITY_OBJECT_TONES.teal, warm: IDENTITY_OBJECT_TONES.amber },
  Hybrid: { cool: IDENTITY_OBJECT_TONES.teal, warm: IDENTITY_OBJECT_TONES.amber },
  Endurance: { cool: IDENTITY_OBJECT_TONES.teal, warm: IDENTITY_OBJECT_TONES.amber },
  Emerging: { cool: IDENTITY_OBJECT_TONES.teal, warm: IDENTITY_OBJECT_TONES.amber },
};

function getTone(archetype: Archetype) {
  return ARCHETYPE_TONE_MAP[archetype] ?? ARCHETYPE_TONE_MAP.Hybrid;
}

interface GlowLayerProps {
  archetype: Archetype;
  isHovering: MotionValue<number>;
  className?: string;
}

export function GlowLayer({ archetype, isHovering, className }: GlowLayerProps) {
  const tone = getTone(archetype);
  const blur = useTransform(isHovering, [0, 1], [72, 96]);
  const opacity = useTransform(isHovering, [0, 1], [0.3, 0.42]);
  const hazeFilter = useMotionTemplate`blur(${blur}px)`;

  return (
    <motion.div
      className={cn('absolute inset-0 -z-20 pointer-events-none', className)}
      style={{ opacity }}
    >
      <motion.div
        className="absolute -left-[6%] top-[5%] h-[42%] w-[46%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${tone.cool}24 0%, ${tone.cool}10 34%, transparent 72%)`,
          boxShadow: `0 0 18px rgba(121,216,210,0.16), 0 0 64px rgba(121,216,210,0.075)`,
          filter: hazeFilter,
        }}
      />
      <motion.div
        className="absolute bottom-[2%] right-[-3%] h-[30%] w-[34%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${tone.warm}12 0%, ${tone.warm}08 30%, transparent 76%)`,
          boxShadow: `0 0 14px rgba(196,131,61,0.09), 0 0 48px rgba(196,131,61,0.04)`,
          filter: hazeFilter,
        }}
      />
      <motion.div
        className="absolute inset-x-[10%] bottom-[-6%] h-[26%] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.42) 48%, transparent 78%)',
          filter: hazeFilter,
        }}
      />
      <motion.div
        className="absolute left-[10%] top-[8%] h-14 w-14 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.022) 0%, transparent 74%)',
          filter: hazeFilter,
        }}
      />
    </motion.div>
  );
}

interface ReflectionLayerProps {
  glowX: MotionValue<number>;
  glowY: MotionValue<number>;
  isHovering: MotionValue<number>;
}

export function ReflectionLayer({ glowX, glowY, isHovering }: ReflectionLayerProps) {
  const opacity = useTransform(isHovering, [0, 1], [0.05, 0.085]);
  const sweepX = useTransform(isHovering, [0, 1], [-180, 180]);
  const sweepOpacity = useTransform(isHovering, [0, 1], [0, 0.06]);
  const glare = useMotionTemplate`radial-gradient(400px circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.07), rgba(255,255,255,0.026) 16%, transparent 46%)`;

  return (
    <motion.div
      className="absolute inset-0 z-30 overflow-hidden rounded-[2.05rem] pointer-events-none"
      style={{ opacity, transform: 'translateZ(24px)' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 28% 18%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.024) 18%, transparent 42%)',
          mixBlendMode: 'screen',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ backgroundImage: glare, mixBlendMode: 'screen' }}
      />
      <motion.div
        className="absolute -top-[10%] h-[130%] w-[24%] rotate-[14deg] rounded-full blur-3xl"
        style={{
          x: sweepX,
          opacity: sweepOpacity,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 48%, rgba(255,255,255,0) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.012) 8%, transparent 26%, transparent 80%, rgba(255,255,255,0.02) 100%)',
          mixBlendMode: 'screen',
        }}
      />
    </motion.div>
  );
}

interface EdgeHighlightProps {
  archetype: Archetype;
  isHovering: MotionValue<number>;
  className?: string;
}

export function EdgeHighlight({ archetype, isHovering, className }: EdgeHighlightProps) {
  const tone = getTone(archetype);
  const rimOpacity = useTransform(isHovering, [0, 1], [0.52, 0.66]);

  return (
    <motion.div
      className={cn('absolute inset-0 z-10 rounded-[2.05rem] pointer-events-none', className)}
      style={{ opacity: rimOpacity, transform: 'translateZ(8px)' }}
    >
      <div
        className="absolute inset-0 rounded-[2.05rem]"
        style={{
          border: '1px solid rgba(255,255,255,0.018)',
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.06)',
            'inset 0 -18px 34px rgba(0,0,0,0.58)',
          ].join(', '),
        }}
      />
      <div
        className="absolute left-[-1%] top-[-1%] h-[20%] w-[24%] rounded-[2rem]"
        style={{
          background: `radial-gradient(circle at 24% 24%, ${tone.cool}30 0%, ${tone.cool}12 32%, transparent 70%)`,
          filter: 'blur(17px)',
        }}
      />
      <div
        className="absolute right-[-2%] bottom-[-2%] h-[12%] w-[15%] rounded-[2rem]"
        style={{
          background: `radial-gradient(circle at 78% 78%, ${tone.warm}16 0%, ${tone.warm}08 26%, transparent 72%)`,
          filter: 'blur(14px)',
        }}
      />
      <div
        className="absolute inset-[2px] rounded-[1.92rem]"
        style={{
          border: '1px solid rgba(255,255,255,0.014)',
          boxShadow: [
            'inset 0 16px 26px rgba(255,255,255,0.012)',
            'inset 0 -24px 38px rgba(0,0,0,0.58)',
          ].join(', '),
        }}
      />
    </motion.div>
  );
}

interface AuraArcProps {
  archetype: Archetype;
  score: number;
  isHovering: MotionValue<number>;
  className?: string;
}

export function AuraArc({ archetype, score, isHovering, className }: AuraArcProps) {
  const tone = getTone(archetype);
  const scale = useTransform(isHovering, [0, 1], [1, 1.01]);
  const opacity = useTransform(isHovering, [0, 1], [0.56, 0.72]);
  const progress = Math.max(0, Math.min(100, score));
  const gradientId = `aura-arc-${archetype.replace(/\s+/g, '-').toLowerCase()}`;
  const path = 'M 20 176 C 46 90, 118 28, 218 28 C 304 28, 364 70, 386 144';

  return (
    <motion.div
      className={cn('absolute pointer-events-none', className)}
      style={{ scale, opacity }}
    >
      <svg width="406" height="188" viewBox="0 0 406 188" className="block overflow-visible">
        <defs>
          <linearGradient id={`${gradientId}-core`} x1="20" y1="176" x2="386" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(95,214,208,0)" />
            <stop offset="16%" stopColor={`${tone.cool}44`} />
            <stop offset="56%" stopColor={`${tone.cool}86`} />
            <stop offset="86%" stopColor={`${tone.warm}36`} />
            <stop offset="100%" stopColor="rgba(201,122,42,0)" />
          </linearGradient>
          <linearGradient id={`${gradientId}-glow`} x1="20" y1="176" x2="386" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(95,214,208,0)" />
            <stop offset="20%" stopColor={`${tone.cool}0d`} />
            <stop offset="60%" stopColor={`${tone.cool}18`} />
            <stop offset="88%" stopColor={`${tone.warm}0c`} />
            <stop offset="100%" stopColor="rgba(201,122,42,0)" />
          </linearGradient>
          <filter id={`${gradientId}-blur`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        <path
          d={path}
          pathLength={100}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d={path}
          pathLength={100}
          fill="none"
          stroke={`url(#${gradientId}-glow)`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={100 - progress}
          filter={`url(#${gradientId}-blur)`}
          opacity="0.85"
        />
        <path
          d={path}
          pathLength={100}
          fill="none"
          stroke={`url(#${gradientId}-core)`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={100 - progress}
        />
      </svg>
    </motion.div>
  );
}

export const AuraRing = AuraArc;

export function BackgroundTexture({ className }: { className?: string }) {
  return (
    <div
      className={cn('absolute inset-0 z-0 rounded-[2.05rem] pointer-events-none', className)}
      style={{
        backgroundImage: [
          'linear-gradient(180deg, rgba(255,255,255,0.024) 0%, rgba(255,255,255,0.008) 10%, transparent 30%, transparent 82%, rgba(255,255,255,0.012) 100%)',
          'linear-gradient(180deg, rgba(17,19,21,0.26) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.24) 100%)',
          'linear-gradient(135deg, rgba(121,216,210,0.024) 0%, transparent 24%, transparent 76%, rgba(196,131,61,0.018) 100%)',
          'radial-gradient(circle at 18% 14%, rgba(255,255,255,0.034) 0%, transparent 18%)',
          'radial-gradient(circle at 84% 82%, rgba(255,255,255,0.02) 0%, transparent 18%)',
          'radial-gradient(circle at 24% 72%, rgba(255,255,255,0.012) 0, rgba(255,255,255,0.012) 1px, transparent 1.8px)',
          'radial-gradient(circle at 68% 28%, rgba(255,255,255,0.01) 0, rgba(255,255,255,0.01) 1px, transparent 1.8px)',
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.005) 0, rgba(255,255,255,0.005) 1px, transparent 1px, transparent 3px)',
        ].join(', '),
      }}
    />
  );
}

interface MetricTileProps {
  label: string;
  icon?: React.ReactNode;
  value: string | number;
  detail?: string;
  valueColor?: string;
  detailColor?: string;
  accentColor?: string;
  className?: string;
}

export function MetricTile({ label, icon, value, detail, valueColor, detailColor, accentColor, className }: MetricTileProps) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-[1.2rem] px-4 pb-4 pt-3.5', className)}
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.016) 0%, rgba(255,255,255,0.006) 14%, rgba(0,0,0,0.54) 100%)',
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.042)',
          'inset 0 12px 18px rgba(255,255,255,0.008)',
          'inset 0 -20px 34px rgba(0,0,0,0.64)',
          `inset 0 0 0 1px ${accentColor ? accentColor.replace(/0?\.\d+\)$/, '0.12)') : 'rgba(255,255,255,0.012)'}`,
          '0 8px 16px -22px rgba(0,0,0,1)',
        ].join(', '),
        border: '1px solid rgba(255,255,255,0.011)',
        transform: 'translateZ(16px)',
      }}
    >
      {accentColor ? (
        <div
          className="absolute inset-0 rounded-[1.2rem] opacity-100"
          style={{
            background: `linear-gradient(180deg, ${accentColor.replace(/0?\.\d+\)$/, '0.12)')} 0%, transparent 42%)`,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}
      <div
        className="absolute inset-x-4 top-0 h-px"
        style={{
          background: accentColor
            ? `linear-gradient(90deg, transparent, ${accentColor.replace(/0?\.\d+\)$/, '0.22)')}, transparent)`
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        }}
      />
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-white/60">{icon}</span>}
        <span className="block text-[0.52rem] font-medium uppercase tracking-[0.28em] text-white/[0.4]">
          {label}
        </span>
      </div>
      <span
        className="mt-2.5 block text-[2.02rem] font-black leading-none tracking-[-0.06em]"
        style={{
          color: valueColor || 'white',
          textShadow: accentColor ? `0 0 12px ${accentColor}` : '0 8px 24px rgba(0,0,0,0.46)',
        }}
      >
        {value}
      </span>
      {detail ? (
        <span 
          className="mt-1.5 block text-[0.62rem] font-medium leading-snug"
          style={{ color: detailColor || 'rgba(255,255,255,0.36)' }}
        >
          {detail}
        </span>
      ) : null}
    </div>
  );
}

interface IdentityStripProps {
  name: string;
  handle: string;
  avatar?: string | null;
  archetype: Archetype;
  archetypeIcon: string;
  className?: string;
}

export function IdentityStrip({
  name,
  handle,
  avatar,
  archetype,
  archetypeIcon,
  className,
}: IdentityStripProps) {
  const tone = getTone(archetype);
  const avatarUrl = avatar?.trim() ? avatar : null;

  return (
    <div
      className={cn('flex items-center gap-3 rounded-[1.35rem] px-4 py-3.5', className)}
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.022) 0%, rgba(255,255,255,0.008) 16%, rgba(0,0,0,0.5) 100%)',
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.046)',
          'inset 0 -18px 30px rgba(0,0,0,0.56)',
          'inset 0 0 0 1px rgba(255,255,255,0.012)',
        ].join(', '),
        border: '1px solid rgba(255,255,255,0.014)',
        transform: 'translateZ(16px)',
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[0.95rem] border border-white/[0.08] bg-black/40"
        style={{
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.015), 0 10px 18px -18px rgba(0,0,0,0.9)`,
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg">{archetypeIcon}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-[0.05em] text-white/[0.92]">
          {name}
        </span>
        <span className="block truncate text-xs font-medium text-white/[0.34]">@{handle}</span>
      </div>

      <div className="shrink-0 text-right">
        <div
          className="flex items-center gap-1 rounded-full px-2.5 py-[0.14rem] border"
          style={{ 
            borderColor: `${tone.warm}40`,
            background: `${tone.warm}0a`
          }}
        >
          <span className="text-[0.6rem]" style={{ color: tone.warm }}>⚡</span>
          <span
            className="block text-[0.55rem] font-bold uppercase tracking-[0.18em]"
            style={{ color: tone.warm }}
          >
            {archetype}
          </span>
        </div>
      </div>
    </div>
  );
}
