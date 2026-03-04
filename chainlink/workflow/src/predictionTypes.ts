/**
 * StockBaller AI Prediction Workflow Types
 * Type definitions for the match prediction market
 */

// Match fixture from API-Football
export interface MatchFixture {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  kickoffTime: number; // Unix timestamp
  venue: string;
  league: string;
}

// AI prediction result
export interface AIPrediction {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  confidence: number; // 1-100
  reasoning: string;
  timestamp: number;
}

// On-chain prediction submission result
export interface PredictionResult {
  matchId: number;
  txHash: string;
  success: boolean;
  prediction?: AIPrediction;
  error?: string;
}

// User bet on AI prediction
export interface UserBet {
  user: string; // Wallet address
  matchId: number;
  betAmount: bigint; // In USDC
  timestamp: number;
}

// Match settlement result
export interface MatchSettlement {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number;
  actualAwayScore: number;
  isMatch: boolean;
  totalPool: bigint;
  winnersCount: number;
  bonusPerWinner: bigint;
}

// Prediction workflow configuration
export interface PredictionConfig {
  apiFootballKey: string;
  openAiKey: string;
  baseSepoliaRpc: string;
  predictionMarketAddress: string;
  bonusAmountUSD: number;
  premierLeagueId: number;
}

// Leaderboard entry
export interface PredictionLeaderboard {
  user: string;
  correctPredictions: number;
  totalBets: number;
  totalWinnings: bigint;
  winRate: number;
}
