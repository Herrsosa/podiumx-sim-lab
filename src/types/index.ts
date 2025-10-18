export type Sport = 'Running' | 'HYROX' | 'Cycling' | 'Triathlon' | 'CrossFit' | 'Swimming' | 'Trail Run' | 'Rowing';

export interface Athlete {
  id: string;
  slug: string;
  name: string;
  sport: Sport;
  avatar: string;
  bio: string;
  location: string;
  socials: {
    instagram?: string;
    strava?: string;
    twitter?: string;
  };
  supply: number;
  reserve: number;
  price: number;
  marketCap: number;
  athleteRevenue: number;
  change24h: number;
  volume24h: number;
  workouts: Workout[];
  posts: Post[];
}

export interface Post {
  id: string;
  created_at: string;
  workout_json: Workout | Record<string, unknown> | null;
  image_url: string | null;
  text: string | null;
  token_gated: boolean;
  strava_activity_id: number | null;
  author_id: string;
}

export interface Trade {
  id: string;
  athleteId: string;
  athleteName: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  fee: number;
  timestamp: number;
  userPnL?: number;
}

export interface Position {
  athleteId: string;
  athleteName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface Wallet {
  usdc: number;
  positions: Record<string, Position>;
}

export interface Workout {
  id: string;
  date: string;
  type: 'Run' | 'HYROX' | 'Swim' | 'Bike' | 'Strength' | 'Other';
  distance?: number;
  duration: number;
  pace?: string;
  speed?: string;
  rpe: number;
  notes: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface UserProfile {
  displayName: string;
  sport: Sport;
  location: string;
  bio: string;
  avatar?: string;
  socials: {
    instagram?: string;
    strava?: string;
    twitter?: string;
  };
  workouts: Workout[];
  isAthlete: boolean;
}

export interface AppState {
  athletes: Athlete[];
  wallet: Wallet;
  trades: Trade[];
  userProfile: UserProfile;
  userAthleteId?: string;
  initialized: boolean;
  
  // Actions
  buyTokens: (athleteId: string, quantity: number) => void;
  sellTokens: (athleteId: string, quantity: number) => void;
  createUserAthlete: (initialSupply: number) => void;
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  updateWorkout: (id: string, workout: Partial<Workout>) => void;
  deleteWorkout: (id: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  faucet: (amount: number) => void;
  resetDemo: () => void;
  initializeStore: () => void;
}
