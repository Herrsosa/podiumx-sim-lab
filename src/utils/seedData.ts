import { Athlete, Trade, Wallet, UserProfile, Workout } from '@/types';
import { calculatePrice, generatePriceHistory } from './bondingCurve';
import nilsAvatar from '@/assets/athletes/nils.jpg';
import maraAvatar from '@/assets/athletes/mara.jpg';
import leoAvatar from '@/assets/athletes/leo.jpg';
import avaAvatar from '@/assets/athletes/ava.jpg';
import kaiAvatar from '@/assets/athletes/kai.jpg';
import rioAvatar from '@/assets/athletes/rio.jpg';
import zaraAvatar from '@/assets/athletes/zara.jpg';
import maxAvatar from '@/assets/athletes/max.jpg';

const ATHLETE_DATA: Omit<Athlete, 'supply' | 'reserve' | 'price' | 'marketCap' | 'athleteRevenue' | 'change24h' | 'volume24h' | 'workouts'>[] = [
  {
    id: '1',
    slug: 'nils',
    name: 'Nils Bergström',
    sport: 'Running',
    avatar: nilsAvatar,
    bio: 'Marathon specialist with 2:15 PR. Training for Berlin 2025.',
    location: 'Stockholm, Sweden',
    socials: { instagram: '@nilsruns', strava: 'nils-bergstrom' },
  },
  {
    id: '2',
    slug: 'mara',
    name: 'Mara Chen',
    sport: 'HYROX',
    avatar: maraAvatar,
    bio: 'Elite HYROX athlete. 2x World Championships podium.',
    location: 'Singapore',
    socials: { instagram: '@marahyrox', twitter: '@marac' },
  },
  {
    id: '3',
    slug: 'leo',
    name: 'Leo Martinez',
    sport: 'Cycling',
    avatar: leoAvatar,
    bio: 'Professional cyclist. Climbing specialist, mountain lover.',
    location: 'Barcelona, Spain',
    socials: { instagram: '@leocycles', strava: 'leo-martinez' },
  },
  {
    id: '4',
    slug: 'ava',
    name: 'Ava Thompson',
    sport: 'Triathlon',
    avatar: avaAvatar,
    bio: 'Ironman 70.3 champion. Swim-bike-run enthusiast.',
    location: 'Boulder, USA',
    socials: { instagram: '@avatri', strava: 'ava-thompson' },
  },
  {
    id: '5',
    slug: 'kai',
    name: 'Kai Anderson',
    sport: 'CrossFit',
    avatar: kaiAvatar,
    bio: 'CrossFit Games veteran. Strength meets conditioning.',
    location: 'Auckland, New Zealand',
    socials: { instagram: '@kaicf', twitter: '@kaianderson' },
  },
  {
    id: '6',
    slug: 'rio',
    name: 'Rio Silva',
    sport: 'Swimming',
    avatar: rioAvatar,
    bio: 'Olympic swimmer. 100m freestyle specialist.',
    location: 'Rio de Janeiro, Brazil',
    socials: { instagram: '@rioswims' },
  },
  {
    id: '7',
    slug: 'zara',
    name: 'Zara Williams',
    sport: 'Trail Run',
    avatar: zaraAvatar,
    bio: 'Ultra-runner. UTMB finisher. Mountains are my playground.',
    location: 'Chamonix, France',
    socials: { instagram: '@zaratrails', strava: 'zara-williams' },
  },
  {
    id: '8',
    slug: 'max',
    name: 'Max Jensen',
    sport: 'Rowing',
    avatar: maxAvatar,
    bio: 'Competitive rower. 2k PR: 6:15. Erg life.',
    location: 'Copenhagen, Denmark',
    socials: { instagram: '@maxrows', twitter: '@maxjensen' },
  },
];

function generateWorkoutsForAthlete(athleteId: string, sport: string): Workout[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const workouts: Workout[] = [];
  
  const workoutTypes: Record<string, string[]> = {
    'Running': ['Run', 'Run', 'Run', 'Strength'],
    'HYROX': ['HYROX', 'Strength', 'Run'],
    'Cycling': ['Bike', 'Bike', 'Strength'],
    'Triathlon': ['Swim', 'Bike', 'Run', 'Strength'],
    'CrossFit': ['Strength', 'Strength', 'Other'],
    'Swimming': ['Swim', 'Swim', 'Strength'],
    'Trail Run': ['Run', 'Run', 'Strength'],
    'Rowing': ['Other', 'Strength', 'Other'],
  };

  const types = workoutTypes[sport] || ['Other', 'Strength'];
  
  // Generate 5-8 recent workouts
  const numWorkouts = Math.floor(Math.random() * 4) + 5;
  
  for (let i = 0; i < numWorkouts; i++) {
    const type = types[Math.floor(Math.random() * types.length)] as Workout['type'];
    const daysAgo = i * (Math.random() * 2 + 1); // 1-3 days apart
    const duration = Math.floor(Math.random() * 60) + 30; // 30-90 min
    const distance = type === 'Run' || type === 'Bike' ? Math.random() * 15 + 5 : undefined;
    const pace = type === 'Run' && distance ? `${Math.floor(4 + Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}/km` : undefined;
    const speed = type === 'Bike' && distance ? `${(15 + Math.random() * 10).toFixed(1)} km/h` : undefined;
    const rpe = Math.floor(Math.random() * 3) + 6; // 6-9

    const notes = [
      'Felt great today! Perfect conditions.',
      'Tough session but pushed through.',
      'Easy recovery day.',
      'New PR! Feeling strong.',
      'Good progress on technique.',
      'Solid effort, ready for more.',
    ];

    workouts.push({
      id: `${athleteId}-workout-${i}`,
      date: new Date(now - daysAgo * dayMs).toISOString().split('T')[0],
      type,
      distance,
      duration,
      pace,
      speed,
      rpe,
      notes: notes[Math.floor(Math.random() * notes.length)],
    });
  }

  return workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generateSeedAthletes(): Athlete[] {
  return ATHLETE_DATA.map((athlete, index) => {
    const initialSupply = 40 + index * 5; // 40-75 range
    const initialReserve = 1500 + index * 200; // 1500-2900 range
    const price = calculatePrice(initialSupply);
    const marketCap = price * initialSupply;
    
    // Generate some random 24h change
    const change24h = (Math.random() - 0.5) * 20; // +/- 10%
    const volume24h = Math.random() * 5000 + 1000; // 1k-6k

    return {
      ...athlete,
      supply: initialSupply,
      reserve: initialReserve,
      price,
      marketCap,
      athleteRevenue: Math.random() * 500 + 100,
      change24h,
      volume24h,
      workouts: generateWorkoutsForAthlete(athlete.id, athlete.sport),
    };
  });
}

export function generateSeedTrades(athletes: Athlete[]): Trade[] {
  const trades: Trade[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  athletes.forEach((athlete) => {
    // Generate 15-25 trades per athlete
    const numTrades = Math.floor(Math.random() * 10) + 15;
    
    for (let i = 0; i < numTrades; i++) {
      const type = Math.random() > 0.5 ? 'buy' : 'sell';
      const quantity = Math.floor(Math.random() * 5) + 1;
      const price = athlete.price * (0.8 + Math.random() * 0.4); // +/- 20%
      const total = price * quantity;
      const fee = total * 0.03;

      trades.push({
        id: `${athlete.id}-${i}`,
        athleteId: athlete.id,
        athleteName: athlete.name,
        type,
        quantity,
        price,
        total,
        fee,
        timestamp: now - Math.random() * dayMs * 7, // Last 7 days
      });
    }
  });

  return trades.sort((a, b) => b.timestamp - a.timestamp);
}

export function generateSeedWallet(athletes: Athlete[]): Wallet {
  const wallet: Wallet = {
    usdc: 2000,
    positions: {},
  };

  // Give user starter positions in 2-3 athletes
  const numPositions = Math.floor(Math.random() * 2) + 2;
  const selectedAthletes = [...athletes]
    .sort(() => Math.random() - 0.5)
    .slice(0, numPositions);

  selectedAthletes.forEach((athlete) => {
    const quantity = Math.floor(Math.random() * 3) + 2; // 2-4 tokens
    const avgCost = athlete.price * (0.85 + Math.random() * 0.15); // Bought cheaper
    const pnl = (athlete.price - avgCost) * quantity;
    const pnlPercent = ((athlete.price - avgCost) / avgCost) * 100;

    wallet.positions[athlete.id] = {
      athleteId: athlete.id,
      athleteName: athlete.name,
      quantity,
      avgCost,
      currentPrice: athlete.price,
      pnl,
      pnlPercent,
    };
  });

  return wallet;
}

export function generateSeedProfile(): UserProfile {
  return {
    displayName: 'Demo Athlete',
    sport: 'Running',
    location: 'San Francisco, USA',
    bio: 'Passionate runner and fitness enthusiast. Always chasing the next PR.',
    socials: {},
    workouts: [],
    isAthlete: false,
  };
}
