import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArenaCharacter, RacePhase, StationResult } from "../types";
import { STATIONS } from "../data/stations";
import { ArenaAvatar } from "./ArenaAvatar";

interface RaceTrackViewProps {
  phase: RacePhase;
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  currentStation: number;
  stationResults: StationResult[];
  fighterProgress: [number, number];
  odds?: { fighter1Odds: number; fighter2Odds: number } | null;
}

const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const STATION_BG: Record<string, string> = {
  "mining-rig": "rgba(40, 32, 70, 0.85)",
  "pushing-bags": "rgba(50, 42, 20, 0.85)",
  "rug-pull-recovery": "rgba(60, 28, 28, 0.85)",
  "fomo-jumps": "rgba(20, 60, 50, 0.85)",
  "liquidity-rowing": "rgba(20, 40, 70, 0.85)",
  "bag-holding": "rgba(60, 50, 20, 0.85)",
  "stablecoin-lunges": "rgba(24, 52, 36, 0.85)",
  "moon-balls": "rgba(18, 20, 48, 0.9)",
};

export function RaceTrackView({
  phase,
  fighter1,
  fighter2,
  currentStation,
  stationResults,
  fighterProgress,
  odds,
}: RaceTrackViewProps) {
  const station = STATIONS[currentStation];
  if (!station) return null;
  const progress1 = fighterProgress[0];
  const progress2 = fighterProgress[1];
  const totalTime1 = stationResults.reduce((sum, r) => sum + r.fighter1Time, 0);
  const totalTime2 = stationResults.reduce((sum, r) => sum + r.fighter2Time, 0);
  const gapSeconds = Math.abs(totalTime1 - totalTime2);
  const gapPercent = Math.abs(progress1 - progress2);

  const raceClock = formatClock(Math.max(totalTime1, totalTime2));
  const isCompleting = phase === "station_complete";
  const exitX = isCompleting ? 120 : 0;
  const stationBg = STATION_BG[station.id] ?? "rgba(20, 20, 40, 0.85)";

  return (
    <div className="station-view" style={{ "--station-bg": stationBg } as CSSProperties}>
      <div className="station-view-header">
        <div className="station-view-clock">{raceClock}</div>
        <div className="station-view-title">
          <span className="station-view-label">STATION {currentStation + 1}/{STATIONS.length}</span>
          <span className="station-view-name">{station.icon} {station.name}</span>
        </div>
        {odds && (
          <div className="station-view-odds">
            <span>{fighter1.ticker} {odds.fighter1Odds.toFixed(2)}x</span>
            <span>{fighter2.ticker} {odds.fighter2Odds.toFixed(2)}x</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={station.id}
          className="station-view-panel"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
        >
          <motion.div
            className="station-lane p1"
            animate={{ x: exitX, opacity: isCompleting ? 0 : 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            <div className="station-lane-header">
              <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={36} className="is-round" />
              <span className="station-lane-ticker">{fighter1.ticker}</span>
              <span className="station-lane-time">⏱ {formatClock(totalTime1)}</span>
            </div>
            <div className="station-progress">
              <div className="station-progress-fill p1" style={{ width: `${progress1}%` }} />
            </div>
            <div className="station-progress-meta">
              <span>📊 {Math.round(progress1)}%</span>
            </div>
          </motion.div>

          <div className="station-gap">
            <span className="gap-label">GAP</span>
            <span className="gap-value">
              {gapSeconds ? `${gapSeconds.toFixed(1)}s` : `${gapPercent.toFixed(0)}%`}
            </span>
          </div>

          <motion.div
            className="station-lane p2"
            animate={{ x: exitX, opacity: isCompleting ? 0 : 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            <div className="station-lane-header">
              <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={36} className="is-round" />
              <span className="station-lane-ticker">{fighter2.ticker}</span>
              <span className="station-lane-time">⏱ {formatClock(totalTime2)}</span>
            </div>
            <div className="station-progress">
              <div className="station-progress-fill p2" style={{ width: `${progress2}%` }} />
            </div>
            <div className="station-progress-meta">
              <span>📊 {Math.round(progress2)}%</span>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="station-mini-progress">
        {STATIONS.map((station, idx) => (
          <span
            key={station.id}
            className={idx < currentStation ? "mini-dot complete" : idx === currentStation ? "mini-dot current" : "mini-dot"}
          />
        ))}
      </div>
    </div>
  );
}
