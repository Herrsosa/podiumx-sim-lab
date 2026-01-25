import React from "react";
import { motion } from "framer-motion";
import { ArenaCharacter } from "../types";

interface MatchupVersusOverlayProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  durationMs?: number;
  onComplete?: () => void;
}

export function MatchupVersusOverlay({
  fighter1,
  fighter2,
  durationMs = 5000,
  onComplete,
}: MatchupVersusOverlayProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onComplete]);

  // Check for rivalry
  const rivalry = fighter1.lore.rivalries?.[fighter2.id];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Scanlines */}
      <div className="scanlines pointer-events-none" />

      {/* Split background gradients */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      >
        <div
          className="absolute inset-y-0 left-0 right-1/2"
          style={{
            background: `linear-gradient(to right, ${fighter1.color}40, transparent)`,
          }}
        />
        <div
          className="absolute inset-y-0 left-1/2 right-0"
          style={{
            background: `linear-gradient(to left, ${fighter2.color}40, transparent)`,
          }}
        />
      </motion.div>

      {/* Center lightning bolt effect */}
      <motion.div
        className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white to-transparent"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />

      {/* Main content container */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center max-w-7xl mx-auto px-8">
        {/* Fighter portraits split screen */}
        <div className="grid grid-cols-2 gap-16 w-full mb-4">
          {/* Fighter 1 */}
          <motion.div
            className="flex flex-col items-end pr-8"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="relative w-48 h-48 mb-4">
              <motion.div
                className="absolute inset-0 rounded-2xl blur-2xl"
                style={{ backgroundColor: fighter1.color }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white/20">
                <img
                  src={fighter1.avatar}
                  alt={fighter1.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <motion.div
              className="text-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div
                className="text-3xl font-black mb-1"
                style={{
                  color: fighter1.color,
                  textShadow: `0 0 20px ${fighter1.color}80`,
                }}
              >
                {fighter1.name}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">
                {fighter1.lore.title}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {fighter1.ticker}
              </div>
            </motion.div>
          </motion.div>

          {/* Fighter 2 */}
          <motion.div
            className="flex flex-col items-start pl-8"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="relative w-48 h-48 mb-4">
              <motion.div
                className="absolute inset-0 rounded-2xl blur-2xl"
                style={{ backgroundColor: fighter2.color }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white/20">
                <img
                  src={fighter2.avatar}
                  alt={fighter2.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <motion.div
              className="text-left"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div
                className="text-3xl font-black mb-1"
                style={{
                  color: fighter2.color,
                  textShadow: `0 0 20px ${fighter2.color}80`,
                }}
              >
                {fighter2.name}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">
                {fighter2.lore.title}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {fighter2.ticker}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Giant VS in center */}
        <motion.div
          className="flex-shrink-0 my-6 z-10"
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <div className="relative">
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 blur-3xl bg-white"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* VS text */}
            <div className="relative text-7xl font-black text-white tracking-tighter drop-shadow-2xl">
              VS
            </div>
          </div>
        </motion.div>

        {/* Rivalry text - moved to top for better visibility */}
        {rivalry && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 max-w-2xl text-center px-6 py-4 rounded-xl bg-black/80 backdrop-blur-sm border border-yellow-400/40 z-20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <div className="text-xs uppercase tracking-wider text-yellow-400 mb-2 font-bold">
              🔥 Rivalry Alert 🔥
            </div>
            <div className="text-base text-gray-100 italic font-medium">
              "{rivalry}"
            </div>
          </motion.div>
        )}

        {/* Bottom stats comparison */}
        <motion.div
          className="flex items-center gap-8 text-xs uppercase tracking-wider z-10 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <div className="text-right bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
            <div className="text-gray-400 text-[10px] mb-1">Recent Form</div>
            <div className="text-white text-xs font-bold">{fighter1.lore.recentForm || "Debut"}</div>
          </div>
          <div className="text-white/40 text-sm">VS</div>
          <div className="text-left bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
            <div className="text-gray-400 text-[10px] mb-1">Recent Form</div>
            <div className="text-white text-xs font-bold">{fighter2.lore.recentForm || "Debut"}</div>
          </div>
        </motion.div>

        {/* Energy burst particles */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          initial={{ scale: 0 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1.5, delay: 0.4 }}
        >
          <div className="w-96 h-96 rounded-full border-4 border-white/30" />
        </motion.div>
      </div>
    </motion.div>
  );
}
