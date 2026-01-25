// Commentary lines for race simulation

export type CommentaryType =
  | "race_start"
  | "station_intro"
  | "station_lead"
  | "station_close"
  | "station_win"
  | "ability_trigger"
  | "weakness_trigger"
  | "comeback"
  | "blowout"
  | "final_station"
  | "race_finish"
  | "dramatic";

interface CommentaryLine {
  type: CommentaryType;
  templates: string[]; // Use {fighter1}, {fighter2}, {leader}, {trailer}, {station} as placeholders
}

export const COMMENTARY: CommentaryLine[] = [
  // Race start
  {
    type: "race_start",
    templates: [
      "AND WE'RE LIVE! {fighter1} vs {fighter2} - the pool is DEEP.",
      "WAGMI or NGMI? {fighter1} and {fighter2} are about to find out.",
      "The crowd is feral. {fighter1} takes on {fighter2}!",
      "Two legends enter. One leaves with the $COPE.",
      "The arena erupts as {fighter1} and {fighter2} hit the line.",
    ],
  },

  // Station introductions
  {
    type: "station_intro",
    templates: [
      "{station} is live! This is where portfolios - and legs - break.",
      "Next up: {station}. Time to sweat like a degen at ATH.",
      "{station} incoming - who's built different today?",
      "{station} time. No place to hide, only reps.",
      "{station} is a pressure test. The crowd wants chaos.",
    ],
  },

  // Close race
  {
    type: "station_close",
    templates: [
      "NECK AND NECK through {station}!",
      "This is too close to call - both are emptying the tank.",
      "No separation at {station}. Pure tension.",
      "You couldn't fit a Satoshi between these two.",
      "The crowd is holding its breath right now.",
    ],
  },

  // Leading
  {
    type: "station_lead",
    templates: [
      "{leader} is pulling away! {trailer} needs a response.",
      "{leader} is cooking right now. This is dominance.",
      "{leader} makes a statement at {station}!",
      "{trailer} is fading - can they claw it back?",
      "The market is leaning toward {leader} after {station}.",
      "{leader} SURGES AHEAD! {trailer} is in trouble!",
      "{leader} just flipped the pace. Crowd is losing it.",
    ],
  },

  // Station win
  {
    type: "station_win",
    templates: [
      "{leader} takes {station}! Momentum swings.",
      "That's {station} to {leader}. The odds move.",
      "Advantage {leader} after {station}.",
      "{leader} claims {station} and the crowd reacts.",
      "{leader} WINS {station}! Absolute statement.",
    ],
  },

  // Ability trigger
  {
    type: "ability_trigger",
    templates: [
      "⚡ {fighter1}'s {ability} activates! The arena pops off!",
      "WHAT IS HAPPENING?! {fighter1} just hit {ability}!",
      "{ability} online! {fighter1} is transcending.",
      "Legendary timing - {fighter1} triggers {ability}!",
      "THE CROWD ROARS! {fighter1} unleashes {ability}!",
    ],
  },

  // Weakness trigger
  {
    type: "weakness_trigger",
    templates: [
      "😰 Uh oh... {fighter1} is showing {weakness}!",
      "This could be bad - {weakness} hits {fighter1}.",
      "{fighter1} is wobbling! {weakness} is real.",
      "The wheels are coming off. {weakness} strikes {fighter1}!",
      "DISASTER! {fighter1} gets hit with {weakness}!",
    ],
  },

  // Comeback
  {
    type: "comeback",
    templates: [
      "WAIT! {trailer} is mounting a comeback!",
      "Don't count out {trailer}. They're clawing back!",
      "{trailer} refuses to go quietly.",
      "Momentum is shifting. {trailer} smells blood!",
      "{trailer} won't stay down. This is a fight.",
    ],
  },

  // Blowout
  {
    type: "blowout",
    templates: [
      "{leader} is dominating right now.",
      "This is getting ugly for {trailer}.",
      "{leader} is in a league of their own today.",
      "Absolute control from {leader}.",
    ],
  },

  // Final station
  {
    type: "final_station",
    templates: [
      "🏁 FINAL STATION! Everything comes down to this.",
      "This is it - last push. WHO WANTS IT MORE?",
      "Last chance for glory. Empty the tanks.",
      "FINAL STATION! The crowd is losing it.",
    ],
  },

  // Race finish
  {
    type: "race_finish",
    templates: [
      "🏆 {leader} wins! What a battle.",
      "IT'S OVER! {leader} takes the victory.",
      "HISTORY MADE! {leader} is triumphant.",
      "{leader} crosses the line - champion.",
      "THE CROWD ERUPTS! {leader} is your winner.",
    ],
  },

  // Dramatic moments
  {
    type: "dramatic",
    templates: [
      "The energy in this arena is electric.",
      "This is peak crypto athletics.",
      "The $COPE is flowing in the stands.",
      "Odds are moving fast - bettors are panicking.",
      "Nobody is sitting down right now.",
    ],
  },
];

const ABILITY_CALLOUTS: Record<string, string[]> = {
  "Merge Mode": [
    "⚡ {fighter} hits MERGE MODE. Efficiency unlocked.",
    "⚡ {fighter} just went proof-of-stake on the pace.",
  ],
  "BNB Boost": [
    "💪 {fighter} flexes BNB BOOST. Heavy bags, light work.",
    "💪 {fighter} taps the reserves and powers through.",
  ],
  "Leverage Lunge": [
    "📈 {fighter} goes full LEVERAGE LUNGE. High risk, high speed.",
    "📈 {fighter} 50x'd the cadence. Someone check the margin.",
  ],
  "Laser Focus": [
    "🔥 {fighter} locks in LASER FOCUS. No exit liquidity today.",
    "🔥 {fighter} sees only the finish line. Laser eyes engaged.",
  ],
  "Perp Swagger": [
    "💎 {fighter} flashes PERP SWAGGER. Funding is paying in sweat.",
    "💎 {fighter} thrives in volatility. Swagger at max.",
  ],
  "Luna Hype": [
    "🌕 {fighter} rides LUNA HYPE. The crowd believes again.",
    "🌕 {fighter} is running on vibes and bullish candles.",
  ],
  "Ape In": [
    "🦍 {fighter} APES IN. No plan, just momentum.",
    "🦍 {fighter} sends it. Degens do not brake.",
  ],
  "Macro Zen": [
    "🧘 {fighter} enters MACRO ZEN. Calm is a weapon.",
    "🧘 {fighter} zooms out and breathes through the pain.",
  ],
  "Regulator Grip": [
    "🚨 {fighter} clamps down with REGULATOR GRIP.",
    "🚨 {fighter} brings the paperwork and the pace.",
  ],
  "Chaos Tweet": [
    "📱 {fighter} drops a CHAOS TWEET. Markets (and legs) whiplash.",
    "📱 {fighter} tweets mid-rep. The arena trembles.",
  ],
  "5-Year Horizon": [
    "🔮 {fighter} activates the 5-YEAR HORIZON. Short-term is noise.",
    "🔮 {fighter} sees the decade. Pace stays bullish.",
  ],
  "Sacrifice Phase": [
    "💪 {fighter} hits the SACRIFICE PHASE. Early power spike.",
    "💪 {fighter} front-runs the field. Pure hype fuel.",
  ],
  "Full Send": [
    "🎰 {fighter} goes FULL SEND. No brakes, just volatility.",
    "🎰 {fighter} YOLOs the rep count. Risk on!",
  ],
  "Market Move": [
    "🐋 {fighter} makes a MARKET MOVE. The lane shakes.",
    "🐋 {fighter} throws size at the station. Absolute unit.",
  ],
  "Coffee Rush": [
    "☕ {fighter} is on a COFFEE RUSH. Caffeine spikes the pace.",
    "☕ {fighter} is wired and flying.",
  ],
  "Number Go Up": [
    "🟠 {fighter} channels NUMBER GO UP energy. Conviction wins.",
    "🟠 {fighter} stacks reps like sats.",
  ],
  "Due Diligence": [
    "🔍 {fighter} runs DUE DILIGENCE mid-station. Clean execution.",
    "🔍 {fighter} checked the contracts. No traps today.",
  ],
  "Reverse Psychology": [
    "🖤 {fighter} hits REVERSE PSYCHOLOGY. Low expectations, high output.",
    "🖤 {fighter} expected pain, found momentum.",
  ],
  "Paid Promotion": [
    "📢 {fighter} launches a PAID PROMOTION. Hype does work.",
    "📢 {fighter} pumps the crowd and the pace.",
  ],
  "Diamond Hands": [
    "💎 {fighter} activates DIAMOND HANDS. Unshakeable stride.",
    "💎 {fighter} holds the line and the lead.",
  ],
};

const WEAKNESS_CALLOUTS: Record<string, string[]> = {
  "Research Spiral": [
    "🤔 {fighter} is stuck in a research spiral. Whitepaper paralysis.",
    "🤔 {fighter} opened one more tab and lost the lead.",
  ],
  "Regulatory Heat": [
    "👔 {fighter} feels regulatory heat. Pace drops instantly.",
    "👔 {fighter} got the subpoena. Legs are heavy now.",
  ],
  "Liquidity Crisis": [
    "❄️ {fighter} hits a liquidity crisis. No exits, no oxygen.",
    "❄️ {fighter} can't find depth. The tank is empty.",
  ],
  "Maxi Stubbornness": [
    "🧱 {fighter} refuses to adapt. Maxi stubbornness hurts.",
    "🧱 {fighter} won't pivot. The pace moves on.",
  ],
  "Funding Rate": [
    "💸 {fighter} gets hit by a funding rate flip. Momentum drains.",
    "💸 {fighter} is paying funding in sweat and it hurts.",
  ],
  "Depeg Panic": [
    "📉 {fighter} depegs under pressure. Chaos everywhere.",
    "📉 {fighter} loses the peg. Confidence collapses.",
  ],
  "Overlevered": [
    "⚠️ {fighter} is overlevered. Speed fades fast.",
    "⚠️ {fighter} went 100x and got liquidated by gravity.",
  ],
  "Vacation Mode": [
    "🏖️ {fighter} drifts into vacation mode. Urgency gone.",
    "🏖️ {fighter} is mentally on a beach. The gap grows.",
  ],
  "Paperwork": [
    "📋 {fighter} is buried in paperwork. Red tape slows everything.",
    "📋 {fighter} needs approvals. The pace slips.",
  ],
  "Distraction Loop": [
    "📱 {fighter} is caught in a distraction loop. Focus lost.",
    "📱 {fighter} doomscrolls mid-race. Brutal timing.",
  ],
  "Mean Reversion": [
    "📉 {fighter} hits mean reversion. The thesis wobbles.",
    "📉 {fighter} feels the correlation snap.",
  ],
  "Deflation Event": [
    "🎈 {fighter} takes a deflation event. Momentum vanishes.",
    "🎈 {fighter} runs out of hype fuel.",
  ],
  "Rekt": [
    "🪦 {fighter} gets rekt. Too cocky, too exposed.",
    "🪦 {fighter} is liquidated by gravity.",
  ],
  "Slippage": [
    "🐌 {fighter} hits slippage. Too big to move fast.",
    "🐌 {fighter} can't turn the size into speed.",
  ],
  "First Bear Market": [
    "😰 {fighter} meets the first bear market. Panic sets in.",
    "😰 {fighter} sees red and freezes.",
  ],
  "Tunnel Vision": [
    "👁️ {fighter} slips into tunnel vision. No adaptability.",
    "👁️ {fighter} refuses to pivot and pays for it.",
  ],
  "PTSD Trigger": [
    "😱 {fighter} hits a PTSD trigger. Flashbacks slow the pace.",
    "😱 {fighter} freezes as the rug memory returns.",
  ],
  "Self-Fulfilling Prophecy": [
    "😐 {fighter} self-sabotages. Can't handle the lead.",
    "😐 {fighter} expected failure and delivered it.",
  ],
  "Exit Liquidity": [
    "🚪 {fighter} exits early. Took profit and lost momentum.",
    "🚪 {fighter} sold the lead for crumbs.",
  ],
  "Complacency": [
    "😴 {fighter} drifts into complacency. Pace dips.",
    "😴 {fighter} got too comfortable and paid the price.",
  ],
};

let lastCommentary = "";

const pickUniqueLine = (lines: string[]) => {
  if (!lines.length) return "";
  let line = lines[Math.floor(Math.random() * lines.length)];
  let attempts = 0;
  while (line === lastCommentary && attempts < 3 && lines.length > 1) {
    line = lines[Math.floor(Math.random() * lines.length)];
    attempts += 1;
  }
  lastCommentary = line;
  return line;
};

const applyReplacements = (line: string, replacements?: Record<string, string>) => {
  let output = line;
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      output = output.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    });
  }
  return output;
};

// Get a random commentary line of a specific type
export const getCommentary = (
  type: CommentaryType,
  replacements?: Record<string, string>
): string => {
  const lines = COMMENTARY.find((c) => c.type === type)?.templates || [];
  if (lines.length === 0) return "";
  return applyReplacements(pickUniqueLine(lines), replacements);
};

export const getAbilityCallout = (fighter: string, ability: string): string => {
  const lines = ABILITY_CALLOUTS[ability] || [];
  if (lines.length === 0) {
    return getCommentary("ability_trigger", { fighter1: fighter, ability });
  }
  return applyReplacements(pickUniqueLine(lines), { fighter, ability });
};

export const getWeaknessCallout = (fighter: string, weakness: string): string => {
  const lines = WEAKNESS_CALLOUTS[weakness] || [];
  if (lines.length === 0) {
    return getCommentary("weakness_trigger", { fighter1: fighter, weakness });
  }
  return applyReplacements(pickUniqueLine(lines), { fighter, weakness });
};

// Character-specific taunts
export const CHARACTER_TAUNTS: Record<string, string[]> = {
  "vitaleak-butterbean": [
    "The merge waits for no one.",
    "Hash faster, breathe later.",
    "Protocol says: go.",
  ],
  "chungus-zhao": [
    "Liquidity never sleeps.",
    "Funds are SAFU, pace is not.",
    "Binance strong!",
  ],
  "scam-bankman-fraud": [
    "Trust the process... and the leverage.",
    "Everything is solvent!",
    "Don't look at my balance sheet.",
  ],
  "michael-staylor": [
    "There is no second-best pace.",
    "Laser eyes locked on victory.",
    "Stacking sats and stations.",
  ],
  "arthur-haze": [
    "Perp energy only.",
    "Funding paid in sweat.",
    "Cool under leverage.",
  ],
  "do-kwong": [
    "The peg is fine, promise.",
    "Algorithmic confidence.",
    "Don't fade me now.",
  ],
  "ape-sem": [
    "SEND IT!",
    "We are so back.",
    "Ape now, breathe later.",
  ],
  "banana-pal": [
    "Zoom out and smile.",
    "Banana for scale.",
    "Calm is alpha.",
  ],
  "gary-guzzler": [
    "Compliance is cardio.",
    "I have questions about your form.",
    "Consider this a warning.",
  ],
  "elongated-muskrat": [
    "Posting through the burn.",
    "Let's get weird.",
    "One tweet, one rep.",
  ],
};

export const getCharacterTaunt = (characterId: string): string => {
  const taunts = CHARACTER_TAUNTS[characterId] || ["Let's go!"];
  return taunts[Math.floor(Math.random() * taunts.length)];
};
