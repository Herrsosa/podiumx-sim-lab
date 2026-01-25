import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Coins, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

import { useArenaStore } from "../store/useArenaStore";
import { ArenaCharacter } from "../types";
import { STATIONS } from "../data/stations";
import { ARENA_CHARACTERS } from "../data/characters";
import { getCommentary } from "../data/commentary";
import { useArenaSound } from "../hooks/useArenaSound";
import { FighterSelector } from "../components/FighterSelector";
import { RaceCountdown } from "../components/RaceTrack";
import { Commentary } from "../components/Commentary";
import { RaceResults } from "../components/RaceResults";
import { InitialBetting } from "../components/InitialBetting";
import { BettingSidebar } from "../components/BettingSidebar";
import { BettingStrip } from "../components/BettingStrip";
import { LiveBetFeed, LiveBetItem } from "../components/LiveBetFeed";
import { OddsMovement } from "../components/OddsMovement";
import { RaceStats } from "../components/RaceStats";
import { BigEventOverlay } from "../components/BigEventOverlay";
import { StationIntroOverlay } from "../components/StationIntroOverlay";
import { StationCompleteOverlay } from "../components/StationCompleteOverlay";
import { StationPreviewOverlay } from "../components/StationPreviewOverlay";
import { StationTransitionOverlay } from "../components/StationTransitionOverlay";
import { FighterLoreOverlay } from "../components/FighterLoreOverlay";
import { MatchupVersusOverlay } from "../components/MatchupVersusOverlay";
import { LiveCommentaryOverlay } from "../components/LiveCommentaryOverlay";
import { LiveBettingContext } from "../components/LiveBettingContext";
import { CrowdHypeMeter } from "../components/CrowdHypeMeter";
import { CashOutPanel } from "../components/CashOutPanel";
import { RaceViewContainer, RaceViewMode } from "../components/RaceViewContainer";
import { simulateStation } from "../engine/simulation";
import { RACE_TIMING } from "../config/raceTiming";
import {
  applyOddsShift,
  calculateLiveOdds,
  calculateOverallOdds,
  calculateStationOdds,
  calculateWinProbability,
} from "../engine/betting";

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

const FAKE_BET_AMOUNTS = [50, 100, 250, 500, 1000];
const QUICK_BET_AMOUNTS = [50, 100, 250, 500];
const ROUND_BETTING_SECONDS = Math.max(1, Math.round(RACE_TIMING.station.roundBetting / 1000));
const COUNTDOWN_SECONDS = Math.max(1, Math.round(RACE_TIMING.preRace.countdown / 1000));
const PREVIEW_DURATION_MS = RACE_TIMING.preRace.stationPreview ?? 0;
const AUTO_MODE = true;
const AUTO_MATCHUP_DISPLAY_MS = 5000;
const AUTO_RESULTS_DELAY_MS = 6500;

const REACTION_EMOJIS = {
  surge: ["🚀", "🔥", "⚡", "🚀", "🔥"],
  bonk: ["💀", "😵", "💀", "😂", "💀"],
  lead: ["⚡", "😳", "🔥", "⚡", "😮"],
};

const EVENT_META = {
  surge: { icon: "⚡", name: "SURGE", seconds: 4 },
  bonk: { icon: "💥", name: "BONK", seconds: 5 },
  lead: { icon: "🏁", name: "LEAD CHANGE", seconds: 0 },
} as const;

export default function ArenaPlay() {
  const {
    balance,
    startingBalance,
    race,
    bets,
    setFighter,
    placeBet,
    addBalance,
    cashOutBet,
    startRace,
    setPhase,
    addCommentary,
    recordStationResult,
    finishRace,
    resetRace,
    setRoundBettingTime: setRoundBettingTimeGlobal,
    updateFighterProgress,
    currentStreak,
  } = useArenaStore();

  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_SECONDS);
  const [showInitialBetting, setShowInitialBetting] = useState(false);
  const [roundBettingTime, setRoundBettingTime] = useState(ROUND_BETTING_SECONDS);
  const [currentStationProgress, setCurrentStationProgress] = useState<[number, number]>([0, 0]);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hypeLevel, setHypeLevel] = useState(20);
  const [eventCallout, setEventCallout] = useState<{
    type: "surge" | "bonk" | "lead";
    text: string;
    fighterId?: string;
    eventKey?: string;
    seconds?: number;
  } | null>(null);
  const [bigEvent, setBigEvent] = useState<{
    type: "surge" | "bonk" | "lead";
    name: string;
    icon: string;
    seconds?: number;
    eventKey?: string;
    fighterId?: string;
  } | null>(null);
  const [viewerCount, setViewerCount] = useState(1200);
  const [liveBets, setLiveBets] = useState<LiveBetItem[]>([]);
  const [communityBets, setCommunityBets] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [oddsHistory, setOddsHistory] = useState<{ fighter1Odds: number; fighter2Odds: number }[]>([]);
  const [quickBetAmount, setQuickBetAmount] = useState(50);
  const [reactions, setReactions] = useState<string[]>([]);
  const [raceView, setRaceView] = useState<RaceViewMode>("track");
  const [autoStartAt, setAutoStartAt] = useState<number | null>(null);
  const [autoCountdown, setAutoCountdown] = useState(Math.ceil(AUTO_MATCHUP_DISPLAY_MS / 1000));
  const autoTimersRef = useRef<number[]>([]);

  useEffect(() => {
    setRoundBettingTimeGlobal(roundBettingTime);
  }, [roundBettingTime, setRoundBettingTimeGlobal]);

  const animationFrameRef = useRef<number | null>(null);
  const eventTimersRef = useRef<number[]>([]);
  const commentaryTimersRef = useRef<number[]>([]);
  const lastMatchRef = useRef<string | null>(null);
  const crowdSplitRef = useRef<{ p1: number; p2: number }>({ p1: 50, p2: 50 });
  const marketOddsRef = useRef<{ fighter1Odds: number; fighter2Odds: number } | null>(null);
  const [fighter1, fighter2] = race.fighters;

  // Sound system integration
  const { playSound } = useArenaSound();

  const communityTotal = communityBets.p1 + communityBets.p2;
  const topUpAmount = Math.max(0, Math.round(startingBalance - balance));
  const canTopUp = topUpAmount > 0;
  const crowdSplit = useMemo(() => {
    if (communityTotal <= 0) return { p1: 50, p2: 50 };
    return {
      p1: Math.round((communityBets.p1 / communityTotal) * 100),
      p2: Math.round((communityBets.p2 / communityTotal) * 100),
    };
  }, [communityBets, communityTotal]);

  useEffect(() => {
    crowdSplitRef.current = crowdSplit;
  }, [crowdSplit]);

  const pushLiveBet = useCallback((bet: LiveBetItem) => {
    setLiveBets((prev) => [bet, ...prev].slice(0, 12));
  }, []);

  const registerBet = useCallback(
    (fighterId: string, amount: number, username: string) => {
      if (!fighter1 || !fighter2) return;

      const choice = fighterId === fighter1.id ? fighter1 : fighter2;

      setCommunityBets((prev) =>
        fighterId === fighter1.id
          ? { p1: prev.p1 + amount, p2: prev.p2 }
          : { p1: prev.p1, p2: prev.p2 + amount }
      );

      pushLiveBet({
        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        username,
        amount,
        choiceTicker: choice.ticker,
        choiceColor: choice.color,
        timestamp: Date.now(),
      });

      if (amount >= 500) {
        setHypeLevel((prev) => Math.min(100, prev + 15));
      }
    },
    [fighter1, fighter2, pushLiveBet]
  );

  const triggerEventCallout = useCallback(
    (callout: { type: "surge" | "bonk" | "lead"; text: string; fighterId?: string; eventKey?: string }) => {
      const boostMap = { surge: 85, bonk: 95, lead: 70 };
      const meta = EVENT_META[callout.type];
      setEventCallout({ ...callout, seconds: meta.seconds });
      setBigEvent({
        type: callout.type,
        name: callout.eventKey || meta.name,
        icon: meta.icon,
        seconds: meta.seconds || undefined,
        eventKey: callout.eventKey,
        fighterId: callout.fighterId,
      });
      setHypeLevel((prev) => Math.max(prev * 0.6, boostMap[callout.type]));

      // Trigger hype spike sound based on event intensity
      if (callout.type === 'lead' || boostMap[callout.type] >= 90) {
        playSound('hype_spike');
      }

      const clearId = window.setTimeout(() => setEventCallout(null), RACE_TIMING.events[callout.type]);
      eventTimersRef.current.push(clearId);
      const bigClearId = window.setTimeout(() => setBigEvent(null), 3000);
      eventTimersRef.current.push(bigClearId);
    },
    [setEventCallout, setHypeLevel, playSound]
  );

  // Handle fighter selection
  const handleSetFighter = (slot: 0 | 1, character: ArenaCharacter | null) => {
    setFighter(slot, character);
  };

  // Move to initial betting after fighter selection
  const handleFighterSelectionConfirm = () => {
    if (fighter1 && fighter2) {
      setShowInitialBetting(true);
    }
  };

  // Start the race after initial bet
  const handleStartRace = () => {
    setShowInitialBetting(false);
    startRace();
  };

  // Place initial bet
  const handlePlaceInitialBet = (fighterId: string, fighterName: string, amount: number, odds: number) => {
    const success = placeBet({
      type: "overall_winner",
      fighterId,
      fighterName,
      amount,
      odds,
    });
    if (success) {
      registerBet(fighterId, amount, "you");
      handleStartRace();
    }
  };

  // Place round bet
  const handlePlaceRoundBet = (fighterId: string, fighterName: string, amount: number, odds: number) => {
    const success = placeBet({
      type: "station_winner",
      stationId: STATIONS[race.currentStation].id,
      fighterId,
      fighterName,
      amount,
      odds,
    });
    if (success) {
      registerBet(fighterId, amount, "you");
      setPhase("station_racing");
    }
  };

  // Reset for new race
  const handleNewRace = useCallback(() => {
    resetRace();
    setShowInitialBetting(false);
    setCurrentStationProgress([0, 0]);
    setLiveBets([]);
    setOddsHistory([]);
  }, [resetRace]);

  const clearAutoTimers = useCallback(() => {
    autoTimersRef.current.forEach((id) => clearTimeout(id));
    autoTimersRef.current = [];
  }, []);

  const pickRandomMatchup = useCallback(() => {
    const roster = [...ARENA_CHARACTERS];
    for (let i = roster.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [roster[i], roster[j]] = [roster[j], roster[i]];
    }
    setFighter(0, roster[0]);
    setFighter(1, roster[1]);
  }, [setFighter]);

  useEffect(() => {
    return () => {
      clearAutoTimers();
    };
  }, [clearAutoTimers]);

  useEffect(() => {
    if (!AUTO_MODE) return;
    if (showInitialBetting) return;
    if (race.phase !== "selection") {
      setAutoStartAt(null);
      return;
    }

    clearAutoTimers();

    if (!fighter1 || !fighter2) {
      pickRandomMatchup();
    }

    const startAt = Date.now() + AUTO_MATCHUP_DISPLAY_MS;
    setAutoStartAt(startAt);
    setAutoCountdown(Math.ceil(AUTO_MATCHUP_DISPLAY_MS / 1000));

    const timer = window.setTimeout(() => {
      if (race.phase === "selection") {
        startRace();
      }
    }, AUTO_MATCHUP_DISPLAY_MS);
    autoTimersRef.current.push(timer);
  }, [
    race.phase,
    fighter1,
    fighter2,
    showInitialBetting,
    clearAutoTimers,
    pickRandomMatchup,
    startRace,
  ]);

  useEffect(() => {
    if (!AUTO_MODE) return;
    if (!autoStartAt || race.phase !== "selection") return;

    const interval = window.setInterval(() => {
      const secondsLeft = Math.max(0, Math.ceil((autoStartAt - Date.now()) / 1000));
      setAutoCountdown(secondsLeft);
    }, 250);

    return () => clearInterval(interval);
  }, [autoStartAt, race.phase]);

  useEffect(() => {
    if (!AUTO_MODE) return;
    if (race.phase !== "results") return;

    clearAutoTimers();
    const timer = window.setTimeout(() => {
      handleNewRace();
    }, AUTO_RESULTS_DELAY_MS);
    autoTimersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [race.phase, clearAutoTimers, handleNewRace]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;
    const matchupKey = `${fighter1.id}-${fighter2.id}`;
    if (lastMatchRef.current === matchupKey) return;

    lastMatchRef.current = matchupKey;
    const basePool = 35000 + Math.floor(Math.random() * 20000);
    const [prob1] = calculateWinProbability(fighter1, fighter2);
    const lean = Math.min(0.72, Math.max(0.28, prob1 + (Math.random() - 0.5) * 0.08));
    const p1 = Math.round(basePool * lean);

    setCommunityBets({ p1, p2: basePool - p1 });
    setLiveBets([]);
    setOddsHistory([]);
    setViewerCount(1000 + Math.floor(Math.random() * 900));
  }, [fighter1, fighter2]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;
    const interval = setInterval(() => {
      setViewerCount((prev) => Math.max(200, prev + Math.floor(Math.random() * 90) - 45));
    }, 1600);
    return () => clearInterval(interval);
  }, [fighter1, fighter2]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;
    if (race.phase === "selection" || race.phase === "results") return;

    let timeoutId: number;
    let active = true;

    const schedule = () => {
      const delay = 1200 + Math.random() * 2200;
      timeoutId = window.setTimeout(() => {
        if (!active) return;

        const split = crowdSplitRef.current;
        const choice = Math.random() < split.p1 / 100 ? fighter1 : fighter2;
        const username =
          FAKE_USER_PREFIXES[Math.floor(Math.random() * FAKE_USER_PREFIXES.length)] +
          Math.floor(Math.random() * 999);
        const amount = FAKE_BET_AMOUNTS[Math.floor(Math.random() * FAKE_BET_AMOUNTS.length)];

        registerBet(choice.id, amount, username);
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [fighter1, fighter2, race.phase, registerBet]);

  useEffect(() => {
    marketOddsRef.current = null;
  }, [race.phase]);

  useEffect(() => {
    if (!fighter1 || !fighter2) return;
    const interval = setInterval(() => {
      const latestOdds = marketOddsRef.current;
      if (!latestOdds) return;
      setOddsHistory((prev) => [...prev.slice(-19), latestOdds]);
    }, 1400);
    return () => clearInterval(interval);
  }, [fighter1, fighter2]);

  // Fighter 1 Lore Introduction
  useEffect(() => {
    if (race.phase !== "fighter1_lore") return;
    const timer = setTimeout(() => {
      setPhase("fighter2_lore");
    }, RACE_TIMING.preRace.fighterLore1);
    return () => clearTimeout(timer);
  }, [race.phase, setPhase]);

  // Fighter 2 Lore Introduction
  useEffect(() => {
    if (race.phase !== "fighter2_lore") return;
    const timer = setTimeout(() => {
      setPhase("matchup_versus");
    }, RACE_TIMING.preRace.fighterLore2);
    return () => clearTimeout(timer);
  }, [race.phase, setPhase]);

  // Matchup VS Screen
  useEffect(() => {
    if (race.phase !== "matchup_versus") return;
    const timer = setTimeout(() => {
      setPhase("pre_race");
    }, RACE_TIMING.preRace.vsMatchup);
    return () => clearTimeout(timer);
  }, [race.phase, setPhase]);

  // Pre-race hype screen
  useEffect(() => {
    if (race.phase !== "pre_race") return;
    const timer = setTimeout(() => {
      if (PREVIEW_DURATION_MS > 0) {
        setPhase("station_preview");
      } else {
        setCountdownValue(COUNTDOWN_SECONDS);
        setPhase("countdown");
      }
    }, RACE_TIMING.preRace.taleOfTape);
    return () => clearTimeout(timer);
  }, [race.phase, setPhase]);

  useEffect(() => {
    if (race.phase !== "station_preview") return;
    const timer = setTimeout(() => {
      setCountdownValue(COUNTDOWN_SECONDS);
      setPhase("countdown");
    }, PREVIEW_DURATION_MS);
    return () => clearTimeout(timer);
  }, [race.phase, setPhase]);

  // Countdown effect
  useEffect(() => {
    if (race.phase !== "countdown") return;

    if (countdownValue > 0) {
      // Play countdown beep
      if (countdownValue === 1) {
        playSound('countdown_final');
      } else {
        playSound('countdown_beep');
      }
      const timer = setTimeout(() => setCountdownValue(countdownValue - 1), 1000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setPhase("station_intro");
      addCommentary(
        getCommentary("race_start", {
          fighter1: fighter1!.name,
          fighter2: fighter2!.name,
        })
      );
    }, RACE_TIMING.animations.viewTransition);
    return () => clearTimeout(timer);
  }, [race.phase, countdownValue, fighter1, fighter2, setPhase, addCommentary, playSound]);

  // Station intro effect
  useEffect(() => {
    if (race.phase !== "station_intro") return;

    // Play race start sound on first station
    if (race.currentStation === 0) {
      playSound('race_start');
    } else {
      playSound('whoosh');
    }

    const introDuration =
      race.currentStation === STATIONS.length - 1
        ? RACE_TIMING.finalStation.intro
        : RACE_TIMING.station.intro;

    const timer = setTimeout(() => {
      setPhase("round_betting");
      setRoundBettingTime(ROUND_BETTING_SECONDS);
    }, introDuration);

    return () => clearTimeout(timer);
  }, [race.phase, race.currentStation, setPhase, playSound]);

  // Round betting timer
  useEffect(() => {
    if (race.phase !== "round_betting") return;

    if (roundBettingTime > 0) {
      const timer = setTimeout(() => setRoundBettingTime(roundBettingTime - 1), 1000);
      return () => clearTimeout(timer);
    }

    setPhase("station_racing");
  }, [race.phase, roundBettingTime, setPhase]);

  // Station racing simulation
  useEffect(() => {
    if (race.phase !== "station_racing" || !fighter1 || !fighter2) return;

    eventTimersRef.current.forEach((id) => clearTimeout(id));
    commentaryTimersRef.current.forEach((id) => clearTimeout(id));
    eventTimersRef.current = [];
    commentaryTimersRef.current = [];

    const station = STATIONS[race.currentStation];
    const { race: latestRace } = useArenaStore.getState();
    const cumulativeTimes: [number, number] = [
      latestRace.fighterTimes[0].reduce((a, b) => a + b, 0),
      latestRace.fighterTimes[1].reduce((a, b) => a + b, 0),
    ];

    const { result, commentary, abilityTriggered, weaknessTriggered } = simulateStation(
      fighter1,
      fighter2,
      station,
      race.currentStation,
      cumulativeTimes
    );

    const isFinalStation = race.currentStation === STATIONS.length - 1;
    const gapSeconds = Math.abs(result.fighter1Time - result.fighter2Time);
    const leadBefore =
      cumulativeTimes[0] === cumulativeTimes[1] ? null : cumulativeTimes[0] < cumulativeTimes[1] ? 0 : 1;
    const leadAfter =
      cumulativeTimes[0] + result.fighter1Time < cumulativeTimes[1] + result.fighter2Time ? 0 : 1;
    const hasLeadChange = leadBefore !== null && leadAfter !== leadBefore;

    const eventBuffer =
      (abilityTriggered ? RACE_TIMING.events.surge : 0) +
      (weaknessTriggered ? RACE_TIMING.events.bonk : 0) +
      (hasLeadChange ? RACE_TIMING.events.lead : 0);

    const baseRacing = isFinalStation ? RACE_TIMING.finalStation.racing : RACE_TIMING.station.racing;
    const racingDuration =
      baseRacing +
      Math.round(gapSeconds * RACE_TIMING.station.racingPerSecondGap) +
      Math.round(eventBuffer * 0.6);

    const scheduleEvent = (
      type: "surge" | "bonk" | "lead",
      text: string,
      delay: number,
      fighterId?: string,
      eventKey?: string
    ) => {
      const timeoutId = window.setTimeout(
        () => triggerEventCallout({ type, text, fighterId, eventKey }),
        delay
      );
      eventTimersRef.current.push(timeoutId);
    };

    if (abilityTriggered) {
      scheduleEvent(
        "surge",
        `${abilityTriggered.abilityName.toUpperCase()} ACTIVATED`,
        Math.round(racingDuration * 0.35),
        abilityTriggered.fighterId,
        abilityTriggered.abilityName
      );
      // Play surge sound
      window.setTimeout(() => playSound('surge'), Math.round(racingDuration * 0.35));
    }
    if (weaknessTriggered) {
      scheduleEvent(
        "bonk",
        `${weaknessTriggered.weaknessName.toUpperCase()}!`,
        Math.round(racingDuration * 0.55),
        weaknessTriggered.fighterId,
        weaknessTriggered.weaknessName
      );
      // Play bonk sound
      window.setTimeout(() => playSound('bonk'), Math.round(racingDuration * 0.55));
    }
    if (hasLeadChange) {
      const leaderId = leadAfter === 0 ? fighter1.id : fighter2.id;
      scheduleEvent("lead", "LEAD CHANGE!", Math.round(racingDuration * 0.7), leaderId, "Lead Change");
      // Play lead change sound
      window.setTimeout(() => playSound('lead_change'), Math.round(racingDuration * 0.7));
    }

    const commentaryDelay = 500;
    const commentarySpacing = Math.max(550, (racingDuration - commentaryDelay) / Math.max(1, commentary.length));
    commentary.forEach((line, idx) => {
      const timeoutId = window.setTimeout(
        () => addCommentary(line),
        Math.min(racingDuration - 300, commentaryDelay + idx * commentarySpacing)
      );
      commentaryTimersRef.current.push(timeoutId);
    });

    const leadBias = result.fighter1Time < result.fighter2Time ? 6 : -6;
    const startTime = performance.now();
    const pauseTracker = { pausedDuration: 0, lastTimestamp: 0 };

    const animate = (timestamp: number) => {
      if (!pauseTracker.lastTimestamp) {
        pauseTracker.lastTimestamp = timestamp;
      }

      pauseTracker.lastTimestamp = timestamp;

      const elapsed = timestamp - startTime - pauseTracker.pausedDuration;
      const progressRatio = Math.min(1, Math.max(0, elapsed / racingDuration));
      const baseProgress = progressRatio * 100;
      const jitter = Math.sin(elapsed / 180) * 2;

      const progressValues: [number, number] = [
        Math.min(100, Math.max(0, baseProgress + leadBias + jitter)),
        Math.min(100, Math.max(0, baseProgress - leadBias - jitter)),
      ];

      setCurrentStationProgress(progressValues);
      updateFighterProgress(progressValues);

      if (progressRatio < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentStationProgress([100, 100]);
        updateFighterProgress([100, 100]);
        recordStationResult(result);

        if (race.currentStation >= STATIONS.length - 1) {
          const totalTime1 = cumulativeTimes[0] + result.fighter1Time;
          const totalTime2 = cumulativeTimes[1] + result.fighter2Time;
          const winner = totalTime1 < totalTime2 ? fighter1 : fighter2;

          addCommentary(getCommentary("race_finish", { leader: winner.name }));
          finishRace(winner);
        } else {
          setPhase("station_complete");
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      eventTimersRef.current.forEach((id) => clearTimeout(id));
      commentaryTimersRef.current.forEach((id) => clearTimeout(id));
      eventTimersRef.current = [];
      commentaryTimersRef.current = [];
    };
  }, [
    race.phase,
    race.currentStation,
    fighter1,
    fighter2,
    addCommentary,
    finishRace,
    recordStationResult,
    setPhase,
    triggerEventCallout,
    updateFighterProgress,
  ]);

  useEffect(() => {
    if (race.phase !== "station_complete") return;

    // Play station complete sound
    playSound('station_complete');

    const timer = setTimeout(() => {
      setPhase("station_transition");
    }, RACE_TIMING.station.complete);

    return () => clearTimeout(timer);
  }, [race.phase, setPhase, playSound]);

  useEffect(() => {
    if (race.phase !== "station_transition") return;

    setCurrentStationProgress([0, 0]);
    updateFighterProgress([0, 0]);
    useArenaStore.getState().advanceStation();

    const timer = setTimeout(() => {
      setPhase("station_intro");
    }, RACE_TIMING.station.transition);

    return () => clearTimeout(timer);
  }, [race.phase, setPhase, updateFighterProgress]);

  useEffect(() => {
    if (!eventCallout) return;
    if (eventCallout.type === "bonk" || eventCallout.type === "surge" || eventCallout.type === "lead") {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [eventCallout]);

  useEffect(() => {
    if (race.phase !== "station_complete") return;
    setIsShaking(true);
    const timer = setTimeout(() => setIsShaking(false), 500);
    return () => clearTimeout(timer);
  }, [race.phase]);

  useEffect(() => {
    if (!eventCallout || eventCallout.type !== "lead") return;
    setIsFlashing(true);
    const timer = setTimeout(() => setIsFlashing(false), 300);
    return () => clearTimeout(timer);
  }, [eventCallout]);

  useEffect(() => {
    if (!eventCallout) return;
    const pool = REACTION_EMOJIS[eventCallout.type];
    setReactions(Array.from({ length: 12 }, () => pool[Math.floor(Math.random() * pool.length)]));
    setViewerCount((prev) => prev + 150 + Math.floor(Math.random() * 200));

    const timer = setTimeout(() => setReactions([]), RACE_TIMING.events[eventCallout.type]);
    return () => clearTimeout(timer);
  }, [eventCallout]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHypeLevel((prev) => Math.max(0, prev - 4));
    }, 280);
    return () => clearInterval(interval);
  }, []);

  const overallOdds = fighter1 && fighter2 ? calculateOverallOdds(fighter1, fighter2) : null;
  const liveOdds = fighter1 && fighter2
    ? calculateLiveOdds(fighter1, fighter2, race.stationResults, race.currentStation, STATIONS.length)
    : null;

  const completedTime1 = race.fighterTimes[0].reduce((a, b) => a + b, 0);
  const completedTime2 = race.fighterTimes[1].reduce((a, b) => a + b, 0);
  const stationDurationMs =
    race.currentStation === STATIONS.length - 1
      ? RACE_TIMING.finalStation.racing
      : RACE_TIMING.station.racing;
  const progressGapSeconds =
    ((currentStationProgress[0] - currentStationProgress[1]) / 100) * (stationDurationMs / 1000);
  const currentGapSeconds = completedTime1 - completedTime2 + progressGapSeconds;
  const stationsRemaining = Math.max(0, STATIONS.length - race.currentStation - 1);
  const activeOverallBet = bets.find((bet) => bet.type === "overall_winner" && bet.status === "pending");

  const marketOddsBase =
    race.phase === "selection" ||
    showInitialBetting ||
    race.phase === "pre_race" ||
    race.phase === "station_preview" ||
    race.phase === "countdown"
    ? overallOdds
    : liveOdds ?? overallOdds;
  const marketOdds = marketOddsBase ? applyOddsShift(marketOddsBase, crowdSplit) : null;

  const stationOddsBase = fighter1 && fighter2 && race.currentStation < STATIONS.length
    ? calculateStationOdds(
        fighter1,
        fighter2,
        STATIONS[race.currentStation],
        [
          race.fighterTimes[0].reduce((a, b) => a + b, 0),
          race.fighterTimes[1].reduce((a, b) => a + b, 0),
        ]
      )
    : null;
  const stationOdds = stationOddsBase ? applyOddsShift(stationOddsBase, crowdSplit) : null;

  const nextStation = race.currentStation + 1 < STATIONS.length ? STATIONS[race.currentStation + 1] : undefined;
  const lastStationResult = race.stationResults[race.stationResults.length - 1];
  const displayState = useMemo(() => {
    switch (race.phase) {
      case "pre_race":
        return "tale_of_tape";
      case "station_preview":
        return "station_preview";
      case "countdown":
        return "countdown";
      case "station_intro":
        return "station_intro";
      case "station_racing":
        return "station_racing";
      case "station_complete":
        return "station_result";
      case "station_transition":
        return "station_transition";
      case "round_betting":
        return "round_betting";
      case "results":
        return "results";
      default:
        return "idle";
    }
  }, [eventCallout, race.phase]);
  const showBettingSidebar = displayState === "round_betting";
  const showBettingStrip = displayState === "station_racing";
  const showCommentary = displayState === "station_racing";
  const showSidePanels = displayState === "round_betting";
  const showRaceStats =
    displayState === "station_racing" ||
    displayState === "round_betting" ||
    displayState === "station_complete" ||
    displayState === "station_transition";

  useEffect(() => {
    marketOddsRef.current = marketOdds;
  }, [marketOdds]);

  useEffect(() => {
    if (race.phase === "pre_race" || race.phase === "countdown" || race.phase === "results") {
      setRaceView("broadcast");
      return;
    }

    if (race.phase === "station_preview") {
      setRaceView("broadcast");
      return;
    }

    if (race.phase === "station_intro") {
      if (race.currentStation === STATIONS.length - 1) {
        setRaceView("broadcast");
      } else {
        setRaceView("track");
      }
      return;
    }

    if (race.phase === "round_betting") {
      setRaceView("sidescroller");
      return;
    }

    if (race.phase === "station_complete") {
      setRaceView("sidescroller");
      return;
    }

    if (race.phase === "station_transition") {
      setRaceView("track");
      return;
    }

    if (race.phase === "station_racing") {
      setRaceView("sidescroller");
    }
  }, [race.phase, race.currentStation]);

  return (
    <div className="arena-theme min-h-screen">
      <div className="arena-background" />
      <div className="arena-grade" />
      <div className="scanlines" />
      <div className={cn("min-h-screen arena-stage", isShaking && "arena-shake", isFlashing && "arena-flash")}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-black/50 backdrop-blur-lg border-b border-gray-800">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/arena" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Arena</span>
            </Link>

            <div className="flex items-center gap-4">
              {currentStreak > 0 && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Trophy size={16} />
                  <span className="text-sm font-bold">{currentStreak} streak</span>
                </div>
              )}

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

        <main className="container mx-auto px-4 py-6">
          {/* Selection Phase */}
          {race.phase === "selection" && !showInitialBetting && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center mb-8">
                <h1 className="arena-title text-white mb-2">
                  SELECT YOUR FIGHTERS
                </h1>
                <p className="arena-subtitle">
                  Choose wisely - each fighter has unique abilities and weaknesses
                </p>
              </div>

              <FighterSelector
                selectedFighters={race.fighters}
                onSelect={handleSetFighter}
                onConfirm={handleFighterSelectionConfirm}
                autoMode={AUTO_MODE}
                autoCountdown={autoCountdown}
              />
            </motion.div>
          )}

          {/* Initial Betting Phase */}
          {showInitialBetting && fighter1 && fighter2 && marketOdds && (
            <InitialBetting
              fighter1={fighter1}
              fighter2={fighter2}
              fighter1Odds={marketOdds.fighter1Odds}
              fighter2Odds={marketOdds.fighter2Odds}
              balance={balance}
              communitySplit={crowdSplit}
              poolTotal={communityTotal}
              onPlaceBet={handlePlaceInitialBet}
              onBack={() => setShowInitialBetting(false)}
              onTopUp={canTopUp ? () => addBalance(topUpAmount) : undefined}
              topUpAmount={topUpAmount}
            />
          )}

          {/* Fighter 1 Lore Introduction */}
          <AnimatePresence>
            {race.phase === "fighter1_lore" && fighter1 && (
              <FighterLoreOverlay
                fighter={fighter1}
                durationMs={RACE_TIMING.preRace.fighterLore1}
                onComplete={() => setPhase("fighter2_lore")}
              />
            )}
          </AnimatePresence>

          {/* Fighter 2 Lore Introduction */}
          <AnimatePresence>
            {race.phase === "fighter2_lore" && fighter2 && (
              <FighterLoreOverlay
                fighter={fighter2}
                durationMs={RACE_TIMING.preRace.fighterLore2}
                onComplete={() => setPhase("matchup_versus")}
              />
            )}
          </AnimatePresence>

          {/* Matchup VS Screen */}
          <AnimatePresence>
            {race.phase === "matchup_versus" && fighter1 && fighter2 && (
              <MatchupVersusOverlay
                fighter1={fighter1}
                fighter2={fighter2}
                durationMs={RACE_TIMING.preRace.vsMatchup}
                onComplete={() => setPhase("pre_race")}
              />
            )}
          </AnimatePresence>

          {/* Countdown */}
          <AnimatePresence>
            {race.phase === "countdown" && (
              <RaceCountdown count={countdownValue} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {bigEvent && fighter1 && fighter2 && (
              <BigEventOverlay
                type={bigEvent.type}
                name={bigEvent.name}
                icon={bigEvent.icon}
                seconds={bigEvent.seconds}
                eventKey={bigEvent.eventKey}
                fighter={bigEvent.fighterId === fighter2.id ? fighter2 : fighter1}
                opponent={bigEvent.fighterId === fighter2.id ? fighter1 : fighter2}
                onComplete={() => setBigEvent(null)}
              />
            )}
          </AnimatePresence>

          {/* Station preview overlay */}
          <AnimatePresence>
            {race.phase === "station_preview" && fighter1 && fighter2 && (
              <StationPreviewOverlay
                stations={STATIONS}
                fighter1={fighter1}
                fighter2={fighter2}
                durationMs={PREVIEW_DURATION_MS}
              />
            )}
          </AnimatePresence>

          {/* Station intro overlay */}
          <AnimatePresence>
            {race.phase === "station_intro" && STATIONS[race.currentStation] && (
              <StationIntroOverlay
                station={STATIONS[race.currentStation]}
                stationIndex={race.currentStation}
                totalStations={STATIONS.length}
              />
            )}
          </AnimatePresence>

          {/* Station complete overlay */}
          <AnimatePresence>
            {race.phase === "station_complete" && fighter1 && fighter2 && lastStationResult && (
              <StationCompleteOverlay
                station={STATIONS[race.currentStation]}
                stationIndex={race.currentStation}
                totalStations={STATIONS.length}
                result={lastStationResult}
                fighter1={fighter1}
                fighter2={fighter2}
              />
            )}
          </AnimatePresence>

          {/* Station transition overlay */}
          <AnimatePresence>
            {race.phase === "station_transition" && STATIONS[race.currentStation] && (
              <StationTransitionOverlay
                station={STATIONS[race.currentStation]}
                stationIndex={race.currentStation}
                totalStations={STATIONS.length}
              />
            )}
          </AnimatePresence>

          {/* Live Commentary Overlay - Top Left */}
          {(race.phase === "station_racing" || race.phase === "station_complete") && (
            <LiveCommentaryOverlay
              lines={race.commentary}
              maxLines={3}
              autoHideDelay={8000}
            />
          )}

          {/* Live Betting Context - Top Right */}
          {race.phase === "station_racing" && fighter1 && fighter2 && (
            <LiveBettingContext
              activeBet={activeOverallBet}
              fighter1={fighter1}
              fighter2={fighter2}
              currentGapSeconds={currentGapSeconds}
              stationsRemaining={stationsRemaining}
            />
          )}

          {/* Crowd Hype Meter - Top Center */}
          {(race.phase === "station_racing" || race.phase === "round_betting") && (
            <CrowdHypeMeter
              hypeLevel={hypeLevel}
              viewerCount={viewerCount}
            />
          )}

          {/* Racing Phase */}
          {(race.phase === "pre_race" ||
            race.phase === "countdown" ||
            race.phase === "station_intro" ||
            race.phase === "round_betting" ||
            race.phase === "station_racing" ||
            race.phase === "station_complete" ||
            race.phase === "station_transition") &&
            fighter1 &&
            fighter2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <RaceViewContainer
                  view={raceView}
                  phase={race.phase}
                  fighter1={fighter1}
                  fighter2={fighter2}
                  currentStation={race.currentStation}
                  stationResults={race.stationResults}
                  fighterProgress={currentStationProgress}
                  odds={marketOdds}
                  oddsHistory={oddsHistory}
                  viewerCount={viewerCount}
                  poolTotal={communityTotal}
                  commentary={race.commentary[race.commentary.length - 1]}
                  eventCallout={eventCallout}
                  hypeLevel={hypeLevel}
                />

                {reactions.length > 0 && (
                  <div className="arena-reactions">
                    {reactions.map((reaction, index) => (
                      <span key={`${reaction}-${index}`}>{reaction}</span>
                    ))}
                  </div>
                )}

                {(showCommentary && activeOverallBet) || showRaceStats ? (
                  <div className="space-y-4">
                    {showCommentary && activeOverallBet && (
                      <CashOutPanel
                        bet={activeOverallBet}
                        fighter1={fighter1}
                        fighter2={fighter2}
                        currentGap={currentGapSeconds}
                        stationsRemaining={stationsRemaining}
                        onCashOut={cashOutBet}
                      />
                    )}
                    {showRaceStats && (
                      <RaceStats
                        fighter1={fighter1}
                        fighter2={fighter2}
                        stationResults={race.stationResults}
                      />
                    )}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)] gap-6">
                  <div className="space-y-4">
                    {showBettingStrip && stationOdds && (
                      <BettingStrip
                        fighter1={fighter1}
                        fighter2={fighter2}
                        station={STATIONS[race.currentStation]}
                        odds={stationOdds}
                        amount={quickBetAmount}
                        balance={balance}
                        onBet={handlePlaceRoundBet}
                        onTopUp={canTopUp ? () => addBalance(topUpAmount) : undefined}
                        topUpAmount={topUpAmount}
                      />
                    )}
                    {showCommentary && (
                      <Commentary lines={race.commentary} />
                    )}
                  </div>

                  <div className="space-y-4">
                    {showBettingSidebar && stationOdds && (
                      <BettingSidebar
                        fighter1={fighter1}
                        fighter2={fighter2}
                        station={STATIONS[race.currentStation]}
                        nextStation={nextStation}
                        odds={stationOdds}
                        balance={balance}
                        phase={race.phase}
                        timeLeft={roundBettingTime}
                        selectedAmount={quickBetAmount}
                        quickAmounts={QUICK_BET_AMOUNTS}
                        bets={bets}
                        onSelectAmount={setQuickBetAmount}
                        onQuickBet={handlePlaceRoundBet}
                      />
                    )}

                    {showSidePanels && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                          <LiveBetFeed bets={liveBets} />
                        </div>

                        <div className="arena-community-panel">
                          <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Community Bets</div>
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span style={{ color: "#00ff88" }}>
                              {fighter1.ticker} {crowdSplit.p1}%
                            </span>
                            <span style={{ color: "#ff00ff" }}>
                              {fighter2.ticker} {crowdSplit.p2}%
                            </span>
                          </div>
                          <div className="bet-split mt-2">
                            <div
                              className="bet-split-fill"
                              style={{ width: `${crowdSplit.p1}%` }}
                            />
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Total volume: {communityTotal.toLocaleString()} $COPE
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          {/* Results Phase */}
          <AnimatePresence>
            {race.phase === "results" && race.winner && fighter1 && fighter2 && (
              <RaceResults
                winner={race.winner}
                fighter1={fighter1}
                fighter2={fighter2}
                stationResults={race.stationResults}
                bets={bets}
                onNewRace={handleNewRace}
                balance={balance}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
