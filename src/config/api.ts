/**
 * API Configuration
 * Configure external API endpoints and keys
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';

// Backend API URL
// In development: localhost
// In production: set EXPO_PUBLIC_API_URL to your deployed API
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (isDevelopment ? 'http://localhost:3001/api' : 'https://api.prospect.io/api');

// API-Football Configuration
export const API_FOOTBALL_CONFIG = {
  BASE_URL: 'https://v3.football.api-sports.io',
  // Store API key in environment or replace with your key
  API_KEY: process.env.EXPO_PUBLIC_SPORTMONKS_API_KEY || '',
  // Rate limiting: 10 requests per minute for free tier
  RATE_LIMIT_MS: 6000, // 6 seconds between requests
  // Current season
  SEASON: 2024,
  // Premier League ID
  PREMIER_LEAGUE_ID: 39,
};

// Yield payout rules (micro-yield per action)
export const YIELD_PAYOUTS = {
  GOAL: 0.25,
  ASSIST: 0.12,
  APPEARANCE: 0.02,  // Per match played
  YELLOW_CARD: -0.05,
  RED_CARD: -0.50,
  CLEAN_SHEET: 0.10, // Bonus for goalkeepers/defenders
};

// Age multiplier for valuation
export const AGE_MULTIPLIERS: Record<string, number> = {
  PRIME: 15,    // Age 23-29
  YOUNG: 12,    // Age < 23
  VETERAN: 8,   // Age 30+
};

// Price bounds
export const PRICE_BOUNDS = {
  MIN: 1.00,
  MAX: Infinity,
};

// Get age multiplier based on age
export const getAgeMultiplier = (age: number): number => {
  if (age < 23) return AGE_MULTIPLIERS.YOUNG;
  if (age <= 29) return AGE_MULTIPLIERS.PRIME;
  return AGE_MULTIPLIERS.VETERAN;
};

// Calculate cash yield from stats
export const calculateCashYield = (stats: {
  goals: number;
  assists: number;
  matchesPlayed: number;
  yellowCards: number;
  redCards: number;
  cleanSheets?: number;
}): number => {
  const gains =
    (stats.goals * YIELD_PAYOUTS.GOAL) +
    (stats.assists * YIELD_PAYOUTS.ASSIST) +
    (stats.matchesPlayed * YIELD_PAYOUTS.APPEARANCE) +
    ((stats.cleanSheets || 0) * YIELD_PAYOUTS.CLEAN_SHEET);

  const penalties =
    (stats.yellowCards * Math.abs(YIELD_PAYOUTS.YELLOW_CARD)) +
    (stats.redCards * Math.abs(YIELD_PAYOUTS.RED_CARD));

  // Floor at $0 - never negative
  return Math.max(0, gains - penalties);
};

// Calculate token price from yield and age
export const calculateTokenPrice = (yield_: number, age: number): number => {
  const multiplier = getAgeMultiplier(age);
  const rawPrice = yield_ * multiplier;

  // Clamp to price bounds
  return Math.max(PRICE_BOUNDS.MIN, Math.min(PRICE_BOUNDS.MAX, rawPrice));
};
