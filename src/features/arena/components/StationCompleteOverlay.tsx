import { motion } from "framer-motion";
import { ArenaCharacter, Station, StationResult } from "../types";
import { ANIMATION_VARIANTS, TRANSITION_PRESET } from "../config/animations";

interface StationCompleteOverlayProps {
  station: Station;
  stationIndex: number;
  totalStations: number;
  result: StationResult;
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
}

export function StationCompleteOverlay({
  station,
  stationIndex,
  totalStations,
  result,
  fighter1,
  fighter2,
}: StationCompleteOverlayProps) {
  const winner = result.winner === 0 ? fighter1 : result.winner === 1 ? fighter2 : null;
  const gap = Math.abs(result.fighter1Time - result.fighter2Time);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      {...ANIMATION_VARIANTS.fade}
      transition={TRANSITION_PRESET.quick}
    >
      <motion.div
        className="arena-station-complete"
        {...ANIMATION_VARIANTS.scaleIn}
        transition={TRANSITION_PRESET.medium}
      >
        <div className="text-xs uppercase tracking-[0.4em] text-gray-400">
          Station {stationIndex + 1}/{totalStations} complete
        </div>
        <div className="mt-3 text-2xl font-black text-white">{station.name}</div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="station-complete-row">
            <span>{fighter1.ticker}</span>
            <span className="font-mono">{result.fighter1Time.toFixed(1)}s</span>
          </div>
          <div className="station-complete-row">
            <span>{fighter2.ticker}</span>
            <span className="font-mono">{result.fighter2Time.toFixed(1)}s</span>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-300">
          Gap: {gap.toFixed(1)}s
        </div>
        {winner && (
          <div className="mt-3 text-sm font-semibold text-emerald-300">
            {winner.ticker} takes the station
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
