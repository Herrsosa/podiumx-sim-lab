import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Station } from "../types";
import { ArenaCharacter } from "../types";

interface StationProgressProps {
  station: Station;
  fighter1Progress: number; // 0-100
  fighter2Progress: number; // 0-100
  fighter1Time?: number;
  fighter2Time?: number;
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  isActive: boolean;
  isComplete: boolean;
  winner?: 0 | 1 | null;
}

export function StationProgress({
  station,
  fighter1Progress,
  fighter2Progress,
  fighter1Time,
  fighter2Time,
  fighter1,
  fighter2,
  isActive,
  isComplete,
  winner,
}: StationProgressProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, "0")}`;
  };

  return (
    <motion.div
      className={cn(
        "p-5 rounded-2xl transition-all duration-300",
        "bg-black/60 backdrop-blur-lg",
        "border border-white/10",
        isActive
          ? "border-yellow-500/40 shadow-[0_0_30px_rgba(255,170,0,0.35)]"
          : isComplete
          ? "border-white/10"
          : "border-white/5 opacity-60"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isActive || isComplete ? 1 : 0.5, y: 0 }}
    >
      {/* Station header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{station.icon}</span>
          <div>
            <h4 className="font-bold text-white text-sm">{station.name}</h4>
            <p className="text-[10px] text-gray-400">
              {station.description || station.distance || `${station.reps} reps`}
            </p>
          </div>
        </div>
        {isActive && (
          <motion.div
            className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            LIVE
          </motion.div>
        )}
        {isComplete && winner !== null && winner !== undefined && (
          <div
            className="px-2 py-0.5 rounded text-[10px] font-bold"
            style={{
              backgroundColor: winner === 0 ? "#00ff8820" : "#ff00ff20",
              color: winner === 0 ? "#00ff88" : "#ff00ff",
            }}
          >
            {winner === 0 ? fighter1.ticker : fighter2.ticker} WINS
          </div>
        )}
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        {/* Fighter 1 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#00ff88] font-mono">
              {fighter1.ticker}
            </span>
            {fighter1Time !== undefined && (
              <span className="text-gray-400 font-mono">
                {formatTime(fighter1Time)}
              </span>
            )}
          </div>
          <div className="stat-bar-container">
            <motion.div
              className="stat-bar-fill"
              style={{
                background: "linear-gradient(90deg, #00ff88, rgba(0, 255, 136, 0.5))",
                boxShadow: "0 0 12px rgba(0, 255, 136, 0.5)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${fighter1Progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Fighter 2 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#ff00ff] font-mono">
              {fighter2.ticker}
            </span>
            {fighter2Time !== undefined && (
              <span className="text-gray-400 font-mono">
                {formatTime(fighter2Time)}
              </span>
            )}
          </div>
          <div className="stat-bar-container">
            <motion.div
              className="stat-bar-fill"
              style={{
                background: "linear-gradient(90deg, #ff00ff, rgba(255, 0, 255, 0.5))",
                boxShadow: "0 0 12px rgba(255, 0, 255, 0.5)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${fighter2Progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Compact version for race track
export function StationMarker({
  station,
  index,
  currentStation,
  winner,
}: {
  station: Station;
  index: number;
  currentStation: number;
  winner?: 0 | 1 | null;
}) {
  const isActive = index === currentStation;
  const isComplete = index < currentStation;

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center",
        isActive && "scale-110"
      )}
      animate={{
        scale: isActive ? 1.1 : 1,
        opacity: isActive || isComplete ? 1 : 0.4,
      }}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-lg",
          "border-2 transition-all",
          isActive
            ? "border-yellow-500 bg-yellow-500/20"
            : isComplete
            ? winner === 0
              ? "border-[#00ff88] bg-[#00ff88]/20"
              : winner === 1
              ? "border-[#ff00ff] bg-[#ff00ff]/20"
              : "border-gray-500 bg-gray-500/20"
            : "border-gray-700 bg-gray-800"
        )}
      >
        {station.icon}
      </div>
      <span
        className={cn(
          "text-[10px] mt-1 font-medium",
          isActive ? "text-yellow-400" : isComplete ? "text-gray-400" : "text-gray-600"
        )}
      >
        {station.name}
      </span>
    </motion.div>
  );
}
