/**
 * Trading Types - Yield-Based Token Model
 */

export type OrderType = 'market' | 'limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'expired';

export interface Order {
  id: string;
  playerId: string;
  athleteId?: string; // Legacy alias
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  quantity: number;
  price?: number;
  filledPrice?: number;
  filledQuantity: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// Enriched portfolio position for UI display
// Contains calculated yield based on quantity * yieldPerShare
export interface EnrichedPortfolioPosition {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  quantity: number;
  averagePrice: number;      // Average price paid per token
  currentPrice: number;      // Current market price
  currentValue: number;      // quantity * currentPrice
  costBasis: number;         // quantity * averagePrice
  unrealizedPnL: number;     // currentValue - costBasis
  unrealizedPnLPercent: number;
  // Yield fields (calculated: quantity * yieldPerShare)
  yieldPerShare: number;     // Per-token yield from backend
  estimatedYield: number;    // User's yield = quantity * yieldPerShare
  apy: string;               // APY percentage string
  lastUpdated: string;
}

// Re-export PortfolioPosition from API service for backward compatibility
// Use EnrichedPortfolioPosition for UI components that need calculated yield
export type { PortfolioPosition } from '../services/tradingApiService';

export interface Trade {
  id: string;
  orderId: string;
  playerId: string;
  athleteId?: string; // Legacy alias
  side: OrderSide;
  quantity: number;
  price: number;
  total: number;
  fee: number;
  executedAt: string;
}

// Swap/Checkout breakdown
export interface SwapQuote {
  playerId: string;
  playerName: string;
  playerImage: string;

  // Input
  inputAmount: number;        // USDC amount
  inputCurrency: 'USDC';

  // Output
  outputAmount: number;       // Token amount
  pricePerToken: number;

  // Fee breakdown (for transparency)
  liquidityReserve: number;   // Backs token price
  yieldPoolContribution: number; // Funds payouts
  platformFee: number;

  // Totals
  totalFees: number;
  effectiveRate: number;

  expiresAt: string;
}

export interface PricePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Optional yield event marker
  yieldEvent?: {
    action: string;
    payout: number;
  };
}

export type TimeFrame = '1H' | '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

export interface ChartData {
  playerId: string;
  timeframe: TimeFrame;
  data: PricePoint[];
}

// Market overview stats
export interface MarketStats {
  totalMarketCap: number;
  activeYieldPool: number;
  totalPlayersListed: number;
  playersLiveNow: number;
  volume24h: number;
}

