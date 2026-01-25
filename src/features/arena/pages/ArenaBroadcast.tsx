import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useArenaStore } from "../store/useArenaStore";
import { RaceTrack } from "../components/RaceTrack";
import { Commentary } from "../components/Commentary";
import { LiveBetFeed, LiveBetItem } from "../components/LiveBetFeed";
import { OddsMovement } from "../components/OddsMovement";
import { STATIONS } from "../data/stations";
import { applyOddsShift, calculateLiveOdds, calculateOverallOdds, calculateWinProbability } from "../engine/betting";

const FAKE_USER_PREFIXES = [
  "degen_",
  "ape_",
  "whale_",
  "ngmi_",
  "wagmi_",
  "moon_",
  "diamond_",
  "paper_",
  "hodl_",
  "anon_",
  "ser_",
  "fren_",
];

const FAKE_BET_AMOUNTS = [100, 250, 500, 1000, 2500];

export default function ArenaBroadcast() {
  const { race } = useArenaStore();
  const [viewerCount, setViewerCount] = useState(2500);
  const [liveBets, setLiveBets] = useState<LiveBetItem[]>([]);
  const [poolTotal, setPoolTotal] = useState(90000);
  const [crowdSplit, setCrowdSplit] = useState<{ p1: number; p2: number }>({ p1: 50, p2: 50 });
  const [oddsHistory, setOddsHistory] = useState<{ fighter1Odds: number; fighter2Odds: number }[]>([]);
  const [hypeLevel, setHypeLevel] = useState(35);
  const [fighter1, fighter2] = race.fighters;

  const crowdSplitRef = useRef(crowdSplit);
  const marketOddsRef = useRef<{ fighter1Odds: number; fighter2Odds: number } | null>(null);

  useEffect(() => {
    crowdSplitRef.current = crowdSplit;
  }, [crowdSplit]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;
    const [prob1] = calculateWinProbability(fighter1, fighter2);
    const lean = Math.min(0.72, Math.max(0.28, prob1 + (Math.random() - 0.5) * 0.1));
    setCrowdSplit({
      p1: Math.round(lean * 100),
      p2: Math.round((1 - lean) * 100),
    });
  }, [fighter1, fighter2]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;
    setLiveBets([]);
    setOddsHistory([]);
    setPoolTotal(90000 + Math.floor(Math.random() * 20000));
    setViewerCount(2200 + Math.floor(Math.random() * 1200));
  }, [fighter1, fighter2]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;
    const interval = setInterval(() => {
      setViewerCount((prev) => Math.max(500, prev + Math.floor(Math.random() * 120) - 60));
    }, 1600);
    return () => clearInterval(interval);
  }, [fighter1, fighter2]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;

    let timeoutId: number;
    let active = true;

    const schedule = () => {
      const delay = 1400 + Math.random() * 2400;
      timeoutId = window.setTimeout(() => {
        if (!active) return;
        const split = crowdSplitRef.current;
        const choice = Math.random() < split.p1 / 100 ? fighter1 : fighter2;
        const username =
          FAKE_USER_PREFIXES[Math.floor(Math.random() * FAKE_USER_PREFIXES.length)] +
          Math.floor(Math.random() * 999);
        const amount = FAKE_BET_AMOUNTS[Math.floor(Math.random() * FAKE_BET_AMOUNTS.length)];

        setLiveBets((prev) => [
          {
            id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            username,
            amount,
            choiceTicker: choice.ticker,
            choiceColor: choice.color,
            timestamp: Date.now(),
          },
          ...prev,
        ].slice(0, 10));

        setPoolTotal((prev) => prev + amount);
        setHypeLevel((prev) => Math.min(100, prev + (amount >= 1000 ? 10 : 4)));

        schedule();
      }, delay);
    };

    schedule();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [fighter1, fighter2]);

  const overallOdds = fighter1 && fighter2 ? calculateOverallOdds(fighter1, fighter2) : null;
  const liveOdds = fighter1 && fighter2
    ? calculateLiveOdds(fighter1, fighter2, race.stationResults, race.currentStation, STATIONS.length)
    : null;
  const marketOddsBase = liveOdds ?? overallOdds;
  const marketOdds = marketOddsBase ? applyOddsShift(marketOddsBase, crowdSplit) : null;

  useEffect(() => {
    marketOddsRef.current = marketOdds;
  }, [marketOdds]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;
    const interval = setInterval(() => {
      const latestOdds = marketOddsRef.current;
      if (!latestOdds) return;
      setOddsHistory((prev) => [...prev.slice(-19), latestOdds]);
    }, 1500);
    return () => clearInterval(interval);
  }, [fighter1, fighter2]);

  if (!fighter1 || !fighter2) {
    return (
      <div className="arena-theme min-h-screen">
        <div className="arena-background" />
        <div className="arena-grade" />
        <div className="scanlines" />
        <div className="min-h-screen arena-stage flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-2xl font-bold text-white">Broadcast Standby</div>
            <div className="mt-2">Waiting for the next matchup.</div>
            <Link to="/arena" className="mt-4 inline-flex text-yellow-400">Join the arena</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-theme min-h-screen">
      <div className="arena-background" />
      <div className="arena-grade" />
      <div className="scanlines" />
      <div className="min-h-screen arena-stage">
        <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-lg border-b border-gray-800">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="text-white font-black text-lg">Crypto Hyrox Arena</div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="live-indicator" />
              LIVE
              <span>👁️ {viewerCount.toLocaleString()}</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          <RaceTrack
            fighter1={fighter1}
            fighter2={fighter2}
            currentStation={race.currentStation}
            stationResults={race.stationResults}
            fighterProgress={race.fighterProgress}
            phase={race.phase}
            roundBettingTime={race.roundBettingTimeLeft}
            crowdSplit={crowdSplit}
            hypeLevel={hypeLevel}
            viewerCount={viewerCount}
            poolTotal={poolTotal}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6">
            <div className="space-y-4">
              <div className="arena-community-panel">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Matchup</div>
                <div className="mt-3 flex items-center justify-between text-sm font-bold text-white">
                  <span style={{ color: "#00ff88" }}>{fighter1.ticker}</span>
                  <span className="text-gray-500">vs</span>
                  <span style={{ color: "#ff00ff" }}>{fighter2.ticker}</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Community split: {crowdSplit.p1}% / {crowdSplit.p2}%
                </div>
                <div className="bet-split mt-2">
                  <div className="bet-split-fill" style={{ width: `${crowdSplit.p1}%` }} />
                </div>
                {marketOdds && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-black/40 px-3 py-2 text-[#00ff88]">
                      {fighter1.ticker} {marketOdds.fighter1Odds.toFixed(2)}x
                    </div>
                    <div className="rounded-lg bg-black/40 px-3 py-2 text-[#ff00ff]">
                      {fighter2.ticker} {marketOdds.fighter2Odds.toFixed(2)}x
                    </div>
                  </div>
                )}
              </div>

              <Commentary lines={race.commentary} maxLines={6} />
            </div>

            <div className="space-y-4">
              <LiveBetFeed bets={liveBets} />
              {marketOdds && (
                <OddsMovement
                  fighter1={fighter1}
                  fighter2={fighter2}
                  history={oddsHistory.length > 0 ? oddsHistory : [marketOdds]}
                />
              )}
              <motion.div
                className="arena-community-panel text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Bet Now</div>
                <div className="mt-2 text-lg font-bold text-white">athlyst.fun/arena</div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
