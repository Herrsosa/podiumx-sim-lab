import { ArenaCharacter, CharacterStats, Station, StationResult } from "../types";
import { STATIONS } from "../data/stations";
import { getAbilityCallout, getCommentary, getCharacterTaunt, getWeaknessCallout } from "../data/commentary";

const pickLine = (lines?: string[]) => {
  if (!lines || lines.length === 0) return "";
  return lines[Math.floor(Math.random() * lines.length)];
};

const applyStationTemplate = (line: string, replacements: Record<string, string>) => {
  let output = line;
  Object.entries(replacements).forEach(([key, value]) => {
    output = output.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  });
  return output;
};

// Base time for a station (in seconds)
const BASE_STATION_TIME = 60;
const VOLATILE_STATIONS = new Set(["fomo-jumps", "stablecoin-lunges", "moon-balls"]);

const roll = (chance: number) => Math.random() < chance;

const isWindowMatch = (window: "early" | "late" | undefined, stationIndex: number) => {
  if (!window) return false;
  if (window === "early") return stationIndex <= 2;
  return stationIndex >= 5;
};

// Calculate effectiveness for a station (0-100)
export function calculateEffectiveness(
  character: ArenaCharacter,
  station: Station
): number {
  const stats = character.stats;

  // Primary stat contributes 60%, secondary 40%
  const primaryWeight = 0.6;
  const secondaryWeight = 0.4;

  const primaryStat = stats[station.primaryStat];
  const secondaryStat = stats[station.secondaryStat];

  return primaryStat * primaryWeight + secondaryStat * secondaryWeight;
}

// Check if ability triggers
export function checkAbilityTrigger(
  character: ArenaCharacter,
  station: Station,
  currentPosition: "leading" | "trailing" | "tied",
  stationIndex: number
): boolean {
  const ability = character.ability;

  // Station-specific triggers
  if (ability.triggerStation && ability.triggerStation === station.id) {
    return true;
  }

  if (ability.triggerWhen) {
    return ability.triggerWhen === currentPosition ? roll(0.45) : false;
  }

  if (ability.triggerWindow && isWindowMatch(ability.triggerWindow, stationIndex)) {
    return roll(0.45);
  }

  if (ability.triggerOnStats?.includes(station.primaryStat)) {
    return roll(0.4);
  }

  if (ability.triggerVolatile && VOLATILE_STATIONS.has(station.id)) {
    return roll(0.4);
  }

  // Random triggers for non-station-specific abilities
  if (!ability.triggerStation && !ability.triggerWhen && !ability.triggerWindow && !ability.triggerOnStats) {
    // Comeback abilities trigger when trailing
    if (ability.effect === "comeback" && currentPosition === "trailing") {
      return roll(0.4); // 40% chance when trailing
    }

    // Higher chance in later stations
    const baseChance = 0.15 + (stationIndex * 0.05);
    return roll(baseChance);
  }

  return false;
}

// Check if weakness triggers
export function checkWeaknessTrigger(
  character: ArenaCharacter,
  station: Station,
  currentPosition: "leading" | "trailing" | "tied",
  stationIndex: number
): boolean {
  const weakness = character.weakness;

  // Station-specific triggers
  if (weakness.triggerStation && weakness.triggerStation === station.id) {
    return roll(0.6); // 60% chance at specific station
  }

  if (weakness.triggerWhen) {
    return weakness.triggerWhen === currentPosition ? roll(0.45) : false;
  }

  if (weakness.triggerWindow && isWindowMatch(weakness.triggerWindow, stationIndex)) {
    return roll(0.45);
  }

  if (weakness.triggerOnStats?.includes(station.primaryStat)) {
    return roll(0.4);
  }

  if (weakness.triggerVolatile && VOLATILE_STATIONS.has(station.id)) {
    return roll(0.4);
  }

  // Choke weakness triggers more in final stations
  if (weakness.effect === "choke") {
    const chokeChance = stationIndex >= 6 ? 0.3 : 0.1;
    return roll(chokeChance);
  }

  // Random triggers
  if (
    !weakness.triggerStation &&
    !weakness.triggerWhen &&
    !weakness.triggerWindow &&
    !weakness.triggerOnStats &&
    !weakness.triggerVolatile
  ) {
    return roll(0.1); // 10% base chance
  }

  return false;
}

// Calculate station time with all modifiers
export function calculateStationTime(
  character: ArenaCharacter,
  station: Station,
  options: {
    abilityActive: boolean;
    weaknessActive: boolean;
    currentPosition: "leading" | "trailing" | "tied";
    stationIndex: number;
  }
): number {
  // Base effectiveness determines time
  const effectiveness = calculateEffectiveness(character, station);

  // Convert effectiveness to time (higher effectiveness = lower time)
  // Effectiveness of 100 = BASE_TIME * 0.7
  // Effectiveness of 50 = BASE_TIME * 1.0
  // Effectiveness of 0 = BASE_TIME * 1.3
  const effectivenessFactor = 1.3 - (effectiveness / 100) * 0.6;
  let time = BASE_STATION_TIME * effectivenessFactor;

  // Apply ability bonus (10-20% faster)
  if (options.abilityActive) {
    time *= 0.85;
  }

  // Apply weakness penalty (10-25% slower)
  if (options.weaknessActive) {
    time *= 1.2;
  }

  // Add randomness (±8%)
  const randomFactor = 0.92 + Math.random() * 0.16;
  time *= randomFactor;

  // Drama injection for close races - later stations get tighter
  if (options.stationIndex >= 5) {
    // Compress times in final stations
    const compressionFactor = 1 - (options.stationIndex - 5) * 0.02;
    time *= compressionFactor;
  }

  return Math.round(time * 10) / 10; // Round to 1 decimal
}

// Simulate a single station
export function simulateStation(
  fighter1: ArenaCharacter,
  fighter2: ArenaCharacter,
  station: Station,
  stationIndex: number,
  cumulativeTimes: [number, number] // Total time so far for each fighter
): {
  result: StationResult;
  commentary: string[];
  abilityTriggered?: { fighterId: string; abilityName: string };
  weaknessTriggered?: { fighterId: string; weaknessName: string };
} {
  const commentary: string[] = [];

  // Determine current positions
  const timeDiff = cumulativeTimes[0] - cumulativeTimes[1];
  const position1: "leading" | "trailing" | "tied" =
    timeDiff < -2 ? "leading" : timeDiff > 2 ? "trailing" : "tied";
  const position2: "leading" | "trailing" | "tied" =
    timeDiff > 2 ? "leading" : timeDiff < -2 ? "trailing" : "tied";

  // Check for abilities
  const ability1Triggers = checkAbilityTrigger(fighter1, station, position1, stationIndex);
  const ability2Triggers = checkAbilityTrigger(fighter2, station, position2, stationIndex);

  // Check for weaknesses
  const weakness1Triggers = checkWeaknessTrigger(fighter1, station, position1, stationIndex);
  const weakness2Triggers = checkWeaknessTrigger(fighter2, station, position2, stationIndex);

  let abilityTriggered: { fighterId: string; abilityName: string } | undefined;
  let weaknessTriggered: { fighterId: string; weaknessName: string } | undefined;

  // Calculate times
  const time1 = calculateStationTime(fighter1, station, {
    abilityActive: ability1Triggers,
    weaknessActive: weakness1Triggers,
    currentPosition: position1,
    stationIndex,
  });

  const time2 = calculateStationTime(fighter2, station, {
    abilityActive: ability2Triggers,
    weaknessActive: weakness2Triggers,
    currentPosition: position2,
    stationIndex,
  });

  // Determine winner
  const stationTimeDiff = time1 - time2;
  const winner: 0 | 1 | null =
    stationTimeDiff < -0.5 ? 0 : stationTimeDiff > 0.5 ? 1 : null;

  // Generate commentary

  // Station intro
  const introLine = pickLine(station.commentary?.start);
  if (introLine) {
    commentary.push(
      applyStationTemplate(introLine, {
        p1: fighter1.name,
        p2: fighter2.name,
        station: station.name,
      })
    );
  } else {
    commentary.push(
      getCommentary("station_intro", { station: station.name })
    );
  }

  // Ability commentary
  if (ability1Triggers) {
    abilityTriggered = { fighterId: fighter1.id, abilityName: fighter1.ability.name };
    commentary.push(
      getAbilityCallout(fighter1.name, fighter1.ability.name)
    );
    const clutchLine = pickLine(station.commentary?.clutch);
    if (clutchLine) {
      commentary.push(
        applyStationTemplate(clutchLine, {
          name: fighter1.name,
          p1: fighter1.name,
          p2: fighter2.name,
        })
      );
    }
  }
  if (ability2Triggers) {
    abilityTriggered = { fighterId: fighter2.id, abilityName: fighter2.ability.name };
    commentary.push(
      getAbilityCallout(fighter2.name, fighter2.ability.name)
    );
    const clutchLine = pickLine(station.commentary?.clutch);
    if (clutchLine) {
      commentary.push(
        applyStationTemplate(clutchLine, {
          name: fighter2.name,
          p1: fighter1.name,
          p2: fighter2.name,
        })
      );
    }
  }

  // Weakness commentary
  if (weakness1Triggers) {
    weaknessTriggered = { fighterId: fighter1.id, weaknessName: fighter1.weakness.name };
    commentary.push(
      getWeaknessCallout(fighter1.name, fighter1.weakness.name)
    );
    const bonkLine = pickLine(station.commentary?.bonk);
    if (bonkLine) {
      commentary.push(
        applyStationTemplate(bonkLine, {
          name: fighter1.name,
          p1: fighter1.name,
          p2: fighter2.name,
        })
      );
    }
  }
  if (weakness2Triggers) {
    weaknessTriggered = { fighterId: fighter2.id, weaknessName: fighter2.weakness.name };
    commentary.push(
      getWeaknessCallout(fighter2.name, fighter2.weakness.name)
    );
    const bonkLine = pickLine(station.commentary?.bonk);
    if (bonkLine) {
      commentary.push(
        applyStationTemplate(bonkLine, {
          name: fighter2.name,
          p1: fighter1.name,
          p2: fighter2.name,
        })
      );
    }
  }

  // Race situation commentary
  if (Math.abs(stationTimeDiff) < 1) {
    // Close race
    const closeLine = pickLine(station.commentary?.close);
    if (closeLine) {
      commentary.push(
        applyStationTemplate(closeLine, {
          p1: fighter1.name,
          p2: fighter2.name,
          station: station.name,
        })
      );
    } else {
      commentary.push(
        getCommentary("station_close", { station: station.name })
      );
    }
  } else {
    // Clear leader
    const leader = winner === 0 ? fighter1 : fighter2;
    const trailer = winner === 0 ? fighter2 : fighter1;
    const leadLine = pickLine(
      winner === 0 ? station.commentary?.p1Leading : station.commentary?.p2Leading
    );
    if (leadLine) {
      commentary.push(
        applyStationTemplate(leadLine, {
          p1: fighter1.name,
          p2: fighter2.name,
          leader: leader.name,
          trailer: trailer.name,
          station: station.name,
        })
      );
    } else {
      commentary.push(
        getCommentary("station_lead", {
          leader: leader.name,
          trailer: trailer.name,
          station: station.name,
        })
      );
    }
  }

  // Station winner
  if (winner !== null) {
    commentary.push(
      getCommentary("station_win", {
        leader: winner === 0 ? fighter1.name : fighter2.name,
        station: station.name,
      })
    );
  }

  // Check for comeback
  const newTotalDiff = (cumulativeTimes[0] + time1) - (cumulativeTimes[1] + time2);
  const oldTotalDiff = cumulativeTimes[0] - cumulativeTimes[1];
  if (
    (oldTotalDiff > 5 && newTotalDiff < 2) ||
    (oldTotalDiff < -5 && newTotalDiff > -2)
  ) {
    const trailer = newTotalDiff > oldTotalDiff ? fighter2 : fighter1;
    commentary.push(
      getCommentary("comeback", { trailer: trailer.name })
    );
  }

  // Check for blowout
  if (Math.abs(newTotalDiff) > 15) {
    const leader = newTotalDiff < 0 ? fighter1 : fighter2;
    const trailer = newTotalDiff < 0 ? fighter2 : fighter1;
    commentary.push(
      getCommentary("blowout", { leader: leader.name, trailer: trailer.name })
    );
  }

  // Final station special commentary
  if (stationIndex === STATIONS.length - 1) {
    commentary.unshift(getCommentary("final_station", {}));
  }

  // Occasional dramatic moment
  if (Math.random() < 0.2) {
    commentary.push(getCommentary("dramatic", {}));
  }

  // Occasional character taunt
  if (Math.random() < 0.15 && winner !== null) {
    const winnerChar = winner === 0 ? fighter1 : fighter2;
    commentary.push(`${winnerChar.name}: "${getCharacterTaunt(winnerChar.id)}"`);
  }

  return {
    result: {
      stationId: station.id,
      fighter1Time: time1,
      fighter2Time: time2,
      winner,
      abilityTriggered,
      weaknessTriggered,
    },
    commentary,
    abilityTriggered,
    weaknessTriggered,
  };
}

// Simulate entire race (for instant results if needed)
export function simulateFullRace(
  fighter1: ArenaCharacter,
  fighter2: ArenaCharacter
): {
  results: StationResult[];
  winner: ArenaCharacter;
  totalTimes: [number, number];
  commentary: string[];
} {
  const results: StationResult[] = [];
  const allCommentary: string[] = [];
  const cumulativeTimes: [number, number] = [0, 0];

  // Race start commentary
  allCommentary.push(
    getCommentary("race_start", {
      fighter1: fighter1.name,
      fighter2: fighter2.name,
    })
  );

  // Simulate each station
  for (let i = 0; i < STATIONS.length; i++) {
    const station = STATIONS[i];
    const { result, commentary } = simulateStation(
      fighter1,
      fighter2,
      station,
      i,
      cumulativeTimes
    );

    results.push(result);
    allCommentary.push(...commentary);

    cumulativeTimes[0] += result.fighter1Time;
    cumulativeTimes[1] += result.fighter2Time;
  }

  // Determine overall winner
  const winner = cumulativeTimes[0] < cumulativeTimes[1] ? fighter1 : fighter2;

  // Finish commentary
  allCommentary.push(
    getCommentary("race_finish", { leader: winner.name })
  );

  return {
    results,
    winner,
    totalTimes: cumulativeTimes,
    commentary: allCommentary,
  };
}

// Get overall strength rating (for betting odds)
export function getOverallStrength(character: ArenaCharacter): number {
  const stats = character.stats;

  // Weighted average based on station impact
  const weights = {
    endurance: 0.3, // Most important for overall performance
    speed: 0.25,
    strength: 0.2,
    mental: 0.15,
    technique: 0.1,
  };

  let total = 0;
  (Object.keys(weights) as Array<keyof CharacterStats>).forEach((stat) => {
    total += stats[stat] * weights[stat];
  });

  return total;
}
