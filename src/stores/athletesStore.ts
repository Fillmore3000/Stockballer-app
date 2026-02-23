/**
 * Athletes Store - Zustand
 * Market data and athlete information
 */
import { create } from 'zustand';
import type { TimeFrame, PricePoint } from '../types';
import * as athleteService from '../services/athleteService';
import type { ExtendedAthlete } from '../services/athleteService';

interface AthletesState {
  athletes: ExtendedAthlete[];
  trendingAthletes: ExtendedAthlete[];
  searchResults: ExtendedAthlete[];
  selectedAthlete: ExtendedAthlete | null;
  chartData: PricePoint[];
  selectedTimeframe: TimeFrame;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;

  // Actions
  fetchAthletes: () => Promise<void>;
  fetchTrending: () => Promise<void>;
  searchAthletes: (query: string) => Promise<void>;
  selectAthlete: (athlete: ExtendedAthlete | null) => void;
  fetchAthleteById: (id: string) => Promise<ExtendedAthlete | null>;
  fetchChartData: (athleteId: string, timeframe: TimeFrame) => Promise<void>;
  setTimeframe: (timeframe: TimeFrame) => void;
  clearSearch: () => void;
  clearError: () => void;
}

export const useAthletesStore = create<AthletesState>((set, get) => ({
  athletes: [],
  trendingAthletes: [],
  searchResults: [],
  selectedAthlete: null,
  chartData: [],
  selectedTimeframe: '1D',
  isLoading: false,
  isSearching: false,
  error: null,

  fetchAthletes: async () => {
    set({ isLoading: true, error: null });

    try {
      const athletes = await athleteService.fetchAllAthletes();
      set({ athletes, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch athletes',
        isLoading: false,
      });
    }
  },

  fetchTrending: async () => {
    set({ isLoading: true, error: null });

    try {
      const trendingAthletes = await athleteService.fetchTrendingAthletes();
      set({ trendingAthletes, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch trending',
        isLoading: false,
      });
    }
  },

  searchAthletes: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    set({ isSearching: true });

    try {
      const results = await athleteService.searchAthletes(query);
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      set({ isSearching: false });
    }
  },

  selectAthlete: (athlete) => {
    set({ selectedAthlete: athlete });
  },

  fetchAthleteById: async (id: string) => {
    try {
      const athlete = await athleteService.fetchAthleteById(id);
      if (athlete) {
        set({ selectedAthlete: athlete });
      }
      return athlete;
    } catch (error) {
      console.error('Failed to fetch athlete:', error);
      return null;
    }
  },

  fetchChartData: async (athleteId: string, timeframe: TimeFrame) => {
    set({ isLoading: true });

    try {
      const data = await athleteService.fetchChartData(athleteId, timeframe);
      set({ chartData: data, selectedTimeframe: timeframe, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  setTimeframe: (timeframe) => {
    set({ selectedTimeframe: timeframe });
  },

  clearSearch: () => {
    set({ searchResults: [] });
  },

  clearError: () => {
    set({ error: null });
  },
}));
