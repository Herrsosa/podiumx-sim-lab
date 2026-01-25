import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArenaCharacter, RacePhase, StationResult } from "../types";
import { STATIONS } from "../data/stations";
import { RACE_TIMING } from "../config/raceTiming";
import { RaceTrackView } from "./RaceTrackView";
import { BroadcastView } from "./BroadcastView";
import { SideScrollerView } from "./SideScrollerView";
import { OddsMovement } from "./OddsMovement";

export type RaceViewMode = "track" | "broadcast" | "sidescroller";

interface RaceViewContainerProps {
  view: RaceViewMode;
  phase: RacePhase;
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  currentStation: number;
  stationResults: StationResult[];
  fighterProgress: [number, number];
  odds?: { fighter1Odds: number; fighter2Odds: number } | null;
  oddsHistory?: { fighter1Odds: number; fighter2Odds: number }[];
  viewerCount: number;
  poolTotal?: number;
  commentary?: string;
  eventCallout?: {
    type: "surge" | "bonk" | "lead";
    text: string;
    fighterId?: string;
    eventKey?: string;
    seconds?: number;
  } | null;
  hypeLevel?: number;
}

const VIEW_ANIMS = {
  track: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  broadcast: {
    initial: { opacity: 0, scale: 1.05 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
  sidescroller: {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  },
};

export function RaceViewContainer({
  view,
  phase,
  fighter1,
  fighter2,
  currentStation,
  stationResults,
  fighterProgress,
  odds,
  oddsHistory = [],
  viewerCount,
  poolTotal,
  commentary,
  eventCallout,
  hypeLevel = 40,
}: RaceViewContainerProps) {
  const station = STATIONS[currentStation];
  const totalTime1 = stationResults.reduce((sum, r) => sum + r.fighter1Time, 0);
  const totalTime2 = stationResults.reduce((sum, r) => sum + r.fighter2Time, 0);
  const eventClass = eventCallout ? `event-${eventCallout.type}` : "";
  const showOddsOverlay =
    [
      "pre_race",
      "station_preview",
      "countdown",
      "station_intro",
      "round_betting",
      "station_racing",
      "station_complete",
      "station_transition",
    ].includes(phase) && (oddsHistory.length > 0 || Boolean(odds));

  return (
    <div
      className={`race-view-container ${eventClass} view-${view}`}
      style={{ "--hype": Math.min(1, Math.max(0.2, hypeLevel / 100)) } as CSSProperties}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className={`race-view ${view}`}
          initial={VIEW_ANIMS[view].initial}
          animate={VIEW_ANIMS[view].animate}
          exit={VIEW_ANIMS[view].exit}
          transition={{ duration: RACE_TIMING.animations.viewTransition / 1000, ease: "easeOut" }}
        >
          {view === "track" && (
            <RaceTrackView
              phase={phase}
              fighter1={fighter1}
              fighter2={fighter2}
              currentStation={currentStation}
              stationResults={stationResults}
              fighterProgress={fighterProgress}
              odds={odds}
            />
          )}
          {view === "broadcast" && station && (
            <BroadcastView
              phase={phase}
              fighter1={fighter1}
              fighter2={fighter2}
              station={station}
              stationIndex={currentStation}
              totalStations={STATIONS.length}
              viewerCount={viewerCount}
              poolTotal={poolTotal}
              totalTimes={[totalTime1, totalTime2]}
              commentary={commentary}
              eventCallout={eventCallout}
            />
          )}
          {view === "sidescroller" && (
            <SideScrollerView
              fighter1={fighter1}
              fighter2={fighter2}
              stationResults={stationResults}
              currentStation={currentStation}
              fighterProgress={fighterProgress}
              phase={phase}
              eventCallout={eventCallout}
            />
          )}
        </motion.div>
      </AnimatePresence>
      {showOddsOverlay && (
        <div className="race-odds-overlay">
          <OddsMovement
            fighter1={fighter1}
            fighter2={fighter2}
            history={oddsHistory.length > 0 ? oddsHistory : odds ? [odds] : []}
          />
        </div>
      )}
    </div>
  );
}
