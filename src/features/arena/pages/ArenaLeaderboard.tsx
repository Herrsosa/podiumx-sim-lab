import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coins, Trophy, TrendingUp, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArenaAvatar } from "../components/ArenaAvatar";

import { useArenaStore } from "../store/useArenaStore";
import { ARENA_CHARACTERS } from "../data/characters";

export default function ArenaLeaderboard() {
  const {
    balance,
    raceHistory,
    bestStreak,
    currentStreak,
    totalRaces,
    totalWinnings,
  } = useArenaStore();

  // Calculate fighter win rates
  const fighterStats = ARENA_CHARACTERS.map((char) => {
    const asWinner = raceHistory.filter((r) => r.winner.id === char.id).length;
    const total = raceHistory.filter(
      (r) => r.fighter1.id === char.id || r.fighter2.id === char.id
    ).length;

    return {
      character: char,
      wins: asWinner,
      appearances: total,
      winRate: total > 0 ? (asWinner / total) * 100 : 0,
    };
  })
    .filter((s) => s.appearances > 0)
    .sort((a, b) => b.winRate - a.winRate);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="arena-theme min-h-screen">
      <div className="arena-background" />
      <div className="arena-grade" />
      <div className="scanlines" />
      <div className="min-h-screen arena-stage">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-black/50 backdrop-blur-lg border-b border-gray-800">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/arena" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Arena</span>
            </Link>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
              <Coins size={16} className="text-yellow-400" />
              <span className="font-mono font-bold text-white">
                {balance.toFixed(0)}
              </span>
              <span className="text-yellow-400 text-sm">$COPE</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-black text-white mb-2 arena-heading">
            <Trophy className="inline-block mr-2 text-yellow-400" size={32} />
            Leaderboard
          </h1>
          <p className="text-gray-400">Your arena statistics and race history</p>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Target size={16} />
              <span className="text-xs">Total Races</span>
            </div>
            <p className="text-2xl font-mono font-bold text-white">{totalRaces}</p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs">Total P&L</span>
            </div>
            <p
              className={cn(
                "text-2xl font-mono font-bold",
                totalWinnings >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {totalWinnings >= 0 ? "+" : ""}
              {totalWinnings.toFixed(0)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Trophy size={16} />
              <span className="text-xs">Current Streak</span>
            </div>
            <p className="text-2xl font-mono font-bold text-yellow-400">
              {currentStreak}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-xs">Best Streak</span>
            </div>
            <p className="text-2xl font-mono font-bold text-yellow-400">
              {bestStreak}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Race history */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={20} className="text-gray-400" />
              Race History
            </h2>

            {raceHistory.length === 0 ? (
              <div className="p-8 rounded-xl bg-gray-800/30 border border-gray-700/50 text-center">
                <p className="text-gray-500 mb-4">No races yet</p>
                <Button asChild>
                  <Link to="/arena/play">Start Your First Race</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {raceHistory.map((race, idx) => (
                  <motion.div
                    key={race.id}
                    className="p-3 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * idx }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <ArenaAvatar value={race.fighter1.avatar} alt={race.fighter1.name} size={26} />
                          <span className="text-gray-600 mx-1 text-xs">vs</span>
                          <ArenaAvatar value={race.fighter2.avatar} alt={race.fighter2.name} size={26} />
                        </div>

                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">🏆</span>
                            <span className="text-sm font-bold text-white">
                              {race.winner.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500">
                            {race.margin < 5 ? "Photo finish!" : `Won by ${race.margin.toFixed(1)}s`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-mono font-bold",
                            race.totalPayout > race.totalBet
                              ? "text-green-400"
                              : race.totalPayout < race.totalBet
                              ? "text-red-400"
                              : "text-gray-400"
                          )}
                        >
                          {race.totalPayout > race.totalBet ? "+" : ""}
                          {(race.totalPayout - race.totalBet).toFixed(0)} $COPE
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatTimeAgo(race.timestamp)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Fighter stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-gray-400" />
              Fighter Performance
            </h2>

            {fighterStats.length === 0 ? (
              <div className="p-8 rounded-xl bg-gray-800/30 border border-gray-700/50 text-center">
                <p className="text-gray-500">
                  Race more to see fighter statistics
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {fighterStats.map((stat, idx) => (
                  <motion.div
                    key={stat.character.id}
                    className="p-3 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * idx }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${stat.character.color}20` }}
                        >
                          <ArenaAvatar value={stat.character.avatar} alt={stat.character.name} size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {stat.character.name}
                          </p>
                          <p
                            className="text-xs font-mono"
                            style={{ color: stat.character.color }}
                          >
                            {stat.character.ticker}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-white">
                          {stat.winRate.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {stat.wins}W / {stat.appearances - stat.wins}L
                        </p>
                      </div>
                    </div>

                    {/* Win rate bar */}
                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${stat.winRate}%`,
                          backgroundColor: stat.character.color,
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black font-bold"
          >
            <Link to="/arena/play">Race Again</Link>
          </Button>
        </motion.div>
        </main>
      </div>
    </div>
  );
}
