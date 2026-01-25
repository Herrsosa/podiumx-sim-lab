import { Station } from "../types";

export const STATIONS: Station[] = [
  {
    id: "mining-rig",
    name: "MINING RIG",
    distance: "Hash sprint",
    primaryStat: "endurance",
    secondaryStat: "mental",
    description: "Proof of Work requires actual work.",
    whyFunny: "Miners call it work, now they have to sweat for it.",
    icon: "⛏️",
    commentary: {
      start: ["Time to mine some blocks!", "Proof of Work begins!"],
      p1Leading: ["{p1} hashing faster!", "{p1}'s rig is OVERCLOCKED!"],
      p2Leading: ["{p2} found the nonce!", "{p2}'s hash rate is INSANE!"],
      close: ["Both miners neck and neck!", "The difficulty is SPIKING!"]
    }
  },
  {
    id: "pushing-bags",
    name: "PUSHING BAGS",
    distance: "Bag drag",
    primaryStat: "strength",
    secondaryStat: "mental",
    description: "Push those heavy bags you've been holding since the top.",
    whyFunny: "We've all been holding bags.",
    icon: "💰",
    commentary: {
      start: ["Time to push those HEAVY bags!", "We've all been here..."],
      p1Leading: ["{p1} knows this feeling!", "{p1} pushing through the pain!"],
      p2Leading: ["{p2} must have lighter bags!", "{p2} sold the top?!"],
      close: ["Both carrying equal bags!", "These bags are HEAVY!"]
    }
  },
  {
    id: "rug-pull-recovery",
    name: "RUG PULL RECOVERY",
    distance: "Rug recoil",
    primaryStat: "strength",
    secondaryStat: "technique",
    description: "Pull yourself back from getting rugged.",
    whyFunny: "Recovery after getting rugged is the real workout.",
    icon: "🔙",
    commentary: {
      start: ["Recovery mode ACTIVATED!", "Pull back from the rug!"] ,
      p1Leading: ["{p1} has practice recovering!", "{p1}'s been rugged before!"] ,
      p2Leading: ["{p2} never trusted that project anyway!", "{p2} pulling HARD!"] ,
      close: ["Both recovering at same pace!", "Equal rug pull experience!"]
    }
  },
  {
    id: "fomo-jumps",
    name: "FOMO JUMPS",
    distance: "Pump hops",
    primaryStat: "speed",
    secondaryStat: "technique",
    description: "Jump in before you miss the pump.",
    whyFunny: "FOMO buying at any price.",
    icon: "📈",
    commentary: {
      start: ["FOMO IS REAL!", "Don't miss this pump!"] ,
      p1Leading: ["{p1} jumped in EARLY!", "{p1}'s FOMO is PRINTING!"] ,
      p2Leading: ["{p2} aping in!", "{p2} doesn't want to miss it!"] ,
      close: ["Both caught the same entry!", "Identical FOMO energy!"]
    }
  },
  {
    id: "liquidity-rowing",
    name: "LIQUIDITY ROWING",
    distance: "Pool churn",
    primaryStat: "endurance",
    secondaryStat: "technique",
    description: "Provide liquidity to your cardio pool.",
    whyFunny: "Everyone's an LP until it's time to row.",
    icon: "🚣",
    commentary: {
      start: ["Adding liquidity!", "Deep pool energy needed!"] ,
      p1Leading: ["{p1}'s pool is DEEP!", "{p1} serious LP energy!"] ,
      p2Leading: ["{p2} providing that liquidity!", "{p2}'s TVL is massive!"] ,
      close: ["Liquidity pools are matched!", "Equal depth detected!"]
    }
  },
  {
    id: "bag-holding",
    name: "BAG HOLDING",
    distance: "Diamond carry",
    primaryStat: "strength",
    secondaryStat: "mental",
    description: "Diamond hands required.",
    whyFunny: "Holding heavy bags through the bear.",
    icon: "🎒",
    commentary: {
      start: ["These bags won't carry themselves!", "Diamond hands required!"] ,
      p1Leading: ["{p1}'s been holding since 2017!", "{p1} carrying with EASE!"] ,
      p2Leading: ["{p2} has lighter bags!", "{p2} must have DCA'd!"] ,
      close: ["Both veterans of the bear market!", "Equal bag weight!"]
    }
  },
  {
    id: "stablecoin-lunges",
    name: "STABLECOIN LUNGES",
    distance: "Peg steps",
    primaryStat: "technique",
    secondaryStat: "endurance",
    description: "Stay stable... if you can.",
    whyFunny: "We all remember the depegs.",
    icon: "🏃",
    commentary: {
      start: ["Maintain the peg!", "Stability is EVERYTHING!"] ,
      p1Leading: ["{p1} maintaining stability!", "{p1}'s peg is HOLDING!"] ,
      p2Leading: ["{p2} somehow still stable!", "{p2} not depegging!"] ,
      close: ["Both maintaining their peg!", "Algorithmic balance achieved!"] ,
      bonk: ["{name} is DEPEGGING!", "THE PEG IS BROKEN!", "ALGORITHMIC FAILURE!"]
    }
  },
  {
    id: "moon-balls",
    name: "MOON BALLS",
    distance: "Moon shots",
    primaryStat: "strength",
    secondaryStat: "speed",
    description: "Launch those balls TO THE MOON.",
    whyFunny: "To the moon, WAGMI.",
    icon: "🌙",
    commentary: {
      start: ["FINAL STATION! MOON TIME!", "SEND IT TO THE MOON!"] ,
      p1Leading: ["{p1} is MOONING!", "{p1} TO THE MOON!"] ,
      p2Leading: ["{p2} LAUNCHING!", "{p2} found the rocket!"] ,
      close: ["PHOTO FINISH INCOMING!", "WHO WANTS THE MOON MORE?!"] ,
      clutch: ["{name} CLUTCH PERFORMANCE!", "WHEN IT MATTERS MOST!"]
    }
  }
];

// Additional workout stations for variety (future use)
export const BONUS_STATIONS: Station[] = [
  {
    id: "burpees",
    name: "Burpee Broad Jumps",
    reps: 80,
    primaryStat: "endurance",
    secondaryStat: "strength",
    description: "The movement everyone loves to hate",
    icon: "💀",
  },
  {
    id: "wall-balls",
    name: "Wall Balls",
    reps: 100,
    primaryStat: "endurance",
    secondaryStat: "technique",
    description: "Squat, throw, catch, repeat until death",
    icon: "🏀",
  },
  {
    id: "lunges",
    name: "Sandbag Lunges",
    distance: "100m",
    primaryStat: "strength",
    secondaryStat: "endurance",
    description: "One painful step at a time",
    icon: "🦵",
  },
  {
    id: "sled-pull",
    name: "Sled Pull",
    distance: "50m",
    primaryStat: "strength",
    secondaryStat: "technique",
    description: "Dig deep and drag that weight",
    icon: "🪢",
  },
];

export const getStationById = (id: string): Station | undefined => {
  return [...STATIONS, ...BONUS_STATIONS].find((station) => station.id === id);
};

export const getStationIndex = (id: string): number => {
  return STATIONS.findIndex((station) => station.id === id);
};
