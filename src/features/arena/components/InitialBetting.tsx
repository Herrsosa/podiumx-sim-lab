import { useState } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArenaCharacter } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { formatOdds, calculatePayout, getSuggestedBets } from "../engine/betting";
import { FighterCard } from "./FighterCard";
import { ArenaAvatar } from "./ArenaAvatar";

const SPARKS = [
  { top: "10%", left: "20%", randX: 0.2, randY: 0.9 },
  { top: "25%", left: "70%", randX: 0.8, randY: 0.2 },
  { top: "40%", left: "35%", randX: 0.3, randY: 0.7 },
  { top: "60%", left: "65%", randX: 0.7, randY: 0.4 },
  { top: "75%", left: "45%", randX: 0.5, randY: 0.8 },
  { top: "30%", left: "50%", randX: 0.6, randY: 0.1 },
];

function VSElement() {
  return (
    <div className="vs-container">
      <div className="vs-glow" />
      <div className="vs-lightning" />
      <div className="vs-text">VS</div>
      <div className="vs-flare" />
      <div className="vs-sparks">
        {SPARKS.map((spark, i) => (
          <div
            key={i}
            className={`spark spark-${i}`}
            style={
              {
                top: spark.top,
                left: spark.left,
                "--rand-x": spark.randX,
                "--rand-y": spark.randY,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

interface InitialBettingProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  fighter1Odds: number;
  fighter2Odds: number;
  balance: number;
  communitySplit?: { p1: number; p2: number };
  poolTotal?: number;
  onPlaceBet: (fighterId: string, fighterName: string, amount: number, odds: number) => void;
  onBack: () => void;
  onTopUp?: () => void;
  topUpAmount?: number;
}

export function InitialBetting({
  fighter1,
  fighter2,
  fighter1Odds,
  fighter2Odds,
  balance,
  communitySplit,
  poolTotal,
  onPlaceBet,
  onBack,
  onTopUp,
  topUpAmount,
}: InitialBettingProps) {
  const [selectedFighter, setSelectedFighter] = useState<ArenaCharacter | null>(null);
  const [betAmount, setBetAmount] = useState<string>("100");
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

  const canPlaceBet = selectedFighter &&
    betAmount &&
    parseFloat(betAmount) > 0 &&
    parseFloat(betAmount) <= balance;

  return (
    <motion.div
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Change Fighters
        </button>
        <div className="text-right">
          <p className="text-sm text-gray-400">Your balance</p>
          <p className="text-xl font-mono font-bold text-white">
            {balance.toFixed(0)} $COPE
          </p>
          {onTopUp && topUpAmount && topUpAmount > 0 && (
            <button
              type="button"
              onClick={onTopUp}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-emerald-400/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-300 hover:text-emerald-100 transition"
            >
              Top Up {topUpAmount}
            </button>
          )}
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="arena-title text-white mb-2">
          PLACE YOUR BET
        </h1>
        <p className="arena-subtitle">
          Pick your winner and set your stake
        </p>
        {communitySplit && poolTotal !== undefined && (
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-400">
            <span>
              Community: {communitySplit.p1}% {fighter1.ticker} | {communitySplit.p2}% {fighter2.ticker}
            </span>
            <span>
              Pool: {poolTotal.toLocaleString()} $COPE
            </span>
          </div>
        )}
      </div>

      {/* Fighter matchup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Fighter 1 */}
        <motion.div
          className={cn(
            "cursor-pointer transition-all duration-200",
            selectedFighter?.id === fighter1.id && "ring-2 ring-[#00ff88] rounded-xl"
          )}
          onClick={() => setSelectedFighter(fighter1)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FighterCard
            character={fighter1}
            playerSlot={1}
            isSelected={selectedFighter?.id === fighter1.id}
            showStats
          />
          <div className="mt-2 text-center">
            <span className="text-2xl font-black" style={{ color: "#00ff88" }}>
              {formatOdds(fighter1Odds)}
            </span>
            <p className="text-xs text-gray-400">
              Win {calculatePayout(100, fighter1Odds).toFixed(0)} for 100 staked
            </p>
          </div>
        </motion.div>

        {/* VS */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex z-10">
          <VSElement />
        </div>

        {/* Fighter 2 */}
        <motion.div
          className={cn(
            "cursor-pointer transition-all duration-200",
            selectedFighter?.id === fighter2.id && "ring-2 ring-[#ff00ff] rounded-xl"
          )}
          onClick={() => setSelectedFighter(fighter2)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FighterCard
            character={fighter2}
            playerSlot={2}
            isSelected={selectedFighter?.id === fighter2.id}
            showStats
          />
          <div className="mt-2 text-center">
            <span className="text-2xl font-black" style={{ color: "#ff00ff" }}>
              {formatOdds(fighter2Odds)}
            </span>
            <p className="text-xs text-gray-400">
              Win {calculatePayout(100, fighter2Odds).toFixed(0)} for 100 staked
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bet amount section */}
      <motion.div
        className="max-w-md mx-auto p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700"
        animate={{
          borderColor: selectedFighter
            ? selectedFighter.id === fighter1.id
              ? "#00ff88"
              : "#ff00ff"
            : "#374151",
        }}
      >
        {selectedFighter ? (
          <>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400">Betting on</p>
              <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <ArenaAvatar value={selectedFighter.avatar} alt={selectedFighter.name} size={28} />
                {selectedFighter.name}
              </p>
            </div>

            <div className="space-y-4">
              {/* Amount input */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Bet Amount ($COPE)
                </label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="bg-gray-800 border-gray-700 text-lg text-center"
                />
              </div>

              {/* Quick bet buttons */}
              <div className="grid grid-cols-4 gap-2">
                {suggestedBets.slice(0, 4).map((amount, idx) => (
                  <button
                    key={amount}
                    className={cn(
                      "py-2 px-3 text-sm rounded-lg transition-colors",
                      betAmount === amount.toString()
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    )}
                    onClick={() => handleQuickBet(amount)}
                  >
                    {idx === 3 ? "ALL IN" : amount}
                  </button>
                ))}
              </div>

              {/* Potential payout */}
              {potentialPayout > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Potential payout:</span>
                    <span className="text-2xl font-bold text-green-400">
                      {potentialPayout.toFixed(0)} $COPE
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedOdds}x odds = +{(potentialPayout - parseFloat(betAmount || "0")).toFixed(0)} profit
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Select a fighter above to place your bet</p>
          </div>
        )}

        {/* Start button */}
        <Button
          onClick={handlePlaceBet}
          disabled={!canPlaceBet}
          className={cn(
            "btn-primary w-full mt-6 py-6 text-lg font-bold",
            !canPlaceBet && "opacity-50 cursor-not-allowed"
          )}
        >
          {canPlaceBet ? "START RACE" : "Select a fighter and amount"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
