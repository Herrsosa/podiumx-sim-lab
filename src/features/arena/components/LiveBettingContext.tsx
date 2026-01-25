import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Bet } from "../types";
import { ArenaCharacter } from "../types";

interface LiveBettingContextProps {
  activeBet: Bet | undefined;
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  currentGapSeconds: number;
  stationsRemaining: number;
}

export function LiveBettingContext({
  activeBet,
  fighter1,
  fighter2,
  currentGapSeconds,
  stationsRemaining,
}: LiveBettingContextProps) {
  if (!activeBet) return null;

  // Determine which fighter the bet is on
  const betFighter = activeBet.fighterId === fighter1.id ? fighter1 : fighter2;
  const isWinning =
    (activeBet.fighterId === fighter1.id && currentGapSeconds < 0) ||
    (activeBet.fighterId === fighter2.id && currentGapSeconds > 0);

  // Calculate potential payout
  const potentialPayout = activeBet.amount * activeBet.odds;
  const potentialProfit = potentialPayout - activeBet.amount;

  // Determine status
  const absGap = Math.abs(currentGapSeconds);
  const isClose = absGap < 3;
  const isCrucial = stationsRemaining <= 2;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-24 right-6 z-40 pointer-events-none"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
      >
        <motion.div
          className="bg-black/80 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden"
          animate={isClose ? {
            scale: [1, 1.02, 1],
            borderColor: ["rgba(255,255,255,0.2)", "rgba(251,191,36,0.6)", "rgba(255,255,255,0.2)"],
          } : {}}
          transition={{ duration: 1.5, repeat: isClose ? Infinity : 0 }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-2 border-b border-white/10"
            style={{
              background: isWinning
                ? "linear-gradient(to right, rgba(34,197,94,0.2), rgba(22,163,74,0.2))"
                : "linear-gradient(to right, rgba(239,68,68,0.2), rgba(220,38,38,0.2))"
            }}
          >
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Your Bet
            </span>
            {isCrucial && (
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
                CRUCIAL
              </span>
            )}
          </div>

          {/* Content */}
          <div className="px-4 py-3 space-y-2">
            {/* Bet info */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold border-2"
                style={{
                  borderColor: betFighter.color,
                  backgroundColor: `${betFighter.color}20`
                }}
              >
                {betFighter.ticker.slice(1, 2)}
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400">Betting on</div>
                <div className="text-sm font-bold text-white">{betFighter.name}</div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-1">
                {isWinning ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-xs font-medium ${
                  isWinning ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isWinning ? 'WINNING' : 'TRAILING'}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Gap: {absGap.toFixed(1)}s
              </div>
            </div>

            {/* Potential payout */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-400">Potential Win:</span>
                <div className="text-right">
                  <div className="text-base font-bold text-yellow-400">
                    +{potentialProfit.toFixed(0)} $COPE
                  </div>
                  <div className="text-[10px] text-gray-500">
                    ({activeBet.odds.toFixed(2)}x odds)
                  </div>
                </div>
              </div>
            </div>

            {/* Tension indicator */}
            {isClose && (
              <motion.div
                className="pt-2 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="text-[10px] font-bold uppercase tracking-wider text-yellow-400"
                  animate={{
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ⚡ PHOTO FINISH ⚡
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
