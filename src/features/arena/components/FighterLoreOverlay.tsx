import React from "react";
import { motion } from "framer-motion";
import { ArenaCharacter } from "../types";
import { Trophy, Zap, AlertTriangle, Sparkles } from "lucide-react";

interface FighterLoreOverlayProps {
  fighter: ArenaCharacter;
  durationMs?: number;
  onComplete?: () => void;
}

const STAT_NAMES: Record<keyof ArenaCharacter["stats"], string> = {
  strength: "Strength",
  speed: "Speed",
  endurance: "Endurance",
  technique: "Technique",
  mental: "Mental",
};

export function FighterLoreOverlay({
  fighter,
  durationMs = 10000,
  onComplete,
}: FighterLoreOverlayProps) {
  // Calculate animation timings
  const portraitDelay = 0;
  const nameDelay = 1000;
  const taglineDelay = 1800;
  const backstoryDelay = 2800;
  const statsDelay = 4500;
  const statStagger = 300;
  const abilityDelay = 7000;
  const voiceLineDelay = 8500;

  // Auto-complete after duration
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onComplete]);

  // Get top 2 stats
  const sortedStats = Object.entries(fighter.stats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2) as Array<[keyof typeof fighter.stats, number]>;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${fighter.color}40, transparent 70%)`,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 0.3 }}
        transition={{ duration: 8, ease: "easeOut" }}
      />

      {/* Scanline effect */}
      <div className="scanlines pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-8 text-center">
        {/* Portrait with dramatic entrance */}
        <motion.div
          className="relative mb-8 mx-auto w-64 h-64"
          initial={{ scale: 0.5, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: portraitDelay / 1000, ease: "easeOut" }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ backgroundColor: fighter.color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />

          {/* Portrait image */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white/20">
            <img
              src={fighter.avatar}
              alt={fighter.name}
              className="w-full h-full object-cover"
              style={{ filter: "contrast(1.1) brightness(1.1)" }}
            />
          </div>

          {/* Corner accent */}
          <motion.div
            className="absolute -top-2 -right-2 w-12 h-12"
            style={{ color: fighter.color }}
            initial={{ opacity: 0, rotate: -45, scale: 0 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            <Sparkles className="w-full h-full" />
          </motion.div>
        </motion.div>

        {/* Name with glitch effect */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: nameDelay / 1000 }}
        >
          <motion.h1
            className="text-6xl font-black mb-2 tracking-tight"
            style={{
              color: fighter.color,
              textShadow: `0 0 30px ${fighter.color}80, 0 0 60px ${fighter.color}40`,
            }}
          >
            {fighter.name}
          </motion.h1>
        </motion.div>

        {/* Tagline (lore title) */}
        <motion.div
          className="text-2xl font-bold text-white/90 mb-8 uppercase tracking-wider"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: taglineDelay / 1000 }}
        >
          {fighter.lore.title}
        </motion.div>

        {/* Backstory */}
        <motion.div
          className="max-w-2xl mx-auto mb-8 px-6 py-4 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: backstoryDelay / 1000 }}
        >
          <p className="text-lg text-gray-200 leading-relaxed italic">
            "{fighter.lore.backstory}"
          </p>
        </motion.div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 gap-6 max-w-xl mx-auto mb-8">
          {sortedStats.map(([statKey, value], index) => (
            <motion.div
              key={statKey}
              className="relative"
              initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                delay: (statsDelay + index * statStagger) / 1000,
              }}
            >
              <div className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                {STAT_NAMES[statKey]}
              </div>
              <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    backgroundColor: fighter.color,
                    boxShadow: `0 0 10px ${fighter.color}80`,
                  }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${value}%` }}
                  transition={{
                    duration: 1,
                    delay: (statsDelay + index * statStagger + 200) / 1000,
                    ease: "easeOut",
                  }}
                />
              </div>
              <motion.div
                className="text-right text-2xl font-bold mt-1"
                style={{ color: fighter.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: (statsDelay + index * statStagger + 800) / 1000,
                }}
              >
                {value}
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Ability & Weakness */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
          {/* Ability */}
          <motion.div
            className="relative p-4 rounded-xl border-2 bg-black/40 backdrop-blur-sm overflow-hidden"
            style={{ borderColor: `${fighter.color}60` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: abilityDelay / 1000 }}
          >
            <motion.div
              className="absolute inset-0 opacity-10"
              style={{ backgroundColor: fighter.color }}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1.5, rotate: 0 }}
              transition={{ duration: 0.8, delay: abilityDelay / 1000 + 0.2 }}
            />
            <div className="relative flex items-start gap-3">
              <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: fighter.color }} />
              <div className="text-left">
                <div className="text-sm font-bold text-white mb-1">
                  {fighter.ability.name}
                </div>
                <div className="text-xs text-gray-300">
                  {fighter.ability.description}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Weakness */}
          <motion.div
            className="relative p-4 rounded-xl border-2 border-red-500/40 bg-black/40 backdrop-blur-sm overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: abilityDelay / 1000 + 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-red-500/10"
              initial={{ scale: 0, rotate: 45 }}
              animate={{ scale: 1.5, rotate: 0 }}
              transition={{ duration: 0.8, delay: abilityDelay / 1000 + 0.4 }}
            />
            <div className="relative flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
              <div className="text-left">
                <div className="text-sm font-bold text-white mb-1">
                  {fighter.weakness.name}
                </div>
                <div className="text-xs text-gray-300">
                  {fighter.weakness.description}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Voice Line with waveform effect */}
        <motion.div
          className="relative max-w-xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: voiceLineDelay / 1000 }}
        >
          <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-black/60 backdrop-blur-sm border border-white/20">
            <motion.div
              className="text-3xl"
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                delay: voiceLineDelay / 1000,
              }}
            >
              💬
            </motion.div>
            <div className="text-base font-medium text-white italic">
              "{fighter.voiceLine}"
            </div>
          </div>

          {/* Waveform bars */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-white/40 rounded-full"
                animate={{
                  height: ["4px", "12px", "4px"],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: voiceLineDelay / 1000 + i * 0.1,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Recent Form */}
        {fighter.lore.recentForm && (
          <motion.div
            className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: voiceLineDelay / 1000 + 0.5 }}
          >
            <Trophy className="w-4 h-4" />
            <span>{fighter.lore.recentForm}</span>
          </motion.div>
        )}

        {/* Skip hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-500 uppercase tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Hold SPACE to skip
        </motion.div>
      </div>
    </motion.div>
  );
}
