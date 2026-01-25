import { motion } from "framer-motion";
import { Station } from "../types";

interface StationTransitionOverlayProps {
  station: Station;
  stationIndex: number;
  totalStations: number;
}

export function StationTransitionOverlay({
  station,
  stationIndex,
  totalStations,
}: StationTransitionOverlayProps) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="arena-station-transition"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
      >
        <div className="transition-label">NEXT STATION</div>
        <div className="transition-track">
          <div className="transition-glow" />
          <div className="transition-dot" />
        </div>
        <div className="transition-station">
          <span className="transition-icon">{station.icon}</span>
          <div className="transition-name">
            Station {stationIndex + 1}/{totalStations} · {station.name}
          </div>
          <div className="transition-desc">{station.description}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
