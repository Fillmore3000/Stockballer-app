/**
 * StockBaller Price Calculator
 * Ported from api/src/market/market.service.ts for Chainlink CRE Workflow
 * 
 * FORMULA: Price = IPO + (Net_Yield × Form_Multiplier × Age_Multiplier)
 * 
 * Where:
 * - Net_Yield = Positive_Yield - Penalties
 * - Positive performance → Price rises above $100 IPO
 * - High risk/penalties → Price can drop below $100 IPO
 */

import { ApiFootballStatistics, PriceResult } from './types.js';

// Price constraints (in USDC with 6 decimals)
const IPO_PRICE = 100_000_000n;      // $100.00 starting price
const MIN_PRICE = 1_000_000n;         // $1.00 minimum
const MAX_PRICE = 10000_000_000n;     // $10,000.00 soft cap for hackathon

// Yield values (in micro-USDC, will multiply by 1000 for precision)
const YIELD_PER_GOAL = 250_000n;          // $0.25 per goal
const YIELD_PER_ASSIST = 120_000n;        // $0.12 per assist
const YIELD_PER_MATCH = 20_000n;          // $0.02 per match
const YIELD_PER_CLEAN_SHEET = 100_000n;   // $0.10 per clean sheet

// Penalty values (negative impact)
const PENALTY_YELLOW_CARD = 150_000n;     // -$0.15 per yellow
const PENALTY_RED_CARD = 1_500_000n;      // -$1.50 per red
const PENALTY_MISSED_PENALTY = 500_000n;  // -$0.50 per missed pen
const PENALTY_OWN_GOAL = 750_000n;        // -$0.75 per own goal

/**
 * Get age multiplier based on player's age
 * - Age < 20: 15x (high potential youth)
 * - Age 20-27: 12x (prime years)
 * - Age > 27: 8x (veteran)
 */
export function getAgeMultiplier(age: number): bigint {
  if (age < 20) return 15n;
  if (age <= 27) return 12n;
  return 8n;
}

/**
 * Calculate form multiplier based on rating (700-1300 in basis points)
 * Rating scale: 0-10 from API-Football
 * Returns: 700 = 0.7x, 1000 = 1.0x, 1300 = 1.3x
 */
export function getFormMultiplier(rating: number): bigint {
  if (rating <= 0) return 1000n; // No rating = neutral (1.0x)
  
  // Map 0-10 rating to 700-1300 multiplier
  // 5.0 = 1000 (1.0x average)
  // 7.0+ = 1200+ (good form)
  // <5.0 = 800- (poor form)
  const normalized = (rating - 5.0) / 5.0; // -1 to +1
  const multiplier = Math.max(700, Math.min(1300, 1000 + Math.floor(normalized * 300)));
  return BigInt(multiplier);
}

/**
 * Extract stats from API-Football response
 */
export function extractStats(statistics: ApiFootballStatistics[]) {
  const current = statistics[0]; // Current season stats
  
  return {
    goals: current?.goals?.total ?? 0,
    assists: current?.goals?.assists ?? 0,
    appearances: current?.games?.appearences ?? 0,
    rating: parseFloat(current?.games?.rating ?? '0'),
    yellowCards: current?.cards?.yellow ?? 0,
    redCards: current?.cards?.red ?? 0,
    penaltiesMissed: current?.penalty?.missed ?? 0,
  };
}

/**
 * Calculate the positive yield from good performance
 */
export function calculatePositiveYield(stats: ReturnType<typeof extractStats>): bigint {
  const goalYield = BigInt(stats.goals) * YIELD_PER_GOAL;
  const assistYield = BigInt(stats.assists) * YIELD_PER_ASSIST;
  const matchYield = BigInt(stats.appearances) * YIELD_PER_MATCH;
  
  return goalYield + assistYield + matchYield;
}

/**
 * Calculate penalties from negative events
 */
export function calculatePenalties(stats: ReturnType<typeof extractStats>): bigint {
  const yellowPenalty = BigInt(stats.yellowCards) * PENALTY_YELLOW_CARD;
  const redPenalty = BigInt(stats.redCards) * PENALTY_RED_CARD;
  const penMissPenalty = BigInt(stats.penaltiesMissed) * PENALTY_MISSED_PENALTY;
  
  return yellowPenalty + redPenalty + penMissPenalty;
}

/**
 * Main price calculation function
 * 
 * @param statistics - Raw API-Football statistics array
 * @param age - Player's age
 * @param tokenId - Token ID for the result
 * @param currentPrice - Current on-chain price (for comparison)
 * @returns PriceResult with old and new prices
 */
export function calculateAthletePrice(
  statistics: ApiFootballStatistics[],
  age: number,
  tokenId: number,
  currentPrice: bigint = IPO_PRICE
): PriceResult {
  const stats = extractStats(statistics);
  
  // Calculate positive and negative yields
  const positiveYield = calculatePositiveYield(stats);
  const penalties = calculatePenalties(stats);
  
  // Net yield (can be negative if penalties exceed positive performance)
  const netYield = positiveYield - penalties;
  
  // Get multipliers
  const formMultiplier = getFormMultiplier(stats.rating);
  const ageMultiplier = getAgeMultiplier(age);
  
  // Calculate price adjustment
  // Formula: yieldAdjustment = netYield × (formMultiplier / 1000) × ageMultiplier
  // Using integer math to avoid floating point issues
  const yieldAdjustment = (netYield * formMultiplier * ageMultiplier) / 1000n;
  
  // Final price = IPO + adjustment
  let newPrice = IPO_PRICE + yieldAdjustment;
  
  // Clamp between MIN and MAX
  if (newPrice < MIN_PRICE) {
    newPrice = MIN_PRICE;
  } else if (newPrice > MAX_PRICE) {
    newPrice = MAX_PRICE;
  }
  
  return {
    tokenId,
    oldPrice: currentPrice,
    newPrice,
    stats: {
      goals: stats.goals,
      assists: stats.assists,
      appearances: stats.appearances,
      rating: stats.rating,
      yellowCards: stats.yellowCards,
      redCards: stats.redCards,
    },
    timestamp: Date.now(),
  };
}

/**
 * Format price from USDC (6 decimals) to human readable
 */
export function formatPrice(priceInMicroUsdc: bigint): string {
  const dollars = Number(priceInMicroUsdc) / 1_000_000;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Convert human readable price to USDC (6 decimals)
 */
export function toUsdcPrice(dollars: number): bigint {
  return BigInt(Math.floor(dollars * 1_000_000));
}
