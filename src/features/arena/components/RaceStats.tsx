import { ArenaCharacter, StationResult } from "../types";
import { ArenaAvatar } from "./ArenaAvatar";

interface RaceStatsProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  stationResults: StationResult[];
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export function RaceStats({ fighter1, fighter2, stationResults }: RaceStatsProps) {
  const stationsWon = stationResults.reduce(
    (acc, result) => {
      if (result.winner === 0) acc.p1 += 1;
      if (result.winner === 1) acc.p2 += 1;
      return acc;
    },
    { p1: 0, p2: 0 }
  );

  const totalTimes = stationResults.reduce(
    (acc, result) => {
      acc.p1 += result.fighter1Time;
      acc.p2 += result.fighter2Time;
      return acc;
    },
    { p1: 0, p2: 0 }
  );

  const events = stationResults.reduce(
    (acc, result) => {
      if (result.abilityTriggered?.fighterId === fighter1.id) acc.p1Surges += 1;
      if (result.abilityTriggered?.fighterId === fighter2.id) acc.p2Surges += 1;
      if (result.weaknessTriggered?.fighterId === fighter1.id) acc.p1Bonks += 1;
      if (result.weaknessTriggered?.fighterId === fighter2.id) acc.p2Bonks += 1;
      return acc;
    },
    { p1Surges: 0, p2Surges: 0, p1Bonks: 0, p2Bonks: 0 }
  );

  return (
    <div className="race-stats">
      <div className="race-stats-row">
        <div className="race-stats-fighter p1">
          <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={44} className="is-round" />
          <span className="race-stats-ticker">{fighter1.ticker}</span>
        </div>

        <div className="race-stats-center">
          <span className="race-stats-label">SCORE</span>
          <div className="race-stats-score">
            <span className="race-stats-score-p1">{stationsWon.p1}</span>
            <span className="race-stats-divider">-</span>
            <span className="race-stats-score-p2">{stationsWon.p2}</span>
          </div>
        </div>

        <div className="race-stats-fighter p2">
          <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={44} className="is-round" />
          <span className="race-stats-ticker">{fighter2.ticker}</span>
        </div>
      </div>

      <div className="race-stats-row">
        <div className="race-stats-meta p1">⏱ {formatTime(totalTimes.p1)}</div>
        <div className="race-stats-center-label">STATIONS</div>
        <div className="race-stats-meta p2">⏱ {formatTime(totalTimes.p2)}</div>
      </div>

      <div className="race-stats-row">
        <div className="race-stats-meta p1">⚡ {events.p1Surges} surges · ☠ {events.p1Bonks} bonks</div>
        <div className="race-stats-center-label">EVENTS</div>
        <div className="race-stats-meta p2">⚡ {events.p2Surges} surges · ☠ {events.p2Bonks} bonks</div>
      </div>
    </div>
  );
}
