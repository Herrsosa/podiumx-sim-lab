export type Sport = 'Running' | 'HYROX' | 'Cycling' | 'Triathlon' | 'CrossFit' | 'Swimming' | 'Trail Run' | 'Rowing';
export type ProfileType = 'human' | 'agent';
export type PostType = 'proof_of_sweat' | 'proof_of_contribution';
export type ContributionType = 'research' | 'coding' | 'design' | 'outreach' | 'ops' | 'automation' | 'analysis' | 'custom';
export type ContributionStatus = 'completed' | 'partial' | 'failed' | 'in_review';
export type VerificationStatus = 'self_reported' | 'human_verified' | 'system_verified';
export type ContributionArtifactType = 'image' | 'link' | 'file' | 'text';

export const SPORTS: Sport[] = ['Running', 'HYROX', 'Cycling', 'Triathlon', 'CrossFit', 'Swimming', 'Trail Run', 'Rowing'];

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
  createdAt?: string;
  priceUpdatedAt?: string | null;
  tokenCreatedAt?: string | null;
  profileType?: ProfileType;
  contributionStats?: ContributionProfileStats | null;
}

export interface ContributionProfileStats {
  totalContributions: number;
  completedContributions: number;
  verifiedContributions: number;
  acceptanceRate: number;
  topCategories: Array<{ type: ContributionType; count: number }>;
  recentContributionStreak: number;
  artifactsShipped: number;
}

export interface ProofOfContributionArtifact {
  id: string;
  contribution_post_id?: string;
  artifact_type: ContributionArtifactType;
  label: string;
  url: string | null;
  storage_path: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  sort_order: number;
  created_at?: string;
}

export interface ProofOfContribution {
  post_id: string;
  title: string;
  contribution_type: ContributionType;
  task_brief: string;
  workflow_summary: string;
  result_summary: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  status: ContributionStatus;
  verification_status: VerificationStatus;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  verifier_note: string | null;
  task_id: string | null;
  bounty_id: string | null;
  attestation_hash: string | null;
  external_reference: string | null;
  reproducibility_metadata: Record<string, unknown> | null;
  artifacts: ProofOfContributionArtifact[];
  created_at?: string;
  updated_at?: string;
}

export interface Post {
  id: string;
  created_at: string;
  workout_json: Workout | Record<string, unknown> | null;
  image_url: string | null;
  text: string | null;
  token_gated: boolean;
  strava_activity_id: number | null;
  strava_map_polyline?: string | null;
  author_id: string;
  visibility: 'public' | 'supporters' | 'backers';
  min_tokens_required: number;
  post_type: PostType;
  is_pinned?: boolean;
  monad_tx_hash?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  location_country_code?: string | null;
  location_geohash?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  has_location?: boolean | null;
  proof_of_contribution?: ProofOfContribution | null;
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
  sol: number;
  positions: Record<string, Position>;
}

export interface Workout {
  id: string;
  date: string;
  type: 'Run' | 'HYROX' | 'Swim' | 'Bike' | 'Strength' | 'HIIT' | 'Other';
  distance?: number;
  duration: number;
  pace?: string;
  speed?: string;
  rpe: number;
  notes: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  visibility: 'public' | 'supporters' | 'backers';
  minTokensRequired: number;
  is_agent?: boolean;
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
