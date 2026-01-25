import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coins, Trophy, Zap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

import { useArenaStore } from "../store/useArenaStore";
import { ARENA_CHARACTERS } from "../data/characters";
import { STATIONS } from "../data/stations";
import { FighterCard } from "../components/FighterCard";
import { ArenaAvatar } from "../components/ArenaAvatar";

export default function ArenaWelcome() {
  const { balance, startingBalance, addBalance, raceHistory, bestStreak, totalRaces } =
    useArenaStore();
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [hoveredCharacter, setHoveredCharacter] = useState<string | null>(null);
  const topUpAmount = Math.max(0, Math.round(startingBalance - balance));
  const canTopUp = topUpAmount > 0;

  // Rotate featured character
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % ARENA_CHARACTERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const featuredCharacter = ARENA_CHARACTERS[featuredIndex];

  return (
    <div className="arena-theme min-h-screen">
      <div className="arena-background" />
      <div className="arena-grade" />
      <div className="scanlines" />
      <div className="min-h-screen arena-stage">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-black/50 backdrop-blur-lg border-b border-gray-800">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Athlyst</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                <Coins size={16} className="text-yellow-400" />
                <span className="font-mono font-bold text-white">
                  {balance.toFixed(0)}
                </span>
                <span className="text-yellow-400 text-sm">$COPE</span>
              </div>
              {canTopUp && (
                <button
                  type="button"
                  onClick={() => addBalance(topUpAmount)}
                  className="px-3 py-1.5 rounded-full border border-emerald-400/40 text-emerald-200 text-xs font-semibold uppercase tracking-[0.2em] hover:border-emerald-300 hover:text-emerald-100 transition"
                >
                  Top Up {topUpAmount}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.h1
            className="text-5xl md:text-7xl font-black mb-4 arena-heading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#ff00ff] bg-clip-text text-transparent">
              CRYPTO
            </span>
            <br />
            <span className="text-white">HYROX ARENA</span>
          </motion.h1>

          <motion.p
            className="text-xl text-gray-400 max-w-xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            20 legendary crypto personalities battle it out in 8 brutal arena stations.
            Pick your fighter. Place your bets. May the best token win.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black font-bold text-xl px-12 py-6 rounded-xl shadow-lg shadow-[#00ff88]/30 hover:shadow-[#00ff88]/50 transition-shadow"
            >
              <Link to="/arena/play">
                <Zap className="mr-2" size={24} />
                ENTER THE ARENA
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Featured character */}
        <motion.div
          className="max-w-sm mx-auto mb-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-center text-sm text-gray-500 uppercase tracking-wider mb-3">
            Featured Fighter
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={featuredCharacter.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <FighterCard character={featuredCharacter} showStats />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Character roster preview */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <h2 className="text-center text-lg font-bold text-white mb-4">
            20 Fighters Ready to Battle
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {ARENA_CHARACTERS.map((char, idx) => (
              <motion.div
                key={char.id}
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center text-2xl cursor-pointer transition-all",
                  "border-2",
                  hoveredCharacter === char.id
                    ? "scale-125 z-10"
                    : featuredIndex === idx
                    ? "scale-110"
                    : "scale-100"
                )}
                style={{
                  backgroundColor: `${char.color}20`,
                  borderColor:
                    hoveredCharacter === char.id || featuredIndex === idx
                      ? char.color
                      : "transparent",
                  boxShadow:
                    hoveredCharacter === char.id
                      ? `0 0 20px ${char.color}60`
                      : "none",
                }}
                onMouseEnter={() => setHoveredCharacter(char.id)}
                onMouseLeave={() => setHoveredCharacter(null)}
                whileHover={{ scale: 1.2 }}
              >
                <ArenaAvatar value={char.avatar} alt={char.name} size={36} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats & How it works */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {/* Your stats */}
          <motion.div
            className="p-6 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="text-yellow-400" size={20} />
              Your Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-mono font-bold text-white">
                  {totalRaces}
                </p>
                <p className="text-xs text-gray-400">Total Races</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-yellow-400">
                  {bestStreak}
                </p>
                <p className="text-xs text-gray-400">Best Streak</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-[#00ff88]">
                  {balance.toFixed(0)}
                </p>
                <p className="text-xs text-gray-400">$COPE Balance</p>
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-purple-400">
                  {raceHistory.length}
                </p>
                <p className="text-xs text-gray-400">Race History</p>
              </div>
            </div>
          </motion.div>

          {/* How it works */}
          <motion.div
            className="p-6 rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700/50"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3 }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="text-[#00ff88]" size={20} />
              How It Works
            </h3>
            <ol className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00ff88]/20 text-[#00ff88] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>Pick 2 fighters from 20 crypto legends</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00ff88]/20 text-[#00ff88] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>Place your $COPE bet on the winner</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00ff88]/20 text-[#00ff88] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>Watch them battle through 8 savage stations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00ff88]/20 text-[#00ff88] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  4
                </span>
                <span>Win $COPE and build your streak!</span>
              </li>
            </ol>
          </motion.div>
        </div>

        {/* Stations preview */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <h2 className="text-center text-lg font-bold text-white mb-4">
            8 Brutal Stations
          </h2>
          <div className="flex justify-center gap-2 flex-wrap max-w-2xl mx-auto">
            {STATIONS.map((station) => (
              <div
                key={station.id}
                className="px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center gap-2"
              >
                <span className="text-lg">{station.icon}</span>
                <span className="text-sm text-gray-300">{station.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent races (if any) */}
        {raceHistory.length > 0 && (
          <motion.div
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="text-purple-400" size={20} />
              Recent Races
            </h2>
            <div className="space-y-2">
              {raceHistory.slice(0, 5).map((race) => (
                <div
                  key={race.id}
                  className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <ArenaAvatar value={race.fighter1.avatar} alt={race.fighter1.name} size={28} />
                    <span className="text-gray-500">vs</span>
                    <ArenaAvatar value={race.fighter2.avatar} alt={race.fighter2.name} size={28} />
                    <span className="text-yellow-400 text-lg ml-2">🏆</span>
                    <span className="text-sm text-white">{race.winner.name}</span>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-mono",
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
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          <Button
            asChild
            variant="outline"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          >
            <Link to="/auth">
              <Users className="mr-2" size={16} />
              Want to be a real athlete? Join Athlyst
            </Link>
          </Button>
        </motion.div>
        </main>
      </div>
    </div>
  );
}
