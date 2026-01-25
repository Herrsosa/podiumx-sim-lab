import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArenaCharacter, RacePhase, StationResult } from "../types";
import { STATIONS } from "../data/stations";
import { ArenaAvatar } from "./ArenaAvatar";

interface SideScrollerViewProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  stationResults: StationResult[];
  currentStation: number;
  fighterProgress: [number, number];
  phase: RacePhase;
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

const EVENT_UI = {
  surge: { icon: "⚡", shortName: "SURGE", isPositive: true, seconds: 4 },
  bonk: { icon: "💥", shortName: "BONK", isPositive: false, seconds: 5 },
  lead: { icon: "🏁", shortName: "LEAD CHANGE", isPositive: true, seconds: 0 },
} as const;

const SWEAT_PARTICLES = [
  { delay: "0s", x: "8px" },
  { delay: "0.3s", x: "18px" },
  { delay: "0.6s", x: "28px" },
];

const DUST_PARTICLES = [
  { delay: "0s", x: "6px" },
  { delay: "0.2s", x: "16px" },
];

const STATION_BACKGROUNDS: Record<string, string> = {
  "mining-rig": "rgba(40, 32, 70, 0.85)",
  "pushing-bags": "rgba(50, 42, 20, 0.85)",
  "rug-pull-recovery": "rgba(60, 28, 28, 0.85)",
  "fomo-jumps": "rgba(20, 60, 50, 0.85)",
  "liquidity-rowing": "rgba(20, 40, 70, 0.85)",
  "bag-holding": "rgba(60, 50, 20, 0.85)",
  "stablecoin-lunges": "rgba(24, 52, 36, 0.85)",
  "moon-balls": "rgba(18, 20, 48, 0.9)",
};

const EXERCISE_SCENES: Record<string, string> = {
  "mining-rig": "mining_rig",
  "pushing-bags": "pushing_bags",
  "rug-pull-recovery": "rug_pull",
  "fomo-jumps": "fomo_jumps",
  "liquidity-rowing": "liquidity_rowing",
  "bag-holding": "bag_holding",
  "stablecoin-lunges": "stablecoin_lunges",
  "moon-balls": "moon_balls",
};

interface ExerciseImageProps {
  src: string;
  fallbacks?: string[];
  alt: string;
  className?: string;
}

function ExerciseImage({ src, fallbacks = [], alt, className }: ExerciseImageProps) {
  const sources = [src, ...fallbacks].filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [src, fallbacks.join("|")]);

  const currentSrc = sources[currentIndex];
  if (!currentSrc) return null;

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="eager"
      className={className}
      onError={() => {
        if (currentIndex < sources.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          return;
        }
        setCurrentIndex(sources.length);
      }}
    />
  );
}

export function SideScrollerView({
  fighter1,
  fighter2,
  stationResults,
  currentStation,
  fighterProgress,
  phase,
  eventCallout,
}: SideScrollerViewProps) {
  const station = STATIONS[currentStation];
  const progress1 = fighterProgress[0];
  const progress2 = fighterProgress[1];

  const totalTime1 = stationResults.reduce((sum, r) => sum + r.fighter1Time, 0);
  const totalTime2 = stationResults.reduce((sum, r) => sum + r.fighter2Time, 0);
  const gapSeconds = Math.abs(totalTime1 - totalTime2);

  const getState = (id: string, progress: number, opponent: number) => {
    if (eventCallout?.type === "surge" && eventCallout.fighterId === id) return "surge";
    if (eventCallout?.type === "bonk" && eventCallout.fighterId === id) return "bonk";
    if (progress > opponent + 6) return "leading";
    if (progress < opponent - 6) return "trailing";
    return "neutral";
  };
  const p1State = getState(fighter1.id, progress1, progress2);
  const p2State = getState(fighter2.id, progress2, progress1);
  const eventUi = eventCallout ? EVENT_UI[eventCallout.type] : null;
  const isCompleting = phase === "station_complete";
  const bubbleOffset = 34;

  const stationBg = station ? STATION_BACKGROUNDS[station.id] : undefined;
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  const assetBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const resolveAsset = (path: string) => `${assetBase}${path.replace(/^\//, "")}`;
  const exerciseKey = station ? EXERCISE_SCENES[station.id] ?? station.id.replace(/-/g, "_") : "";
  const exerciseScene = station ? resolveAsset(`images/exercises/${exerciseKey}.png`) : "";
  const stationBackdrop = station ? resolveAsset(`images/stations/${station.id}.png`) : "";
  const rootExerciseFallback = station ? `/images/exercises/${exerciseKey}.png` : "";
  const legacyExerciseFallback = station ? resolveAsset(`exercises/${exerciseKey}.png`) : "";
  const rootLegacyExerciseFallback = station ? `/exercises/${exerciseKey}.png` : "";
  const hyphenExerciseFallback = station ? resolveAsset(`images/exercises/${station.id}.png`) : "";
  const rootHyphenFallback = station ? `/images/exercises/${station.id}.png` : "";
  const legacyHyphenFallback = station ? resolveAsset(`exercises/${station.id}.png`) : "";
  const rootLegacyHyphenFallback = station ? `/exercises/${station.id}.png` : "";
  const fallbackCandidates = station
    ? [
        rootExerciseFallback,
        legacyExerciseFallback,
        rootLegacyExerciseFallback,
        hyphenExerciseFallback,
        rootHyphenFallback,
        legacyHyphenFallback,
        rootLegacyHyphenFallback,
        stationBackdrop,
      ]
    : [];

  return (
    <div
      className="side-scroller-view station-cam"
      style={{ "--station-bg": stationBg ?? "rgba(20, 20, 40, 0.85)" } as CSSProperties}
    >
      <AnimatePresence mode="wait">
        {station && (
          <motion.div
            key={station.id}
            className="station-cam-stage"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
          >
            <div
              className="station-background"
              style={{
                backgroundImage: stationBackdrop
                  ? `url(${stationBackdrop}), url(${exerciseScene})`
                  : exerciseScene
                  ? `url(${exerciseScene})`
                  : rootExerciseFallback
                  ? `url(${rootExerciseFallback})`
                  : undefined,
              }}
            />
            <div className="exercise-scene">
              <ExerciseImage
                src={exerciseScene}
                fallbacks={fallbackCandidates}
                alt={`${station.name} exercise`}
                className="exercise-scene-image"
              />
            </div>

            <div className="station-cam-content">
              <div className="station-cam-header">
                <div className="station-cam-number">
                  STATION {currentStation + 1}/{STATIONS.length}
                </div>
                <div className="station-cam-title">
                  <span className="station-icon">{station.icon}</span>
                  {station.name}
                </div>
                <div className="station-cam-tagline">"{station.description}"</div>
              </div>

              <div className="lane-time top-left">⏱ {formatTime(totalTime1)}</div>
              <div className="lane-time top-right">⏱ {formatTime(totalTime2)}</div>

              <div className={`side-lane ${p1State === "leading" ? "leading" : ""}`}>
                <div className="lane-bg far" />
                <div className="lane-bg mid" />
                <div className="lane-track" />
                <motion.div
                  className={`character-image-container ${p1State} ${
                    p1State === "bonk" ? "bonking" : ""
                  }`}
                  style={{ left: `${Math.min(88, Math.max(6, progress1))}%` } as CSSProperties}
                  animate={{ x: isCompleting ? 140 : 0, opacity: isCompleting ? 0 : 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 18 }}
                >
                  <ArenaAvatar
                    value={fighter1.avatar}
                    alt={fighter1.name}
                    size={88}
                    className="character-portrait"
                  />
                  {SWEAT_PARTICLES.map((particle, idx) => (
                    <span
                      key={`p1-sweat-${idx}`}
                      className="sweat-particle"
                      style={
                        {
                          "--delay": particle.delay,
                          "--offset-x": particle.x,
                        } as CSSProperties
                      }
                    />
                  ))}
                  {p1State === "leading" &&
                    DUST_PARTICLES.map((particle, idx) => (
                      <span
                        key={`p1-dust-${idx}`}
                        className="dust-particle"
                        style={
                          {
                            "--delay": particle.delay,
                            "--offset-x": particle.x,
                          } as CSSProperties
                        }
                      />
                    ))}
                  {p1State === "surge" && <span className="sparkle" />}
                  {p1State === "leading" && <span className="speed-lines" />}
                </motion.div>
                <div className="lane-info">
                  <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={32} className="is-round" />
                  <span className="lane-ticker">{fighter1.ticker}</span>
                  <div className="lane-progress">
                    <div className="lane-progress-fill p1" style={{ width: `${progress1}%` }} />
                  </div>
                  <span className="lane-pct">{Math.round(progress1)}%</span>
                </div>
                <AnimatePresence>
                  {eventCallout && eventUi && eventCallout.fighterId === fighter1.id && (
                    <motion.div
                      key={`event-${eventCallout.type}-${fighter1.id}`}
                      className={`event-bubble ${eventUi.isPositive ? "boost" : "penalty"}`}
                      style={{ left: `calc(${Math.min(88, Math.max(6, progress1))}% + ${bubbleOffset}px)` }}
                      initial={{ y: 8, opacity: 0, scale: 0.85 }}
                      animate={{ y: -6, opacity: 1, scale: 1 }}
                      exit={{ y: -18, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    >
                      <div className="bubble-content">
                        <span className="event-icon">{eventUi.icon}</span>
                        <span className="event-name">
                          {eventCallout.text || eventUi.shortName}
                        </span>
                        {eventUi.seconds > 0 && (
                          <span className="event-effect">
                            {eventUi.isPositive ? "+" : "-"}
                            {eventCallout.seconds ?? eventUi.seconds}s
                          </span>
                        )}
                      </div>
                      <div className="bubble-tail" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={`side-lane ${p2State === "leading" ? "leading" : ""}`}>
                <div className="lane-bg far" />
                <div className="lane-bg mid" />
                <div className="lane-track" />
                <motion.div
                  className={`character-image-container ${p2State} ${
                    p2State === "bonk" ? "bonking" : ""
                  }`}
                  style={{ left: `${Math.min(88, Math.max(6, progress2))}%` } as CSSProperties}
                  animate={{ x: isCompleting ? 140 : 0, opacity: isCompleting ? 0 : 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 18 }}
                >
                  <ArenaAvatar
                    value={fighter2.avatar}
                    alt={fighter2.name}
                    size={88}
                    className="character-portrait"
                  />
                  {SWEAT_PARTICLES.map((particle, idx) => (
                    <span
                      key={`p2-sweat-${idx}`}
                      className="sweat-particle"
                      style={
                        {
                          "--delay": particle.delay,
                          "--offset-x": particle.x,
                        } as CSSProperties
                      }
                    />
                  ))}
                  {p2State === "leading" &&
                    DUST_PARTICLES.map((particle, idx) => (
                      <span
                        key={`p2-dust-${idx}`}
                        className="dust-particle"
                        style={
                          {
                            "--delay": particle.delay,
                            "--offset-x": particle.x,
                          } as CSSProperties
                        }
                      />
                    ))}
                  {p2State === "surge" && <span className="sparkle" />}
                  {p2State === "leading" && <span className="speed-lines" />}
                </motion.div>
                <div className="lane-info">
                  <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={32} className="is-round" />
                  <span className="lane-ticker">{fighter2.ticker}</span>
                  <div className="lane-progress">
                    <div className="lane-progress-fill p2" style={{ width: `${progress2}%` }} />
                  </div>
                  <span className="lane-pct">{Math.round(progress2)}%</span>
                </div>
                <AnimatePresence>
                  {eventCallout && eventUi && eventCallout.fighterId === fighter2.id && (
                    <motion.div
                      key={`event-${eventCallout.type}-${fighter2.id}`}
                      className={`event-bubble ${eventUi.isPositive ? "boost" : "penalty"}`}
                      style={{ left: `calc(${Math.min(88, Math.max(6, progress2))}% + ${bubbleOffset}px)` }}
                      initial={{ y: 8, opacity: 0, scale: 0.85 }}
                      animate={{ y: -6, opacity: 1, scale: 1 }}
                      exit={{ y: -18, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    >
                      <div className="bubble-content">
                        <span className="event-icon">{eventUi.icon}</span>
                        <span className="event-name">
                          {eventCallout.text || eventUi.shortName}
                        </span>
                        {eventUi.seconds > 0 && (
                          <span className="event-effect">
                            {eventUi.isPositive ? "+" : "-"}
                            {eventCallout.seconds ?? eventUi.seconds}s
                          </span>
                        )}
                      </div>
                      <div className="bubble-tail" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="station-cam-gap">
                {gapSeconds > 0.2 ? (
                  <span className={totalTime1 < totalTime2 ? "p1-leading" : "p2-leading"}>
                    GAP: {gapSeconds.toFixed(1)}s
                  </span>
                ) : (
                  <span className="tied">NECK AND NECK</span>
                )}
              </div>

              <div className="side-progress">
                {STATIONS.map((station, idx) => {
                  const status = idx < currentStation ? "completed" : idx === currentStation ? "current" : "future";
                  return (
                    <div key={station.id} className={`side-checkpoint ${status}`}>
                      <span>{station.icon}</span>
                    </div>
                  );
                })}
              </div>

              {eventCallout && eventUi && (
                <div className={`event-lower-third ${eventUi.isPositive ? "boost" : "penalty"}`}>
                  <div className="lower-third-icon">{eventUi.icon}</div>
                  <div className="lower-third-text">
                    <span className="event-title">{eventCallout.text}</span>
                    {eventCallout.fighterId && (
                      <span className="event-desc">
                        {eventCallout.fighterId === fighter1.id ? fighter1.ticker : fighter2.ticker}{" "}
                        {eventUi.isPositive ? "gains" : "loses"}{" "}
                        {eventUi.seconds > 0
                          ? `${eventCallout.seconds ?? eventUi.seconds} seconds`
                          : "the lead"}
                        .
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
