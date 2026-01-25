// Arena Types

export interface CharacterStats {
  strength: number; // 1-100
  speed: number; // 1-100
  endurance: number; // 1-100
  technique: number; // 1-100
  mental: number; // 1-100
}

export interface CharacterLore {
  title: string; // e.g., "The Merge Master"
  backstory: string; // 1-2 sentence origin story
  signature: string; // catchphrase or motto
  strengths: string[]; // 2-3 key strengths
  weaknesses: string[]; // 1-2 key weaknesses
  recentForm?: string; // e.g., "Won 4 of last 5"
  rivalries?: Record<string, string>; // characterId -> rivalry description
  funFact?: string; // quirky detail
}

export interface ArenaCharacter {
  id: string;
  name: string;
  ticker: string; // e.g., "$DOGE"
  tagline: string;
  avatar: string; // emoji or icon
  color: string; // hex color for their theme
  stats: CharacterStats;
  ability: {
    name: string;
    description: string;
    triggerStation?: string; // station ID where ability activates
    triggerWhen?: "leading" | "trailing" | "tied";
    triggerWindow?: "early" | "late";
    triggerOnStats?: Array<keyof CharacterStats>;
    triggerVolatile?: boolean;
    effect: "speed_boost" | "endurance_boost" | "mental_boost" | "comeback" | "intimidate";
  };
  weakness: {
    name: string;
    description: string;
    triggerStation?: string;
    triggerWhen?: "leading" | "trailing" | "tied";
    triggerWindow?: "early" | "late";
    triggerOnStats?: Array<keyof CharacterStats>;
    triggerVolatile?: boolean;
    effect: "speed_penalty" | "endurance_penalty" | "mental_penalty" | "choke";
  };
  voiceLine: string; // what they say when selected
  lore: CharacterLore; // NEW: rich backstory and personality
}

export interface Station {
  id: string;
  name: string;
  distance?: string; // e.g., "1km"
  reps?: number; // e.g., 50
  realEquivalent?: string;
  primaryStat: keyof CharacterStats;
  secondaryStat: keyof CharacterStats;
  description: string;
  whyFunny?: string;
  icon: string; // emoji
  commentary?: {
    start: string[];
    p1Leading: string[];
    p2Leading: string[];
    close: string[];
    bonk?: string[];
    clutch?: string[];
  };
}

export type RacePhase =
  | "selection" // picking fighters
  | "betting" // initial bet
  | "fighter1_lore" // NEW: first fighter introduction
  | "fighter2_lore" // NEW: second fighter introduction
  | "matchup_versus" // NEW: epic VS screen
  | "pre_race" // tale of the tape
  | "station_preview" // station walkthrough
  | "countdown" // 3-2-1
  | "racing" // active race
  | "station_intro" // showing next station
  | "round_betting" // per-round betting window
  | "station_racing" // executing station
  | "station_complete" // station results pause
  | "station_transition" // brief standings pause
  | "results"; // showing winner

export interface RaceState {
  phase: RacePhase;
  currentStation: number; // 0-7
  fighters: [ArenaCharacter | null, ArenaCharacter | null];
  fighterProgress: [number, number]; // 0-100 for each fighter
  fighterTimes: [number[], number[]]; // times for each station
  stationResults: StationResult[];
  winner: ArenaCharacter | null;
  commentary: string[];
  roundBettingTimeLeft: number;
}

export interface StationResult {
  stationId: string;
  fighter1Time: number;
  fighter2Time: number;
  winner: 0 | 1 | null; // 0 = fighter1, 1 = fighter2, null = tie
  abilityTriggered?: { fighterId: string; abilityName: string };
  weaknessTriggered?: { fighterId: string; weaknessName: string };
}

export interface Bet {
  id: string;
  type: "overall_winner" | "station_winner";
  stationId?: string; // for station bets
  fighterId: string;
  fighterName: string;
  amount: number;
  odds: number;
  status: "pending" | "won" | "lost" | "cashed_out";
  payout?: number;
}

export interface RaceHistoryEntry {
  id: string;
  timestamp: number;
  fighter1: Pick<ArenaCharacter, "id" | "name" | "ticker" | "avatar">;
  fighter2: Pick<ArenaCharacter, "id" | "name" | "ticker" | "avatar">;
  winner: Pick<ArenaCharacter, "id" | "name" | "ticker" | "avatar">;
  totalBet: number;
  totalPayout: number;
  margin: number; // how close the race was (seconds)
}

export interface ArenaState {
  // Balance
  balance: number;
  startingBalance: number;

  // Current race
  race: RaceState;
  bets: Bet[];

  // History
  raceHistory: RaceHistoryEntry[];
  currentStreak: number;
  bestStreak: number;
  totalRaces: number;
  totalWinnings: number;

  // Actions
  setFighter: (slot: 0 | 1, character: ArenaCharacter | null) => void;
  placeBet: (bet: Omit<Bet, "id" | "status">) => boolean;
  cancelBet: (betId: string) => void;
  cashOutBet: (betId: string, payout: number) => void;
  startRace: () => void;
  advanceStation: () => void;
  setPhase: (phase: RacePhase) => void;
  addCommentary: (line: string) => void;
  recordStationResult: (result: StationResult) => void;
  finishRace: (winner: ArenaCharacter) => void;
  settleBets: () => void;
  resetRace: () => void;
  addBalance: (amount: number) => void;
  setRoundBettingTime: (time: number) => void;
  updateFighterProgress: (progress: [number, number]) => void;
}
