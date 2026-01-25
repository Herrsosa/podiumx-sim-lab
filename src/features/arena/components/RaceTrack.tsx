import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArenaCharacter, StationResult, RacePhase } from "../types";
import { STATIONS } from "../data/stations";
import { StationMarker } from "./StationProgress";
import { ArenaAvatar } from "./ArenaAvatar";

interface RaceTrackProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  currentStation: number;
  stationResults: StationResult[];
  fighterProgress: [number, number]; // 0-100 within current station
  phase?: RacePhase;
  roundBettingTime?: number;
  crowdSplit?: { p1: number; p2: number };
  hypeLevel?: number;
  viewerCount?: number;
  poolTotal?: number;
  className?: string;
}

export function RaceTrack({
  fighter1,
  fighter2,
  currentStation,
  stationResults,
  fighterProgress,
  phase,
  roundBettingTime,
  crowdSplit,
  hypeLevel = 0,
  viewerCount,
  poolTotal,
  className,
}: RaceTrackProps) {
  // Calculate overall progress (0-100)
  const stationWeight = 100 / STATIONS.length;
  const progress1 = currentStation * stationWeight + (fighterProgress[0] / 100) * stationWeight;
  const progress2 = currentStation * stationWeight + (fighterProgress[1] / 100) * stationWeight;

  // Calculate total times
  const totalTime1 = stationResults.reduce((sum, r) => sum + r.fighter1Time, 0);
  const totalTime2 = stationResults.reduce((sum, r) => sum + r.fighter2Time, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="arena-hud">
        <div className="space-y-2">
          <div className="arena-hud-chip">Crypto Hyrox Live</div>
          <div className="arena-hud-title">
            {STATIONS[currentStation]?.name || "Station"}
          </div>
          <div className="arena-hud-sub">
            Station {currentStation + 1}/{STATIONS.length}
          </div>
        </div>
        <div className="space-y-2 text-center">
          <div className="arena-hud-chip">
            {phase === "round_betting" ? "Betting Window" : "Race Phase"}
          </div>
          <div className="arena-hud-title">
            {phase === "round_betting"
              ? `${roundBettingTime ?? 0}s`
              : phase === "station_racing"
              ? "Racing"
              : phase === "station_intro"
              ? "Warm Up"
              : "Live"}
          </div>
          <div className="arena-hud-sub">Live odds + hype</div>
        </div>
        <div className="space-y-2">
          <div className="arena-hud-chip">Crowd Split</div>
          <div className="bet-split">
            <div
              className="bet-split-fill"
              style={{ width: `${crowdSplit?.p1 ?? 50}%` }}
            />
          </div>
          <div className="arena-hud-sub">
            {crowdSplit?.p1 ?? 50}% P1 · {crowdSplit?.p2 ?? 50}% P2
          </div>
          <div className="arena-hud-sub">Hype meter</div>
          <div className="hype-meter">
            <div className="hype-fill" style={{ width: `${hypeLevel}%` }} />
          </div>
        </div>
      </div>

      {(viewerCount !== undefined || poolTotal !== undefined) && (
        <div className="arena-live-strip">
          {viewerCount !== undefined && (
            <div className="arena-live-chip">
              <span className="live-indicator" />
              {viewerCount.toLocaleString()} watching
            </div>
          )}
          {poolTotal !== undefined && (
            <div className="arena-live-chip">
              Pool: {poolTotal.toLocaleString()} $COPE
            </div>
          )}
        </div>
      )}

      {/* Race header with total times */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2">
          <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={32} className="is-round" />
          <div>
            <p className="text-sm font-bold" style={{ color: "#00ff88" }}>
              {fighter1.ticker}
            </p>
            <p className="text-xs text-gray-400 font-mono">
              {formatTime(totalTime1)}
            </p>
          </div>
        </div>

        <div className="text-center">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Station</span>
          <p className="text-[10px] text-gray-500">
            {currentStation + 1}/{STATIONS.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-bold" style={{ color: "#ff00ff" }}>
              {fighter2.ticker}
            </p>
            <p className="text-xs text-gray-400 font-mono">
              {formatTime(totalTime2)}
            </p>
          </div>
          <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={32} className="is-round" />
        </div>
      </div>

      {/* Station progress bar */}
      <div className="station-progress">
        {STATIONS.map((station, idx) => {
          const isCompleted = idx < currentStation;
          const isActive = idx === currentStation;
          return (
            <div
              key={station.id}
              className={cn(
                "station-segment",
                isCompleted && "completed",
                isActive && "active"
              )}
              title={station.name}
            />
          );
        })}
        <motion.div
          className="position-marker p1"
          animate={{ left: `${progress1}%` }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="position-marker p2"
          animate={{ left: `${progress2}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Race lanes */}
      <div className="race-lanes">
        <div className="race-lane">
          <div className="lane-avatar p1">
            <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={40} className="is-round" />
          </div>
          <div className="lane-track">
            <motion.div
              className="lane-progress p1"
              animate={{ width: `${progress1}%` }}
              transition={{ duration: 0.4 }}
            >
              {progress1 >= progress2 && <span className="lane-trail" />}
            </motion.div>
          </div>
          <div className="lane-percentage" style={{ color: "#00ff88" }}>
            {Math.round(progress1)}%
          </div>
        </div>
        <div className="race-lane">
          <div className="lane-avatar p2">
            <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={40} className="is-round" />
          </div>
          <div className="lane-track">
            <motion.div
              className="lane-progress p2"
              animate={{ width: `${progress2}%` }}
              transition={{ duration: 0.4 }}
            >
              {progress2 > progress1 && <span className="lane-trail" />}
            </motion.div>
          </div>
          <div className="lane-percentage" style={{ color: "#ff00ff" }}>
            {Math.round(progress2)}%
          </div>
        </div>
      </div>

      {/* Station markers below track */}
      <div className="flex justify-between px-4">
        {STATIONS.map((station, idx) => (
          <StationMarker
            key={station.id}
            station={station}
            index={idx}
            currentStation={currentStation}
            winner={stationResults[idx]?.winner}
          />
        ))}
      </div>

      {/* Gap indicator */}
      {currentStation > 0 && (
        <div className="text-center">
          {Math.abs(totalTime1 - totalTime2) < 2 ? (
            <motion.span
              className="text-yellow-400 font-bold text-sm"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              NECK AND NECK!
            </motion.span>
          ) : (
            <span className="text-gray-400 text-sm">
              {totalTime1 < totalTime2 ? fighter1.ticker : fighter2.ticker} leads by{" "}
              <span className="font-bold text-white">
                {Math.abs(totalTime1 - totalTime2).toFixed(1)}s
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Countdown component
export function RaceCountdown({
  count,
  onComplete,
}: {
  count: number;
  onComplete?: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        key={count}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        {count > 0 ? (
          <span className="text-9xl font-black text-white arena-heading">{count}</span>
        ) : (
          <motion.span
            className="text-6xl font-black bg-gradient-to-r from-[#00ff88] to-[#ff00ff] bg-clip-text text-transparent arena-heading"
            animate={{ scale: [1, 1.2, 1] }}
          >
            GO!
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  );
}
