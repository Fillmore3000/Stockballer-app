/**
 * Trading API Service - Connects to backend trading endpoints
 * Replaces local AsyncStorage-based transactionService
 */
import { API_BASE_URL } from '../config/api';

// Types
export interface BalanceResponse {
  walletAddress: string;
  usdcBalance: number;
}

export interface DepositResponse {
  success: boolean;
  newBalance: number;
  txHash: string;
}

export interface QuoteResponse {
  playerId: string;
  playerName: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  pricePerToken: number;
  subtotal: number;
  fee: number;
  total: number;
  feeBreakdown: {
    tradingFee: number;
    tradingFeePercent: number;
  };
  expiresAt: string;
}

export interface BuyResponse {
  success: boolean;
  orderId: string;
  side: 'BUY';
  playerId: string;
  playerName: string;
  quantity: number;
  pricePerToken: number;
  subtotal: number;
  fee: number;
  totalCost: number;
  newBalance: number;
  holding: {
    quantity: number;
    averagePrice: number;
  };
}

export interface SellResponse {
  success: boolean;
  orderId: string;
  side: 'SELL';
  playerId: string;
  playerName: string;
  quantity: number;
  pricePerToken: number;
  subtotal: number;
  fee: number;
  netProceeds: number;
  newBalance: number;
  holding: {
    quantity: number;
    averagePrice: number;
  } | null;
}

export interface PortfolioPositionYieldData {
  yieldPerShare: number;
  totalYield: number;
  apy: string;
}

export interface PortfolioPosition {
  playerId: string;
  tokenId?: number;
  playerName: string;
  team: string;
  position: string;
  photoUrl?: string; // Player photo from API-Football
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  // Yield data from backend (per-player yield info)
  yieldData: PortfolioPositionYieldData;
}

export interface PortfolioResponse {
  walletAddress: string;
  usdcBalance: number;
  portfolio: {
    positions: PortfolioPosition[];
    totalValue: number;
    totalCost: number;
    totalPnL: number;
    totalPnLPercent: number;
    totalPositions: number;
  };
}

// API Transaction record (from backend) - different from frontend's TransactionRecord
export interface ApiTransactionRecord {
  id: string;
  type: 'BUY' | 'SELL';
  playerId: string;
  playerName: string;
  team: string;
  quantity: number;
  pricePerToken: number;
  totalAmount: number;
  fee: number;
  txHash: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: string;
  completedAt: string | null;
}

class TradingApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/trading`;
  }

  /**
   * Get user's USDC balance
   */
  async getBalance(walletAddress: string): Promise<BalanceResponse> {
    const response = await fetch(`${this.baseUrl}/balance?wallet=${walletAddress}`);
    if (!response.ok) {
      throw new Error('Failed to get balance');
    }
    return response.json();
  }

  /**
   * Deposit USDC (after blockchain transfer)
   */
  async deposit(walletAddress: string, amount: number, txHash: string): Promise<DepositResponse> {
    const response = await fetch(`${this.baseUrl}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, amount, txHash }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to deposit');
    }
    return response.json();
  }

  /**
   * Get a quote for buying or selling
   */
  async getQuote(playerId: string, side: 'BUY' | 'SELL', quantity: number): Promise<QuoteResponse> {
    const response = await fetch(
      `${this.baseUrl}/quote?playerId=${playerId}&side=${side}&quantity=${quantity}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get quote');
    }
    return response.json();
  }

  /**
   * Execute a buy order
   */
  async buy(walletAddress: string, playerId: string, quantity: number, txHash?: string): Promise<BuyResponse> {
    const response = await fetch(`${this.baseUrl}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, playerId, side: 'BUY', quantity, txHash }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to buy tokens');
    }
    return response.json();
  }

  /**
   * Execute a sell order
   */
  async sell(walletAddress: string, playerId: string, quantity: number, txHash?: string): Promise<SellResponse> {
    const response = await fetch(`${this.baseUrl}/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, playerId, side: 'SELL', quantity, txHash }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sell tokens');
    }
    return response.json();
  }

  /**
   * Get user's portfolio
   */
  async getPortfolio(walletAddress: string): Promise<PortfolioResponse> {
    const response = await fetch(`${this.baseUrl}/portfolio?wallet=${walletAddress}`);
    if (!response.ok) {
      throw new Error('Failed to get portfolio');
    }
    return response.json();
  }

  /**
   * Get user's transaction history
   */
  async getTransactions(walletAddress: string, limit = 50): Promise<ApiTransactionRecord[]> {
    const response = await fetch(`${this.baseUrl}/transactions?wallet=${walletAddress}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to get transactions');
    }
    return response.json();
  }

  /**
   * Get holding for a specific player
   */
  async getHolding(walletAddress: string, playerId: string): Promise<{ holding: PortfolioPosition | null }> {
    const response = await fetch(`${this.baseUrl}/holding/${playerId}?wallet=${walletAddress}`);
    if (!response.ok) {
      throw new Error('Failed to get holding');
    }
    return response.json();
  }

  /**
   * Sync portfolio from blockchain
   * Reads on-chain balances and updates database to match
   */
  async syncFromBlockchain(walletAddress: string): Promise<{
    success: boolean;
    walletAddress: string;
    usdcBalance: { old: number; new: number };
    holdingChanges: { playerId: string; playerName: string; dbQty: number; chainQty: number; action: string }[];
  }> {
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sync from blockchain');
    }
    return response.json();
  }
}

// Export singleton instance
export const tradingApi = new TradingApiService();
export default tradingApi;
