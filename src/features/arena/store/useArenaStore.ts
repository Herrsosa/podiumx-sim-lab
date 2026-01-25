import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ArenaCharacter,
  ArenaState,
  Bet,
  RaceHistoryEntry,
  RacePhase,
  RaceState,
  StationResult,
} from "../types";

const STARTING_BALANCE = 1000;

const initialRaceState: RaceState = {
  phase: "selection",
  currentStation: 0,
  fighters: [null, null],
  fighterProgress: [0, 0],
  fighterTimes: [[], []],
  stationResults: [],
  winner: null,
  commentary: [],
  roundBettingTimeLeft: 0,
};

export const useArenaStore = create<ArenaState>()(
  persist(
    (set, get) => ({
      // Balance
      balance: STARTING_BALANCE,
      startingBalance: STARTING_BALANCE,

      // Current race
      race: initialRaceState,
      bets: [],

      // History
      raceHistory: [],
      currentStreak: 0,
      bestStreak: 0,
      totalRaces: 0,
      totalWinnings: 0,

      // Actions
      setFighter: (slot: 0 | 1, character: ArenaCharacter | null) => {
        set((state) => ({
          race: {
            ...state.race,
            fighters:
              slot === 0
                ? [character, state.race.fighters[1]]
                : [state.race.fighters[0], character],
          },
        }));
      },

      placeBet: (bet: Omit<Bet, "id" | "status">) => {
        const { balance, bets } = get();
        if (bet.amount > balance) return false;

        const newBet: Bet = {
          ...bet,
          id: `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: "pending",
        };

        set((state) => ({
          balance: state.balance - bet.amount,
          bets: [...state.bets, newBet],
        }));

        return true;
      },

      cancelBet: (betId: string) => {
        const { bets } = get();
        const bet = bets.find((b) => b.id === betId);
        if (!bet || bet.status !== "pending") return;

        set((state) => ({
          balance: state.balance + bet.amount,
          bets: state.bets.filter((b) => b.id !== betId),
        }));
      },

      cashOutBet: (betId: string, payout: number) => {
        const { bets } = get();
        const bet = bets.find((b) => b.id === betId);
        if (!bet || bet.status !== "pending") return;

        set((state) => ({
          balance: state.balance + payout,
          bets: state.bets.map((item) =>
            item.id === betId ? { ...item, status: "cashed_out" as const, payout } : item
          ),
        }));
      },

      startRace: () => {
        set((state) => ({
          race: {
            ...state.race,
            phase: "fighter1_lore", // Start with lore introduction
            commentary: [],
            stationResults: [],
            fighterProgress: [0, 0],
            fighterTimes: [[], []],
            currentStation: 0,
            winner: null,
          },
        }));
      },

      advanceStation: () => {
        set((state) => ({
          race: {
            ...state.race,
            currentStation: state.race.currentStation + 1,
          },
        }));
      },

      setPhase: (phase: RacePhase) => {
        set((state) => ({
          race: {
            ...state.race,
            phase,
          },
        }));
      },

      addCommentary: (line: string) => {
        set((state) => ({
          race: {
            ...state.race,
            commentary: [...state.race.commentary, line],
          },
        }));
      },

      recordStationResult: (result: StationResult) => {
        set((state) => ({
          race: {
            ...state.race,
            stationResults: [...state.race.stationResults, result],
            fighterTimes: [
              [...state.race.fighterTimes[0], result.fighter1Time],
              [...state.race.fighterTimes[1], result.fighter2Time],
            ],
          },
        }));
      },

      finishRace: (winner: ArenaCharacter) => {
        const { race, bets } = get();
        const [fighter1, fighter2] = race.fighters;
        if (!fighter1 || !fighter2) return;

        // Calculate total times
        const fighter1Total = race.fighterTimes[0].reduce((a, b) => a + b, 0);
        const fighter2Total = race.fighterTimes[1].reduce((a, b) => a + b, 0);
        const margin = Math.abs(fighter1Total - fighter2Total);

        const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
        const cashedOutPayout = bets
          .filter((bet) => bet.status === "cashed_out")
          .reduce((sum, bet) => sum + (bet.payout ?? 0), 0);
        let totalPayout = cashedOutPayout;
        let payoutFromPending = 0;
        const updatedBets = bets.map((bet) => {
          if (bet.status !== "pending") return bet;

          // For overall winner bets
          if (bet.type === "overall_winner") {
            if (bet.fighterId === winner.id) {
              const payout = bet.amount * bet.odds;
              totalPayout += payout;
              payoutFromPending += payout;
              return { ...bet, status: "won" as const, payout };
            } else {
              return { ...bet, status: "lost" as const, payout: 0 };
            }
          }

          // For station bets - check if that station's winner matches
          if (bet.type === "station_winner" && bet.stationId) {
            const stationResult = race.stationResults.find(
              (r) => r.stationId === bet.stationId
            );
            if (stationResult) {
              const stationWinnerId =
                stationResult.winner === 0
                  ? fighter1.id
                  : stationResult.winner === 1
                  ? fighter2.id
                  : null;
              if (stationWinnerId === bet.fighterId) {
                const payout = bet.amount * bet.odds;
                totalPayout += payout;
                payoutFromPending += payout;
                return { ...bet, status: "won" as const, payout };
              }
            }
            return { ...bet, status: "lost" as const, payout: 0 };
          }

          return bet;
        });

        // Create history entry
        const historyEntry: RaceHistoryEntry = {
          id: `race-${Date.now()}`,
          timestamp: Date.now(),
          fighter1: {
            id: fighter1.id,
            name: fighter1.name,
            ticker: fighter1.ticker,
            avatar: fighter1.avatar,
          },
          fighter2: {
            id: fighter2.id,
            name: fighter2.name,
            ticker: fighter2.ticker,
            avatar: fighter2.avatar,
          },
          winner: {
            id: winner.id,
            name: winner.name,
            ticker: winner.ticker,
            avatar: winner.avatar,
          },
          totalBet,
          totalPayout,
          margin,
        };

        // Update streak
        const wonOverall = updatedBets.some(
          (b) => b.type === "overall_winner" && b.status === "won"
        );
        const lostOverall = updatedBets.some(
          (b) => b.type === "overall_winner" && b.status === "lost"
        );

        set((state) => {
          const newStreak = wonOverall
            ? state.currentStreak + 1
            : lostOverall
            ? 0
            : state.currentStreak;

          return {
            race: {
              ...state.race,
              phase: "results",
              winner,
            },
            bets: updatedBets,
            balance: state.balance + payoutFromPending,
            raceHistory: [historyEntry, ...state.raceHistory].slice(0, 50), // Keep last 50
            totalRaces: state.totalRaces + 1,
            totalWinnings: state.totalWinnings + (totalPayout - totalBet),
            currentStreak: newStreak,
            bestStreak: Math.max(state.bestStreak, newStreak),
          };
        });
      },

      settleBets: () => {
        // This is handled in finishRace
      },

      resetRace: () => {
        set({
          race: initialRaceState,
          bets: [],
        });
      },

      addBalance: (amount: number) => {
        set((state) => ({
          balance: state.balance + amount,
        }));
      },

      setRoundBettingTime: (time: number) => {
        set((state) => ({
          race: {
            ...state.race,
            roundBettingTimeLeft: time,
          },
        }));
      },

      updateFighterProgress: (progress: [number, number]) => {
        set((state) => ({
          race: {
            ...state.race,
            fighterProgress: progress,
          },
        }));
      },
    }),
    {
      name: "arena-state",
      partialize: (state) => ({
        balance: state.balance,
        raceHistory: state.raceHistory,
        currentStreak: state.currentStreak,
        bestStreak: state.bestStreak,
        totalRaces: state.totalRaces,
        totalWinnings: state.totalWinnings,
      }),
    }
  )
);
