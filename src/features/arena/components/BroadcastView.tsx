import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { ArenaCharacter, RacePhase, Station } from "../types";
import { ArenaAvatar } from "./ArenaAvatar";

interface BroadcastViewProps {
  phase: RacePhase;
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  station: Station;
  stationIndex: number;
  totalStations: number;
  viewerCount: number;
  poolTotal?: number;
  totalTimes: [number, number];
  commentary?: string;
  eventCallout?: {
    type: "surge" | "bonk" | "lead";
    text: string;
    fighterId?: string;
    eventKey?: string;
    seconds?: number;
  } | null;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export function BroadcastView({
  phase,
  fighter1,
  fighter2,
  station,
  stationIndex,
  totalStations,
  viewerCount,
  poolTotal,
  totalTimes,
  commentary,
  eventCallout,
}: BroadcastViewProps) {
  const gap = Math.abs(totalTimes[0] - totalTimes[1]);
  const isPreRace = phase === "pre_race" || phase === "countdown";
  const isEvent = Boolean(eventCallout);
  const statRows: Array<{ key: keyof ArenaCharacter["stats"]; label: string }> = [
    { key: "strength", label: "STR" },
    { key: "speed", label: "SPD" },
    { key: "endurance", label: "END" },
    { key: "technique", label: "TEC" },
    { key: "mental", label: "MNT" },
  ];

  return (
    <div className="broadcast-view">
      <div className="broadcast-top-bar">
        <div className="live-badge">
          <span className="dot" /> LIVE
        </div>
        <div className="broadcast-title">CRYPTO HYROX ARENA</div>
        <div className="broadcast-meta">
          <span className="station-pill">
            {isPreRace ? "PRE-RACE" : `STATION ${stationIndex + 1}/${totalStations}`}
          </span>
          <span className="viewer-count">👁 {viewerCount.toLocaleString()} watching</span>
        </div>
      </div>

      {isPreRace ? (
        <div className="broadcast-pre-race">
          <div className="pre-race-title">TALE OF THE TAPE</div>
          <div className="pre-race-fighters">
            <div className="pre-race-card">
              <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={120} />
              <div className="pre-race-ticker">{fighter1.ticker}</div>
              <div className="pre-race-tagline">"{fighter1.tagline}"</div>
            </div>
            <div className="pre-race-versus">VS</div>
            <div className="pre-race-card">
              <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={120} />
              <div className="pre-race-ticker">{fighter2.ticker}</div>
              <div className="pre-race-tagline">"{fighter2.tagline}"</div>
            </div>
          </div>
          <div className="pre-race-stats">
            {statRows.map((stat) => (
              <div key={stat.key} className="pre-race-stat-row">
                <span className="stat-value left">{fighter1.stats[stat.key]}</span>
                <div className="stat-bar">
                  <div className="stat-fill left" style={{ width: `${fighter1.stats[stat.key]}%` }} />
                  <span className="stat-label">{stat.label}</span>
                  <div className="stat-fill right" style={{ width: `${fighter2.stats[stat.key]}%` }} />
                </div>
                <span className="stat-value right">{fighter2.stats[stat.key]}</span>
              </div>
            ))}
          </div>
          <div className="pre-race-footer">
            <span>👁 {viewerCount.toLocaleString()} watching</span>
            {poolTotal !== undefined && (
              <span>💰 {poolTotal.toLocaleString()} $COPE pool</span>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="broadcast-stage">
            <div className="pip-panel p1">
              <div className="pip-avatar">
                <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={72} className="is-round" />
              </div>
              <div className="pip-name">{fighter1.ticker}</div>
            </div>

            <div className="action-frame">
              <div className="action-media">
                <div className="action-icon">{station.icon}</div>
                <div className="action-title">{station.name}</div>
                <div className="action-sub">{station.description}</div>
              </div>
              {eventCallout && (
                <motion.div
                  className={`broadcast-moment ${eventCallout.type}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  {eventCallout.text}
                </motion.div>
              )}
            </div>

            <div className="pip-panel p2">
              <div className="pip-avatar">
                <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={72} className="is-round" />
              </div>
              <div className="pip-name">{fighter2.ticker}</div>
            </div>
          </div>

          {!isEvent && (
            <>
              <div className="lower-third">
                <div className="player-lower-third" style={{ "--player-color": "#00ff88" } as CSSProperties}>
                  <span className="name">{fighter1.ticker}</span>
                  <span className="time">{formatTime(totalTimes[0])}</span>
                </div>
                <div className="gap-badge">
                  <span className="icon">⏱️</span>
                  <span className="value">GAP: {gap.toFixed(0)}s</span>
                </div>
                <div className="player-lower-third" style={{ "--player-color": "#ff00ff" } as CSSProperties}>
                  <span className="name">{fighter2.ticker}</span>
                  <span className="time">{formatTime(totalTimes[1])}</span>
                </div>
              </div>

              <div className="commentary-bar">
                <div className="text">
                  {commentary || "The crowd is roaring as the station heats up..."}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
