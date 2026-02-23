/**
 * Portfolio Store - Zustand State Management
 * Displays portfolio positions synced from backend API (source of truth: blockchain)
 * Trading operations happen in swap.tsx via web3Service + tradingApiService
 */
import { create } from 'zustand';
import type { EnrichedPortfolioPosition } from '../types';
import { tradingApi } from '../services/tradingApiService';

interface PortfolioState {
  positions: EnrichedPortfolioPosition[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Computed (will be calculated on access)
  getTotalValue: () => number;
  getTotalPnL: () => number;
  getTotalEstimatedYield: () => number;
  getPositionByPlayerId: (playerId: string) => EnrichedPortfolioPosition | undefined;

  // Actions
  initialize: (walletAddress?: string) => Promise<void>;
  initializeFromWallet: (walletAddress: string) => Promise<void>;
  setPositions: (positions: EnrichedPortfolioPosition[]) => void;
  refreshPositions: (walletAddress?: string) => Promise<void>;
  clearAllPositions: () => Promise<void>;
  clearError: () => void;
}

// Helper to map API response to enriched position with calculated yield
const mapToEnrichedPosition = (p: {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  yieldData: { yieldPerShare: number; totalYield: number; apy: string };
}): EnrichedPortfolioPosition => ({
  playerId: p.playerId,
  playerName: p.playerName,
  team: p.team,
  position: p.position,
  quantity: p.quantity,
  averagePrice: p.averagePrice,
  currentPrice: p.currentPrice,
  currentValue: p.currentValue,
  costBasis: p.costBasis,
  unrealizedPnL: p.unrealizedPnL,
  unrealizedPnLPercent: p.unrealizedPnLPercent,
  // Yield fields - calculate user's yield from backend data
  yieldPerShare: p.yieldData.yieldPerShare,
  estimatedYield: p.quantity * p.yieldData.yieldPerShare,
  apy: p.yieldData.apy,
  lastUpdated: new Date().toISOString(),
});

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  positions: [],
  isLoading: false,
  isInitialized: false,
  error: null,

  // Computed getters - now use data directly from positions
  getTotalValue: () => {
    return get().positions.reduce((total, pos) => total + pos.currentValue, 0);
  },

  getTotalPnL: () => {
    return get().positions.reduce((total, pos) => total + pos.unrealizedPnL, 0);
  },

  getTotalEstimatedYield: () => {
    return get().positions.reduce((total, pos) => total + pos.estimatedYield, 0);
  },

  getPositionByPlayerId: (playerId) => {
    return get().positions.find(p => p.playerId === playerId);
  },

  // Initialize portfolio - fetch from backend API
  initialize: async (walletAddress?: string) => {
    if (get().isInitialized && get().positions.length > 0) return;

    set({ isLoading: true });
    try {
      if (walletAddress) {
        const response = await tradingApi.getPortfolio(walletAddress);
        const positions = response.portfolio.positions.map(mapToEnrichedPosition);
        set({
          positions,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        // No wallet connected - empty portfolio
        set({
          positions: [],
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      console.error('[PortfolioStore] Failed to initialize:', error);
      set({
        positions: [],
        error: error instanceof Error ? error.message : 'Failed to load positions',
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  // Initialize from wallet address (backend API is source of truth)
  initializeFromWallet: async (walletAddress: string) => {
    set({ isLoading: true });
    try {
      const response = await tradingApi.getPortfolio(walletAddress);
      const positions = response.portfolio.positions.map(mapToEnrichedPosition);
      set({
        positions,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.error('[PortfolioStore] Failed to load from backend:', error);
      set({
        positions: [],
        isLoading: false,
        isInitialized: true,
        error: error instanceof Error ? error.message : 'Failed to load portfolio',
      });
    }
  },

  setPositions: (positions) => {
    set({ positions });
  },

  refreshPositions: async (walletAddress?: string) => {
    set({ isLoading: true });
    try {
      if (walletAddress) {
        const response = await tradingApi.getPortfolio(walletAddress);
        const positions = response.portfolio.positions.map(mapToEnrichedPosition);
        set({ positions, isLoading: false });
        console.log('[PortfolioStore] Refreshed positions from backend:', positions.length);
      } else {
        console.warn('[PortfolioStore] No wallet address provided for refresh');
        set({ isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh',
        isLoading: false,
      });
    }
  },

  clearAllPositions: async () => {
    set({ positions: [], isLoading: false });
    console.log('[PortfolioStore] All positions cleared');
  },

  clearError: () => {
    set({ error: null });
  },
}));
