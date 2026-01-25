export const RACE_TIMING = {
  preRace: {
    fighterLore1: 10000,      // NEW: First fighter lore introduction
    fighterLore2: 10000,      // NEW: Second fighter lore introduction
    vsMatchup: 5000,          // NEW: Epic VS screen
    taleOfTape: 8000,         // INCREASED from 5s
    stationPreview: 30000,    // INCREASED from 24s
    countdown: 5000,          // INCREASED from 4s
  },
  station: {
    intro: 5000,              // INCREASED from 3s
    roundBetting: 8000,
    racing: 6000,
    racingPerSecondGap: 200,
    complete: 4000,           // INCREASED from 2.5s
    transition: 3000,         // DOUBLED from 1.5s
  },
  events: {
    surge: 3000,
    bonk: 2500,
    lead: 2500,
  },
  finalStation: {
    intro: 4000,
    racing: 8000,
  },
  animations: {
    viewTransition: 1200,     // TRIPLED from 400ms
    positionUpdate: 500,
    progressBar: 300,
    textFadeIn: 200,
  },
} as const;
