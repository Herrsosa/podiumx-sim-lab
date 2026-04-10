// Prediction Markets Types

export type MarketStatus = 'draft' | 'open' | 'closed' | 'locked' | 'resolving' | 'resolved' | 'cancelled';
export type MarketType = 'binary' | 'winner' | 'threshold' | 'head_to_head' | 'podium' | 'station';

export interface Market {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string | null;
  eventCity: string | null;
  division: string | null;
  question: string;
  type: MarketType;
  status: MarketStatus;
  closesAt: string;
  resolvedAt: string | null;
  winningOutcomeId: string | null;
  totalPool: number;
  totalTrades: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  outcomes?: MarketOutcome[];
}

export interface MarketOutcome {
  id: string;
  marketId: string;
  label: string;
  description: string | null;
  shares: number;
  probability: number;
  totalStake: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MarketBet {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  stake: number;
  sharesReceived: number;
  priceAtPurchase: number;
  createdAt: string;
}

export interface PredictionCredits {
  userId: string;
  balance: number;
  totalEarned: number;
  totalWagered: number;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionResult {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  wasCorrect: boolean | null;
  totalStake: number;
  payout: number;
  resolvedAt: string | null;
  createdAt: string;
}

export interface MarketActivity {
  id: string;
  marketId: string;
  userId: string;
  outcomeId: string;
  action: string;
  stake: number;
  shares: number;
  createdAt: string;
  // Joined fields
  username?: string;
  avatarUrl?: string;
  outcomeLabel?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  currentBalance: number;
  totalEarned: number;
  totalWagered: number;
  totalMarkets: number;
  correctPredictions: number;
  accuracy: number;
  netProfit: number;
  rank: number;
}

export interface UserMarketPosition {
  outcomeId: string;
  outcomeLabel: string;
  totalStake: number;
  entryCount: number;
}

export interface PredictionWalletSummary {
  availableBalance: number;
  lockedPredictionBalance: number;
  totalBalance: number;
}

export interface PredictionOutcomeV2 {
  id: string;
  marketId: string;
  outcomeKey: 'yes' | 'no' | string;
  label: string;
  description: string | null;
  totalStake: number;
  sortOrder: number;
}

export interface PredictionMarketCardV2 {
  id: string;
  title: string;
  question: string;
  status: MarketStatus;
  marketScope: 'hyrox' | 'athlete';
  eventName: string;
  eventCity: string | null;
  division: string | null;
  locksAt: string;
  totalPool: number;
  totalTrades: number;
  outcomes: PredictionOutcomeV2[];
}

export interface PredictionMarketV2 extends PredictionMarketCardV2 {
  description: string | null;
  eventDate: string | null;
  officialSource: string | null;
  settlementRuleText: string | null;
  winningOutcomeId: string | null;
  resolvedAt: string | null;
}

// API Response types
// Note: These match the snake_case keys returned by the PostgreSQL function
export interface PlaceBetResponse {
  success: boolean;
  bet_id?: string;
  shares_received?: number;
  new_balance?: number;
  outcome_probability?: number;
  error?: string;
  balance?: number;
}

export interface PlacePredictionEntryResponse {
  success: boolean;
  replayed?: boolean;
  entryId?: string | null;
  marketId?: string | null;
  outcomeId?: string | null;
  stakeAmount?: number | null;
  wallet?: PredictionWalletSummary | null;
  error?: string;
  errorCode?: string;
}

export interface ResolveMarketResponse {
  success: boolean;
  marketId?: string;
  winningOutcomeId?: string;
  totalPool?: number;
  error?: string;
}

// Market with full data for display
export interface MarketWithOutcomes extends Market {
  outcomes: MarketOutcome[];
  userPositions?: UserMarketPosition[];
}

// Market card for list display
export interface MarketCard {
  id: string;
  question: string;
  type: MarketType;
  status: MarketStatus;
  eventCity: string | null;
  division: string | null;
  closesAt: string;
  totalPool: number;
  totalTrades: number;
  topOutcomes: {
    label: string;
    probability: number;
  }[];
}
