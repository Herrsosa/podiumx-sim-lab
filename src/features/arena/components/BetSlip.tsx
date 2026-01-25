import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bet } from "../types";
import { formatOdds, calculatePayout } from "../engine/betting";
import { X, Trash2 } from "lucide-react";

interface BetSlipProps {
  bets: Bet[];
  onCancelBet?: (betId: string) => void;
  compact?: boolean;
  className?: string;
}

export function BetSlip({
  bets,
  onCancelBet,
  compact = false,
  className,
}: BetSlipProps) {
  const pendingBets = bets.filter((b) => b.status === "pending");
  const totalStaked = pendingBets.reduce((sum, b) => sum + b.amount, 0);
  const potentialPayout = pendingBets.reduce(
    (sum, b) => sum + calculatePayout(b.amount, b.odds),
    0
  );

  if (pendingBets.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div
        className={cn(
          "px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30",
          className
        )}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-yellow-400">
            {pendingBets.length} active bet{pendingBets.length !== 1 ? "s" : ""}
          </span>
          <span className="text-white font-mono">
            {totalStaked} → {potentialPayout.toFixed(0)} $COPE
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-gradient-to-br from-gray-900/90 to-gray-800/70",
        "border border-gray-700/50",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <span className="text-sm font-bold text-white">Active Bets</span>
        <span className="text-xs text-gray-400">{pendingBets.length} bet(s)</span>
      </div>

      {/* Bets list */}
      <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
        <AnimatePresence>
          {pendingBets.map((bet) => (
            <motion.div
              key={bet.id}
              className={cn(
                "p-3 rounded-lg",
                "bg-gray-800/50 border border-gray-700/50",
                "flex items-center justify-between"
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      bet.type === "overall_winner"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-blue-500/20 text-blue-400"
                    )}
                  >
                    {bet.type === "overall_winner" ? "WINNER" : "STATION"}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {bet.fighterName}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{bet.amount} $COPE</span>
                  <span>×</span>
                  <span className="text-yellow-400">{formatOdds(bet.odds)}</span>
                  <span>=</span>
                  <span className="text-green-400">
                    {calculatePayout(bet.amount, bet.odds).toFixed(0)} $COPE
                  </span>
                </div>
              </div>

              {onCancelBet && (
                <button
                  className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                  onClick={() => onCancelBet(bet.id)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total staked:</span>
          <span className="font-mono text-white">{totalStaked} $COPE</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-400">Potential payout:</span>
          <span className="font-mono text-green-400 font-bold">
            {potentialPayout.toFixed(0)} $COPE
          </span>
        </div>
      </div>
    </div>
  );
}

// Bet result summary (shown after race)
export function BetResults({ bets }: { bets: Bet[] }) {
  const wonBets = bets.filter((b) => b.status === "won");
  const lostBets = bets.filter((b) => b.status === "lost");
  const cashedOutBets = bets.filter((b) => b.status === "cashed_out");
  const totalWon = wonBets.reduce((sum, b) => sum + (b.payout || 0), 0);
  const totalCashedOut = cashedOutBets.reduce((sum, b) => sum + (b.payout || 0), 0);
  const totalLost = lostBets.reduce((sum, b) => sum + b.amount, 0);
  const netResult = totalWon + totalCashedOut - totalLost;

  return (
    <div className="space-y-3">
      {/* Won bets */}
      {wonBets.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-green-400 font-semibold uppercase">
            Won ({wonBets.length})
          </span>
          {wonBets.map((bet) => (
            <div
              key={bet.id}
              className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 flex justify-between"
            >
              <span className="text-sm text-white">{bet.fighterName}</span>
              <span className="text-sm text-green-400 font-bold">
                +{bet.payout?.toFixed(0)} $COPE
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Lost bets */}
      {lostBets.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-red-400 font-semibold uppercase">
            Lost ({lostBets.length})
          </span>
          {lostBets.map((bet) => (
            <div
              key={bet.id}
              className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex justify-between"
            >
              <span className="text-sm text-white">{bet.fighterName}</span>
              <span className="text-sm text-red-400 font-bold">
                -{bet.amount} $COPE
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Cashed out bets */}
      {cashedOutBets.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-yellow-400 font-semibold uppercase">
            Cashed Out ({cashedOutBets.length})
          </span>
          {cashedOutBets.map((bet) => (
            <div
              key={bet.id}
              className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex justify-between"
            >
              <span className="text-sm text-white">{bet.fighterName}</span>
              <span className="text-sm text-yellow-400 font-bold">
                {bet.payout?.toFixed(0)} $COPE
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Net result */}
      <div
        className={cn(
          "p-3 rounded-lg border",
          netResult >= 0
            ? "bg-green-500/10 border-green-500/30"
            : "bg-red-500/10 border-red-500/30"
        )}
      >
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Net result:</span>
          <span
            className={cn(
              "text-lg font-bold",
              netResult >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {netResult >= 0 ? "+" : ""}{netResult.toFixed(0)} $COPE
          </span>
        </div>
      </div>
    </div>
  );
}
