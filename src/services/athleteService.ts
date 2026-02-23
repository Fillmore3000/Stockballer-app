/**
 * Athlete Service - Data Layer
 * Fetches athlete data from Backend API (NestJS + MongoDB)
 * 
 * ENHANCED: Now supports extended stats with devaluation factors
 */
import type { AthleteMarket, Sport, PricePoint, TimeFrame, PlayerStatsExtended, YieldDataExtended } from '../types';
import athletesData from '../data/athletes.json';

// Backend API base URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// Backend player response type (enhanced)
interface BackendPlayer {
  id: string;
  tokenId: number;
  onChainTokenId?: number;
  name: string;
  position: string;
  team: string;
  photoUrl?: string; // Player photo from API-Football
  age: number;
  multiplier: number;
  ipoPrice: number;
  currentPrice: number;
  totalSupply: number;
  circulatingSupply: number;
  stats: {
    goals: number;
    assists: number;
    matches: number;
    cleanSheets: number;
    minutesPlayed?: number;
    shotsOnTarget?: number;
    passAccuracy?: number;
    yellowCards?: number;
    redCards?: number;
    penaltiesMissed?: number;
    ownGoals?: number;
    matchesMissed?: number;
    rating?: number;
    last5Rating?: number;
  };
  yieldData: {
    yield_per_share: number;
    total_yield: number;
    raw_yield?: number;
    penalties?: number;
    form_multiplier?: number;
    breakdown?: {
      goalYield: number;
      assistYield: number;
      matchYield: number;
      cleanSheetYield: number;
      yellowCardPenalty: number;
      redCardPenalty: number;
      penaltyMissPenalty: number;
      ownGoalPenalty: number;
      missedMatchPenalty: number;
    };
    apy: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Raw data type from JSON (comprehensive structure)
export interface RawAthleteData {
  id: string;
  name: string;
  team: string;
  position: 'FW' | 'MF' | 'W' | 'DF' | 'GK';
  age: number;
  token_supply: number;
  financials: {
    ipo_price: number;
    current_market_price: number;
    change_pct: string;
    total_yield_generated: number;
  };
  stats: {
    matches_played: number;
    goals: number;
    assists: number;
    matches_missed: number;
    yellow_cards: number;
    red_cards: number;
  };
  risk_profile: {
    form_rating: string;
    volatility: string;
    status: string;
  };
  valuation_logic: string;
}

// Stats shape from backend (snake_case)
// Adding index signature for compatibility with Record<string, unknown>
interface BackendStats {
  [key: string]: unknown;
  matches_played: number;
  goals: number;
  assists: number;
  matches_missed: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played?: number;
  clean_sheets?: number;
  shots_on_target?: number;
  pass_accuracy?: number;
  penalties_missed?: number;
  own_goals?: number;
  rating?: number;
}

// Extended athlete type with all raw data (enhanced)
// Using Omit to override the stats type from AthleteMarket
export interface ExtendedAthlete extends Omit<AthleteMarket, 'stats' | 'yieldData'> {
  // On-chain token ID
  tokenId?: number;
  onChainTokenId?: number;
  
  // Player photo URL from API-Football
  photoUrl?: string;
  
  tokenSupply?: number;
  ipoPrice?: number;
  changePct?: string;
  totalYieldGenerated?: number;
  stats?: BackendStats;
  riskProfile?: {
    form_rating: string;
    volatility: string;
    status: string;
  };
  valuationLogic?: string;

  // New enhanced fields
  yieldBreakdown?: {
    goalYield: number;
    assistYield: number;
    matchYield: number;
    cleanSheetYield: number;
    yellowCardPenalty: number;
    redCardPenalty: number;
    penaltyMissPenalty: number;
    ownGoalPenalty: number;
    missedMatchPenalty: number;
  };
  rawYield?: number;
  penaltiesDeducted?: number;
  formMultiplier?: number;
  ageMultiplier?: number;
}

// Map position codes to readable format
const getPositionLabel = (position: string): string => {
  const positionMap: Record<string, string> = {
    'FW': 'forward',
    'MF': 'midfielder',
    'W': 'winger',
    'DF': 'defender',
    'GK': 'goalkeeper',
  };
  return positionMap[position] || position;
};

// Parse change percentage string to number
const parseChangePct = (changePct: string): number => {
  return parseFloat(changePct.replace('%', '').replace('+', '')) || 0;
};

// Transform raw data to app format
const transformAthlete = (raw: RawAthleteData): ExtendedAthlete => {
  const currentPrice = raw.financials.current_market_price;
  const ipoPrice = raw.financials.ipo_price;
  const priceChangePercent = parseChangePct(raw.financials.change_pct);
  const priceChange = currentPrice - ipoPrice;

  // Calculate market cap (price * token supply)
  const marketCap = currentPrice * raw.token_supply;

  // Determine if "live" based on status
  const isLive = raw.risk_profile.status === 'ACTIVE';

  return {
    id: raw.id,
    name: raw.name,
    sport: 'soccer' as Sport,
    team: raw.team,
    position: getPositionLabel(raw.position),
    imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(raw.name)}&size=200&background=random`,
    nationality: 'Europe',
    age: raw.age,
    currentPrice,
    priceChange24h: priceChange,
    priceChangePercent24h: priceChangePercent,
    marketCap,
    ytdYield: raw.financials.total_yield_generated,
    projectedNextPayout: parseFloat((raw.financials.total_yield_generated / 38).toFixed(2)),
    nextFixture: `${raw.team} - Next Match`,
    isLive,
    volume24h: Math.round(marketCap * 0.05),
    high24h: currentPrice * 1.02,
    low24h: currentPrice * 0.98,
    allTimeHigh: Math.max(currentPrice, ipoPrice) * 1.1,
    allTimeLow: Math.min(currentPrice, ipoPrice) * 0.9,
    totalShares: raw.token_supply,
    availableShares: Math.round(raw.token_supply * 0.7),
    // Extended fields
    tokenSupply: raw.token_supply,
    ipoPrice: raw.financials.ipo_price,
    changePct: raw.financials.change_pct,
    totalYieldGenerated: raw.financials.total_yield_generated,
    stats: raw.stats,
    riskProfile: raw.risk_profile,
    valuationLogic: raw.valuation_logic,
  };
};

// Transform Backend API player to AthleteMarket format (enhanced)
const transformFromBackend = (player: BackendPlayer): ExtendedAthlete => {
  const marketCap = player.currentPrice * player.totalSupply;

  // Calculate price change from IPO
  const priceChange = player.currentPrice - player.ipoPrice;
  const priceChangePercent = ((player.currentPrice - player.ipoPrice) / player.ipoPrice) * 100;

  // Get form multiplier from yield data if available
  const formMultiplier = player.yieldData?.form_multiplier || 1.0;

  // Determine form rating based on form multiplier and stats
  const getFormRating = (): string => {
    if (formMultiplier >= 1.2) return 'HOT_STREAK';
    if (formMultiplier >= 1.1) return 'GOOD_FORM';
    if (formMultiplier >= 0.9) return 'AVERAGE';
    if (formMultiplier >= 0.8) return 'POOR_FORM';
    return 'COLD_STREAK';
  };

  // Determine status based on missed matches
  const getStatus = (): string => {
    const matchesMissed = player.stats?.matchesMissed || 0;
    if (matchesMissed > 5) return 'INJURED';
    if ((player.stats?.redCards || 0) > 0) return 'SUSPENDED';
    return 'ACTIVE';
  };

  // Determine volatility based on cards and penalties
  const getVolatility = (): string => {
    const redCards = player.stats?.redCards || 0;
    const yellowCards = player.stats?.yellowCards || 0;
    const penaltiesMissed = player.stats?.penaltiesMissed || 0;

    const riskScore = redCards * 3 + yellowCards * 0.5 + penaltiesMissed * 1;
    if (riskScore >= 5) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  };

  const yieldPerShare = player.yieldData?.yield_per_share || 0;
  const penalties = player.yieldData?.penalties || 0;

  return {
    id: player.tokenId.toString(),
    tokenId: player.tokenId,
    onChainTokenId: player.onChainTokenId || player.tokenId,
    name: player.name,
    sport: 'soccer' as Sport,
    team: player.team,
    position: getPositionLabel(player.position),
    // Use real player photo from API-Football, fallback to avatar generator
    imageUrl: player.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=200&background=random`,
    photoUrl: player.photoUrl,
    nationality: 'Europe',
    age: player.age,
    currentPrice: player.currentPrice,
    priceChange24h: priceChange,
    priceChangePercent24h: priceChangePercent,
    marketCap,
    ytdYield: yieldPerShare,
    projectedNextPayout: parseFloat((yieldPerShare / 38).toFixed(2)),
    nextFixture: `${player.team} - Next Match`,
    isLive: true,
    volume24h: Math.round(marketCap * 0.05),
    high24h: player.currentPrice * 1.02,
    low24h: player.currentPrice * 0.98,
    allTimeHigh: player.currentPrice * 1.1,
    allTimeLow: Math.max(5, player.currentPrice * 0.9),
    totalShares: player.totalSupply,
    availableShares: player.totalSupply - player.circulatingSupply,

    // Extended stats (new)
    stats: {
      matches_played: player.stats?.matches || 0,
      goals: player.stats?.goals || 0,
      assists: player.stats?.assists || 0,
      matches_missed: player.stats?.matchesMissed || 0,
      yellow_cards: player.stats?.yellowCards || 0,
      red_cards: player.stats?.redCards || 0,
      // Extended fields
      minutes_played: player.stats?.minutesPlayed || 0,
      clean_sheets: player.stats?.cleanSheets || 0,
      shots_on_target: player.stats?.shotsOnTarget || 0,
      pass_accuracy: player.stats?.passAccuracy || 0,
      penalties_missed: player.stats?.penaltiesMissed || 0,
      own_goals: player.stats?.ownGoals || 0,
      rating: player.stats?.rating || 0,
    },

    // Yield breakdown (new)
    yieldBreakdown: player.yieldData?.breakdown,
    rawYield: player.yieldData?.raw_yield || yieldPerShare,
    penaltiesDeducted: penalties,
    formMultiplier,
    ageMultiplier: player.multiplier,

    // Legacy fields
    tokenSupply: player.totalSupply,
    ipoPrice: player.ipoPrice,
    changePct: `${priceChangePercent > 0 ? '+' : ''}${priceChangePercent.toFixed(1)}%`,
    totalYieldGenerated: player.yieldData?.total_yield || 0,
    riskProfile: {
      form_rating: getFormRating(),
      volatility: getVolatility(),
      status: getStatus(),
    },
    valuationLogic: penalties > 0
      ? `(Yield: $${(yieldPerShare + penalties).toFixed(2)} - Penalties: $${penalties.toFixed(2)}) × Form: ${formMultiplier.toFixed(2)}x × Age: ${player.multiplier}x = $${player.currentPrice.toFixed(2)}`
      : `Yield: $${yieldPerShare.toFixed(2)} × Form: ${formMultiplier.toFixed(2)}x × Age: ${player.multiplier}x = $${player.currentPrice.toFixed(2)}`,
  };
};

// Generate mock price history based on volatility
const generatePriceHistory = (
  athlete: ExtendedAthlete,
  timeframe: TimeFrame
): PricePoint[] => {
  const points: PricePoint[] = [];
  const now = Date.now();

  const timeframeConfig: Record<TimeFrame, { points: number; interval: number }> = {
    '1H': { points: 60, interval: 60 * 1000 },
    '1D': { points: 24, interval: 60 * 60 * 1000 },
    '1W': { points: 7, interval: 24 * 60 * 60 * 1000 },
    '1M': { points: 30, interval: 24 * 60 * 60 * 1000 },
    '3M': { points: 90, interval: 24 * 60 * 60 * 1000 },
    '1Y': { points: 52, interval: 7 * 24 * 60 * 60 * 1000 },
    'ALL': { points: 100, interval: 7 * 24 * 60 * 60 * 1000 },
  };

  const config = timeframeConfig[timeframe];
  const ipoPrice = athlete.ipoPrice || athlete.currentPrice * 0.9;
  let price = ipoPrice;

  // Volatility based on risk profile
  const volatilityMap: Record<string, number> = {
    'LOW': 0.015,
    'STABLE': 0.02,
    'MEDIUM': 0.03,
    'HIGH': 0.04,
    'HIGH_UPSIDE': 0.05,
    'DOWN': 0.035,
    'EXTREME_DOWN': 0.06,
  };
  const volatility = volatilityMap[athlete.riskProfile?.volatility || 'MEDIUM'] || 0.03;
  const trend = athlete.priceChange24h > 0 ? 0.002 : -0.002;

  for (let i = config.points; i >= 0; i--) {
    const timestamp = now - (i * config.interval);

    price = price * (1 + trend + (Math.random() - 0.5) * volatility);

    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);

    points.push({
      timestamp,
      open: parseFloat(price.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume: Math.round(100000 + Math.random() * 500000),
    });
  }

  if (points.length > 0) {
    points[points.length - 1].close = athlete.currentPrice;
  }

  return points;
};

// =============== PUBLIC API ===============

/**
 * Fetch all athletes from Backend API
 */
export const fetchAllAthletes = async (): Promise<ExtendedAthlete[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/market/players`);

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      console.log(`[AthleteService] Fetched ${data.data.length} players from backend`);
      return data.data.map(transformFromBackend);
    }

    throw new Error('No players found in backend');
  } catch (error) {
    console.error('[AthleteService] Backend API error, falling back to JSON:', error);
    // Fallback to JSON data
    await new Promise(resolve => setTimeout(resolve, 300));
    return (athletesData as RawAthleteData[]).map(transformAthlete);
  }
};

/**
 * Fetch trending athletes (best performers by yield)
 */
export const fetchTrendingAthletes = async (): Promise<ExtendedAthlete[]> => {
  // Get all athletes first
  const allAthletes = await fetchAllAthletes();

  // Sort by YTD yield (highest earners first)
  const formRankings: Record<string, number> = {
    'S_TIER': 10, 'A+': 9, 'A': 8, 'A-': 7, 'B+': 6, 'B': 5, 'C+': 4, 'C': 3, 'D': 2, 'D-': 1, 'F': 0
  };

  return allAthletes
    .filter(a => a.isLive)
    .sort((a, b) => b.ytdYield - a.ytdYield)
    .slice(0, 6);
};

/**
 * Fetch single athlete by ID (tokenId)
 */
export const fetchAthleteById = async (id: string): Promise<ExtendedAthlete | null> => {
  try {
    // Fetch from backend by tokenId
    const tokenId = parseInt(id);
    if (isNaN(tokenId)) {
      console.warn(`[AthleteService] Invalid ID format: ${id}`);
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/market/players/${tokenId}`);

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data) {
      return transformFromBackend(data.data);
    }

    return null;
  } catch (error) {
    console.error('[AthleteService] Error fetching athlete by ID:', error);

    // Fallback to JSON
    const raw = (athletesData as RawAthleteData[]).find(a => a.id === id);
    return raw ? transformAthlete(raw) : null;
  }
};

/**
 * Search athletes by name or team
 */
export const searchAthletes = async (query: string): Promise<ExtendedAthlete[]> => {
  // First try to search in live data
  const liveAthletes = await fetchAllAthletes();
  const lowerQuery = query.toLowerCase();

  return liveAthletes.filter(a =>
    a.name.toLowerCase().includes(lowerQuery) ||
    a.team.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Fetch price chart data for an athlete
 */
export const fetchChartData = async (
  athleteId: string,
  timeframe: TimeFrame
): Promise<PricePoint[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  // Try to get from live data first
  const athlete = await fetchAthleteById(athleteId);
  if (athlete) {
    return generatePriceHistory(athlete as ExtendedAthlete, timeframe);
  }

  // Fallback to JSON
  const raw = (athletesData as RawAthleteData[]).find(a => a.id === athleteId);
  if (!raw) return [];

  return generatePriceHistory(transformAthlete(raw), timeframe);
};

/**
 * Force refresh all player data from Backend API
 */
export const refreshFromApi = async (): Promise<ExtendedAthlete[]> => {
  // Just fetch from backend again
  return fetchAllAthletes();
};

/**
 * Check if Backend API is available
 */
export const isLiveApiAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/market/players`);
    return response.ok;
  } catch {
    return false;
  }
};

export default {
  fetchAllAthletes,
  fetchTrendingAthletes,
  fetchAthleteById,
  searchAthletes,
  fetchChartData,
  refreshFromApi,
  isLiveApiAvailable,
};
