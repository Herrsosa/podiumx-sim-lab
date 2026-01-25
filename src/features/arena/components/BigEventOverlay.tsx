import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArenaCharacter } from "../types";
import { ArenaAvatar } from "./ArenaAvatar";
import { getBigOverlayLine } from "../data/bigOverlayLines";
import { ANIMATION_VARIANTS, TRANSITION_PRESET } from "../config/animations";

type BigEventType = "surge" | "bonk" | "lead" | "close";

interface BigEventOverlayProps {
  type: BigEventType;
  name: string;
  icon: string;
  seconds?: number;
  eventKey?: string;
  fighter: ArenaCharacter;
  opponent?: ArenaCharacter;
  onComplete: () => void;
}

export function BigEventOverlay({
  type,
  name,
  icon,
  seconds,
  eventKey,
  fighter,
  opponent,
  onComplete,
}: BigEventOverlayProps) {
  const [phase, setPhase] = useState<"intro" | "main" | "exit">("intro");

  useEffect(() => {
    const mainTimer = window.setTimeout(() => setPhase("main"), 500);
    const exitTimer = window.setTimeout(() => setPhase("exit"), 2500);
    const completeTimer = window.setTimeout(onComplete, 3000);

    return () => {
      window.clearTimeout(mainTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const commentary = getBigOverlayLine(
    fighter.id,
    eventKey,
    type,
    { char: fighter.ticker, opponent: opponent?.ticker ?? "opponent" }
  );

  return (
    <div className={`big-event-overlay ${type} ${phase}`}>
      <div className="overlay-bg-effect" />
      <div className={`screen-flash ${type}`} />

      <motion.div
        className="overlay-content"
        {...ANIMATION_VARIANTS.scaleIn}
        transition={TRANSITION_PRESET.medium}
      >
        <div className="event-icon-huge">{icon}</div>
        <h1 className="event-name-huge">{name}</h1>

        <div className="character-showcase">
          <ArenaAvatar value={fighter.avatar} alt={fighter.name} size={140} className="is-round" />
          <span className="character-ticker">{fighter.ticker}</span>
        </div>

        <div className="overlay-commentary">"{commentary}"</div>

        {seconds !== undefined && (
          <div className={`effect-badge ${type}`}>
            {type === "bonk" ? "-" : "+"}{seconds} SECONDS
          </div>
        )}
      </motion.div>
    </div>
  );
}
