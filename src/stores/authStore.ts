/**
 * Auth Store - Web3 Only Mode
 * Uses MetaMask wallet for authentication and mUSDC for trading
 */
import { create } from 'zustand';
import type { User, TransactionRecord } from '../types';
import { tradingApi } from '../services/tradingApiService';
import { useWalletStore } from './walletStore';

interface AuthState {
  user: User | null;
  transactions: TransactionRecord[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions  
  syncWithWallet: () => Promise<void>;
  loadTransactionHistory: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  transactions: [],
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /**
   * Sync auth state with connected Web3 wallet
   * Called after wallet connection
   */
  syncWithWallet: async () => {
    const walletState = useWalletStore.getState();
    
    if (!walletState.isConnected || !walletState.address) {
      set({
        user: null,
        isAuthenticated: false,
        transactions: [],
      });
      return;
    }

    set({ isLoading: true });
    
    try {
      const address = walletState.address;
      
      // Register with backend (creates user if not exists)
      try {
        await tradingApi.getBalance(address);
      } catch (e) {
        console.log('[AuthStore] Backend sync:', e);
      }

      // Create user from wallet
      const user: User = {
        id: address,
        walletAddress: address,
        username: `user_${address.slice(2, 8)}`,
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        createdAt: new Date().toISOString(),
        isVerified: true,
      };

      // Load transactions
      let transactions: TransactionRecord[] = [];
      try {
        const txData = await tradingApi.getTransactions(address);
        transactions = txData.map(tx => ({
          id: tx.id,
          type: tx.type.toLowerCase() as 'buy' | 'sell',
          playerId: tx.playerId,
          playerName: tx.playerName,
          quantity: tx.quantity,
          pricePerToken: tx.pricePerToken,
          usdcAmount: tx.totalAmount,
          fees: { liquidity: 0, yieldPool: 0, platform: tx.fee, total: tx.fee },
          timestamp: tx.createdAt,
          status: tx.status === 'CONFIRMED' ? 'completed' : 'pending',
        }));
      } catch (e) {
        console.log('[AuthStore] No transactions yet');
      }

      set({
        user,
        transactions,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      console.log(`[AuthStore] Synced with wallet: ${address}`);
    } catch (error) {
      console.error('[AuthStore] Sync error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to sync with wallet',
        isLoading: false,
      });
    }
  },

  loadTransactionHistory: async () => {
    const walletState = useWalletStore.getState();
    if (!walletState.address) {
      console.log('[AuthStore] loadTransactionHistory: No wallet address');
      return;
    }
    
    try {
      console.log('[AuthStore] Loading transaction history for:', walletState.address);
      const txData = await tradingApi.getTransactions(walletState.address);
      console.log('[AuthStore] Received transactions from API:', txData.length);
      
      const transactions: TransactionRecord[] = txData.map(tx => ({
        id: tx.id,
        type: tx.type.toLowerCase() as 'buy' | 'sell',
        playerId: tx.playerId,
        playerName: tx.playerName,
        quantity: tx.quantity,
        pricePerToken: tx.pricePerToken,
        usdcAmount: tx.totalAmount,
        fees: { liquidity: 0, yieldPool: 0, platform: tx.fee, total: tx.fee },
        timestamp: tx.createdAt,
        status: tx.status === 'CONFIRMED' ? 'completed' : 'pending',
      }));
      
      console.log('[AuthStore] Mapped transactions:', transactions.length);
      set({ transactions });
    } catch (error) {
      console.error('[AuthStore] Failed to load transactions:', error);
    }
  },

  logout: () => {
    // Disconnect wallet via walletStore
    useWalletStore.getState().disconnect();
    set({
      user: null,
      isAuthenticated: false,
      transactions: [],
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
