import { ArenaCharacter } from "../types";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const ASSET_BASE = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
const portraitPath = (file: string, ext = "png") => `${ASSET_BASE}portraits/${file}.${ext}`;

const PORTRAITS = {
  "vitaleak-butterbean": portraitPath("vitaleak-butterbean"),
  "chungus-zhao": portraitPath("chungus-zhao"),
  "scam-bankman-fraud": portraitPath("scam-bankman-fraud"),
  "michael-staylor": portraitPath("michael-staylor"),
  "arthur-haze": portraitPath("arthur-haze"),
  "do-kwong": portraitPath("do-kwong"),
  "ape-sem": portraitPath("ape-sem"),
  "banana-pal": portraitPath("banana-pal"),
  "gary-guzzler": portraitPath("gary-guzzler"),
  "elongated-muskrat": portraitPath("elongated-muskrat"),
  "cathy-woodchipper": portraitPath("cathy-woodchipper", "svg"),
  "richard-pump": portraitPath("richard-pump", "svg"),
  "degen-mcyolo": portraitPath("degen-mcyolo", "svg"),
  "anonymous-whale": portraitPath("anonymous-whale", "svg"),
  "chad-intern": portraitPath("chad-intern", "svg"),
  "toxic-maxi": portraitPath("toxic-maxi", "svg"),
  "roger-rugged": portraitPath("roger-rugged", "svg"),
  "ned-ngmi": portraitPath("ned-ngmi", "svg"),
  "shilly-mcshillface": portraitPath("shilly-mcshillface", "svg"),
  "harold-hodlington": portraitPath("harold-hodlington", "svg"),
};

export const ARENA_CHARACTERS: ArenaCharacter[] = [
  {
    id: "vitaleak-butterbean",
    name: "Vitaleak Butterbean",
    ticker: "$VITALEAK",
    tagline: "The Merge Master",
    avatar: PORTRAITS["vitaleak-butterbean"],
    color: "#627EEA",
    stats: {
      strength: 35,
      speed: 55,
      endurance: 92,
      technique: 78,
      mental: 88,
    },
    ability: {
      name: "Merge Mode",
      description: "Finds a second wind in the final stations",
      triggerStation: "moon-balls",
      effect: "endurance_boost",
    },
    weakness: {
      name: "Research Spiral",
      description: "Overthinks when the pace gets chaotic",
      triggerStation: "fomo-jumps",
      effect: "mental_penalty",
    },
    voiceLine: "Let the protocol decide the pace.",
    lore: {
      title: "The Merge Master",
      backstory: "Born in the depths of Ethereum's research labs, Vitaleak transformed from skinny coder to endurance machine. His philosophy: slow, steady, unstoppable—just like the blockchain.",
      signature: "Proof of work, proof of sweat.",
      strengths: [
        "Superhuman endurance in final stations",
        "Mental fortress—never rattled by pressure",
        "Consistent pace that grinds opponents down"
      ],
      weaknesses: [
        "Overthinks strategy in chaotic early rounds",
        "Lacks explosive speed for quick bursts"
      ],
      recentForm: "Won 4 of last 5 · Currently #2 ranked",
      rivalries: {
        "chungus-zhao": "The eternal debate: decentralization vs efficiency",
        "scam-bankman-fraud": "Ethics vs opportunism—oil and water"
      },
      funFact: "Trains while reading Ethereum Improvement Proposals"
    }
  },
  {
    id: "chungus-zhao",
    name: "Chungus Zhao",
    ticker: "$CHUNGUS",
    tagline: "Liquidity always wins",
    avatar: PORTRAITS["chungus-zhao"],
    color: "#F0B90B",
    stats: {
      strength: 88,
      speed: 52,
      endurance: 70,
      technique: 48,
      mental: 82,
    },
    ability: {
      name: "BNB Boost",
      description: "Muscles through heavy bag stations",
      triggerStation: "pushing-bags",
      effect: "intimidate",
    },
    weakness: {
      name: "Regulatory Heat",
      description: "Pressure mounts when the crowd turns",
      triggerStation: "stablecoin-lunges",
      effect: "mental_penalty",
    },
    voiceLine: "Funds are SAFU. Legs are not.",
    lore: {
      title: "The Liquidity King",
      backstory: "Built an empire on speed and volume. Chungus dominates through sheer strength and market-making muscle. When he moves, everyone feels it.",
      signature: "Deep liquidity. Deeper reserves.",
      strengths: [
        "Overwhelming strength on bag stations",
        "Intimidates opponents with pure power",
        "Unshakeable confidence under pressure"
      ],
      weaknesses: [
        "Technique suffers—brute force over finesse",
        "Vulnerable when regulatory pressure mounts"
      ],
      recentForm: "Won 7 of last 10 · Dominant in strength events",
      rivalries: {
        "vitaleak-butterbean": "Centralized power vs decentralized ideals",
        "gary-guzzler": "The regulator's favorite target"
      },
      funFact: "Can push a sled with three people on it"
    }
  },
  {
    id: "scam-bankman-fraud",
    name: "Scam Bankman-Fraud",
    ticker: "$SCAM",
    tagline: "All-in, all the time",
    avatar: PORTRAITS["scam-bankman-fraud"],
    color: "#00D4AA",
    stats: {
      strength: 48,
      speed: 78,
      endurance: 42,
      technique: 58,
      mental: 30,
    },
    ability: {
      name: "Leverage Lunge",
      description: "Explodes early with risky pace",
      triggerStation: "fomo-jumps",
      effect: "speed_boost",
    },
    weakness: {
      name: "Liquidity Crisis",
      description: "Gasses out when stability wobbles",
      triggerStation: "stablecoin-lunges",
      effect: "choke",
    },
    voiceLine: "Everything is fine... totally fine.",
    lore: {
      title: "The Overleveraged Gambler",
      backstory: "Rose meteorically on borrowed money and borrowed time. Explosive speed, zero risk management. He'll either win spectacularly or implode catastrophically.",
      signature: "Risk? What risk?",
      strengths: [
        "Lightning-fast early bursts",
        "Thrives on chaos and FOMO energy",
        "Unpredictable—can catch opponents off guard"
      ],
      weaknesses: [
        "Zero endurance—burns out hard late-race",
        "Chokes when things get stable or technical",
        "Mental game collapses under scrutiny"
      ],
      recentForm: "3-7 record · High variance performer",
      rivalries: {
        "vitaleak-butterbean": "Recklessness vs responsibility",
        "gary-guzzler": "Currently under investigation"
      },
      funFact: "Once tried to complete HYROX on 4 hours of sleep"
    }
  },
  {
    id: "michael-staylor",
    name: "Michael Staylor",
    ticker: "$STAYLOR",
    tagline: "Bitcoin or bust",
    avatar: PORTRAITS["michael-staylor"],
    color: "#FF9500",
    stats: {
      strength: 86,
      speed: 46,
      endurance: 74,
      technique: 52,
      mental: 94,
    },
    ability: {
      name: "Laser Focus",
      description: "Refuses to slow down under pressure",
      triggerStation: "bag-holding",
      effect: "mental_boost",
    },
    weakness: {
      name: "Maxi Stubbornness",
      description: "Struggles to pivot when pace changes",
      triggerStation: "fomo-jumps",
      effect: "speed_penalty",
    },
    voiceLine: "I am once again asking for your endurance.",
    lore: {
      title: "The Bitcoin Maximalist",
      backstory: "Leveraged everything—his company, his reputation, his body—on one bet: Bitcoin. Now he grinds with religious conviction. No shortcuts. No distractions. Only Bitcoin.",
      signature: "Orange coin or nothing.",
      strengths: [
        "Unbreakable mental fortitude",
        "Massive strength for heavy lifts",
        "Never quits, never pivots, never doubts"
      ],
      weaknesses: [
        "Too stubborn to adapt when pace shifts",
        "Slow footwork on speed-based stations"
      ],
      recentForm: "Won 6 of last 8 · Unshakeable consistency",
      rivalries: {
        "do-kwong": "Sound money vs algorithmic experiments",
        "arthur-haze": "Bitcoin vs altcoin degeneracy"
      },
      funFact: "Wears orange socks to every race"
    }
  },
  {
    id: "arthur-haze",
    name: "Arthur Haze",
    ticker: "$HAZE",
    tagline: "Perp king energy",
    avatar: PORTRAITS["arthur-haze"],
    color: "#FF0066",
    stats: {
      strength: 62,
      speed: 82,
      endurance: 68,
      technique: 80,
      mental: 70,
    },
    ability: {
      name: "Perp Swagger",
      description: "Stays cool when everyone else panics",
      triggerStation: "liquidity-rowing",
      effect: "speed_boost",
    },
    weakness: {
      name: "Funding Rate",
      description: "Momentum dips when leverage bites",
      triggerStation: "pushing-bags",
      effect: "endurance_penalty",
    },
    voiceLine: "I've seen worse markets than this.",
    lore: {
      title: "The Perpetual Trader",
      backstory: "Built a derivatives empire while the world slept. Arthur thrives in volatility—fast, technical, ice-cold under pressure. He bets on chaos and usually wins.",
      signature: "Long volatility. Short sleep.",
      strengths: [
        "Elite speed and technical execution",
        "Thrives in high-pressure moments",
        "Stays calm when others panic"
      ],
      weaknesses: [
        "Endurance fades when grinding heavy loads",
        "Overextends on leverage—bleeds momentum late"
      ],
      recentForm: "Won 5 of last 7 · King of close finishes",
      rivalries: {
        "michael-staylor": "Derivatives vs spot—sophistication vs simplicity",
        "chungus-zhao": "Offshore swagger vs centralized power"
      },
      funFact: "Trades during warm-ups between stations"
    }
  },
  {
    id: "do-kwong",
    name: "Do Kwong",
    ticker: "$LUNA",
    tagline: "The peg is fine",
    avatar: PORTRAITS["do-kwong"],
    color: "#5493F7",
    stats: {
      strength: 50,
      speed: 68,
      endurance: 60,
      technique: 66,
      mental: 35,
    },
    ability: {
      name: "Luna Hype",
      description: "Finds a burst when the crowd believes",
      triggerStation: "mining-rig",
      effect: "comeback",
    },
    weakness: {
      name: "Depeg Panic",
      description: "Confidence collapses when stability slips",
      triggerStation: "stablecoin-lunges",
      effect: "choke",
    },
    voiceLine: "Trust me, the peg holds.",
    lore: {
      title: "The Fallen Algorithmist",
      backstory: "Promised the world an algorithmic miracle. When it worked, he was unstoppable. When it broke, so did he. Now he races to rebuild his reputation—one station at a time.",
      signature: "The peg holds... until it doesn't.",
      strengths: [
        "Explosive comebacks when crowd energy builds",
        "Balanced speed and technique",
        "Capable of brilliant execution under belief"
      ],
      weaknesses: [
        "Confidence shatters when things destabilize",
        "Mental game is fragile—one mistake spirals",
        "Chokes hard on stability-focused stations"
      ],
      recentForm: "2-8 record · Trying to find redemption",
      rivalries: {
        "vitaleak-butterbean": "Algorithmic shortcuts vs hard-coded principles",
        "scam-bankman-fraud": "Two sides of the same cautionary tale"
      },
      funFact: "Deleted all social media after the last race"
    }
  },
  {
    id: "ape-sem",
    name: "Ape-sem",
    ticker: "$APE",
    tagline: "Send it. No hesitation.",
    avatar: PORTRAITS["ape-sem"],
    color: "#9945FF",
    stats: {
      strength: 58,
      speed: 90,
      endurance: 62,
      technique: 54,
      mental: 64,
    },
    ability: {
      name: "Ape In",
      description: "Rocket fuel for explosive bursts",
      triggerStation: "fomo-jumps",
      effect: "speed_boost",
    },
    weakness: {
      name: "Overlevered",
      description: "Runs hot and fades late",
      triggerStation: "bag-holding",
      effect: "endurance_penalty",
    },
    voiceLine: "We are so back. We're so back.",
    lore: {
      title: "The Degen Sprinter",
      backstory: "No strategy. No planning. Just pure, unfiltered YOLO energy. Ape-sem explodes out of the gate and hopes momentum carries him home. Sometimes it does.",
      signature: "Send first, think never.",
      strengths: [
        "Fastest first-station burst in the league",
        "Feeds off FOMO energy and crowd hype",
        "Fearless execution—no second-guessing"
      ],
      weaknesses: [
        "Burns out hard in late stations",
        "Overextends early, pays for it later",
        "Lacks discipline for technical work"
      ],
      recentForm: "4-6 record · All wins by early knockout",
      rivalries: {
        "banana-pal": "Impulsive chaos vs calculated patience",
        "harold-hodlington": "Short-term hype vs long-term vision"
      },
      funFact: "Has never finished a cool-down stretch"
    }
  },
  {
    id: "banana-pal",
    name: "Banana Pal",
    ticker: "$BANANA",
    tagline: "Macro zen, banana in hand",
    avatar: PORTRAITS["banana-pal"],
    color: "#FFD700",
    stats: {
      strength: 54,
      speed: 58,
      endurance: 76,
      technique: 72,
      mental: 88,
    },
    ability: {
      name: "Macro Zen",
      description: "Stays calm when the pace turns chaotic",
      triggerStation: "rug-pull-recovery",
      effect: "mental_boost",
    },
    weakness: {
      name: "Vacation Mode",
      description: "Coasts when urgency spikes",
      triggerStation: "fomo-jumps",
      effect: "speed_penalty",
    },
    voiceLine: "Zoom out. Breathe. Hold the line.",
    lore: {
      title: "The Macro Monk",
      backstory: "Traded from a beach in Southeast Asia, always calm, always patient. Banana believes in the long game—steady accumulation, zen mindset, potassium-fueled endurance.",
      signature: "Zoom out. The trend is your friend.",
      strengths: [
        "Unshakeable mental game in chaos",
        "Strong endurance and technical execution",
        "Thrives when others panic"
      ],
      weaknesses: [
        "Too relaxed—lacks urgency in sprint stations",
        "Struggles to match explosive early pace"
      ],
      recentForm: "Won 6 of last 9 · Consistent top-3 finishes",
      rivalries: {
        "ape-sem": "Patience vs impulsiveness",
        "scam-bankman-fraud": "Long-term thinking vs short-term gambling"
      },
      funFact: "Eats exactly one banana before every race"
    }
  },
  {
    id: "gary-guzzler",
    name: "Gary Guzzler",
    ticker: "$SEC",
    tagline: "Compliance above all",
    avatar: PORTRAITS["gary-guzzler"],
    color: "#CC0000",
    stats: {
      strength: 66,
      speed: 40,
      endurance: 70,
      technique: 60,
      mental: 92,
    },
    ability: {
      name: "Regulator Grip",
      description: "Locks in when the crowd gets loud",
      triggerStation: "pushing-bags",
      effect: "intimidate",
    },
    weakness: {
      name: "Paperwork",
      description: "Slow footwork when pace speeds up",
      triggerStation: "fomo-jumps",
      effect: "speed_penalty",
    },
    voiceLine: "Your license to compete has expired.",
    lore: {
      title: "The Enforcer",
      backstory: "Gary doesn't race for glory—he races to prove a point. Methodical, unrelenting, and humorless. He grinds opponents down through sheer bureaucratic persistence.",
      signature: "Rules are rules. No exceptions.",
      strengths: [
        "Intimidating presence—mental warfare specialist",
        "Solid strength and endurance for grinding",
        "Never rattled, never rushes"
      ],
      weaknesses: [
        "Painfully slow on speed-based stations",
        "Overthinks technique—paralysis by analysis"
      ],
      recentForm: "Won 5 of last 8 · Grinds out ugly victories",
      rivalries: {
        "chungus-zhao": "The case that never closes",
        "scam-bankman-fraud": "Exhibit A in ongoing investigation",
        "elongated-muskrat": "Constantly filing complaints"
      },
      funFact: "Brings a rulebook to every race briefing"
    }
  },
  {
    id: "elongated-muskrat",
    name: "Elongated Muskrat",
    ticker: "$MUSK",
    tagline: "One tweet away from chaos",
    avatar: PORTRAITS["elongated-muskrat"],
    color: "#1DA1F2",
    stats: {
      strength: 60,
      speed: 86,
      endurance: 64,
      technique: 58,
      mental: 68,
    },
    ability: {
      name: "Chaos Tweet",
      description: "Injects wild momentum swings",
      triggerStation: "moon-balls",
      effect: "comeback",
    },
    weakness: {
      name: "Distraction Loop",
      description: "Loses focus chasing the next headline",
      triggerStation: "liquidity-rowing",
      effect: "mental_penalty",
    },
    voiceLine: "Posting through the pain.",
    lore: {
      title: "The Chaos Engineer",
      backstory: "Builds rockets, runs companies, races HYROX—all while posting memes. Elongated thrives in unpredictability. One minute he's winning, the next he's distracted by his phone.",
      signature: "Move fast and break things. Literally.",
      strengths: [
        "Elite speed and explosive comebacks",
        "Momentum swings can demoralize opponents",
        "Unpredictable—keeps everyone guessing"
      ],
      weaknesses: [
        "Attention span of a goldfish on caffeine",
        "Gets distracted mid-race by new ideas",
        "Mental focus wavers during grinds"
      ],
      recentForm: "Won 5 of last 10 · Wildly inconsistent",
      rivalries: {
        "gary-guzzler": "Innovation vs regulation—eternal conflict",
        "michael-staylor": "Dogecoin vs Bitcoin—the eternal war"
      },
      funFact: "Posts race updates mid-workout"
    }
  },
  {
    id: "cathy-woodchipper",
    name: "Cathy Woodchipper",
    ticker: "$CATHY",
    tagline: "Innovation wins in the long run",
    avatar: PORTRAITS["cathy-woodchipper"],
    color: "#00D4FF",
    stats: {
      strength: 45,
      speed: 52,
      endurance: 88,
      technique: 70,
      mental: 95,
    },
    ability: {
      name: "5-Year Horizon",
      description: "Ignores short-term setbacks when trailing",
      triggerWhen: "trailing",
      effect: "comeback",
    },
    weakness: {
      name: "Mean Reversion",
      description: "Overconcentration backfires in volatile stations",
      triggerVolatile: true,
      effect: "mental_penalty",
    },
    voiceLine: "This is just noise. My models show the path.",
    lore: {
      title: "The Innovation Evangelist",
      backstory: "Cathy sees the future before anyone else—and bets everything on it. Methodical, research-driven, unshakeable belief in her models. Short-term losses don't matter when you're playing the long game.",
      signature: "Innovation compounds. Patience wins.",
      strengths: [
        "Elite endurance and mental game",
        "Incredible comeback ability when trailing",
        "Ignores noise—stays locked on strategy"
      ],
      weaknesses: [
        "Weak in explosive strength stations",
        "Overcommits to one approach—vulnerable to volatility"
      ],
      recentForm: "Won 4 of last 7 · Strong in endurance events",
      rivalries: {
        "toxic-maxi": "Innovation vs tradition",
        "banana-pal": "Active conviction vs passive patience"
      },
      funFact: "Brings a spreadsheet to the starting line"
    }
  },
  {
    id: "richard-pump",
    name: "Richard Pump",
    ticker: "$PUMP",
    tagline: "Sacrifice for gains",
    avatar: PORTRAITS["richard-pump"],
    color: "#9945FF",
    stats: {
      strength: 82,
      speed: 75,
      endurance: 40,
      technique: 35,
      mental: 70,
    },
    ability: {
      name: "Sacrifice Phase",
      description: "Explosive early performance",
      triggerWindow: "early",
      effect: "speed_boost",
    },
    weakness: {
      name: "Deflation Event",
      description: "Momentum collapses in later stations",
      triggerWindow: "late",
      effect: "endurance_penalty",
    },
    voiceLine: "The gains are coming. Sacrifice now.",
    lore: {
      title: "The Cult Leader",
      backstory: "Promises massive returns to his followers—just sacrifice now, gains come later. Richard explodes early with fanatical intensity, but the promises rarely hold up in the final stations.",
      signature: "Sacrifice everything. Pump incoming.",
      strengths: [
        "Devastating early strength and speed",
        "Intimidating presence and conviction",
        "Explosive first 3 stations"
      ],
      weaknesses: [
        "Zero endurance—collapses late-race",
        "Poor technique—relies on brute force",
        "Deflates hard when hype fades"
      ],
      recentForm: "3-7 record · All wins by early knockout",
      rivalries: {
        "harold-hodlington": "Get-rich-quick vs hold forever",
        "do-kwong": "Competing cults with similar trajectories"
      },
      funFact: "Wears all-black everything to intimidate opponents"
    }
  },
  {
    id: "degen-mcyolo",
    name: "Degen McYolo",
    ticker: "$DEGEN",
    tagline: "Sir, this is a casino",
    avatar: PORTRAITS["degen-mcyolo"],
    color: "#FF6B00",
    stats: {
      strength: 60,
      speed: 90,
      endurance: 45,
      technique: 25,
      mental: 55,
    },
    ability: {
      name: "Full Send",
      description: "Throws caution to the wind",
      effect: "speed_boost",
    },
    weakness: {
      name: "Rekt",
      description: "Overleveraged and liquidated when leading",
      triggerWhen: "leading",
      effect: "choke",
    },
    voiceLine: "YOLO. No risk management.",
    lore: {
      title: "The Pure Gambler",
      backstory: "Lives for the rush. No plans, no backup, no regrets. Degen treats every race like a roulette spin—max bet, max speed, max chaos. He either wins big or flames out spectacularly.",
      signature: "Risk management? Never heard of her.",
      strengths: [
        "Fastest raw speed in the league",
        "Fearless—takes risks others won't",
        "Electrifying when momentum builds"
      ],
      weaknesses: [
        "Chokes when leading—can't handle pressure",
        "Zero technique or strategy",
        "Burns out from overextension"
      ],
      recentForm: "2-8 record · Entertaining, rarely winning",
      rivalries: {
        "banana-pal": "Pure chaos vs calculated calm",
        "cathy-woodchipper": "Gambling vs research"
      },
      funFact: "Once bet his entry fee on a coin flip"
    }
  },
  {
    id: "anonymous-whale",
    name: "Anonymous Whale",
    ticker: "$WHALE",
    tagline: "Moving markets since 2013",
    avatar: PORTRAITS["anonymous-whale"],
    color: "#1E3A5F",
    stats: {
      strength: 95,
      speed: 35,
      endurance: 85,
      technique: 65,
      mental: 90,
    },
    ability: {
      name: "Market Move",
      description: "Overwhelming force on strength stations",
      triggerOnStats: ["strength"],
      effect: "intimidate",
    },
    weakness: {
      name: "Slippage",
      description: "Too big to move fast on speed stations",
      triggerOnStats: ["speed"],
      effect: "speed_penalty",
    },
    voiceLine: "Walls? I am the wall.",
    lore: {
      title: "The Silent Giant",
      backstory: "Nobody knows who they are. Nobody knows where the money came from. They just show up, dominate strength events, and disappear. The Whale doesn't speak—they just move markets.",
      signature: "Silent. Heavy. Inevitable.",
      strengths: [
        "Strongest competitor in the league by far",
        "Elite endurance and mental fortitude",
        "Intimidates opponents before the race begins"
      ],
      weaknesses: [
        "Slowest speed—can't keep up in sprints",
        "Size becomes a liability on agility stations"
      ],
      recentForm: "Won 8 of last 10 · Dominates heavy stations",
      rivalries: {
        "chungus-zhao": "Old money vs new money",
        "ape-sem": "Patient accumulation vs impulsive gambling"
      },
      funFact: "Wears a mask. Identity still unknown."
    }
  },
  {
    id: "chad-intern",
    name: "Chad Intern",
    ticker: "$INTERN",
    tagline: "I was told there would be lambos",
    avatar: PORTRAITS["chad-intern"],
    color: "#4ADE80",
    stats: {
      strength: 50,
      speed: 85,
      endurance: 70,
      technique: 40,
      mental: 35,
    },
    ability: {
      name: "Coffee Rush",
      description: "Caffeine-fueled burst",
      effect: "speed_boost",
    },
    weakness: {
      name: "First Bear Market",
      description: "Panics when trailing",
      triggerWhen: "trailing",
      effect: "mental_penalty",
    },
    voiceLine: "I've had seven espressos today.",
    lore: {
      title: "The Wide-Eyed Newcomer",
      backstory: "Fresh out of college, deep in student debt, Chad thought crypto would be his ticket to wealth. Instead, he's grinding HYROX for prize money. Energetic, naive, overcaffeinated—and surprisingly fast.",
      signature: "Wen lambo? Wen break-even?",
      strengths: [
        "Elite speed fueled by youth and caffeine",
        "Solid endurance—hasn't learned limits yet",
        "Fearless from inexperience"
      ],
      weaknesses: [
        "Fragile mental game—first setback breaks him",
        "Poor technique—hasn't learned proper form",
        "Panics hard when trailing"
      ],
      recentForm: "3-7 record · Learning on the job",
      rivalries: {
        "harold-hodlington": "New money vs old guard",
        "toxic-maxi": "Naive optimism vs hardened cynicism"
      },
      funFact: "Still believes his NFTs will pump"
    }
  },
  {
    id: "toxic-maxi",
    name: "Toxic Maximalist",
    ticker: "$MAXI",
    tagline: "Have fun staying poor",
    avatar: PORTRAITS["toxic-maxi"],
    color: "#F7931A",
    stats: {
      strength: 75,
      speed: 40,
      endurance: 92,
      technique: 55,
      mental: 99,
    },
    ability: {
      name: "Number Go Up",
      description: "Pure conviction energy",
      triggerOnStats: ["endurance"],
      effect: "endurance_boost",
    },
    weakness: {
      name: "Tunnel Vision",
      description: "Can't adapt to technical stations",
      triggerOnStats: ["technique"],
      effect: "mental_penalty",
    },
    voiceLine: "1 BTC = 1 BTC. Keep up.",
    lore: {
      title: "The Unyielding Zealot",
      backstory: "Orange coin only. No altcoins, no compromises, no excuses. The Maxi grinds with religious conviction—every rep a prayer, every station a sermon. He doesn't win gracefully.",
      signature: "HFSP. Stack sats. Stay humble.",
      strengths: [
        "Elite endurance—will never quit",
        "Unbreakable mental game",
        "Conviction creates intimidating presence"
      ],
      weaknesses: [
        "Slow speed—refuses to adapt pace",
        "Poor technique adaptability",
        "Tunnel vision hurts versatility"
      ],
      recentForm: "Won 6 of last 9 · Grind-out victories",
      rivalries: {
        "elongated-muskrat": "Bitcoin vs dogecoin—the eternal war",
        "cathy-woodchipper": "Tradition vs innovation",
        "do-kwong": "Sound money vs algorithmic experiments"
      },
      funFact: "Quotes Satoshi mid-race"
    }
  },
  {
    id: "roger-rugged",
    name: "Roger Rugged",
    ticker: "$RUGGED",
    tagline: "The team was doxxed, they said",
    avatar: PORTRAITS["roger-rugged"],
    color: "#8B0000",
    stats: {
      strength: 55,
      speed: 65,
      endurance: 60,
      technique: 80,
      mental: 45,
    },
    ability: {
      name: "Due Diligence",
      description: "Never getting fooled again",
      triggerOnStats: ["technique"],
      effect: "mental_boost",
    },
    weakness: {
      name: "PTSD Trigger",
      description: "Flashbacks when things go wrong",
      triggerWhen: "trailing",
      effect: "choke",
    },
    voiceLine: "I read the contract this time.",
    lore: {
      title: "The Scarred Survivor",
      backstory: "Got rugged three times in six months. Lost everything. Now Roger obsesses over technique and preparation—trust no one, verify everything. But trauma runs deep.",
      signature: "Check the contract. Check it twice.",
      strengths: [
        "Elite technique—every movement calculated",
        "Paranoid preparation means no surprises",
        "Performs well on technical stations"
      ],
      weaknesses: [
        "Fragile mental game—one setback spirals",
        "Chokes hard when trailing",
        "Flashbacks to past failures destroy focus"
      ],
      recentForm: "4-6 record · Technical brilliance, mental struggles",
      rivalries: {
        "scam-bankman-fraud": "The one who got away",
        "shilly-mcshillface": "Rugged by paid promotions"
      },
      funFact: "Carries a printed smart contract audit to races"
    }
  },
  {
    id: "ned-ngmi",
    name: "Ned NGMI",
    ticker: "$NGMI",
    tagline: "We're all gonna die anyway",
    avatar: PORTRAITS["ned-ngmi"],
    color: "#4A4A4A",
    stats: {
      strength: 45,
      speed: 50,
      endurance: 75,
      technique: 60,
      mental: 30,
    },
    ability: {
      name: "Reverse Psychology",
      description: "Expected failure, surprised by success",
      triggerWhen: "trailing",
      effect: "comeback",
    },
    weakness: {
      name: "Self-Fulfilling Prophecy",
      description: "Can't handle being ahead",
      triggerWhen: "leading",
      effect: "mental_penalty",
    },
    voiceLine: "NGMI, but here we are.",
    lore: {
      title: "The Pessimist Prophet",
      backstory: "Ned expects to lose. Always has. But when expectations are zero, upside is everywhere. He grinds through races with nihilistic endurance—surprised when things go right, validated when they don't.",
      signature: "NGMI. But I'll show up anyway.",
      strengths: [
        "Solid endurance—used to suffering",
        "Comeback ability when already losing",
        "No pressure when you expect nothing"
      ],
      weaknesses: [
        "Sabotages himself when leading",
        "Terrible mental game overall",
        "Can't handle success—literally"
      ],
      recentForm: "2-8 record · Somehow still here",
      rivalries: {
        "toxic-maxi": "Nihilism vs fanaticism",
        "cathy-woodchipper": "Pessimism vs optimism"
      },
      funFact: "Pre-writes his post-race apology tweets"
    }
  },
  {
    id: "shilly-mcshillface",
    name: "Shilly McShillface",
    ticker: "$SHILL",
    tagline: "This is not financial advice (it is)",
    avatar: PORTRAITS["shilly-mcshillface"],
    color: "#FFD700",
    stats: {
      strength: 55,
      speed: 80,
      endurance: 50,
      technique: 45,
      mental: 65,
    },
    ability: {
      name: "Paid Promotion",
      description: "Hype energy boost",
      effect: "speed_boost",
    },
    weakness: {
      name: "Exit Liquidity",
      description: "Dumps when leading",
      triggerWhen: "leading",
      effect: "speed_penalty",
    },
    voiceLine: "This is literally going 100x.",
    lore: {
      title: "The Influencer Grifter",
      backstory: "Everything Shilly does is sponsored—his workouts, his supplements, his racing shoes. Fast out of the gate on hype energy, but he's always looking for the exit. Wins early, disappears when it matters.",
      signature: "Not financial advice. But trust me bro.",
      strengths: [
        "Elite speed on hype and promotion energy",
        "Charismatic presence draws crowd support",
        "Strong early-race performance"
      ],
      weaknesses: [
        "Dumps momentum when leading—looking for exit",
        "Poor endurance—hype fades fast",
        "Technique suffers from lack of fundamentals"
      ],
      recentForm: "3-7 record · Promotes wins, hides losses",
      rivalries: {
        "roger-rugged": "Predator vs victim",
        "banana-pal": "Hype vs substance"
      },
      funFact: "Has 12 active sponsorship deals"
    }
  },
  {
    id: "harold-hodlington",
    name: "Harold Hodlington",
    ticker: "$HODL",
    tagline: "I've been holding since $200",
    avatar: PORTRAITS["harold-hodlington"],
    color: "#00D4FF",
    stats: {
      strength: 70,
      speed: 35,
      endurance: 99,
      technique: 50,
      mental: 98,
    },
    ability: {
      name: "Diamond Hands",
      description: "Cannot be shaken out when behind",
      triggerWhen: "trailing",
      effect: "comeback",
    },
    weakness: {
      name: "Complacency",
      description: "Too relaxed on speed stations",
      triggerOnStats: ["speed"],
      effect: "speed_penalty",
    },
    voiceLine: "I held through Mt. Gox. You can too.",
    lore: {
      title: "The OG Hodler",
      backstory: "Bought Bitcoin at $200. Held through Mt. Gox, held through the 2018 crash, held through everything. Harold doesn't panic, doesn't sell, doesn't quit. Time is his weapon.",
      signature: "HODL. Time in the race beats timing the race.",
      strengths: [
        "Maximum endurance—literally cannot quit",
        "Unbreakable mental fortitude",
        "Elite comeback ability when trailing"
      ],
      weaknesses: [
        "Slowest speed—refuses to rush",
        "Too complacent when things are going well",
        "Poor technique from old-school grinding"
      ],
      recentForm: "Won 7 of last 10 · Grinds out every finish",
      rivalries: {
        "richard-pump": "Long-term vs get-rich-quick",
        "ape-sem": "Patience vs impulsiveness",
        "degen-mcyolo": "Diamond hands vs paper hands"
      },
      funFact: "Never checks the price. Never sells."
    }
  },
];
