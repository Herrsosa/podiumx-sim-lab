import React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { ANIMATION_DURATION, TRANSITION_PRESET } from "../config/animations";

interface CrowdHypeMeterProps {
  hypeLevel: number; // 0-100
  viewerCount?: number;
}

export function CrowdHypeMeter({ hypeLevel, viewerCount }: CrowdHypeMeterProps) {
  // Determine color based on hype level
  const getHypeColor = () => {
    if (hypeLevel >= 80) return { from: "#ef4444", to: "#dc2626" }; // Red - intense
    if (hypeLevel >= 60) return { from: "#f97316", to: "#ea580c" }; // Orange - high
    if (hypeLevel >= 40) return { from: "#f59e0b", to: "#d97706" }; // Amber - moderate
    return { from: "#6b7280", to: "#4b5563" }; // Gray - low
  };

  const colors = getHypeColor();
  const isHot = hypeLevel >= 80;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <motion.div
        className="bg-black/60 backdrop-blur-sm rounded-full px-6 py-2 border border-white/20 shadow-xl"
        animate={isHot ? {
          scale: [1, 1.05, 1],
          borderColor: ["rgba(255,255,255,0.2)", "rgba(239,68,68,0.6)", "rgba(255,255,255,0.2)"],
        } : {}}
        transition={{ duration: ANIMATION_DURATION.epic / 2, repeat: isHot ? Infinity : 0, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-3">
          {/* Flame icon */}
          <motion.div
            animate={isHot ? {
              rotate: [-5, 5, -5],
              scale: [1, 1.2, 1],
            } : {}}
            transition={{ duration: 0.5, repeat: isHot ? Infinity : 0 }}
          >
            <Flame
              className="w-5 h-5"
              style={{ color: colors.from }}
              fill={isHot ? colors.from : "none"}
            />
          </motion.div>

          {/* Hype bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                Crowd Hype
              </span>
              {viewerCount && (
                <span className="text-[10px] text-gray-500">
                  {viewerCount.toLocaleString()} watching
                </span>
              )}
            </div>
            <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(to right, ${colors.from}, ${colors.to})`
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${hypeLevel}%` }}
                transition={TRANSITION_PRESET.medium}
              />
            </div>
          </div>

          {/* Percentage */}
          <motion.div
            className="text-sm font-bold tabular-nums"
            style={{ color: colors.from }}
            animate={isHot ? {
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ duration: 0.5, repeat: isHot ? Infinity : 0 }}
          >
            {Math.round(hypeLevel)}%
          </motion.div>
        </div>

        {/* Hot indicator */}
        {isHot && (
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wider text-red-400 whitespace-nowrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0.6, 1, 0.6], y: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🔥 CROWD IS GOING WILD 🔥
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
