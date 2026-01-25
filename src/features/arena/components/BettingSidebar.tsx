import { cn } from "@/lib/utils";
import { ArenaCharacter, Bet, RacePhase, Station } from "../types";
import { Button } from "@/components/ui/button";
import { ArenaAvatar } from "./ArenaAvatar";
import { calculatePayout, formatOdds } from "../engine/betting";

interface BettingSidebarProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  station: Station;
  nextStation?: Station;
  odds: { fighter1Odds: number; fighter2Odds: number };
  balance: number;
  phase: RacePhase;
  timeLeft: number;
  selectedAmount: number;
  quickAmounts: number[];
  bets: Bet[];
  onSelectAmount: (amount: number) => void;
  onQuickBet: (fighterId: string, fighterName: string, amount: number, odds: number) => void;
  className?: string;
}

export function BettingSidebar({
  fighter1,
  fighter2,
  station,
  nextStation,
  odds,
  balance,
  phase,
  timeLeft,
  selectedAmount,
  quickAmounts,
  bets,
  onSelectAmount,
  onQuickBet,
  className,
}: BettingSidebarProps) {
  const isBettingOpen = phase === "round_betting";
  const pendingBets = bets.filter((bet) => bet.status === "pending");
  const overallBet = pendingBets.find((bet) => bet.type === "overall_winner");
  const stationBets = pendingBets.filter((bet) => bet.type === "station_winner");
  const potentialPayout = pendingBets.reduce((sum, bet) => sum + bet.amount * bet.odds, 0);

  const stationLabel = isBettingOpen
    ? station
    : nextStation ?? station;
  const statKey = stationLabel.primaryStat;
  const statLabel =
    statKey === "strength"
      ? "STR"
      : statKey === "speed"
      ? "SPD"
      : statKey === "endurance"
      ? "END"
      : statKey === "technique"
      ? "TEC"
      : "MNT";
  const statIcon =
    statKey === "strength"
      ? "💪"
      : statKey === "speed"
      ? "⚡"
      : statKey === "endurance"
      ? "🔥"
      : statKey === "technique"
      ? "🎯"
      : "🧠";
  const getStatTone = (value: number) => {
    if (value > 75) return "good";
    if (value >= 45) return "neutral";
    return "bad";
  };

  return (
    <div className={cn("arena-betting-panel", className)}>
      <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
              Next Station
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg">{stationLabel.icon}</span>
              <div>
                <div className="text-sm font-bold text-white">{stationLabel.name}</div>
                <div className="text-xs text-gray-500">
                  {isBettingOpen ? "Betting window" : "Betting reopens soon"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">
                  Tests: {statLabel}
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              isBettingOpen
                ? timeLeft <= 3
                  ? "bg-red-500/20 text-red-300"
                  : "bg-yellow-500/20 text-yellow-300"
                : "bg-gray-800 text-gray-500"
            )}
          >
            {isBettingOpen ? `${timeLeft}s` : "LOCKED"}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={32} />
                <div>
                  <div className="text-sm font-bold text-white">{fighter1.ticker}</div>
                  <div className="text-xs text-gray-400">{fighter1.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#00ff88]">
                  {formatOdds(odds.fighter1Odds)}
                </div>
                <div className="text-[10px] text-gray-500">
                  Pays {calculatePayout(selectedAmount, odds.fighter1Odds).toFixed(0)}
                </div>
              </div>
            </div>
            <div className={`betting-stat ${getStatTone(fighter1.stats[statKey])}`}>
              <span className="betting-stat-icon">{statIcon}</span>
              <span>{statLabel}</span>
              <strong>{fighter1.stats[statKey]}</strong>
              <span className="betting-stat-dot">
                {fighter1.stats[statKey] > 75 ? "🟢" : fighter1.stats[statKey] >= 45 ? "🟡" : "🔴"}
              </span>
            </div>
            <Button
              onClick={() => onQuickBet(fighter1.id, fighter1.name, selectedAmount, odds.fighter1Odds)}
              disabled={!isBettingOpen || selectedAmount <= 0 || selectedAmount > balance}
              className="btn-primary mt-3 w-full"
            >
              BET {selectedAmount} $COPE
            </Button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={32} />
                <div>
                  <div className="text-sm font-bold text-white">{fighter2.ticker}</div>
                  <div className="text-xs text-gray-400">{fighter2.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#ff00ff]">
                  {formatOdds(odds.fighter2Odds)}
                </div>
                <div className="text-[10px] text-gray-500">
                  Pays {calculatePayout(selectedAmount, odds.fighter2Odds).toFixed(0)}
                </div>
              </div>
            </div>
            <div className={`betting-stat ${getStatTone(fighter2.stats[statKey])}`}>
              <span className="betting-stat-icon">{statIcon}</span>
              <span>{statLabel}</span>
              <strong>{fighter2.stats[statKey]}</strong>
              <span className="betting-stat-dot">
                {fighter2.stats[statKey] > 75 ? "🟢" : fighter2.stats[statKey] >= 45 ? "🟡" : "🔴"}
              </span>
            </div>
            <Button
              onClick={() => onQuickBet(fighter2.id, fighter2.name, selectedAmount, odds.fighter2Odds)}
              disabled={!isBettingOpen || selectedAmount <= 0 || selectedAmount > balance}
              className="btn-primary mt-3 w-full"
            >
              BET {selectedAmount} $COPE
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
            Quick Bet
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-semibold",
                  amount === selectedAmount
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                )}
                onClick={() => onSelectAmount(amount)}
              >
                {amount}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>Your balance</span>
            <span className="font-mono text-white">{balance.toFixed(0)} $COPE</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
            Your Bets
          </div>
          <div className="mt-2 space-y-2 text-xs text-gray-400">
            {overallBet ? (
              <div className="flex items-center justify-between">
                <span>Overall: {overallBet.fighterName}</span>
                <span className="font-mono text-white">
                  {overallBet.amount} x {overallBet.odds.toFixed(2)}
                </span>
              </div>
            ) : (
              <div>No overall bet yet.</div>
            )}
            {stationBets.length > 0 ? (
              stationBets.slice(0, 2).map((bet) => (
                <div key={bet.id} className="flex items-center justify-between">
                  <span>Round: {bet.fighterName}</span>
                  <span className="font-mono text-white">
                    {bet.amount} x {bet.odds.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <div>No round bets placed.</div>
            )}
          </div>
          {potentialPayout > 0 && (
            <div className="mt-3 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-300">
              Potential payout: {potentialPayout.toFixed(0)} $COPE
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
