# StockBaller x Chainlink CRE

> **Hackathon:** Chainlink Convergence  
> **Categories:** DeFi & Tokenization | CRE & AI | Prediction Markets  
> **Network:** Base Sepolia (Chain ID: 84532)

## 🎯 What is StockBaller?

StockBaller is a **sports finance platform** that combines three powerful features:

1. **Athlete Token Trading** - Trade athlete performance like stocks with prices based on real match statistics
2. **AI Prediction Oracle** - GPT-4 powered match predictions submitted on-chain
3. **Prediction Markets** - Bet on match outcomes with wallet-linked rewards

### The Problem with Centralized Oracles

Traditional sports apps use centralized backends to update prices and outcomes. This creates:
- Single points of failure
- Trust issues (who verifies the data?)
- Manipulation risk
- No transparent audit trail

### Our Solution: Chainlink CRE + AI Oracle

We integrate **Chainlink Runtime Environment (CRE)** to create **decentralized, verifiable oracles**:

**Price Oracle (CRE Workflow):**
1. **Fetch** → CRE workflow pulls live stats from API-Football
2. **Calculate** → Multiple Chainlink nodes compute prices independently
3. **Consensus** → Byzantine Fault Tolerant protocol verifies results
4. **Execute** → Verified price written to Base Sepolia blockchain

**Prediction Oracle (AI + On-Chain):**
1. **Analyze** → GPT-4 analyzes team form, injuries, head-to-head stats
2. **Predict** → AI generates score prediction with confidence percentage
3. **Submit** → Prediction recorded on-chain via PredictionMarket.sol
4. **Verify** → Settlement checks AI prediction against final result

Every price update and prediction is cryptographically verified and immutable.

---

## 📁 Chainlink Integration Files

### Price Oracle (CRE Workflow)

| File | Description |
|------|-------------|
| [`chainlink/workflow/src/index.ts`](workflow/src/index.ts) | Main CRE workflow with cron & HTTP triggers |
| [`chainlink/workflow/src/priceCalculator.ts`](workflow/src/priceCalculator.ts) | StockBaller pricing formula |
| [`chainlink/workflow/src/types.ts`](workflow/src/types.ts) | TypeScript type definitions |
| [`chainlink/workflow/config/workflow.yaml`](workflow/config/workflow.yaml) | Workflow configuration |
| [`chainlink/contracts/ProSpectVaultV2.sol`](contracts/ProSpectVaultV2.sol) | Smart contract with Chainlink authorization |

### Prediction Oracle (AI + On-Chain)

| File | Description |
|------|-------------|
| [`api/src/prediction/prediction.service.ts`](../api/src/prediction/prediction.service.ts) | AI prediction engine with GPT-4 + on-chain submission |
| [`api/src/prediction/prediction.controller.ts`](../api/src/prediction/prediction.controller.ts) | REST API endpoints for predictions |
| [`api/prisma/schema.prisma`](../api/prisma/schema.prisma) | Database models (Prediction, PredictionBet, User) |
| [`blockchain/contracts/PredictionMarket.sol`](../blockchain/contracts/PredictionMarket.sol) | On-chain prediction storage contract |
| [`chainlink/demo-match.ps1`](demo-match.ps1) | Demo script for full prediction flow |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHAINLINK CRE WORKFLOW                       │
│  ┌────────────┐   ┌─────────────┐   ┌────────────────────────┐  │
│  │  TRIGGER   │ → │  HTTP FETCH │ → │  PRICE CALCULATION     │  │
│  │ (Cron/HTTP)│   │ API-Football│   │  (StockBaller Formula) │  │
│  └────────────┘   └─────────────┘   └────────────────────────┘  │
│                                              │                   │
│                                              ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    DON CONSENSUS                            ││
│  │   Node 1 ──┐                                                ││
│  │   Node 2 ──┼──→ BFT Aggregation ──→ Verified Price         ││
│  │   Node N ──┘                                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                              │                   │
│                                              ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    EVM WRITE                                ││
│  │   ProSpectVaultV2.updatePriceFromOracle(tokenId, price)     ││
│  │   Base Sepolia (Chain ID: 84532)                            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Prediction Oracle Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   AI PREDICTION ORACLE                          │
│  ┌────────────┐   ┌─────────────┐   ┌────────────────────────┐  │
│  │  FIXTURES  │ → │   GPT-4     │ → │  SCORE PREDICTION      │  │
│  │ (API/Mock) │   │  Analysis   │   │  + Confidence + Reason │  │
│  └────────────┘   └─────────────┘   └────────────────────────┘  │
│                                              │                   │
│                                              ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │               ON-CHAIN SUBMISSION                           ││
│  │   PredictionMarket.submitPrediction(                        ││
│  │     matchId, homeScore, awayScore, timestamp                ││
│  │   ) → Returns txHash                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                              │                   │
│                                              ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    USER BETTING                             ││
│  │   - Users place bets (wallet-linked)                        ││
│  │   - Match settles with actual score                         ││
│  │   - Winners receive £100 bonus (on-chain)                   ││
│  │   - Leaderboard tracks win rates                            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 📜 Smart Contracts

### Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| ProSpectVaultV2 | `0x05C5D2A758AE2F79FD0Df800c949Eab3219da1D0` | Athlete token trading + Chainlink price oracle |
| PredictionMarket | `0x2D86C73e9709C5e9f76c45291077e87b4D5E1A56` | AI predictions + betting + settlements |
| MockUSDC | `0xb0BB4913d5f4B12fF633e5Ef786dF0feCdF56B84` | Test USDC for trading |

---

## 💰 Pricing Formula

```
Price = IPO + (Net_Yield × Form_Multiplier × Age_Multiplier)
```

Where:
- **Net_Yield** = Positive_Yield - Penalties
- **Positive_Yield** = (Goals × $0.25) + (Assists × $0.12) + (Matches × $0.02)
- **Penalties** = (Yellow × $0.15) + (Red × $1.50) + (Penalty Miss × $0.50)
- **Form_Multiplier** = 0.7 to 1.3 based on average rating
- **Age_Multiplier** = 15 (youth), 12 (prime), 8 (veteran)

---

## 🎯 Prediction API

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predictions/fixtures` | GET | List upcoming matches |
| `/api/predictions/demo/predict` | POST | Generate AI prediction for demo match |
| `/api/predictions/submit` | POST | Submit prediction on-chain (returns txHash) |
| `/api/predictions/bet` | POST | Place bet on a prediction (wallet-linked) |
| `/api/predictions/settle/:matchId` | POST | Settle match with actual score |
| `/api/predictions/user/:address` | GET | Get user stats and bet history |
| `/api/predictions/leaderboard` | GET | View top predictors by win rate |

### Database Models

```prisma
model Prediction {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  matchId     Int      @unique
  homeTeam    String
  awayTeam    String
  homeScore   Int
  awayScore   Int
  confidence  Float
  reasoning   String
  txHash      String?
  settled     Boolean  @default(false)
  actualHome  Int?
  actualAway  Int?
  bets        PredictionBet[]
  createdAt   DateTime @default(now())
}

model PredictionBet {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  userId       String   @db.ObjectId
  user         User     @relation(fields: [userId], references: [id])
  predictionId String   @db.ObjectId
  prediction   Prediction @relation(fields: [predictionId], references: [id])
  amount       Int
  won          Boolean?
  bonusAmount  Int?
  createdAt    DateTime @default(now())
  @@unique([userId, predictionId])
}
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- CRE CLI (`irm https://cre.chain.link/install.ps1 | iex`)
- CRE account ([cre.chain.link/signup](https://cre.chain.link/signup))
- API-Football key ([api-football.com](https://www.api-football.com/))

### Installation

```bash
# Clone the repo
git clone https://github.com/Fillmore3000/Stockballer-app.git
cd Stockballer-app/chainlink/workflow

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your API_FOOTBALL_KEY
```

### Simulate Workflow

```bash
# Login to CRE
cre login

# Run simulation (executes locally, makes real API calls)
cre simulate

# Expected output:
# [CRE] ========================================
# [CRE] StockBaller Price Oracle - Starting
# [CRE] Processing Erling Haaland (token 1)...
# [CRE] Haaland: 20G/5A, Rating: 7.8, Price: $100.00 → $112.50
# [CRE] COMPLETE: 5/5 updated
# [CRE] ========================================
```

### Deploy to DON (Early Access)

```bash
# Upload secrets
cre secrets set API_FOOTBALL_KEY="your_key_here"

# Deploy workflow
cre deploy --config ./config/workflow.yaml
```

---

## 📜 Smart Contract

### ProSpectVaultV2.sol

Key additions for Chainlink integration:

```solidity
// Authorized Chainlink oracle
address public chainlinkOracleAddress;

// Only oracle can update prices
modifier onlyChainlinkOracle() {
    require(msg.sender == chainlinkOracleAddress, "Not oracle");
    _;
}

// Update price from CRE workflow
function updatePriceFromOracle(
    uint256 tokenId, 
    uint256 newPrice
) external onlyChainlinkOracle {
    // Verified by Chainlink DON consensus
    tokenPrices[tokenId] = newPrice;
    emit OraclePriceUpdate(tokenId, oldPrice, newPrice, msg.sender, block.timestamp);
}
```

### Deployment (Base Sepolia)

```bash
cd blockchain
npx hardhat run scripts/deploy-v2.js --network baseSepolia
```

---

## 📊 CRE Workflow Flow

```typescript
// 1. Trigger fires (every hour or HTTP POST)
cre.Handler(
  cron.Trigger({ schedule: '0 0 * * * *' }),
  onPriceUpdateTrigger
);

// 2. Callback fetches data and calculates prices
async function onPriceUpdateTrigger(config, runtime, trigger) {
  const httpClient = http.Client(runtime);
  const evmClient = evm.Client(runtime, { chainId: 84532 });

  for (const athlete of config.athletes) {
    // Fetch stats from API-Football
    const stats = await httpClient.fetch({
      url: `https://v3.football.api-sports.io/players?id=${athlete.apiFootballId}`,
      headers: { 'x-rapidapi-key': config.apiFootballKey }
    });

    // Calculate new price
    const newPrice = calculateAthletePrice(stats, athlete.age, athlete.tokenId);

    // Write to blockchain (verified by DON)
    await evmClient.write({
      contract: config.vaultContractAddress,
      method: 'updatePriceFromOracle',
      args: [athlete.tokenId, newPrice]
    });
  }
}
```

---

## � Demo: Prediction Flow

Run the full prediction → bet → settle flow with the demo script:

```powershell
cd chainlink
.\demo-match.ps1
```

### What the demo does:

1. **Get Fixtures** - Lists available matches
2. **AI Prediction** - GPT-4 analyzes Real Madrid vs Liverpool → Predicts 5-1
3. **On-Chain Submit** - Records prediction to PredictionMarket.sol → Returns txHash
4. **User Bet** - Places £50 bet linked to wallet address
5. **Settlement** - Match ends, settles with actual score
6. **Rewards** - Winners receive £100 bonus (on-chain)
7. **Leaderboard** - Shows top predictors by win rate

### Manual API Testing

```powershell
# Start API server
cd api && npm run start:dev

# Generate AI prediction for demo match
Invoke-RestMethod -Uri "http://localhost:3001/api/predictions/demo/predict" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"homeTeam":"Real Madrid","awayTeam":"Liverpool","matchId":1002}'

# Submit prediction on-chain
Invoke-RestMethod -Uri "http://localhost:3001/api/predictions/submit" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"matchId":1002,"homeScore":5,"awayScore":1}'

# Place bet (linked to wallet)
Invoke-RestMethod -Uri "http://localhost:3001/api/predictions/bet" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"matchId":1002,"userAddress":"0x977Ad55cB75Ad56ED26b34585d397EAE50223B1B","amount":50}'

# Settle match after completion
Invoke-RestMethod -Uri "http://localhost:3001/api/predictions/settle/1002" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"actualHomeScore":5,"actualAwayScore":1}'

# Check user stats
Invoke-RestMethod -Uri "http://localhost:3001/api/predictions/user/0x977Ad55cB75Ad56ED26b34585d397EAE50223B1B"

# View leaderboard
Invoke-RestMethod -Uri "http://localhost:3001/api/predictions/leaderboard"
```

---

## 🎥 Demo Video

[Watch the 3-5 minute demo video](https://youtube.com/watch?v=COMING_SOON)

Demonstrates:
1. App overview with wallet connection
2. CRE workflow simulation for price oracle
3. AI prediction generation with GPT-4
4. On-chain prediction submission (txHash)
5. User betting with wallet linkage
6. Match settlement and bonus rewards
7. Leaderboard with win rates

---

## 🔗 Links

| Resource | Link |
|----------|------|
| **Live App** | [stockballer.app](https://stockballer.app) |
| **GitHub** | [github.com/Fillmore3000/Stockballer-app](https://github.com/Fillmore3000/Stockballer-app) |
| **ProSpectVaultV2** | [Base Sepolia](https://sepolia.basescan.org/address/0x05C5D2A758AE2F79FD0Df800c949Eab3219da1D0) |
| **PredictionMarket** | [Base Sepolia](https://sepolia.basescan.org/address/0x2D86C73e9709C5e9f76c45291077e87b4D5E1A56) |
| **MockUSDC** | [Base Sepolia](https://sepolia.basescan.org/address/0xb0BB4913d5f4B12fF633e5Ef786dF0feCdF56B84) |
| **Chainlink CRE Docs** | [docs.chain.link/cre](https://docs.chain.link/cre) |

---

## 📋 Hackathon Checklist

### Track 1: DeFi & Tokenization
- [x] Token trading linked to wallet addresses
- [x] Price oracle with CRE workflow integration
- [x] ProSpectVaultV2.sol deployed to Base Sepolia
- [x] Buy/sell functionality with on-chain execution

### Track 2: CRE & AI
- [x] GPT-4 integration for match analysis
- [x] AI prediction engine with confidence scores
- [x] On-chain prediction submission (PredictionMarket.sol)
- [x] External API integration (API-Football)

### Track 3: Prediction Markets
- [x] Betting system with wallet-linked bets
- [x] Settlement mechanism with actual scores
- [x] Bonus reward distribution (100 USDC per winner)
- [x] Leaderboard with win rate tracking
- [x] Database persistence (Prisma/MongoDB)

### General
- [x] Project description with use case and architecture
- [x] Public GitHub repository
- [x] README with links to Chainlink integration files
- [x] CRE Workflow built (TypeScript)
- [x] Workflow integrates blockchain (Base Sepolia) with external API
- [x] Demo script for full prediction flow
- [ ] 3-5 minute demo video
- [ ] Live deployment on CRE network (Early Access)

---

## 👥 Team

**StockBaller** - Trade athlete performance like stocks.

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.
