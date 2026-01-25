import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArenaCharacter, Station } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatOdds, calculatePayout, getSuggestedBets } from "../engine/betting";
import { ArenaAvatar } from "./ArenaAvatar";

interface RoundBettingProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  station: Station;
  fighter1Odds: number;
  fighter2Odds: number;
  balance: number;
  timeLeft: number; // seconds
  onPlaceBet: (fighterId: string, fighterName: string, amount: number, odds: number) => void;
  onSkip: () => void;
  className?: string;
}

export function RoundBetting({
  fighter1,
  fighter2,
  station,
  fighter1Odds,
  fighter2Odds,
  balance,
  timeLeft,
  onPlaceBet,
  onSkip,
  className,
}: RoundBettingProps) {
  const [selectedFighter, setSelectedFighter] = useState<ArenaCharacter | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const suggestedBets = getSuggestedBets(balance);

  const selectedOdds = selectedFighter?.id === fighter1.id ? fighter1Odds : fighter2Odds;
  const potentialPayout = selectedFighter && betAmount
    ? calculatePayout(parseFloat(betAmount) || 0, selectedOdds)
    : 0;

  const handleQuickBet = (amount: number) => {
    setBetAmount(amount.toString());
  };

  const handlePlaceBet = () => {
    if (!selectedFighter || !betAmount) return;
    const amount = parseFloat(betAmount);
    if (amount > 0 && amount <= balance) {
      onPlaceBet(selectedFighter.id, selectedFighter.name, amount, selectedOdds);
    }
  };

  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md mx-4 p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Timer */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Next Station
            </span>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {station.icon} {station.name}
            </h3>
          </div>
          <motion.div
            className={cn(
              "px-3 py-1 rounded-full font-mono text-lg font-bold",
              timeLeft <= 3 ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
            )}
            animate={timeLeft <= 3 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: timeLeft <= 3 ? Infinity : 0 }}
          >
            {timeLeft}s
          </motion.div>
        </div>

        {/* Fighter selection */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            className={cn(
              "p-3 rounded-xl border-2 transition-all",
              selectedFighter?.id === fighter1.id
                ? "border-[#00ff88] bg-[#00ff88]/10"
                : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
            )}
            onClick={() => setSelectedFighter(fighter1)}
          >
            <div className="flex items-center gap-2 mb-2">
              <ArenaAvatar value={fighter1.avatar} alt={fighter1.name} size={32} />
              <div className="text-left">
                <p className="text-sm font-bold text-white">{fighter1.ticker}</p>
                <p className="text-xs text-gray-400">{fighter1.name}</p>
              </div>
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: "#00ff88" }}
            >
              {formatOdds(fighter1Odds)}
            </div>
          </button>

          <button
            className={cn(
              "p-3 rounded-xl border-2 transition-all",
              selectedFighter?.id === fighter2.id
                ? "border-[#ff00ff] bg-[#ff00ff]/10"
                : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
            )}
            onClick={() => setSelectedFighter(fighter2)}
          >
            <div className="flex items-center gap-2 mb-2">
              <ArenaAvatar value={fighter2.avatar} alt={fighter2.name} size={32} />
              <div className="text-left">
                <p className="text-sm font-bold text-white">{fighter2.ticker}</p>
                <p className="text-xs text-gray-400">{fighter2.name}</p>
              </div>
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: "#ff00ff" }}
            >
              {formatOdds(fighter2Odds)}
            </div>
          </button>
        </div>

        {/* Bet amount */}
        <AnimatePresence>
          {selectedFighter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Bet Amount ($COPE)
                </label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              {/* Quick bet buttons */}
              <div className="flex gap-2">
                {suggestedBets.slice(0, 4).map((amount) => (
                  <button
                    key={amount}
                    className="flex-1 py-1 px-2 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                    onClick={() => handleQuickBet(amount)}
                  >
                    {amount === balance ? "ALL" : amount}
                  </button>
                ))}
              </div>

              {/* Potential payout */}
              {potentialPayout > 0 && (
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Potential payout:</span>
                    <span className="text-green-400 font-bold">
                      {potentialPayout.toFixed(0)} $COPE
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Balance */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-400">Your balance:</span>
          <span className="font-mono text-white">{balance.toFixed(0)} $COPE</span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            onClick={onSkip}
            className="btn-secondary flex-1"
          >
            Skip
          </Button>
          <Button
            onClick={handlePlaceBet}
            disabled={!selectedFighter || !betAmount || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > balance}
            className={cn("btn-primary flex-1", (!selectedFighter || !betAmount) && "opacity-50 cursor-not-allowed")}
          >
            Place Bet
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
