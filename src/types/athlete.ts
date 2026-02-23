/**
 * Athlete/Player Types - Yield-Based Token Model
 * 
 * ENHANCED: Now includes devaluation factors (cards, penalties, form)
 */

/**
 * Extended player stats from backend
 */
export interface PlayerStatsExtended {
  // Positive factors
  goals: number;
  assists: number;
  matches: number;
  cleanSheets: number;
  minutesPlayed: number;
  shotsOnTarget: number;
  passAccuracy: number;

  // Devaluation factors
  yellowCards: number;
  redCards: number;
  penaltiesMissed: number;
  ownGoals: number;
  matchesMissed: number;

  // Form tracking
  rating: number;
  last5Rating: number;
}

/**
 * Yield breakdown from formula
 */
export interface YieldBreakdown {
  goalYield: number;
  assistYield: number;
  matchYield: number;
  cleanSheetYield: number;
  yellowCardPenalty: number;
  redCardPenalty: number;
  penaltyMissPenalty: number;
  ownGoalPenalty: number;
  missedMatchPenalty: number;
}

/**
 * Extended yield data from backend
 */
export interface YieldDataExtended {
  yield_per_share: number;
  total_yield: number;
  raw_yield: number;
  penalties: number;
  form_multiplier: number;
  breakdown: YieldBreakdown;
  apy: string;
}

export interface Player {
  id: string;
  name: string;
  sport: Sport;
  team: string;
  teamLogo?: string;
  position: PlayerPosition | string; // Allow legacy string positions
  imageUrl: string;
  photoUrl?: string; // API-Football player photo URL
  nationality: string;
  age: number;
  jerseyNumber?: number;
}

export interface PlayerToken extends Player {
  // On-chain token ID (ERC-1155)
  tokenId?: number;
  onChainTokenId?: number;

  // Pricing
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;

  // Token Supply (optional for flexibility)
  totalSupply?: number;
  circulatingSupply?: number;
  marketCap: number;

  // Yield Data
  ytdYield: number;           // Total yield earned this season
  projectedNextPayout: number; // AI prediction for next match
  nextFixture: string;         // "vs Luton" 
  nextFixtureDate?: string;    // ISO date (optional)

  // Extended stats from backend (flexible to support both snake_case and camelCase)
  stats?: PlayerStatsExtended | Record<string, unknown>;
  yieldData?: YieldDataExtended;

  // Form/Risk indicators
  formMultiplier?: number;    // 0.7 - 1.3
  ageMultiplier?: number;     // 8, 12, or 15

  // Status
  isLive: boolean;            // Currently playing
  hasUpcomingFixture?: boolean;

  // Legacy compatibility fields
  playerId?: string;          // Legacy alias for id
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  totalShares?: number;
  availableShares?: number;
}

export type Sport = 'soccer' | 'basketball' | 'football' | 'baseball' | 'hockey' | 'tennis' | 'golf' | 'mma' | 'boxing';

export type PlayerPosition =
  // Soccer
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward'
  | 'striker'
  // Basketball
  | 'point_guard'
  | 'shooting_guard'
  | 'small_forward'
  | 'power_forward'
  | 'center'
  // Football (NFL)
  | 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S' | 'K' | 'P'
  // Baseball
  | 'SP' | 'RP' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'DH/P'
  // Hockey
  | 'G' | 'D' | 'LW' | 'RW'
  // Generic
  | 'SF' | 'PG' | 'SG' | 'PF';

// Yield payout rules per position/action
export interface YieldRule {
  action: YieldAction;
  payout: number;
  description: string;
}

export type YieldAction =
  | 'goal'
  | 'assist'
  | 'clean_sheet'
  | 'penalty_save'
  | 'motm'           // Man of the Match
  | 'win'
  | 'draw';

// Yield event history (for chart overlays)
export interface YieldEvent {
  id: string;
  playerId: string;
  date: string;
  action: YieldAction;
  payout: number;
  matchDescription: string;
}

export interface PlayerNews {
  id: string;
  playerId: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  imageUrl?: string;
}

// Legacy alias for compatibility
export type Athlete = Player;
export type AthleteMarket = PlayerToken;


