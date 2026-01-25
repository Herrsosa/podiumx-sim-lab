import { motion } from "framer-motion";
import { Station } from "../types";
import { ANIMATION_VARIANTS, TRANSITION_PRESET } from "../config/animations";
import { Target, Zap, Activity } from "lucide-react";

interface StationIntroOverlayProps {
  station: Station;
  stationIndex: number;
  totalStations: number;
}

const STAT_ICONS: Record<string, string> = {
  strength: "💪",
  speed: "⚡",
  endurance: "🔥",
  technique: "🎯",
  mental: "🧠",
};

const STAT_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  strength: { from: "#ef4444", to: "#dc2626", glow: "rgba(239,68,68,0.5)" },
  speed: { from: "#3b82f6", to: "#2563eb", glow: "rgba(59,130,246,0.5)" },
  endurance: { from: "#f97316", to: "#ea580c", glow: "rgba(249,115,22,0.5)" },
  technique: { from: "#8b5cf6", to: "#7c3aed", glow: "rgba(139,92,246,0.5)" },
  mental: { from: "#06b6d4", to: "#0891b2", glow: "rgba(6,182,212,0.5)" },
};

export function StationIntroOverlay({ station, stationIndex, totalStations }: StationIntroOverlayProps) {
  const isFinalStation = stationIndex === totalStations - 1;
  const statIcon = STAT_ICONS[station.primaryStat] || "📊";
  const statColor = STAT_COLORS[station.primaryStat] || { from: "#6b7280", to: "#4b5563", glow: "rgba(107,114,128,0.5)" };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
      {...ANIMATION_VARIANTS.fade}
      transition={TRANSITION_PRESET.quick}
    >
      {/* Scanlines */}
      <div className="scanlines pointer-events-none" />

      {/* Animated background effect */}
      <motion.div
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${statColor.from}, transparent 60%)`,
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative z-10 w-full max-w-3xl mx-auto px-8"
        {...ANIMATION_VARIANTS.scaleIn}
        transition={TRANSITION_PRESET.medium}
      >
        {/* Station counter badge */}
        <motion.div
          className="flex items-center justify-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-sm uppercase tracking-widest font-bold">
              <span className="text-white">Station {stationIndex + 1}</span>
              <span className="text-gray-500 mx-2">/</span>
              <span className="text-gray-400">{totalStations}</span>
            </span>
            {isFinalStation && (
              <motion.span
                className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-bold uppercase"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ⚡ Final
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Main card */}
        <div className="relative">
          {/* Glowing border effect */}
          <motion.div
            className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
            style={{
              background: `linear-gradient(135deg, ${statColor.from}, ${statColor.to})`,
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl border-2 border-white/20 p-10 overflow-hidden">
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 opacity-50" style={{ borderColor: statColor.from }} />
            <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 opacity-50" style={{ borderColor: statColor.to }} />

            {/* Diagonal stripe pattern */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${statColor.from} 0px, ${statColor.from} 2px, transparent 2px, transparent 12px)`,
            }} />

            {/* Station icon - massive */}
            <motion.div
              className="text-center mb-6"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, delay: 0.3, type: "spring", stiffness: 150 }}
            >
              <motion.div
                className="text-9xl mb-4 filter drop-shadow-2xl inline-block"
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {station.icon}
              </motion.div>
            </motion.div>

            {/* Station name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1
                className="text-5xl md:text-6xl font-black text-center mb-4 tracking-tight"
                style={{
                  background: `linear-gradient(to right, ${statColor.from}, ${statColor.to}, ${statColor.from})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundSize: "200% 100%",
                }}
              >
                {station.name.toUpperCase()}
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              className="text-center text-gray-300 text-lg italic mb-8 max-w-xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              "{station.description}"
            </motion.p>

            {/* Divider */}
            <motion.div
              className="h-px mx-auto mb-8 relative overflow-hidden"
              style={{ width: "60%" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, transparent, ${statColor.from}, ${statColor.to}, transparent)`,
                }}
              />
            </motion.div>

            {/* Stat requirement */}
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center gap-3 px-8 py-4 rounded-2xl border-2 relative overflow-hidden"
                style={{
                  borderColor: `${statColor.from}80`,
                  background: `linear-gradient(135deg, ${statColor.from}10, ${statColor.to}10)`,
                }}
              >
                {/* Animated background shine */}
                <motion.div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${statColor.from}60, transparent)`,
                  }}
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                <motion.div
                  className="relative text-5xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {statIcon}
                </motion.div>

                <div className="relative">
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-semibold">
                    Primary Attribute
                  </div>
                  <div className="text-3xl font-black uppercase" style={{ color: statColor.from }}>
                    {station.primaryStat}
                  </div>
                </div>

                <motion.div
                  className="relative ml-4"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Activity className="w-6 h-6" style={{ color: statColor.to }} />
                </motion.div>
              </div>

              {/* Action text */}
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300 uppercase tracking-wider font-medium">
                  {isFinalStation ? "The Final Challenge" : "Prepare for action"}
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Bottom hint */}
        <motion.div
          className="mt-6 text-center text-xs text-gray-600 uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isFinalStation ? "Everything on the line..." : "Get ready..."}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
