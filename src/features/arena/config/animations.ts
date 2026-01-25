/**
 * Animation Constants for Arena
 *
 * Provides consistent timing and easing across all animations.
 * Use these constants instead of hardcoding durations.
 */

export const ANIMATION_DURATION = {
  // Micro-interactions (hover, press, small state changes)
  instant: 0.15, // 150ms

  // Quick transitions (buttons, small cards, tooltips)
  quick: 0.3, // 300ms

  // Medium transitions (overlays, modals, slide-ins)
  medium: 0.6, // 600ms

  // Slow dramatic reveals (hero images, lore intros)
  slow: 1.0, // 1000ms

  // Epic cinematic sequences (full-screen transitions)
  epic: 2.0, // 2000ms
} as const;

export const ANIMATION_EASING = {
  // Entrances - objects coming into view
  enter: "easeOut" as const,

  // Exits - objects leaving view
  exit: "easeIn" as const,

  // General motion - smooth bidirectional
  smooth: "easeInOut" as const,

  // Bouncy playful motion
  spring: {
    type: "spring" as const,
    stiffness: 300,
    damping: 20,
  },

  // Snappy responsive feel
  snappy: {
    type: "spring" as const,
    stiffness: 500,
    damping: 30,
  },
} as const;

export const ANIMATION_DELAY = {
  none: 0,
  tiny: 0.1, // 100ms
  short: 0.3, // 300ms
  medium: 0.5, // 500ms
  long: 1.0, // 1000ms
} as const;

/**
 * Common animation variants for consistent motion
 */
export const ANIMATION_VARIANTS = {
  // Fade in/out
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Scale + fade (cards, modals)
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  // Slide from bottom
  slideUp: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  // Slide from top
  slideDown: {
    initial: { opacity: 0, y: -30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  // Slide from left
  slideLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  },

  // Slide from right
  slideRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 30 },
  },

  // Button press
  buttonPress: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
  },

  // Pulsing glow (attention)
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
} as const;

/**
 * Transition presets for common animation patterns
 */
export const TRANSITION_PRESET = {
  // Quick snappy interaction
  quick: {
    duration: ANIMATION_DURATION.quick,
    ease: ANIMATION_EASING.enter,
  },

  // Medium overlay appearance
  medium: {
    duration: ANIMATION_DURATION.medium,
    ease: ANIMATION_EASING.enter,
  },

  // Slow dramatic entrance
  slow: {
    duration: ANIMATION_DURATION.slow,
    ease: ANIMATION_EASING.enter,
  },

  // Smooth exit
  exit: {
    duration: ANIMATION_DURATION.medium,
    ease: ANIMATION_EASING.exit,
  },

  // Spring bounce
  spring: ANIMATION_EASING.spring,

  // Snappy spring
  snappy: ANIMATION_EASING.snappy,
} as const;

/**
 * Helper function to create staggered children animations
 */
export function createStagger(
  baseDelay: number = 0,
  staggerDelay: number = 0.1
) {
  return {
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: baseDelay,
      },
    },
  };
}
