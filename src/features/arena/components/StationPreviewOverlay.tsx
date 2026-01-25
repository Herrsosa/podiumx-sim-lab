import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArenaCharacter, Station } from "../types";
import { ArenaAvatar } from "./ArenaAvatar";
import { Target, Zap } from "lucide-react";
import { ANIMATION_DURATION, TRANSITION_PRESET } from "../config/animations";

interface StationPreviewOverlayProps {
  stations: Station[];
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  durationMs: number;
}

const STAT_ICONS: Record<string, string> = {
  strength: "💪",
  speed: "⚡",
  endurance: "🔥",
  technique: "🎯",
  mental: "🧠",
};

export function StationPreviewOverlay({
  stations,
  fighter1,
  fighter2,
  durationMs,
}: StationPreviewOverlayProps) {
  const [currentPreview, setCurrentPreview] = useState(0);
  const stepMs = Math.max(500, Math.round(durationMs / stations.length));

  useEffect(() => {
    setCurrentPreview(0);
    const interval = window.setInterval(() => {
      setCurrentPreview((prev) => {
        if (prev >= stations.length - 1) {
          window.clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, stepMs);

    return () => window.clearInterval(interval);
  }, [stations.length, stepMs]);

  const station = stations[currentPreview];
  const advantage = useMemo(() => {
    if (!station) return null;
    const p1Stat = fighter1.stats[station.primaryStat];
    const p2Stat = fighter2.stats[station.primaryStat];
    if (p1Stat === p2Stat) return null;
    return p1Stat > p2Stat ? fighter1 : fighter2;
  }, [station, fighter1, fighter2]);

  if (!station) return null;

  const statIcon = STAT_ICONS[station.primaryStat] || "📊";
  const statDiff = Math.abs(fighter1.stats[station.primaryStat] - fighter2.stats[station.primaryStat]);
  const isCompetitive = statDiff <= 15;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION_PRESET.quick}
    >
      {/* Scanlines */}
      <div className="scanlines pointer-events-none" />

      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 50%, #3b82f6, #8b5cf6, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-8 py-12">
        {/* Title with dramatic entrance */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className="inline-block"
            animate={{
              textShadow: [
                "0 0 20px rgba(59,130,246,0.5)",
                "0 0 40px rgba(139,92,246,0.7)",
                "0 0 20px rgba(59,130,246,0.5)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-3">
              THE GAUNTLET AWAITS
            </h1>
          </motion.div>
          <p className="text-gray-400 text-sm uppercase tracking-widest">
            {stations.length} Stations · Winner Takes All
          </p>
        </motion.div>

        {/* Station indicators */}
        <div className="flex items-center justify-center gap-3 mb-16">
          {stations.map((_, idx) => (
            <motion.div
              key={`preview-dot-${idx}`}
              className="relative"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
            >
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                  idx === currentPreview
                    ? "bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-300 text-white scale-125 shadow-lg shadow-cyan-500/50"
                    : idx < currentPreview
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-gray-800 border-gray-600 text-gray-400"
                }`}
                animate={
                  idx === currentPreview
                    ? {
                        boxShadow: [
                          "0 0 20px rgba(6,182,212,0.5)",
                          "0 0 40px rgba(6,182,212,0.8)",
                          "0 0 20px rgba(6,182,212,0.5)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {idx + 1}
              </motion.div>
              {/* Connector line */}
              {idx < stations.length - 1 && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 left-full w-3 h-0.5 ${
                    idx < currentPreview ? "bg-emerald-500" : "bg-gray-700"
                  }`}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Station card with enhanced design */}
        <AnimatePresence mode="wait">
          <motion.div
            key={station.id}
            className="relative"
            initial={{ opacity: 0, scale: 0.9, rotateY: -20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.95, rotateY: 20 }}
            transition={TRANSITION_PRESET.medium}
          >
            {/* Glowing border effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl blur-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-30"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-white/20 p-8 overflow-hidden">
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-cyan-500/50" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-purple-500/50" />

              {/* Station icon - huge and centered */}
              <motion.div
                className="text-center mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="text-8xl mb-2 filter drop-shadow-2xl">{station.icon}</div>
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs uppercase tracking-wider text-cyan-300 font-bold">
                    Station {currentPreview + 1}/{stations.length}
                  </span>
                </div>
              </motion.div>

              {/* Station name */}
              <motion.h2
                className="text-4xl font-black text-center mb-3 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {station.name.toUpperCase()}
              </motion.h2>

              {/* Description */}
              <motion.p
                className="text-center text-gray-300 text-lg italic mb-6 max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                "{station.description}"
              </motion.p>

              {/* Stat requirement */}
              <motion.div
                className="flex items-center justify-center gap-3 mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <span className="text-3xl">{statIcon}</span>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Primary Stat</div>
                    <div className="text-xl font-black text-white">{station.primaryStat.toUpperCase()}</div>
                  </div>
                </div>
              </motion.div>

              {/* Fighter comparison */}
              <motion.div
                className="grid grid-cols-3 gap-4 items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {/* Fighter 1 */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={56} className="is-round" />
                    {advantage?.id === fighter1.id && (
                      <motion.div
                        className="absolute -top-1 -right-1"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      </motion.div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{fighter1.ticker}</div>
                  <div
                    className={`text-2xl font-black ${
                      advantage?.id === fighter1.id ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {fighter1.stats[station.primaryStat]}
                  </div>
                </div>

                {/* VS divider */}
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-black text-gray-600">VS</div>
                  {isCompetitive && (
                    <motion.div
                      className="mt-2 text-xs px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-bold uppercase tracking-wider"
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ⚡ Close Match
                    </motion.div>
                  )}
                </div>

                {/* Fighter 2 */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={56} className="is-round" />
                    {advantage?.id === fighter2.id && (
                      <motion.div
                        className="absolute -top-1 -right-1"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      </motion.div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{fighter2.ticker}</div>
                  <div
                    className={`text-2xl font-black ${
                      advantage?.id === fighter2.id ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {fighter2.stats[station.primaryStat]}
                  </div>
                </div>
              </motion.div>

              {/* Advantage indicator */}
              {advantage && !isCompetitive && (
                <motion.div
                  className="mt-6 flex items-center justify-center gap-2 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold">
                    <span className="text-emerald-400">⚡</span> {advantage.ticker} has the edge (+{statDiff})
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress indicator */}
        <motion.div
          className="mt-8 text-center text-xs text-gray-500 uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Preparing station {currentPreview + 1} of {stations.length}...
        </motion.div>
      </div>
    </motion.div>
  );
}
