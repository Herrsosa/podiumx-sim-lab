import { ArenaCharacter, Station, StationResult } from "../types";
import { getOverallStrength, calculateEffectiveness } from "./simulation";

// Calculate win probability based on character stats
export function calculateWinProbability(
  fighter1: ArenaCharacter,
  fighter2: ArenaCharacter
): [number, number] {
  const strength1 = getOverallStrength(fighter1);
  const strength2 = getOverallStrength(fighter2);

  // Convert to probability using logistic function
  const diff = strength1 - strength2;
  const prob1 = 1 / (1 + Math.exp(-diff / 15)); // Scale factor of 15

  // Add some uncertainty (never below 15% or above 85%)
  const minProb = 0.15;
  const maxProb = 0.85;
  const adjustedProb1 = minProb + (maxProb - minProb) * prob1;

  return [adjustedProb1, 1 - adjustedProb1];
}

// Calculate odds from probability
export function probabilityToOdds(probability: number): number {
  // Convert probability to decimal odds
  // Add house edge of ~5%
  const trueOdds = 1 / probability;
  const houseEdge = 0.05;
  const adjustedOdds = trueOdds * (1 - houseEdge);

  // Round to 2 decimal places
  return Math.round(adjustedOdds * 100) / 100;
}

// Calculate betting odds for overall race winner
export function calculateOverallOdds(
  fighter1: ArenaCharacter,
  fighter2: ArenaCharacter
): { fighter1Odds: number; fighter2Odds: number } {
  const [prob1, prob2] = calculateWinProbability(fighter1, fighter2);

  return {
    fighter1Odds: probabilityToOdds(prob1),
    fighter2Odds: probabilityToOdds(prob2),
  };
}

// Calculate odds for a specific station
export function calculateStationOdds(
  fighter1: ArenaCharacter,
  fighter2: ArenaCharacter,
  station: Station,
  currentTimes: [number, number] // cumulative times so far
): { fighter1Odds: number; fighter2Odds: number } {
  // Base effectiveness for this station
  const eff1 = calculateEffectiveness(fighter1, station);
  const eff2 = calculateEffectiveness(fighter2, station);

  // Adjust for momentum (whoever's behind might push harder)
  const timeDiff = currentTimes[0] - currentTimes[1];
  let momentumBonus1 = 0;
  let momentumBonus2 = 0;

  if (timeDiff > 3) {
    // Fighter 1 is behind, might push harder
    momentumBonus1 = 5;
  } else if (timeDiff < -3) {
    // Fighter 2 is behind
    momentumBonus2 = 5;
  }

  // Check for ability/weakness at this station
  let abilityBonus1 = 0;
  let abilityBonus2 = 0;

  if (fighter1.ability.triggerStation === station.id) {
    abilityBonus1 = 10;
  }
  if (fighter2.ability.triggerStation === station.id) {
    abilityBonus2 = 10;
  }
  if (fighter1.weakness.triggerStation === station.id) {
    abilityBonus1 -= 8;
  }
  if (fighter2.weakness.triggerStation === station.id) {
    abilityBonus2 -= 8;
  }

  // Calculate adjusted effectiveness
  const adjEff1 = eff1 + momentumBonus1 + abilityBonus1;
  const adjEff2 = eff2 + momentumBonus2 + abilityBonus2;

  // Convert to probability
  const diff = adjEff1 - adjEff2;
  const prob1 = 1 / (1 + Math.exp(-diff / 12));

  // Wider uncertainty for station bets
  const minProb = 0.2;
  const maxProb = 0.8;
  const adjustedProb1 = minProb + (maxProb - minProb) * prob1;

  return {
    fighter1Odds: probabilityToOdds(adjustedProb1),
    fighter2Odds: probabilityToOdds(1 - adjustedProb1),
  };
}

// Calculate potential payout
export function calculatePayout(amount: number, odds: number): number {
  return Math.round(amount * odds * 100) / 100;
}

// Format odds for display
export function formatOdds(odds: number): string {
  return odds.toFixed(2) + "x";
}

// Get suggested bet amounts based on balance
export function getSuggestedBets(balance: number): number[] {
  const suggestions: number[] = [];

  // Small bet (10%)
  suggestions.push(Math.round(balance * 0.1));

  // Medium bet (25%)
  suggestions.push(Math.round(balance * 0.25));

  // Large bet (50%)
  suggestions.push(Math.round(balance * 0.5));

  // All in
  suggestions.push(balance);

  return suggestions.filter((s) => s > 0);
}

// Calculate live odds based on race progress
export function calculateLiveOdds(
  fighter1: ArenaCharacter,
  fighter2: ArenaCharacter,
  stationResults: StationResult[],
  currentStation: number,
  totalStations: number
): { fighter1Odds: number; fighter2Odds: number } {
  // Get current time totals
  const time1 = stationResults.reduce((sum, r) => sum + r.fighter1Time, 0);
  const time2 = stationResults.reduce((sum, r) => sum + r.fighter2Time, 0);

  // Base probability from character strength
  const [baseProb1] = calculateWinProbability(fighter1, fighter2);

  // Calculate time-based adjustment
  const timeDiff = time1 - time2;
  const stationsRemaining = totalStations - currentStation;

  // Each second of lead translates to probability adjustment
  // Less impact early, more impact late
  const impactFactor = 0.02 + (currentStation / totalStations) * 0.06;
  const timeAdjustment = -timeDiff * impactFactor;

  // Combine base probability with time adjustment
  let liveProb1 = baseProb1 + timeAdjustment;

  // Clamp to reasonable bounds (more extreme late in race)
  const minProb = stationsRemaining > 4 ? 0.1 : stationsRemaining > 2 ? 0.05 : 0.02;
  const maxProb = 1 - minProb;
  liveProb1 = Math.max(minProb, Math.min(maxProb, liveProb1));

  return {
    fighter1Odds: probabilityToOdds(liveProb1),
    fighter2Odds: probabilityToOdds(1 - liveProb1),
  };
}

export function applyOddsShift(
  odds: { fighter1Odds: number; fighter2Odds: number },
  crowdSplit?: { p1: number; p2: number }
): { fighter1Odds: number; fighter2Odds: number } {
  if (!crowdSplit) return odds;

  const delta = (crowdSplit.p1 - 50) * 0.015;
  const clampOdds = (value: number) => Math.max(1.1, Math.min(9.99, value));
  const adjusted1 = clampOdds(odds.fighter1Odds - delta);
  const adjusted2 = clampOdds(odds.fighter2Odds + delta);

  return {
    fighter1Odds: Math.round(adjusted1 * 100) / 100,
    fighter2Odds: Math.round(adjusted2 * 100) / 100,
  };
}

// Check if a bet is valid
export function validateBet(
  amount: number,
  balance: number,
  minBet: number = 10
): { valid: boolean; error?: string } {
  if (amount < minBet) {
    return { valid: false, error: `Minimum bet is ${minBet} $COPE` };
  }

  if (amount > balance) {
    return { valid: false, error: "Insufficient balance" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: "Invalid bet amount" };
  }

  return { valid: true };
}
