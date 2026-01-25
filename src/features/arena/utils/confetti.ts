import confetti from "canvas-confetti";

// Arena-specific celebration colors
const ARENA_COLORS = ["#00ff88", "#ff00ff", "#ffd700", "#00d4ff", "#ff4444"];

// Victory celebration - full screen confetti burst
export function celebrateVictory() {
  const duration = 3000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ARENA_COLORS,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ARENA_COLORS,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// Big win celebration - more intense
export function celebrateBigWin() {
  const duration = 5000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors: ARENA_COLORS,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors: ARENA_COLORS,
    });

    // Add some from the top
    if (Math.random() < 0.3) {
      confetti({
        particleCount: 3,
        angle: 270,
        spread: 100,
        origin: { x: Math.random(), y: 0 },
        colors: ARENA_COLORS,
        gravity: 1.5,
      });
    }

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// Quick burst for smaller wins
export function celebrateBurst() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ARENA_COLORS,
  });
}

// Fighter-specific celebration (uses their color)
export function celebrateFighter(color: string) {
  const colors = [color, "#ffffff", color];

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors,
  });
}

// Emoji burst (for character reactions)
export function emojiConfetti(emoji: string) {
  const scalar = 2;
  const confettiEmoji = confetti.shapeFromText({ text: emoji, scalar });

  confetti({
    shapes: [confettiEmoji],
    particleCount: 30,
    spread: 60,
    origin: { y: 0.5 },
    scalar,
  });
}

// Stream effect (continuous light particles)
export function startConfettiStream(): () => void {
  const intervalId = setInterval(() => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 25,
      origin: { x: 0 },
      colors: ARENA_COLORS,
      gravity: 0.5,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 25,
      origin: { x: 1 },
      colors: ARENA_COLORS,
      gravity: 0.5,
    });
  }, 50);

  return () => clearInterval(intervalId);
}
