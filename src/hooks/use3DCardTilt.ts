import { useRef, useCallback } from 'react';
import {
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';

interface Use3DCardTiltOptions {
  maxTilt?: number;
  springConfig?: { stiffness?: number; damping?: number; mass?: number };
}

interface Use3DCardTiltReturn<T extends HTMLElement> {
  ref: React.RefObject<T>;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  /** Normalized glow X position (0–100) */
  glowX: MotionValue<number>;
  /** Normalized glow Y position (0–100) */
  glowY: MotionValue<number>;
  /** Raw mouse X relative to center (-1 to 1) */
  mouseX: MotionValue<number>;
  /** Raw mouse Y relative to center (-1 to 1) */
  mouseY: MotionValue<number>;
  isHovering: MotionValue<number>;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

export function use3DCardTilt<T extends HTMLElement>(
  options: Use3DCardTiltOptions = {}
): Use3DCardTiltReturn<T> {
  const {
    maxTilt = 8,
    springConfig = { stiffness: 150, damping: 20, mass: 0.5 },
  } = options;

  const ref = useRef<T>(null!);

  // Raw cursor position normalised to [-1, 1]
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const hoverVal = useMotionValue(0);

  // Spring-smoothed values
  const springX = useSpring(rawX, springConfig);
  const springY = useSpring(rawY, springConfig);
  const springHover = useSpring(hoverVal, { stiffness: 300, damping: 30 });

  // Map to rotation (invert Y for natural feel: mouse up = tilt toward viewer)
  const rotateX = useTransform(springY, [-1, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(springX, [-1, 1], [-maxTilt, maxTilt]);

  // Glow position (0-100%)
  const glowX = useTransform(springX, [-1, 1], [0, 100]);
  const glowY = useTransform(springY, [-1, 1], [0, 100]);

  const updateFromPosition = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width; // 0 to 1
      const y = (clientY - rect.top) / rect.height; // 0 to 1

      rawX.set((x - 0.5) * 2); // -1 to 1
      rawY.set((y - 0.5) * 2); // -1 to 1
      hoverVal.set(1);
    },
    [rawX, rawY, hoverVal]
  );

  const resetPosition = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    hoverVal.set(0);
  }, [rawX, rawY, hoverVal]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      updateFromPosition(e.clientX, e.clientY);
    },
    [updateFromPosition]
  );

  const handleMouseLeave = useCallback(() => {
    resetPosition();
  }, [resetPosition]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        updateFromPosition(touch.clientX, touch.clientY);
      }
    },
    [updateFromPosition]
  );

  const handleTouchEnd = useCallback(() => {
    resetPosition();
  }, [resetPosition]);

  return {
    ref,
    rotateX,
    rotateY,
    glowX,
    glowY,
    mouseX: springX,
    mouseY: springY,
    isHovering: springHover,
    handleMouseMove,
    handleMouseLeave,
    handleTouchMove,
    handleTouchEnd,
  };
}
