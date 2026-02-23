/**
 * StockBaller Chainlink CRE Workflow Types
 * Type definitions for the athlete price oracle workflow
 */

// API-Football response types
export interface ApiFootballPlayer {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    nationality: string;
    height: string;
    weight: string;
    photo: string;
  };
  statistics: ApiFootballStatistics[];
}

export interface ApiFootballStatistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
  };
  games: {
    appearences: number;
    lineups: number;
    minutes: number;
    rating: string | null;
  };
  goals: {
    total: number | null;
    assists: number | null;
  };
  cards: {
    yellow: number;
    red: number;
  };
  penalty: {
    scored: number;
    missed: number;
  };
}

export interface ApiFootballResponse {
  response: ApiFootballPlayer[];
  errors: string[];
  results: number;
}

// Athlete configuration for the workflow
export interface AthleteConfig {
  tokenId: number;
  apiFootballId: number;
  name: string;
  position: string;
  baseMultiplier: number; // 15 (age<20), 12 (20-27), 8 (>27)
}

// Price calculation result
export interface PriceResult {
  tokenId: number;
  oldPrice: bigint;
  newPrice: bigint;
  stats: {
    goals: number;
    assists: number;
    appearances: number;
    rating: number;
    yellowCards: number;
    redCards: number;
  };
  timestamp: number;
}

// Workflow configuration
export interface WorkflowConfig {
  apiFootballKey: string;
  baseSepoliaRpc: string;
  vaultContractAddress: string;
  athletes: AthleteConfig[];
  updateIntervalHours: number;
}

// EVM transaction result
export interface TransactionResult {
  tokenId: number;
  txHash: string;
  success: boolean;
  error?: string;
}



// Workflow execution summary
export interface WorkflowExecutionSummary {
  timestamp: number;
  athletesProcessed: number;
  successfulUpdates: number;
  failedUpdates: number;
  transactions: TransactionResult[];
  totalGasUsed?: bigint;
}
