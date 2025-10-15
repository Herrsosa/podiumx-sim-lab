import confetti from "canvas-confetti";

export function celebrateAura() {
  if (typeof window === "undefined") return;
  const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (mql?.matches) return;

  confetti({
    particleCount: 120,
    spread: 65,
    startVelocity: 35,
    scalar: 0.9,
    origin: { y: 0.7 },
  });
}
