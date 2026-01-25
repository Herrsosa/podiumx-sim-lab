import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArenaCharacter, Station } from "../types";
import { ArenaAvatar } from "./ArenaAvatar";
import { ANIMATION_VARIANTS } from "../config/animations";

interface BettingStripProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  station: Station;
  odds: { fighter1Odds: number; fighter2Odds: number };
  amount: number;
  balance: number;
  onBet: (fighterId: string, fighterName: string, amount: number, odds: number) => void;
  onTopUp?: () => void;
  topUpAmount?: number;
}

const statLabelMap: Record<string, string> = {
  strength: "STR",
  speed: "SPD",
  endurance: "END",
  technique: "TEC",
  mental: "MNT",
};
const statIconMap: Record<string, string> = {
  strength: "💪",
  speed: "⚡",
  endurance: "🔥",
  technique: "🎯",
  mental: "🧠",
};

const statTone = (value: number) => {
  if (value > 75) return "good";
  if (value >= 45) return "neutral";
  return "bad";
};

export function BettingStrip({
  fighter1,
  fighter2,
  station,
  odds,
  amount,
  balance,
  onBet,
  onTopUp,
  topUpAmount,
}: BettingStripProps) {
  const statKey = station.primaryStat;
  const statLabel = statLabelMap[statKey] ?? statKey.toUpperCase();
  const statIcon = statIconMap[statKey] ?? "📊";
  const needsTopUp = amount > balance;
  const canTopUp = needsTopUp && onTopUp && topUpAmount && topUpAmount > 0;
  return (
    <div className="betting-strip">
      <div className="betting-strip-header">
        <span>{station.icon} NEXT: {station.name}</span>
        <span className="betting-strip-tests">Tests: {statLabel}</span>
      </div>
      <div className="betting-strip-card">
        <div className="betting-strip-info">
          <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={28} />
          <div>
            <div className="betting-strip-ticker" style={{ color: "#00ff88" }}>
              {fighter1.ticker}
            </div>
            <div className="betting-strip-odds">{odds.fighter1Odds.toFixed(2)}x</div>
            <div className={`betting-stat ${statTone(fighter1.stats[statKey])}`}>
              <span className="betting-stat-icon">{statIcon}</span>
              <span>{statLabel}</span>
              <strong>{fighter1.stats[statKey]}</strong>
            </div>
          </div>
        </div>
        <motion.div {...ANIMATION_VARIANTS.buttonPress}>
          <Button
            className="btn-primary betting-strip-button"
            disabled={amount > balance}
            onClick={() => onBet(fighter1.id, fighter1.name, amount, odds.fighter1Odds)}
          >
            BET {amount}
          </Button>
        </motion.div>
      </div>
      <div className="betting-strip-card">
        <div className="betting-strip-info">
          <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={28} />
          <div>
            <div className="betting-strip-ticker" style={{ color: "#ff00ff" }}>
              {fighter2.ticker}
            </div>
            <div className="betting-strip-odds">{odds.fighter2Odds.toFixed(2)}x</div>
            <div className={`betting-stat ${statTone(fighter2.stats[statKey])}`}>
              <span className="betting-stat-icon">{statIcon}</span>
              <span>{statLabel}</span>
              <strong>{fighter2.stats[statKey]}</strong>
            </div>
          </div>
        </div>
        <motion.div {...ANIMATION_VARIANTS.buttonPress}>
          <Button
            className="btn-primary betting-strip-button"
            disabled={amount > balance}
            onClick={() => onBet(fighter2.id, fighter2.name, amount, odds.fighter2Odds)}
          >
            BET {amount}
          </Button>
        </motion.div>
      </div>
      {canTopUp && (
        <button type="button" className="betting-strip-topup" onClick={onTopUp}>
          Top up {topUpAmount} $COPE
        </button>
      )}
    </div>
  );
}
