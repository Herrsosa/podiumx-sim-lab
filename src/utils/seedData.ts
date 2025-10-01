import { Athlete, Trade, Wallet, UserProfile } from '@/types';
import { calculatePrice, generatePriceHistory } from './bondingCurve';

const ATHLETE_DATA: Omit<Athlete, 'supply' | 'reserve' | 'price' | 'marketCap' | 'athleteRevenue' | 'change24h' | 'volume24h'>[] = [
  {
    id: '1',
    slug: 'nils',
    name: 'Nils Bergström',
    sport: 'Running',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nils',
    bio: 'Marathon specialist with 2:15 PR. Training for Berlin 2025.',
    location: 'Stockholm, Sweden',
    socials: { instagram: '@nilsruns', strava: 'nils-bergstrom' },
  },
  {
    id: '2',
    slug: 'mara',
    name: 'Mara Chen',
    sport: 'HYROX',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mara',
    bio: 'Elite HYROX athlete. 2x World Championships podium.',
    location: 'Singapore',
    socials: { instagram: '@marahyrox', twitter: '@marac' },
  },
  {
    id: '3',
    slug: 'leo',
    name: 'Leo Martinez',
    sport: 'Cycling',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leo',
    bio: 'Professional cyclist. Climbing specialist, mountain lover.',
    location: 'Barcelona, Spain',
    socials: { instagram: '@leocycles', strava: 'leo-martinez' },
  },
  {
    id: '4',
    slug: 'ava',
    name: 'Ava Thompson',
    sport: 'Triathlon',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ava',
    bio: 'Ironman 70.3 champion. Swim-bike-run enthusiast.',
    location: 'Boulder, USA',
    socials: { instagram: '@avatri', strava: 'ava-thompson' },
  },
  {
    id: '5',
    slug: 'kai',
    name: 'Kai Anderson',
    sport: 'CrossFit',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kai',
    bio: 'CrossFit Games veteran. Strength meets conditioning.',
    location: 'Auckland, New Zealand',
    socials: { instagram: '@kaicf', twitter: '@kaianderson' },
  },
  {
    id: '6',
    slug: 'rio',
    name: 'Rio Silva',
    sport: 'Swimming',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rio',
    bio: 'Olympic swimmer. 100m freestyle specialist.',
    location: 'Rio de Janeiro, Brazil',
    socials: { instagram: '@rioswims' },
  },
  {
    id: '7',
    slug: 'zara',
    name: 'Zara Williams',
    sport: 'Trail Run',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zara',
    bio: 'Ultra-runner. UTMB finisher. Mountains are my playground.',
    location: 'Chamonix, France',
    socials: { instagram: '@zaratrails', strava: 'zara-williams' },
  },
  {
    id: '8',
    slug: 'max',
    name: 'Max Jensen',
    sport: 'Rowing',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=max',
    bio: 'Competitive rower. 2k PR: 6:15. Erg life.',
    location: 'Copenhagen, Denmark',
    socials: { instagram: '@maxrows', twitter: '@maxjensen' },
  },
];

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
