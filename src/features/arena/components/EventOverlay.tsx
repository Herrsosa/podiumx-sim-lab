import { ArenaCharacter } from "../types";
import { ArenaAvatar } from "./ArenaAvatar";

interface EventOverlayProps {
  event: { type: "surge" | "bonk" | "lead"; text: string; fighterId?: string };
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
}

const BONK_COPY: Record<string, { title: string; overlay: string; line: string }> = {
  "scam-bankman-fraud": {
    title: "FRAUD DETECTION TRIGGERED",
    overlay: "FROZEN ASSETS",
    line: "Looks like the customer funds ran out.",
  },
  "do-kwong": {
    title: "DEATH SPIRAL INITIATED",
    overlay: "DE-PEGGED",
    line: "The peg is not fine.",
  },
  "vitaleak-butterbean": {
    title: "RESEARCH SPIRAL",
    overlay: "OVERTHINKING",
    line: "Too busy reading whitepapers.",
  },
  "chungus-zhao": {
    title: "REGULATORY REST",
    overlay: "COMPLIANCE CHECK",
    line: "SEC just walked in.",
  },
  "michael-staylor": {
    title: "MAXI STUBBORNNESS",
    overlay: "WON'T ADAPT",
    line: "Still not selling.",
  },
  "banana-pal": {
    title: "VACATION MODE",
    overlay: "CHECKED OUT",
    line: "Gone to macro island.",
  },
  "arthur-haze": {
    title: "FUNDING RATE FLIP",
    overlay: "LIQUIDATED",
    line: "100x leverage bites back.",
  },
  "ape-sem": {
    title: "PAPER HANDS",
    overlay: "SOLD THE BOTTOM",
    line: "Should have diamond handed.",
  },
  "elongated-muskrat": {
    title: "DISTRACTION",
    overlay: "POSTING MEMES",
    line: "One more tweet.",
  },
  "gary-guzzler": {
    title: "BUREAUCRACY",
    overlay: "FILING PAPERWORK",
    line: "Form 10-K required.",
  },
};

const SURGE_COPY: Record<string, { title: string; line: string }> = {
  "scam-bankman-fraud": {
    title: "CUSTOMER FUNDS",
    line: "Borrows energy from the opponent.",
  },
  "do-kwong": {
    title: "PEG STABILITY",
    line: "Algorithmic pace optimization engaged.",
  },
  "vitaleak-butterbean": {
    title: "MERGE MODE",
    line: "Proof of stake efficiency kicks in.",
  },
  "chungus-zhao": {
    title: "BNB BOOST",
    line: "Muscles through with exchange reserves.",
  },
  "michael-staylor": {
    title: "LASER FOCUS",
    line: "Eyes on the prize. Never selling.",
  },
  "banana-pal": {
    title: "MACRO ZEN",
    line: "Long-term calm activates.",
  },
  "arthur-haze": {
    title: "PERP SWAGGER",
    line: "100x confidence, 100x performance.",
  },
  "ape-sem": {
    title: "APE ENERGY",
    line: "Full degen mode engaged.",
  },
  "elongated-muskrat": {
    title: "TWEET STORM",
    line: "Chaos is a ladder.",
  },
  "gary-guzzler": {
    title: "ENFORCEMENT ACTION",
    line: "Regulatory pressure hits the opponent.",
  },
};

const BONK_PENALTY_SECONDS = 5;
const SURGE_GAIN_SECONDS = 4;

export function EventOverlay({ event, fighter1, fighter2 }: EventOverlayProps) {
  const fighter = event.fighterId === fighter2.id ? fighter2 : fighter1;

  if (event.type === "lead") {
    const leader = event.fighterId === fighter2.id ? fighter2 : fighter1;
    const trailer = leader.id === fighter1.id ? fighter2 : fighter1;
    return (
      <div className="event-overlay lead">
        <div className="event-backdrop" />
        <div className="event-content">
          <div className="event-title">LEAD CHANGE</div>
          <div className="event-lead">
            <div className="lead-card muted">
              <ArenaAvatar value={trailer.avatar} alt={trailer.name} size={96} className="is-round" />
              <span className="lead-label">WAS #1</span>
            </div>
            <div className="lead-arrow">→</div>
            <div className="lead-card active">
              <ArenaAvatar value={leader.avatar} alt={leader.name} size={96} className="is-round" />
              <span className="lead-label">NOW #1</span>
            </div>
          </div>
          <div className="event-quote">"{event.text}"</div>
          <div className="event-reactions">⚡ ⚡ 🔥 ⚡</div>
        </div>
      </div>
    );
  }

  if (event.type === "bonk") {
    const copy = BONK_COPY[fighter.id];
    return (
      <div className="event-overlay bonk">
        <div className="event-backdrop" />
        <div className="event-content">
          <div className="screen-flash red" />
          <div className="event-title">{copy?.title ?? "BONK"}</div>
          <div className="event-avatar frozen">
            <ArenaAvatar value={fighter.avatar} alt={fighter.name} size={128} className="is-round" />
            <div className="event-badge">{copy?.overlay ?? "FROZEN"}</div>
          </div>
          <div className="event-quote">"{copy?.line ?? "Momentum lost."}"</div>
          <div className="event-impact">
            {fighter.ticker} LOSES {BONK_PENALTY_SECONDS} SECONDS
          </div>
          <div className="event-reactions">💀 💀 💀 😂 💀</div>
        </div>
      </div>
    );
  }

  const copy = SURGE_COPY[fighter.id];
  return (
    <div className="event-overlay surge">
      <div className="event-backdrop" />
      <div className="event-content">
        <div className="screen-flash green" />
        <div className="event-title">{copy?.title ?? "SURGE"} ACTIVATED</div>
        <div className="event-avatar powered">
          <ArenaAvatar value={fighter.avatar} alt={fighter.name} size={128} className="is-round" />
          <div className="event-aura" />
        </div>
        <div className="event-quote">"{copy?.line ?? "Momentum spike."}"</div>
        <div className="event-impact">
          {fighter.ticker} GAINS {SURGE_GAIN_SECONDS} SECONDS
        </div>
        <div className="event-reactions">🚀 🚀 🔥 🚀</div>
      </div>
    </div>
  );
}
