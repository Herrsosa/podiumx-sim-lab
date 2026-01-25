import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArenaCharacter, Bet, StationResult } from "../types";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Users, TrendingUp } from "lucide-react";
import { BetResults } from "./BetSlip";
import { STATIONS } from "../data/stations";
import confetti from "canvas-confetti";
import { ArenaAvatar } from "./ArenaAvatar";

interface RaceResultsProps {
  winner: ArenaCharacter;
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  stationResults: StationResult[];
  bets: Bet[];
  onNewRace: () => void;
  balance: number;
}

export function RaceResults({
  winner,
  fighter1,
  fighter2,
  stationResults,
  bets,
  onNewRace,
  balance,
}: RaceResultsProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate totals
  const totalTime1 = stationResults.reduce((sum, r) => sum + r.fighter1Time, 0);
  const totalTime2 = stationResults.reduce((sum, r) => sum + r.fighter2Time, 0);
  const margin = Math.abs(totalTime1 - totalTime2);

  const loser = winner.id === fighter1.id ? fighter2 : fighter1;
  const winnerTime = winner.id === fighter1.id ? totalTime1 : totalTime2;
  const loserTime = winner.id === fighter1.id ? totalTime2 : totalTime1;

  const wonBets = bets.filter((b) => b.status === "won");
  const didWin = wonBets.length > 0;

  // Confetti effect
  useEffect(() => {
    if (didWin) {
      // Victory confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ["#00ff88", "#ff00ff", "#ffd700", "#00d4ff"];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [didWin]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, "0")}`;
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-lg mx-4 my-auto"
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        {/* Winner announcement */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-block"
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-4"
              style={{
                backgroundColor: `${winner.color}30`,
                boxShadow: `0 0 40px ${winner.color}60`,
              }}
            >
              <ArenaAvatar value={winner.avatar} alt={winner.name} size={72} className="is-round" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-black text-white mb-1">
              {winner.name} WINS!
            </h2>
            <p className="text-xl font-mono" style={{ color: winner.color }}>
              {winner.ticker}
            </p>
          </motion.div>

          <motion.div
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Trophy className="text-yellow-400" size={16} />
            <span className="text-sm text-gray-300">
              Final time: <span className="font-mono font-bold text-white">{formatTime(winnerTime)}</span>
            </span>
            {margin < 5 && (
              <span className="text-xs text-yellow-400">(Photo finish!)</span>
            )}
          </motion.div>
        </div>

        {/* Results card */}
        <motion.div
          className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Bet results */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
              Betting Results
            </h3>
            <BetResults bets={bets} />
          </div>

          {/* Final standings */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
              Final Standings
            </h3>
            <div className="space-y-2">
              {/* Winner */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥇</span>
                <ArenaAvatar value={winner.avatar} alt={winner.name} size={28} />
                <span className="font-bold text-white">{winner.name}</span>
              </div>
              <span className="font-mono text-green-400">{formatTime(winnerTime)}</span>
            </div>

              {/* Loser */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥈</span>
                <ArenaAvatar value={loser.avatar} alt={loser.name} size={28} />
                <span className="font-bold text-gray-400">{loser.name}</span>
              </div>
                <span className="font-mono text-gray-500">
                  {formatTime(loserTime)} (+{margin.toFixed(1)}s)
                </span>
              </div>
            </div>
          </div>

          {/* Station breakdown (collapsible) */}
          <div className="p-4 border-b border-gray-700">
            <button
              className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span className="font-bold uppercase tracking-wider">
                Station Breakdown
              </span>
              <span>{showDetails ? "−" : "+"}</span>
            </button>

            {showDetails && (
              <motion.div
                className="mt-3 space-y-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                {stationResults.map((result, idx) => (
                  <div
                    key={result.stationId}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="text-gray-500 w-24">
                      {STATIONS[idx]?.icon} {STATIONS[idx]?.name}
                    </span>
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          "font-mono",
                          result.winner === 0
                            ? "text-[#00ff88]"
                            : result.winner === 1
                            ? "text-gray-500"
                            : "text-gray-400"
                        )}
                      >
                        {result.fighter1Time.toFixed(1)}s
                      </span>
                      <span className="text-gray-600">vs</span>
                      <span
                        className={cn(
                          "font-mono",
                          result.winner === 1
                            ? "text-[#ff00ff]"
                            : result.winner === 0
                            ? "text-gray-500"
                            : "text-gray-400"
                        )}
                      >
                        {result.fighter2Time.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Current balance */}
          <div className="p-4 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Your balance:</span>
              <span className="text-xl font-mono font-bold text-white">
                {balance.toFixed(0)} $COPE
              </span>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          className="mt-6 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={onNewRace}
            className="btn-primary w-full py-6 text-lg font-bold"
          >
            <RotateCcw className="mr-2" size={20} />
            Race Again
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              asChild
              className="btn-secondary"
            >
              <Link to="/arena">
                <TrendingUp className="mr-2" size={16} />
                Leaderboard
              </Link>
            </Button>

            <Button
              variant="outline"
              asChild
              className="btn-secondary"
            >
              <Link to="/auth">
                <Users className="mr-2" size={16} />
                Join Athlyst
              </Link>
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
