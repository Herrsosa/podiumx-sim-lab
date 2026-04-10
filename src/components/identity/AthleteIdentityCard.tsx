import { useState, useCallback, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionTemplate,
  useTransform,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIdentityKernel } from '@/hooks/useIdentityKernel';
import { useAthletesByIds } from '@/hooks/useAthletesByIds';
import { Skeleton } from '@/components/ui/skeleton';
import { ShareAuraModal } from '@/components/share/ShareAuraModal';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import { use3DCardTilt } from '@/hooks/use3DCardTilt';
import { CardFront } from './CardFront';
import {
  GlowLayer,
  ReflectionLayer,
  EdgeHighlight,
  BackgroundTexture,
  IDENTITY_OBJECT_TONES,
} from './CardLayers';

interface AthleteIdentityCardProps {
  className?: string;
  athleteId?: string;
  identityLine?: string;
}

export function AthleteIdentityCard({
  className,
  athleteId,
  identityLine,
}: AthleteIdentityCardProps) {
  const { data: kernel, isLoading } = useIdentityKernel(athleteId);
  const { data: myAthleteData } = useMyAthlete();
  const { data: athleteBatch } = useAthletesByIds(athleteId ? [athleteId] : []);
  const athlete = athleteId ? athleteBatch?.[0] : myAthleteData?.athlete;

  const [isInspecting, setIsInspecting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const fallbackHover = useMotionValue(0);
  const tilt = use3DCardTilt<HTMLDivElement>({
    maxTilt: isInspecting ? 3.6 : 3.2,
    springConfig: { stiffness: 78, damping: 19, mass: 1.04 },
  });
  const activeHover = tilt.isHovering ?? fallbackHover;

  const contentShiftX = useTransform(tilt.mouseX, [-1, 1], [-6, 6]);
  const contentShiftY = useTransform(tilt.mouseY, [-1, 1], [-5, 5]);
  const reflectionShiftX = useTransform(tilt.mouseX, [-1, 1], [-10, 10]);
  const reflectionShiftY = useTransform(tilt.mouseY, [-1, 1], [-6, 6]);
  const shadowShiftX = useTransform(tilt.mouseX, [-1, 1], [-10, 10]);
  const shadowBlur = useTransform(activeHover, [0, 1], [72, 96]);
  const cardScale = useTransform(activeHover, [0, 1], [1, 1.012]);
  const cardLift = useTransform(activeHover, [0, 1], [0, -4]);
  const underGlowOpacity = useTransform(activeHover, [0, 1], [0.34, 0.46]);

  const cardShadow = useMotionTemplate`${shadowShiftX}px 38px ${shadowBlur}px rgba(0,0,0,0.72), 0 18px 32px rgba(0,0,0,0.52), 0 0 18px rgba(121,216,210,0.16), 0 0 64px rgba(121,216,210,0.08), 0 0 14px rgba(196,131,61,0.09), 0 0 48px rgba(196,131,61,0.04)`;
  const underGlow = useMotionTemplate`radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.44) 46%, transparent 80%)`;

  useEffect(() => {
    if (!isInspecting) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsInspecting(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isInspecting]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsInspecting((prev) => !prev);
  }, []);

  const handleShareClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setShareOpen(true);
  }, []);

  if (isLoading) {
    return <IdentityCardSkeleton className={className} />;
  }

  if (!kernel) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isInspecting ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/[0.8] backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsInspecting(false)}
          />
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          'relative',
          isInspecting && 'fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none',
          className
        )}
        data-tour="aura-score"
      >
        <button
          type="button"
          onClick={handleShareClick}
          className="absolute right-3 top-3 z-40 rounded-full border border-white/[0.07] bg-black/[0.42] p-2 text-white/[0.42] backdrop-blur-md transition-colors hover:bg-black/[0.5] hover:text-white/[0.68]"
          title="Share Aura Score"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>

        <motion.div
          ref={tilt.ref}
          className={cn('relative w-full', isInspecting && 'pointer-events-auto max-w-[392px]')}
          style={{
            perspective: 1200,
            width: isInspecting ? 'min(392px, 100%)' : '100%',
          }}
          onDoubleClick={handleDoubleClick}
          onMouseMove={tilt.handleMouseMove}
          onMouseLeave={tilt.handleMouseLeave}
          onTouchMove={tilt.handleTouchMove}
          onTouchEnd={tilt.handleTouchEnd}
        >
          <GlowLayer archetype={kernel.archetype} isHovering={activeHover} />

          <motion.div
            className="absolute inset-x-[10%] bottom-[-4%] -z-10 h-24 rounded-full blur-[38px]"
            style={{
              x: shadowShiftX,
              opacity: underGlowOpacity,
              backgroundImage: underGlow,
            }}
          />

          <motion.div
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
              scale: cardScale,
              y: cardLift,
            }}
          >
            <div
              className="relative rounded-[2.4rem] p-[12px]"
              style={{
                background: [
                  'linear-gradient(145deg, rgba(52,58,62,0.98) 0%, rgba(22,25,28,0.99) 34%, rgba(18,20,22,0.995) 74%, rgba(36,31,26,0.98) 100%)',
                  'radial-gradient(circle at 10% 12%, rgba(121,216,210,0.18) 0%, transparent 24%)',
                  'radial-gradient(circle at 92% 92%, rgba(196,131,61,0.1) 0%, transparent 20%)',
                ].join(', '),
                boxShadow: cardShadow,
              }}
            >
              <div
                className="absolute inset-[1px] rounded-[2.24rem]"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.013) 12%, transparent 30%, rgba(196,131,61,0.03) 82%, rgba(255,255,255,0.008) 100%)',
                }}
              />

              <div
                className="relative h-[532px] overflow-hidden rounded-[2.05rem]"
                style={{
                  background: [
                    'linear-gradient(180deg, #15181c 0%, #0c0e12 35%, #06070a 100%)',
                    'radial-gradient(circle at 14% 10%, rgba(121,216,210,0.085) 0%, transparent 26%)',
                    'radial-gradient(circle at 90% 92%, rgba(196,131,61,0.05) 0%, transparent 20%)',
                  ].join(', '),
                }}
              >
                <div
                  className="absolute inset-0 rounded-[2.05rem]"
                  style={{
                    boxShadow: [
                      'inset 0 1px 0 rgba(255,255,255,0.055)',
                      'inset 0 16px 30px rgba(255,255,255,0.012)',
                      'inset 0 -28px 52px rgba(0,0,0,0.64)',
                      'inset 10px 0 26px rgba(121,216,210,0.03)',
                      'inset -10px -8px 24px rgba(196,131,61,0.02)',
                    ].join(', '),
                  }}
                />

                <BackgroundTexture />
                <EdgeHighlight archetype={kernel.archetype} isHovering={activeHover} />

                <motion.div
                  className="relative z-20 h-full"
                  style={{
                    x: contentShiftX,
                    y: contentShiftY,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <CardFront
                    kernel={kernel}
                    identityLine={identityLine}
                    athleteName={athlete?.name}
                    athleteHandle={athlete?.slug}
                    athleteAvatar={athlete?.avatar}
                    isHovering={activeHover}
                  />
                </motion.div>

                <motion.div style={{ x: reflectionShiftX, y: reflectionShiftY }}>
                  <ReflectionLayer
                    glowX={tilt.glowX}
                    glowY={tilt.glowY}
                    isHovering={activeHover}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <ShareAuraModal open={shareOpen} onOpenChange={setShareOpen} athleteId={athleteId} />
    </>
  );
}

function IdentityCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative w-full', className)}>
      <div
        className="rounded-[2.4rem] p-[12px]"
        style={{
          background:
            'linear-gradient(145deg, rgba(84,101,102,0.9) 0%, rgba(18,21,24,0.98) 42%, rgba(89,64,40,0.9) 100%)',
          boxShadow: '0 42px 82px rgba(0,0,0,0.52)',
        }}
      >
        <div
          className="overflow-hidden rounded-[2.05rem] border border-white/[0.04]"
          style={{
            background: `linear-gradient(180deg, ${IDENTITY_OBJECT_TONES.surface} 0%, ${IDENTITY_OBJECT_TONES.base} 100%)`,
          }}
        >
          <Skeleton className="h-[532px] w-full rounded-[2.05rem]" />
        </div>
      </div>
    </div>
  );
}
