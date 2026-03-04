/**
 * API-Football Service
 * Fetches live football player statistics from API-Football (api-sports.io)
 */
import { API_FOOTBALL_CONFIG, calculateCashYield, calculateTokenPrice, getAgeMultiplier } from '../config/api';
import targetPlayersData from '../data/targetPlayers.json';

// =============== TYPES ===============

// Internal normalized stats format
export interface InternalStats {
  goals: number;
  assists: number;
  matchesPlayed: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
}

// API-Football response types
interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: any[];
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

interface ApiFootballPlayerResponse {
  player: ApiFootballPlayer;
  statistics: ApiFootballStatistics[];
}

interface ApiFootballPlayer {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  birth: {
    date: string;
    place: string;
    country: string;
  };
  nationality: string;
  height: string;
  weight: string;
  injured: boolean;
  photo: string;
}

interface ApiFootballStatistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  games: {
    appearences: number;
    lineups: number;
    minutes: number;
    number: number | null;
    position: string;
    rating: string | null;
    captain: boolean;
  };
  goals: {
    total: number;
    conceded: number;
    assists: number;
    saves: number | null;
  };
  cards: {
    yellow: number;
    yellowred: number | null;
    red: number;
  };
  penalty: {
    scored: number;
    missed: number;
  };
}

// Our normalized player type for the app
export interface NormalizedPlayer {
  id: string;
  apiFootballId: number;
  name: string;
  team: string;
  teamLogo?: string;
  position: string;
  positionCode: string;
  imageUrl: string;
  nationality: string;
  age: number;
  dateOfBirth: string;
  tokenSupply: number;
  stats: InternalStats;
  yield: number;
  price: number;
  ageMultiplier: number;
  lastUpdated: string;
}

// Target player from our JSON config
interface TargetPlayer {
  apiFootballId: number;
  sportmonksId?: number; // Legacy field
  name: string;
  team: string;
  position: string;
  tokenSupply: number;
}

// =============== HELPERS ===============

// Rate limiting helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Map position to our format
const mapPosition = (position: string): { label: string; code: string } => {
  const positionMap: Record<string, { label: string; code: string }> = {
    'Goalkeeper': { label: 'goalkeeper', code: 'GK' },
    'Defender': { label: 'defender', code: 'DF' },
    'Midfielder': { label: 'midfielder', code: 'MF' },
    'Attacker': { label: 'forward', code: 'FW' },
  };
  return positionMap[position] || { label: 'midfielder', code: 'MF' };
};

// Aggregate stats across all competitions (Premier League priority)
const aggregateStats = (statistics: ApiFootballStatistics[]): InternalStats => {
  const stats: InternalStats = {
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    minutesPlayed: 0,
    yellowCards: 0,
    redCards: 0,
    cleanSheets: 0,
  };

  if (!statistics || statistics.length === 0) return stats;

  // Find Premier League stats first, or aggregate all
  const premierLeagueStats = statistics.find(s => s.league.id === API_FOOTBALL_CONFIG.PREMIER_LEAGUE_ID);

  if (premierLeagueStats) {
    // Use Premier League stats only for consistency
    stats.goals = premierLeagueStats.goals?.total || 0;
    stats.assists = premierLeagueStats.goals?.assists || 0;
    stats.matchesPlayed = premierLeagueStats.games?.appearences || 0;
    stats.minutesPlayed = premierLeagueStats.games?.minutes || 0;
    stats.yellowCards = premierLeagueStats.cards?.yellow || 0;
    stats.redCards = premierLeagueStats.cards?.red || 0;
    // Clean sheets for goalkeepers
    stats.cleanSheets = premierLeagueStats.goals?.conceded === 0 && premierLeagueStats.games?.appearences > 0
      ? premierLeagueStats.games.appearences
      : 0;
  } else {
    // Aggregate all competitions if no Premier League
    for (const stat of statistics) {
      stats.goals += stat.goals?.total || 0;
      stats.assists += stat.goals?.assists || 0;
      stats.matchesPlayed += stat.games?.appearences || 0;
      stats.minutesPlayed += stat.games?.minutes || 0;
      stats.yellowCards += stat.cards?.yellow || 0;
      stats.redCards += stat.cards?.red || 0;
    }
  }

  return stats;
};

// =============== API CALLS ===============

// Cache for API responses
let playerCache: Map<number, NormalizedPlayer> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if we have a valid API key
 */
export const hasApiKey = (): boolean => {
  return !!API_FOOTBALL_CONFIG.API_KEY && API_FOOTBALL_CONFIG.API_KEY.length > 0;
};

/**
 * Make API request with proper headers
 */
const apiRequest = async <T>(endpoint: string): Promise<T | null> => {
  if (!hasApiKey()) {
    console.warn('API-Football API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${API_FOOTBALL_CONFIG.BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'x-apisports-key': API_FOOTBALL_CONFIG.API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    return null;
  }
};

/**
 * Fetch a single player by API-Football ID
 */
export const fetchPlayerById = async (apiFootballId: number): Promise<NormalizedPlayer | null> => {
  const data = await apiRequest<ApiFootballResponse<ApiFootballPlayerResponse>>(
    `/players?id=${apiFootballId}&season=${API_FOOTBALL_CONFIG.SEASON}`
  );

  if (!data || data.results === 0 || !data.response[0]) {
    return null;
  }

  return normalizePlayer(data.response[0]);
};

/**
 * Normalize API-Football player data to our format
 */
const normalizePlayer = (response: ApiFootballPlayerResponse, targetInfo?: TargetPlayer): NormalizedPlayer => {
  const { player, statistics } = response;
  const positionInfo = mapPosition(statistics[0]?.games?.position || 'Midfielder');
  const stats = aggregateStats(statistics);
  const yieldValue = calculateCashYield(stats);
  const price = calculateTokenPrice(yieldValue, player.age);
  const teamName = statistics[0]?.team?.name || targetInfo?.team || 'Unknown';
  const teamLogo = statistics[0]?.team?.logo;

  return {
    id: `player_${player.id}`,
    apiFootballId: player.id,
    name: player.name,
    team: teamName,
    teamLogo,
    position: positionInfo.label,
    positionCode: targetInfo?.position || positionInfo.code,
    imageUrl: player.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=200&background=random`,
    nationality: player.nationality,
    age: player.age,
    dateOfBirth: player.birth?.date || '',
    tokenSupply: targetInfo?.tokenSupply || 1000,
    stats,
    yield: yieldValue,
    price,
    ageMultiplier: getAgeMultiplier(player.age),
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Create fallback player when API returns no data
 */
const createFallbackPlayer = (target: TargetPlayer): NormalizedPlayer => {
  const positionMap: Record<string, { label: string; code: string }> = {
    'GK': { label: 'goalkeeper', code: 'GK' },
    'DF': { label: 'defender', code: 'DF' },
    'MF': { label: 'midfielder', code: 'MF' },
    'FW': { label: 'forward', code: 'FW' },
    'W': { label: 'winger', code: 'MF' },
  };
  const positionInfo = positionMap[target.position] || { label: 'midfielder', code: 'MF' };

  // Default stats for fallback (minimal so price hits minimum)
  const defaultStats: InternalStats = {
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    minutesPlayed: 0,
    yellowCards: 0,
    redCards: 0,
    cleanSheets: 0,
  };

  const yieldValue = calculateCashYield(defaultStats);
  const estimatedAge = 25; // Default age for prime multiplier
  const price = calculateTokenPrice(yieldValue, estimatedAge);

  return {
    id: `player_${target.apiFootballId}`,
    apiFootballId: target.apiFootballId,
    name: target.name,
    team: target.team,
    teamLogo: undefined,
    position: positionInfo.label,
    positionCode: target.position,
    imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(target.name)}&size=200&background=random`,
    nationality: 'Unknown',
    age: estimatedAge,
    dateOfBirth: '',
    tokenSupply: target.tokenSupply,
    stats: defaultStats,
    yield: yieldValue,
    price,
    ageMultiplier: getAgeMultiplier(estimatedAge),
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Fetch all target players with rate limiting
 * LIVE MODE - Requires API key, no silent fallbacks
 */
export const fetchAllTargetPlayers = async (forceRefresh = false): Promise<NormalizedPlayer[]> => {
  // Check cache first
  const now = Date.now();
  if (!forceRefresh && playerCache.size > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return Array.from(playerCache.values());
  }

  const targetPlayers = targetPlayersData.players as TargetPlayer[];
  const players: NormalizedPlayer[] = [];

  // Require API key for live data
  if (!hasApiKey()) {
    throw new Error('API-Football API key not configured. Set EXPO_PUBLIC_SPORTMONKS_API_KEY in .env');
  }

  for (const target of targetPlayers) {
    const playerId = target.apiFootballId || target.sportmonksId;
    if (!playerId) continue;

    try {
      const data = await apiRequest<ApiFootballResponse<ApiFootballPlayerResponse>>(
        `/players?id=${playerId}&season=${API_FOOTBALL_CONFIG.SEASON}`
      );

      if (data && data.results > 0 && data.response[0]) {
        const normalized = normalizePlayer(data.response[0], target);
        players.push(normalized);
        playerCache.set(playerId, normalized);
      } else {
        // Log warning but continue - player may not have data for current season
        console.warn(`No data for ${target.name} (ID: ${playerId}) - skipping`);
      }

      // Rate limiting - wait between requests
      await sleep(API_FOOTBALL_CONFIG.RATE_LIMIT_MS);
    } catch (error) {
      console.error(`Error fetching ${target.name}:`, error);
      // Continue with other players, but log the error
    }
  }

  cacheTimestamp = Date.now();
  return players;
};

/**
 * Sync a single player's stats (for cron-style updates)
 */
export const syncPlayerStats = async (apiFootballId: number): Promise<NormalizedPlayer | null> => {
  const player = await fetchPlayerById(apiFootballId);
  if (player) {
    playerCache.set(apiFootballId, player);
  }
  return player;
};

/**
 * Get cached player by ID
 */
export const getCachedPlayer = (apiFootballId: number): NormalizedPlayer | undefined => {
  return playerCache.get(apiFootballId);
};

/**
 * Clear the player cache
 */
export const clearCache = (): void => {
  playerCache.clear();
  cacheTimestamp = 0;
};

/**
 * Get all target player IDs
 */
export const getTargetPlayerIds = (): number[] => {
  return (targetPlayersData.players as TargetPlayer[]).map(p => p.apiFootballId || p.sportmonksId || 0).filter(id => id > 0);
};

export default {
  hasApiKey,
  fetchPlayerById,
  fetchAllTargetPlayers,
  syncPlayerStats,
  getCachedPlayer,
  clearCache,
  getTargetPlayerIds,
};
