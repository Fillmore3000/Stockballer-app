/**
 * Platform Store - Tracks global platform statistics
 * Liquidity pool, total trading volume, yield pool, etc.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'platform_state';

export interface AthletePoolData {
  playerId: string;
  playerName: string;
  liquidityReserve: number;      // USDC backing this athlete's tokens
  yieldPool: number;             // USDC available for yield payouts
  circulatingSupply: number;     // Tokens held by users
  totalSupply: number;           // Max tokens available
  currentPrice: number;          // Derived from liquidity/supply
  totalVolume: number;           // All-time trading volume
}

export interface PlatformState {
  // Aggregated stats
  totalLiquidity: number;        // Total USDC in all liquidity reserves
  totalYieldPool: number;        // Total USDC available for yields
  totalPlatformFees: number;     // Total fees collected
  totalTradingVolume: number;    // All-time volume
  totalTransactions: number;     // Count of all trades

  // Per-athlete pools
  athletePools: Record<string, AthletePoolData>;

  // Timestamps
  lastUpdated: string;
  createdAt: string;
}

interface PlatformStore extends PlatformState {
  // Actions
  initialize: () => Promise<void>;

  // Called when user buys tokens
  recordBuy: (
    playerId: string,
    playerName: string,
    usdcAmount: number,
    tokensReceived: number,
    fees: { liquidity: number; yieldPool: number; platform: number }
  ) => Promise<void>;

  // Called when user sells tokens
  recordSell: (
    playerId: string,
    usdcPaidOut: number,
    tokensSold: number,
    platformFee: number
  ) => Promise<void>;

  // Called when yield is claimed
  recordYieldClaim: (
    playerId: string,
    amountClaimed: number
  ) => Promise<void>;

  // Get pool data for an athlete
  getAthletePool: (playerId: string) => AthletePoolData | undefined;

  // Get dynamic price based on liquidity (AMM-style)
  getDynamicPrice: (playerId: string, basePrice: number) => number;

  // Reset for testing
  reset: () => Promise<void>;
}

const DEFAULT_STATE: PlatformState = {
  totalLiquidity: 0,
  totalYieldPool: 0,
  totalPlatformFees: 0,
  totalTradingVolume: 0,
  totalTransactions: 0,
  athletePools: {},
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

export const usePlatformStore = create<PlatformStore>((set, get) => ({
  ...DEFAULT_STATE,

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PlatformState;
        set(parsed);
      }
    } catch (error) {
      console.error('Error loading platform state:', error);
    }
  },

  recordBuy: async (playerId, playerName, usdcAmount, tokensReceived, fees) => {
    const state = get();

    // Get or create athlete pool
    const existingPool = state.athletePools[playerId] || {
      playerId,
      playerName,
      liquidityReserve: 0,
      yieldPool: 0,
      circulatingSupply: 0,
      totalSupply: 10000, // Default max supply
      currentPrice: 0,
      totalVolume: 0,
    };

    // Update pool
    const updatedPool: AthletePoolData = {
      ...existingPool,
      liquidityReserve: existingPool.liquidityReserve + fees.liquidity,
      yieldPool: existingPool.yieldPool + fees.yieldPool,
      circulatingSupply: existingPool.circulatingSupply + tokensReceived,
      totalVolume: existingPool.totalVolume + usdcAmount,
      currentPrice: (existingPool.liquidityReserve + fees.liquidity) /
        (existingPool.circulatingSupply + tokensReceived || 1),
    };

    const newState = {
      totalLiquidity: state.totalLiquidity + fees.liquidity,
      totalYieldPool: state.totalYieldPool + fees.yieldPool,
      totalPlatformFees: state.totalPlatformFees + fees.platform,
      totalTradingVolume: state.totalTradingVolume + usdcAmount,
      totalTransactions: state.totalTransactions + 1,
      athletePools: {
        ...state.athletePools,
        [playerId]: updatedPool,
      },
      lastUpdated: new Date().toISOString(),
    };

    set(newState);

    // Persist
    try {
      const fullState: PlatformState = { ...get() };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));
    } catch (error) {
      console.error('Error saving platform state:', error);
    }
  },

  recordSell: async (playerId, usdcPaidOut, tokensSold, platformFee) => {
    const state = get();
    const pool = state.athletePools[playerId];

    if (!pool) return;

    // Update pool - liquidity decreases, supply decreases
    const updatedPool: AthletePoolData = {
      ...pool,
      liquidityReserve: Math.max(0, pool.liquidityReserve - usdcPaidOut),
      circulatingSupply: Math.max(0, pool.circulatingSupply - tokensSold),
      totalVolume: pool.totalVolume + usdcPaidOut + platformFee,
      currentPrice: pool.circulatingSupply > tokensSold
        ? (pool.liquidityReserve - usdcPaidOut) / (pool.circulatingSupply - tokensSold)
        : pool.currentPrice,
    };

    const newState = {
      totalLiquidity: Math.max(0, state.totalLiquidity - usdcPaidOut),
      totalPlatformFees: state.totalPlatformFees + platformFee,
      totalTradingVolume: state.totalTradingVolume + usdcPaidOut + platformFee,
      totalTransactions: state.totalTransactions + 1,
      athletePools: {
        ...state.athletePools,
        [playerId]: updatedPool,
      },
      lastUpdated: new Date().toISOString(),
    };

    set(newState);

    // Persist
    try {
      const fullState: PlatformState = { ...get() };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));
    } catch (error) {
      console.error('Error saving platform state:', error);
    }
  },

  recordYieldClaim: async (playerId, amountClaimed) => {
    const state = get();
    const pool = state.athletePools[playerId];

    if (!pool) return;

    // Deduct from yield pool
    const updatedPool: AthletePoolData = {
      ...pool,
      yieldPool: Math.max(0, pool.yieldPool - amountClaimed),
    };

    const newState = {
      totalYieldPool: Math.max(0, state.totalYieldPool - amountClaimed),
      athletePools: {
        ...state.athletePools,
        [playerId]: updatedPool,
      },
      lastUpdated: new Date().toISOString(),
    };

    set(newState);

    // Persist
    try {
      const fullState: PlatformState = { ...get() };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));
    } catch (error) {
      console.error('Error saving platform state:', error);
    }
  },

  getAthletePool: (playerId) => {
    return get().athletePools[playerId];
  },

  getDynamicPrice: (playerId, basePrice) => {
    const pool = get().athletePools[playerId];
    if (!pool || pool.circulatingSupply === 0) {
      return basePrice; // Use base price if no trading has occurred
    }
    // Price = Liquidity Reserve / Circulating Supply
    return pool.liquidityReserve / pool.circulatingSupply;
  },

  reset: async () => {
    set(DEFAULT_STATE);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting platform state:', error);
    }
  },
}));
