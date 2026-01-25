import { useEffect, useState } from "react";
import { ArenaCharacter, Bet } from "../types";

interface CashOutPanelProps {
  bet: Bet;
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  currentGap: number;
  stationsRemaining: number;
  onCashOut: (betId: string, payout: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function CashOutPanel({
  bet,
  fighter1,
  fighter2,
  currentGap,
  stationsRemaining,
  onCashOut,
}: CashOutPanelProps) {
  const betOnP1 = bet.fighterId === fighter1.id;
  const isLeading = currentGap < 0 ? betOnP1 : currentGap > 0 ? !betOnP1 : false;

  const gapStrength = clamp(Math.abs(currentGap) / 30, 0, 0.4);
  const comebackBoost = clamp(stationsRemaining * 0.04, 0.08, 0.24);

  let winProbability = 0.5 + (isLeading ? gapStrength : -gapStrength) + (isLeading ? 0 : comebackBoost);
  winProbability = clamp(winProbability, 0.08, 0.92);

  const potentialPayout = bet.amount * bet.odds;
  const cashOutValue = Math.max(1, Math.round(potentialPayout * winProbability));
  const profit = cashOutValue - bet.amount;
  const [previousValue, setPreviousValue] = useState(cashOutValue);
  const isDropping = cashOutValue < previousValue;
  const shouldPulse = isLeading && isDropping;

  useEffect(() => {
    setPreviousValue(cashOutValue);
  }, [cashOutValue]);

  return (
    <div className={`cash-out-card ${shouldPulse ? "pulsing" : ""}`}>
      <div className="position-info">
        <div className="position-title">YOUR POSITION</div>
        <div className="position-line">
          {bet.fighterName} to win @ {bet.odds.toFixed(2)}x
        </div>
        <div className="position-line subtle">
          Stake: {bet.amount} $COPE | Potential: {Math.round(potentialPayout)} $COPE
        </div>
        <div className={`position-line ${isLeading ? "leading" : "trailing"}`}>
          Status: {bet.fighterName} {isLeading ? "LEADING" : "TRAILING"} by {Math.abs(currentGap).toFixed(1)}s
          {isLeading ? " ✅" : " ⚠️"}
        </div>
        <div className="position-line subtle">
          Win probability: {Math.round(winProbability * 100)}%
        </div>
      </div>
      <div className={`cash-out-action ${profit >= 0 ? "profit" : "loss"}`}>
        <div className="cash-out-value">
          CASH OUT: {cashOutValue} $COPE
        </div>
        <div className="profit-loss">
          ({profit >= 0 ? "+" : ""}{profit} {profit >= 0 ? "profit" : "loss"})
        </div>
        <button
          className="cash-out-cta"
          onClick={() => onCashOut(bet.id, cashOutValue)}
        >
          TAKE IT
        </button>
        {shouldPulse && (
          <div className="urgency-text">
            Value dropping. Secure it?
          </div>
        )}
      </div>
    </div>
  );
}
