import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, Athlete, Trade, Position } from '@/types';
import { calculateBuyImpact, calculateSellImpact, calculatePrice } from '@/utils/bondingCurve';
import { generateSeedAthletes, generateSeedTrades, generateSeedWallet, generateSeedProfile } from '@/utils/seedData';

const STORAGE_KEY = 'podiumx-state';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      athletes: [],
      wallet: { usdc: 0, positions: {} },
      trades: [],
      userProfile: generateSeedProfile(),
      userAthleteId: undefined,
      initialized: false,

      initializeStore: () => {
        const state = get();
        if (!state.initialized) {
          const athletes = generateSeedAthletes();
          const trades = generateSeedTrades(athletes);
          const wallet = generateSeedWallet(athletes);
          
          set({
            athletes,
            trades,
            wallet,
            initialized: true,
          });
        }
      },

      buyTokens: (athleteId: string, quantity: number) => {
        const state = get();
        const athlete = state.athletes.find((a) => a.id === athleteId);
        if (!athlete) return;

        const impact = calculateBuyImpact(athlete.supply, athlete.reserve, quantity);
        
        // Check if user has enough USDC
        if (state.wallet.usdc < impact.total) {
          throw new Error('Insufficient USDC balance');
        }

        // Update athlete
        const updatedAthletes = state.athletes.map((a) =>
          a.id === athleteId
            ? {
                ...a,
                supply: impact.newSupply,
                reserve: impact.newReserve,
                price: impact.newPrice,
                marketCap: impact.newPrice * impact.newSupply,
                athleteRevenue: a.athleteRevenue + impact.fee * 0.5,
                volume24h: a.volume24h + impact.total,
              }
            : a
        );

        // Update wallet
        const currentPosition = state.wallet.positions[athleteId];
        const newPosition: Position = currentPosition
          ? {
              ...currentPosition,
              quantity: currentPosition.quantity + quantity,
              avgCost:
                (currentPosition.avgCost * currentPosition.quantity + impact.subtotal) /
                (currentPosition.quantity + quantity),
              currentPrice: impact.newPrice,
              pnl: 0,
              pnlPercent: 0,
            }
          : {
              athleteId,
              athleteName: athlete.name,
              quantity,
              avgCost: impact.avgPrice,
              currentPrice: impact.newPrice,
              pnl: 0,
              pnlPercent: 0,
            };

        // Recalculate PnL
        newPosition.pnl = (newPosition.currentPrice - newPosition.avgCost) * newPosition.quantity;
        newPosition.pnlPercent = ((newPosition.currentPrice - newPosition.avgCost) / newPosition.avgCost) * 100;

        const updatedWallet = {
          usdc: state.wallet.usdc - impact.total,
          positions: {
            ...state.wallet.positions,
            [athleteId]: newPosition,
          },
        };

        // Add trade
        const trade: Trade = {
          id: `${Date.now()}-${athleteId}`,
          athleteId,
          athleteName: athlete.name,
          type: 'buy',
          quantity,
          price: impact.avgPrice,
          total: impact.total,
          fee: impact.fee,
          timestamp: Date.now(),
        };

        set({
          athletes: updatedAthletes,
          wallet: updatedWallet,
          trades: [trade, ...state.trades],
        });
      },

      sellTokens: (athleteId: string, quantity: number) => {
        const state = get();
        const athlete = state.athletes.find((a) => a.id === athleteId);
        const position = state.wallet.positions[athleteId];

        if (!athlete || !position) return;
        if (position.quantity < quantity) {
          throw new Error('Insufficient token balance');
        }

        const impact = calculateSellImpact(athlete.supply, athlete.reserve, quantity);

        // Update athlete
        const updatedAthletes = state.athletes.map((a) =>
          a.id === athleteId
            ? {
                ...a,
                supply: impact.newSupply,
                reserve: impact.newReserve,
                price: impact.newPrice,
                marketCap: impact.newPrice * impact.newSupply,
                athleteRevenue: a.athleteRevenue + impact.fee * 0.5,
                volume24h: a.volume24h + impact.subtotal,
              }
            : a
        );

        // Update wallet
        const newQuantity = position.quantity - quantity;
        const updatedPositions = { ...state.wallet.positions };

        if (newQuantity === 0) {
          delete updatedPositions[athleteId];
        } else {
          const newPosition = {
            ...position,
            quantity: newQuantity,
            currentPrice: impact.newPrice,
            pnl: (impact.newPrice - position.avgCost) * newQuantity,
            pnlPercent: ((impact.newPrice - position.avgCost) / position.avgCost) * 100,
          };
          updatedPositions[athleteId] = newPosition;
        }

        const updatedWallet = {
          usdc: state.wallet.usdc + impact.total,
          positions: updatedPositions,
        };

        // Calculate realized PnL for this trade
        const realizedPnL = (impact.avgPrice - position.avgCost) * quantity;

        // Add trade
        const trade: Trade = {
          id: `${Date.now()}-${athleteId}`,
          athleteId,
          athleteName: athlete.name,
          type: 'sell',
          quantity,
          price: impact.avgPrice,
          total: impact.total,
          fee: impact.fee,
          timestamp: Date.now(),
          userPnL: realizedPnL,
        };

        set({
          athletes: updatedAthletes,
          wallet: updatedWallet,
          trades: [trade, ...state.trades],
        });
      },

      createUserAthlete: (initialSupply: number) => {
        const state = get();
        const athleteId = `user-athlete-${Date.now()}`;
        const slug = state.userProfile.displayName.toLowerCase().replace(/\s+/g, '-');
        
        // Calculate initial reserve (0.1 USDC per token)
        const initialPrice = 0.1;
        const initialReserve = initialPrice * initialSupply;

        const newAthlete: Athlete = {
          id: athleteId,
          slug,
          name: state.userProfile.displayName,
          sport: state.userProfile.sport,
          avatar: state.userProfile.avatar || '',
          bio: state.userProfile.bio,
          location: state.userProfile.location,
          socials: state.userProfile.socials,
          supply: initialSupply,
          reserve: initialReserve,
          price: initialPrice,
          marketCap: initialPrice * initialSupply,
          athleteRevenue: 0,
          change24h: 0,
          volume24h: 0,
          workouts: state.userProfile.workouts,
        };

        // Give user 1 token
        const position: Position = {
          athleteId,
          athleteName: newAthlete.name,
          quantity: 1,
          avgCost: initialPrice,
          currentPrice: initialPrice,
          pnl: 0,
          pnlPercent: 0,
        };

        set({
          athletes: [...state.athletes, newAthlete],
          userAthleteId: athleteId,
          wallet: {
            ...state.wallet,
            positions: {
              ...state.wallet.positions,
              [athleteId]: position,
            },
          },
        });
      },

      addWorkout: (workout) => {
        const state = get();
        const newWorkout = {
          ...workout,
          id: `${Date.now()}`,
        };

        set({
          userProfile: {
            ...state.userProfile,
            workouts: [newWorkout, ...state.userProfile.workouts],
          },
        });
      },

      updateWorkout: (id, updates) => {
        const state = get();
        set({
          userProfile: {
            ...state.userProfile,
            workouts: state.userProfile.workouts.map((w) =>
              w.id === id ? { ...w, ...updates } : w
            ),
          },
        });
      },

      deleteWorkout: (id) => {
        const state = get();
        set({
          userProfile: {
            ...state.userProfile,
            workouts: state.userProfile.workouts.filter((w) => w.id !== id),
          },
        });
      },

      updateProfile: (updates) => {
        const state = get();
        set({
          userProfile: {
            ...state.userProfile,
            ...updates,
          },
        });
      },

      faucet: (amount) => {
        const state = get();
        set({
          wallet: {
            ...state.wallet,
            usdc: state.wallet.usdc + amount,
          },
        });
      },

      resetDemo: () => {
        const athletes = generateSeedAthletes();
        const trades = generateSeedTrades(athletes);
        const wallet = generateSeedWallet(athletes);
        const userProfile = generateSeedProfile();

        set({
          athletes,
          trades,
          wallet,
          userProfile,
          initialized: true,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
