/**
 * StockBaller AI Match Prediction Workflow - Chainlink CRE + Functions
 * 
 * This workflow uses Chainlink Functions to call an LLM (GPT-4/Claude) to
 * predict match scores for upcoming Premier League fixtures. Users who
 * bet on the AI prediction matching the final score win a £100 bonus.
 * 
 * Flow:
 * 1. Cron trigger before match kickoff
 * 2. Fetch upcoming fixture from API-Football
 * 3. Call LLM via Chainlink Functions for AI prediction
 * 4. Write prediction to PredictionMarket smart contract
 * 5. After match: compare actual score vs prediction
 * 6. Winners receive £100 bonus from pool
 * 
 * Hackathon Categories:
 * - CRE & AI: LLM-powered predictions via Chainlink Functions
 * - Prediction Markets: Live score betting pool
 * 
 * @see https://docs.chain.link/cre
 * @see https://docs.chain.link/chainlink-functions
 */

import { cre, cron, http, evm } from '@chainlink/cre-sdk';
import { 
  PredictionConfig, 
  MatchFixture, 
  AIPrediction,
  PredictionResult 
} from './predictionTypes.js';

// PredictionMarket ABI
const PREDICTION_MARKET_ABI = [
  {
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'homeTeam', type: 'string' },
      { name: 'awayTeam', type: 'string' },
      { name: 'predictedHomeScore', type: 'uint8' },
      { name: 'predictedAwayScore', type: 'uint8' },
      { name: 'confidence', type: 'uint8' },
      { name: 'matchStartTime', type: 'uint256' }
    ],
    name: 'submitAIPrediction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'actualHomeScore', type: 'uint8' },
      { name: 'actualAwayScore', type: 'uint8' }
    ],
    name: 'settleMatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'matchId', type: 'uint256' }],
    name: 'getAIPrediction',
    outputs: [
      { name: 'homeScore', type: 'uint8' },
      { name: 'awayScore', type: 'uint8' },
      { name: 'confidence', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

// Default configuration
const config: PredictionConfig = {
  apiFootballKey: process.env.API_FOOTBALL_KEY || '',
  openAiKey: process.env.OPENAI_API_KEY || '',
  baseSepoliaRpc: 'https://sepolia.base.org',
  predictionMarketAddress: process.env.PREDICTION_MARKET_ADDRESS || '',
  bonusAmountUSD: 100,
  premierLeagueId: 39, // API-Football league ID
};

/**
 * Fetch upcoming fixtures from API-Football
 */
async function fetchUpcomingFixtures(
  httpClient: ReturnType<typeof http.Client>,
  leagueId: number
): Promise<MatchFixture[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const response = await httpClient.fetch({
      url: `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2024&from=${today}&next=5`,
      headers: {
        'x-rapidapi-key': config.apiFootballKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) {
      console.error(`[CRE-AI] API-Football error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    return data.response.map((fixture: any) => ({
      id: fixture.fixture.id,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      homeTeamId: fixture.teams.home.id,
      awayTeamId: fixture.teams.away.id,
      kickoffTime: new Date(fixture.fixture.date).getTime(),
      venue: fixture.fixture.venue?.name || 'TBD',
      league: fixture.league.name,
    }));
  } catch (error) {
    console.error(`[CRE-AI] Failed to fetch fixtures:`, error);
    return [];
  }
}

/**
 * Fetch team recent form from API-Football
 */
async function fetchTeamForm(
  httpClient: ReturnType<typeof http.Client>,
  teamId: number
): Promise<string> {
  try {
    const response = await httpClient.fetch({
      url: `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=39&season=2024`,
      headers: {
        'x-rapidapi-key': config.apiFootballKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) return 'Unknown';

    const data = await response.json();
    const stats = data.response;
    
    return `W${stats.fixtures.wins.total}/D${stats.fixtures.draws.total}/L${stats.fixtures.loses.total}, ` +
           `GF:${stats.goals.for.total.total} GA:${stats.goals.against.total.total}`;
  } catch (error) {
    return 'Unknown form';
  }
}

/**
 * Call LLM via Chainlink Functions for score prediction
 * 
 * This uses Chainlink Functions to execute JavaScript off-chain,
 * calling the OpenAI API to generate AI predictions.
 */
async function getAIPrediction(
  httpClient: ReturnType<typeof http.Client>,
  fixture: MatchFixture,
  homeForm: string,
  awayForm: string
): Promise<AIPrediction> {
  console.log(`[CRE-AI] Requesting AI prediction for ${fixture.homeTeam} vs ${fixture.awayTeam}`);

  // Construct prompt for LLM
  const prompt = `You are a football prediction AI for StockBaller. Predict the exact score for this Premier League match.

MATCH: ${fixture.homeTeam} vs ${fixture.awayTeam}
VENUE: ${fixture.venue} (Home advantage for ${fixture.homeTeam})
DATE: ${new Date(fixture.kickoffTime).toLocaleDateString()}

RECENT FORM:
- ${fixture.homeTeam}: ${homeForm}
- ${fixture.awayTeam}: ${awayForm}

Based on this data, predict the EXACT final score. Consider:
1. Home advantage typically worth 0.5 goals
2. Recent form and goal-scoring patterns
3. Historical head-to-head if applicable
4. Defensive and attacking strength

Respond ONLY in this JSON format:
{"homeScore": X, "awayScore": Y, "confidence": Z, "reasoning": "brief explanation"}

Where confidence is 1-100 (how confident you are in this EXACT scoreline).`;

  try {
    const response = await httpClient.fetch({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are StockBaller AI, an expert football prediction system.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error(`[CRE-AI] OpenAI API error: ${response.status}`);
      return getDefaultPrediction(fixture);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[CRE-AI] Failed to parse AI response`);
      return getDefaultPrediction(fixture);
    }

    const prediction = JSON.parse(jsonMatch[0]);
    
    console.log(`[CRE-AI] AI Prediction: ${fixture.homeTeam} ${prediction.homeScore}-${prediction.awayScore} ${fixture.awayTeam}`);
    console.log(`[CRE-AI] Confidence: ${prediction.confidence}%`);
    console.log(`[CRE-AI] Reasoning: ${prediction.reasoning}`);

    return {
      matchId: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      predictedHomeScore: prediction.homeScore,
      predictedAwayScore: prediction.awayScore,
      confidence: prediction.confidence,
      reasoning: prediction.reasoning,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`[CRE-AI] AI prediction failed:`, error);
    return getDefaultPrediction(fixture);
  }
}

/**
 * Fallback prediction if AI fails
 */
function getDefaultPrediction(fixture: MatchFixture): AIPrediction {
  // Default to a conservative 1-1 draw
  return {
    matchId: fixture.id,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    predictedHomeScore: 1,
    predictedAwayScore: 1,
    confidence: 20,
    reasoning: 'Default prediction due to AI unavailability',
    timestamp: Date.now(),
  };
}

/**
 * Submit AI prediction to smart contract
 */
async function submitPredictionOnChain(
  evmClient: ReturnType<typeof evm.Client>,
  prediction: AIPrediction,
  matchStartTime: number
): Promise<PredictionResult> {
  try {
    const tx = await evmClient.write({
      contract: config.predictionMarketAddress,
      abi: PREDICTION_MARKET_ABI,
      method: 'submitAIPrediction',
      args: [
        prediction.matchId,
        prediction.homeTeam,
        prediction.awayTeam,
        prediction.predictedHomeScore,
        prediction.predictedAwayScore,
        prediction.confidence,
        matchStartTime
      ],
    });

    console.log(`[CRE-AI] Prediction submitted on-chain: ${tx.hash}`);

    return {
      matchId: prediction.matchId,
      txHash: tx.hash || 'simulation',
      success: true,
      prediction,
    };
  } catch (error) {
    console.error(`[CRE-AI] Failed to submit prediction:`, error);
    return {
      matchId: prediction.matchId,
      txHash: '',
      success: false,
      error: String(error),
    };
  }
}

/**
 * Main prediction workflow - generates AI predictions before matches
 */
async function onPredictionTrigger(
  cfg: PredictionConfig,
  runtime: cre.Runtime,
  trigger: cron.Payload
): Promise<{ predictions: PredictionResult[] }> {
  console.log(`[CRE-AI] ========================================`);
  console.log(`[CRE-AI] StockBaller AI Prediction Workflow`);
  console.log(`[CRE-AI] Timestamp: ${new Date().toISOString()}`);
  console.log(`[CRE-AI] ========================================`);

  const httpClient = http.Client(runtime);
  const evmClient = evm.Client(runtime, { chainId: 84532 }); // Base Sepolia

  // 1. Fetch upcoming fixtures
  const fixtures = await fetchUpcomingFixtures(httpClient, cfg.premierLeagueId);
  console.log(`[CRE-AI] Found ${fixtures.length} upcoming fixtures`);

  if (fixtures.length === 0) {
    return { predictions: [] };
  }

  const results: PredictionResult[] = [];

  // 2. Process each fixture that's within 24 hours
  const now = Date.now();
  const hoursInMs = 24 * 60 * 60 * 1000;

  for (const fixture of fixtures) {
    // Only predict matches starting within 24 hours
    if (fixture.kickoffTime - now > hoursInMs) {
      console.log(`[CRE-AI] Skipping ${fixture.homeTeam} vs ${fixture.awayTeam} - too far ahead`);
      continue;
    }

    // 3. Fetch team form data
    const homeForm = await fetchTeamForm(httpClient, fixture.homeTeamId);
    const awayForm = await fetchTeamForm(httpClient, fixture.awayTeamId);

    // 4. Get AI prediction
    const prediction = await getAIPrediction(httpClient, fixture, homeForm, awayForm);

    // 5. Submit to smart contract
    const result = await submitPredictionOnChain(evmClient, prediction, fixture.kickoffTime);
    results.push(result);

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[CRE-AI] ========================================`);
  console.log(`[CRE-AI] COMPLETE: ${results.filter(r => r.success).length}/${results.length} predictions submitted`);
  console.log(`[CRE-AI] ========================================`);

  return { predictions: results };
}

/**
 * Match settlement workflow - compares actual results with predictions
 */
async function onMatchSettlementTrigger(
  cfg: PredictionConfig,
  runtime: cre.Runtime,
  trigger: http.Payload
): Promise<{ settled: boolean; matchId: number; actualScore: string; predictedScore: string; winnersCount: number }> {
  console.log(`[CRE-AI] ========================================`);
  console.log(`[CRE-AI] Match Settlement Workflow`);
  console.log(`[CRE-AI] ========================================`);

  const httpClient = http.Client(runtime);
  const evmClient = evm.Client(runtime, { chainId: 84532 });

  // Parse match ID from request body
  const body = JSON.parse(trigger.body || '{}');
  const matchId = body.matchId;

  if (!matchId) {
    return { settled: false, matchId: 0, actualScore: '', predictedScore: '', winnersCount: 0 };
  }

  // Fetch actual result from API-Football
  const response = await httpClient.fetch({
    url: `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
    headers: {
      'x-rapidapi-key': cfg.apiFootballKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  const data = await response.json();
  const fixture = data.response[0];
  
  if (!fixture || fixture.fixture.status.short !== 'FT') {
    console.log(`[CRE-AI] Match not finished yet`);
    return { settled: false, matchId, actualScore: '', predictedScore: '', winnersCount: 0 };
  }

  const actualHome = fixture.goals.home;
  const actualAway = fixture.goals.away;

  console.log(`[CRE-AI] Actual Result: ${fixture.teams.home.name} ${actualHome}-${actualAway} ${fixture.teams.away.name}`);

  // Settle on-chain
  try {
    await evmClient.write({
      contract: cfg.predictionMarketAddress,
      abi: PREDICTION_MARKET_ABI,
      method: 'settleMatch',
      args: [matchId, actualHome, actualAway],
    });

    // Get prediction for comparison
    const prediction = await evmClient.read({
      contract: cfg.predictionMarketAddress,
      abi: PREDICTION_MARKET_ABI,
      method: 'getAIPrediction',
      args: [matchId],
    });

    const isMatch = prediction[0] === actualHome && prediction[1] === actualAway;
    
    console.log(`[CRE-AI] AI Predicted: ${prediction[0]}-${prediction[1]}`);
    console.log(`[CRE-AI] Prediction ${isMatch ? 'MATCHED! 🎉' : 'did not match'}`);

    return {
      settled: true,
      matchId,
      actualScore: `${actualHome}-${actualAway}`,
      predictedScore: `${prediction[0]}-${prediction[1]}`,
      winnersCount: isMatch ? 1 : 0, // Contract handles actual winner count
    };
  } catch (error) {
    console.error(`[CRE-AI] Settlement failed:`, error);
    return { settled: false, matchId, actualScore: `${actualHome}-${actualAway}`, predictedScore: '', winnersCount: 0 };
  }
}

// ============================================
// CRE WORKFLOW HANDLERS
// ============================================

/**
 * Cron Trigger: Run twice daily to catch upcoming fixtures
 * 09:00 and 15:00 UTC
 */
cre.Handler(
  cron.Trigger({ schedule: '0 0 9,15 * * *' }),
  onPredictionTrigger
);

/**
 * HTTP Trigger: Manual prediction request
 */
cre.Handler(
  http.Trigger({ path: '/predict-matches', method: 'POST' }),
  async (cfg: PredictionConfig, runtime: cre.Runtime, trigger: http.Payload) => {
    return onPredictionTrigger(cfg, runtime, { timestamp: Date.now() } as cron.Payload);
  }
);

/**
 * HTTP Trigger: Settle match and distribute winnings
 */
cre.Handler(
  http.Trigger({ path: '/settle-match', method: 'POST' }),
  onMatchSettlementTrigger
);

export {
  config,
  onPredictionTrigger,
  onMatchSettlementTrigger,
  fetchUpcomingFixtures,
  getAIPrediction,
};
