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
// ⚠️ KEEP IN SYNC with api/src/market/market.service.ts (SOURCE OF TRUTH)
export const YIELD_PAYOUTS = {
  GOAL: 0.25,
  ASSIST: 0.12,
  APPEARANCE: 0.02,  // Per match played
  YELLOW_CARD: -0.15,  // Updated to match market.service.ts
  RED_CARD: -1.50,     // Updated to match market.service.ts
  CLEAN_SHEET: 0.10,   // Bonus for goalkeepers/defenders
  PENALTY_MISSED: -0.50,
  OWN_GOAL: -0.75,
};

// Age multiplier for valuation
// ⚠️ KEEP IN SYNC with api/src/market/market.service.ts (SOURCE OF TRUTH)
export const AGE_MULTIPLIERS: Record<string, number> = {
  YOUTH: 15,    // Age < 20 (high potential)
  PRIME: 12,    // Age 20-27 (prime years)
  VETERAN: 8,   // Age > 27
};

// Price bounds
export const PRICE_BOUNDS = {
  MIN: 1.00,
  MAX: Infinity,
};

// Get age multiplier based on age
// ⚠️ KEEP IN SYNC with api/src/market/market.service.ts (SOURCE OF TRUTH)
export const getAgeMultiplier = (age: number): number => {
  if (age < 20) return AGE_MULTIPLIERS.YOUTH;   // High potential
  if (age <= 27) return AGE_MULTIPLIERS.PRIME;  // Prime years
  return AGE_MULTIPLIERS.VETERAN;                // Veteran
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
