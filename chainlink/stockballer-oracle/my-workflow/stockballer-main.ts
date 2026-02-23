/**
 * StockBaller Athlete Price Oracle - Chainlink CRE Workflow
 * 
 * This workflow fetches live football statistics from API-Football,
 * calculates athlete token prices using our yield-based formula,
 * and writes the prices to the ProSpectVault contract on Base Sepolia.
 * 
 * FORMULA: Price = IPO + (Net_Yield × Form_Multiplier × Age_Multiplier)
 */

import {
  bytesToHex,
  type CronPayload,
  handler,
  CronCapability,
  EVMClient,
  encodeCallMsg,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  Runner,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress } from 'viem'
import { z } from 'zod'
import { ProSpectVault } from '../contracts/abi'

// =============================================================================
// Configuration Schema
// =============================================================================

const athleteSchema = z.object({
  tokenId: z.number(),
  apiFootballId: z.number(),
  name: z.string(),
  age: z.number(),
  position: z.string(),
})

const configSchema = z.object({
  schedule: z.string(),
  apiFootballBaseUrl: z.string(),
  vaultAddress: z.string(),
  chainSelectorName: z.string(),
  gasLimit: z.string(),
  athletes: z.array(athleteSchema),
  priceFormula: z.object({
    ipoPrice: z.number(),
    minPrice: z.number(),
    maxPrice: z.number(),
    yieldPerGoal: z.number(),
    yieldPerAssist: z.number(),
    yieldPerMatch: z.number(),
    penaltyYellowCard: z.number(),
    penaltyRedCard: z.number(),
    penaltyMissedPenalty: z.number(),
  }),
})

type Config = z.infer<typeof configSchema>
type Athlete = z.infer<typeof athleteSchema>

// =============================================================================
// API-Football Response Types
// =============================================================================

interface ApiFootballPlayer {
  player: {
    id: number
    name: string
    age: number
  }
  statistics: Array<{
    games: {
      appearences: number
      rating: string | null
    }
    goals: {
      total: number | null
      assists: number | null
    }
    cards: {
      yellow: number | null
      red: number | null
    }
    penalty: {
      missed: number | null
    }
  }>
}

interface ApiFootballResponse {
  response: ApiFootballPlayer[]
}

// =============================================================================
// Price Calculation Functions
// =============================================================================

/**
 * Get age multiplier based on player's age
 * - Age < 20: 15x (high potential youth)
 * - Age 20-27: 12x (prime years)
 * - Age > 27: 8x (veteran)
 */
function getAgeMultiplier(age: number): bigint {
  if (age < 20) return 15n
  if (age <= 27) return 12n
  return 8n
}

/**
 * Calculate form multiplier based on rating (700-1300 in basis points)
 * Rating scale: 0-10 from API-Football
 */
function getFormMultiplier(rating: number): bigint {
  if (rating <= 0) return 1000n
  const normalized = (rating - 5.0) / 5.0
  const multiplier = Math.max(700, Math.min(1300, 1000 + Math.floor(normalized * 300)))
  return BigInt(multiplier)
}

/**
 * Calculate new price for an athlete based on their statistics
 */
function calculatePrice(
  goals: number,
  assists: number,
  appearances: number,
  rating: number,
  yellowCards: number,
  redCards: number,
  penaltiesMissed: number,
  age: number,
  formula: Config['priceFormula']
): bigint {
  // Calculate positive yield
  const goalYield = BigInt(goals) * BigInt(formula.yieldPerGoal)
  const assistYield = BigInt(assists) * BigInt(formula.yieldPerAssist)
  const matchYield = BigInt(appearances) * BigInt(formula.yieldPerMatch)
  const positiveYield = goalYield + assistYield + matchYield

  // Calculate penalties
  const yellowPenalty = BigInt(yellowCards) * BigInt(formula.penaltyYellowCard)
  const redPenalty = BigInt(redCards) * BigInt(formula.penaltyRedCard)
  const penMissPenalty = BigInt(penaltiesMissed) * BigInt(formula.penaltyMissedPenalty)
  const penalties = yellowPenalty + redPenalty + penMissPenalty

  // Net yield
  const netYield = positiveYield - penalties

  // Multipliers
  const formMultiplier = getFormMultiplier(rating)
  const ageMultiplier = getAgeMultiplier(age)

  // Calculate final price
  const yieldAdjustment = (netYield * formMultiplier * ageMultiplier) / 1000n
  let newPrice = BigInt(formula.ipoPrice) + yieldAdjustment

  // Clamp between min and max
  if (newPrice < BigInt(formula.minPrice)) {
    newPrice = BigInt(formula.minPrice)
  } else if (newPrice > BigInt(formula.maxPrice)) {
    newPrice = BigInt(formula.maxPrice)
  }

  return newPrice
}

// =============================================================================
// Cron Trigger Handler
// =============================================================================

const onCronTrigger = (
  runtime: Runtime<Config>,
  _payload: CronPayload
): string => {
  runtime.log('🏈 StockBaller Price Oracle - Starting price update')

  const config = runtime.config

  // Get network for blockchain interactions
  const network = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // For simulation, use mock data since we don't have real API key
  // In production, this would fetch from API-Football
  const mockStats: Record<number, {
    goals: number
    assists: number
    appearances: number
    rating: number
    yellowCards: number
    redCards: number
    penaltiesMissed: number
  }> = {
    276: { goals: 8, assists: 5, appearances: 20, rating: 7.2, yellowCards: 2, redCards: 0, penaltiesMissed: 1 },  // Neymar
    874: { goals: 25, assists: 8, appearances: 28, rating: 8.5, yellowCards: 3, redCards: 0, penaltiesMissed: 0 }, // Mbappe
    1100: { goals: 12, assists: 10, appearances: 25, rating: 8.0, yellowCards: 1, redCards: 0, penaltiesMissed: 0 }, // Lamine Yamal
    154: { goals: 15, assists: 12, appearances: 30, rating: 8.2, yellowCards: 4, redCards: 0, penaltiesMissed: 0 }, // Bellingham
    306: { goals: 10, assists: 4, appearances: 22, rating: 7.0, yellowCards: 5, redCards: 1, penaltiesMissed: 2 }, // Memphis
  }

  const priceUpdates: Array<{ name: string; tokenId: number; newPrice: string }> = []

  // Process each athlete
  for (const athlete of config.athletes) {
    runtime.log(`📊 Processing: ${athlete.name} (ID: ${athlete.apiFootballId})`)

    try {
      // Get stats (mock for simulation, would be API call in production)
      const stats = mockStats[athlete.apiFootballId] || {
        goals: 5, assists: 3, appearances: 15, rating: 6.5, yellowCards: 2, redCards: 0, penaltiesMissed: 0
      }

      // Calculate new price
      const newPrice = calculatePrice(
        stats.goals,
        stats.assists,
        stats.appearances,
        stats.rating,
        stats.yellowCards,
        stats.redCards,
        stats.penaltiesMissed,
        athlete.age,
        config.priceFormula
      )

      // Log price
      const priceUsd = Number(newPrice) / 1_000_000
      runtime.log(`💰 ${athlete.name}: $${priceUsd.toFixed(2)}`)

      // Update price on-chain (simulation will mock this)
      const callData = encodeFunctionData({
        abi: ProSpectVault,
        functionName: 'updatePriceFromOracle',
        args: [BigInt(athlete.tokenId), newPrice],
      })

      const tx = evmClient.sendTransaction(runtime, {
        call: encodeCallMsg({
          to: config.vaultAddress as Address,
          data: callData,
        }),
        maxFeePerGas: 100000000000n,
        maxPriorityFeePerGas: 2000000000n,
        gasLimit: BigInt(config.gasLimit),
        value: 0n,
      })

      const result = tx.result()
      runtime.log(`✅ Updated ${athlete.name} price, tx: ${result.txHash}`)

      priceUpdates.push({
        name: athlete.name,
        tokenId: athlete.tokenId,
        newPrice: newPrice.toString(),
      })
    } catch (error) {
      runtime.log(`❌ Error processing ${athlete.name}: ${error}`)
    }
  }

  // Summary
  runtime.log(`🎯 Price updates completed: ${priceUpdates.length}/${config.athletes.length} athletes`)

  return JSON.stringify({
    success: true,
    updatedCount: priceUpdates.length,
    updates: priceUpdates,
  })
}

// =============================================================================
// Workflow Initialization
// =============================================================================

const initWorkflow = (config: Config) => {
  const cronTrigger = new CronCapability()

  return [
    handler(
      cronTrigger.trigger({
        schedule: config.schedule,
      }),
      onCronTrigger,
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configSchema,
  })
  await runner.run(initWorkflow)
}
