/**
 * User Types - Web3 Ready
 */

export interface User {
  id: string;
  walletAddress: string;       // Primary identifier (Web3 ready)
  email?: string;              // Optional for notifications
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  isVerified: boolean;
}

export interface Portfolio {
  userId: string;
  totalValue: number;
  cashBalance: number;         // USDC balance
  investedValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
}

// Web3-ready wallet state
// Note: Web3 connection state is managed by walletStore, not here
export interface WalletState {
  address: string;             // Simulated or real Web3 address
  usdcBalance: number;         // Available USDC balance (backend/demo)
  totalDeposited: number;      // Lifetime deposits
  totalWithdrawn: number;      // Lifetime withdrawals
  createdAt: string;
}

// Legacy wallet interface (deprecated, use WalletState)
export interface Wallet {
  userId: string;
  balance: number;
  currency: string;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

// Transaction record for history
export interface TransactionRecord {
  id: string;
  type: 'buy' | 'sell' | 'claim' | 'deposit' | 'withdraw';
  playerId?: string;
  playerName?: string;
  quantity?: number;
  pricePerToken?: number;
  usdcAmount: number;
  fees: {
    liquidity: number;
    yieldPool: number;
    platform: number;
    total: number;
  };
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

// Legacy transaction interface (deprecated)
export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'fee' | 'dividend';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
  completedAt?: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  athleteIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'price_alert' | 'order_filled' | 'news' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}
