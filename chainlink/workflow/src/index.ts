/**
 * StockBaller Athlete Price Oracle - Chainlink CRE Workflow
 * 
 * This workflow fetches live athlete statistics from API-Football,
 * calculates token prices using the StockBaller pricing formula,
 * and writes verified prices to the blockchain via Chainlink DON consensus.
 * 
 * Hackathon: Chainlink Convergence
 * Network: Base Sepolia
 * 
 * @see https://docs.chain.link/cre
 */

import { cre, cron, http, evm } from '@chainlink/cre-sdk';
import { calculateAthletePrice, formatPrice } from './priceCalculator.js';
import { 
  WorkflowConfig, 
  AthleteConfig, 
  ApiFootballResponse,
  WorkflowExecutionSummary,
  TransactionResult 
} from './types.js';

// ProSpectVault ABI (only the functions we need)
const VAULT_ABI = [
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'newPrice', type: 'uint256' }
    ],
    name: 'updatePriceFromOracle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getTokenPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'athleteActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Workflow configuration
const config: WorkflowConfig = {
  apiFootballKey: process.env.API_FOOTBALL_KEY || '',
  baseSepoliaRpc: 'https://sepolia.base.org',
  vaultContractAddress: process.env.VAULT_CONTRACT_ADDRESS || '0x05C5D2A758AE2F79FD0Df800c949Eab3219da1D0',
  updateIntervalHours: 1,
  athletes: [
    // Premier League top players with API-Football IDs
    { tokenId: 1, apiFootballId: 1100, name: 'Erling Haaland', position: 'Forward', baseMultiplier: 12 },
    { tokenId: 2, apiFootballId: 184054, name: 'Bukayo Saka', position: 'Winger', baseMultiplier: 15 },
    { tokenId: 3, apiFootballId: 174, name: 'Mohamed Salah', position: 'Forward', baseMultiplier: 8 },
    { tokenId: 4, apiFootballId: 1460, name: 'Cole Palmer', position: 'Midfielder', baseMultiplier: 15 },
    { tokenId: 5, apiFootballId: 284, name: 'Son Heung-min', position: 'Forward', baseMultiplier: 8 },
  ]
};

/**
 * Fetch athlete statistics from API-Football
 * 
 * This is executed by multiple Chainlink nodes independently,
 * and their results are compared for consensus.
 */
async function fetchAthleteStats(
  httpClient: ReturnType<typeof http.Client>,
  playerId: number
): Promise<ApiFootballResponse | null> {
  try {
    const response = await httpClient.fetch({
      url: `https://v3.football.api-sports.io/players?id=${playerId}&season=2024`,
      headers: {
        'x-rapidapi-key': config.apiFootballKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) {
      console.error(`[CRE] API-Football error for player ${playerId}: ${response.status}`);
      return null;
    }

    const data = await response.json() as ApiFootballResponse;
    
    if (data.errors && data.errors.length > 0) {
      console.error(`[CRE] API errors:`, data.errors);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`[CRE] Failed to fetch stats for player ${playerId}:`, error);
    return null;
  }
}

/**
 * Read current price from blockchain
 */
async function getCurrentPrice(
  evmClient: ReturnType<typeof evm.Client>,
  tokenId: number
): Promise<bigint> {
  try {
    const result = await evmClient.read({
      contract: config.vaultContractAddress,
      abi: VAULT_ABI,
      method: 'getTokenPrice',
      args: [tokenId],
    });
    return BigInt(result);
  } catch (error) {
    console.error(`[CRE] Failed to read price for token ${tokenId}:`, error);
    return 100_000_000n; // Default to IPO price ($100)
  }
}

/**
 * Write new price to blockchain
 * This is verified by Chainlink DON consensus before execution
 */
async function updatePriceOnChain(
  evmClient: ReturnType<typeof evm.Client>,
  tokenId: number,
  newPrice: bigint
): Promise<TransactionResult> {
  try {
    const tx = await evmClient.write({
      contract: config.vaultContractAddress,
      abi: VAULT_ABI,
      method: 'updatePriceFromOracle',
      args: [tokenId, newPrice.toString()],
    });

    console.log(`[CRE] Price updated for token ${tokenId}: ${formatPrice(newPrice)}`);
    
    return {
      tokenId,
      txHash: tx.hash || 'simulation',
      success: true,
    };
  } catch (error) {
    console.error(`[CRE] Failed to update price for token ${tokenId}:`, error);
    return {
      tokenId,
      txHash: '',
      success: false,
      error: String(error),
    };
  }
}

/**
 * Process a single athlete: fetch stats, calculate price, update on-chain
 */
async function processAthlete(
  athlete: AthleteConfig,
  httpClient: ReturnType<typeof http.Client>,
  evmClient: ReturnType<typeof evm.Client>
): Promise<TransactionResult> {
  console.log(`[CRE] Processing ${athlete.name} (token ${athlete.tokenId})...`);

  // 1. Fetch stats from API-Football
  const apiResponse = await fetchAthleteStats(httpClient, athlete.apiFootballId);
  
  if (!apiResponse || apiResponse.results === 0) {
    return {
      tokenId: athlete.tokenId,
      txHash: '',
      success: false,
      error: 'No stats available from API-Football',
    };
  }

  // 2. Read current on-chain price
  const currentPrice = await getCurrentPrice(evmClient, athlete.tokenId);

  // 3. Calculate new price using our formula
  const playerData = apiResponse.response[0];
  const age = playerData.player.age || 25;
  const priceResult = calculateAthletePrice(
    playerData.statistics,
    age,
    athlete.tokenId,
    currentPrice
  );

  console.log(`[CRE] ${athlete.name}: ` +
    `${priceResult.stats.goals}G/${priceResult.stats.assists}A, ` +
    `Rating: ${priceResult.stats.rating.toFixed(1)}, ` +
    `Price: ${formatPrice(priceResult.oldPrice)} → ${formatPrice(priceResult.newPrice)}`
  );

  // 4. Skip if price hasn't changed (save gas)
  if (priceResult.newPrice === priceResult.oldPrice) {
    console.log(`[CRE] Price unchanged, skipping on-chain update`);
    return {
      tokenId: athlete.tokenId,
      txHash: '',
      success: true,
    };
  }

  // 5. Update price on-chain
  return await updatePriceOnChain(evmClient, athlete.tokenId, priceResult.newPrice);
}

/**
 * Main workflow callback - triggered by cron
 * 
 * This function is executed by every node in the Chainlink DON.
 * Their results are aggregated via BFT consensus.
 */
async function onPriceUpdateTrigger(
  cfg: WorkflowConfig,
  runtime: cre.Runtime,
  trigger: cron.Payload
): Promise<WorkflowExecutionSummary> {
  console.log(`[CRE] ========================================`);
  console.log(`[CRE] StockBaller Price Oracle - Starting`);
  console.log(`[CRE] Timestamp: ${new Date().toISOString()}`);
  console.log(`[CRE] Athletes: ${cfg.athletes.length}`);
  console.log(`[CRE] ========================================`);

  // Initialize SDK clients
  const httpClient = http.Client(runtime);
  const evmClient = evm.Client(runtime, { chainId: 84532 }); // Base Sepolia

  const transactions: TransactionResult[] = [];

  // Process each athlete
  for (const athlete of cfg.athletes) {
    const result = await processAthlete(athlete, httpClient, evmClient);
    transactions.push(result);
    
    // Small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  const successCount = transactions.filter(t => t.success).length;
  const failCount = transactions.filter(t => !t.success).length;

  const summary: WorkflowExecutionSummary = {
    timestamp: Date.now(),
    athletesProcessed: cfg.athletes.length,
    successfulUpdates: successCount,
    failedUpdates: failCount,
    transactions,
  };

  console.log(`[CRE] ========================================`);
  console.log(`[CRE] COMPLETE: ${successCount}/${cfg.athletes.length} updated`);
  console.log(`[CRE] ========================================`);

  return summary;
}

// ============================================
// CRE WORKFLOW HANDLERS
// ============================================

/**
 * Cron Trigger: Run every hour
 * Schedule format: "second minute hour day month weekday"
 */
cre.Handler(
  cron.Trigger({ schedule: '0 0 * * * *' }), // Every hour at :00
  onPriceUpdateTrigger
);

/**
 * HTTP Trigger: Manual execution for testing/debugging
 * Allows triggering updates via HTTP POST
 */
cre.Handler(
  http.Trigger({ path: '/update-prices', method: 'POST' }),
  async (cfg: WorkflowConfig, runtime: cre.Runtime, trigger: http.Payload) => {
    return onPriceUpdateTrigger(cfg, runtime, { timestamp: Date.now() } as cron.Payload);
  }
);

// Export for testing
export { 
  config, 
  onPriceUpdateTrigger,
  fetchAthleteStats,
  processAthlete,
  getCurrentPrice,
  updatePriceOnChain 
};
