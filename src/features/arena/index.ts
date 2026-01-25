// Arena Feature Exports

// Types
export * from "./types";

// Data
export { ARENA_CHARACTERS, getCharacterById, getRandomCharacter } from "./data/characters";
export { STATIONS, BONUS_STATIONS, getStationById, getStationIndex } from "./data/stations";
export { COMMENTARY, getCommentary, CHARACTER_TAUNTS, getCharacterTaunt } from "./data/commentary";

// Store
export { useArenaStore } from "./store/useArenaStore";

// Engine
export {
  calculateEffectiveness,
  checkAbilityTrigger,
  checkWeaknessTrigger,
  calculateStationTime,
  simulateStation,
  simulateFullRace,
  getOverallStrength,
} from "./engine/simulation";

export {
  calculateWinProbability,
  probabilityToOdds,
  calculateOverallOdds,
  calculateStationOdds,
  calculatePayout,
  formatOdds,
  getSuggestedBets,
  calculateLiveOdds,
  validateBet,
} from "./engine/betting";

// Utils
export {
  celebrateVictory,
  celebrateBigWin,
  celebrateBurst,
  celebrateFighter,
  emojiConfetti,
  startConfettiStream,
} from "./utils/confetti";
