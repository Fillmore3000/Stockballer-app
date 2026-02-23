# StockBaller x Chainlink CRE

> **Hackathon:** Chainlink Convergence  
> **Category:** DeFi / Real-World Assets / Sports Data  
> **Network:** Base Sepolia (Chain ID: 84532)

## 🎯 What is StockBaller?

StockBaller lets users **trade athlete performance like stocks**. Token prices move based on real match statistics (goals, assists, ratings) fetched from live football APIs.

### The Problem with Centralized Oracles

Traditional sports apps use centralized backends to update prices. This creates:
- Single points of failure
- Trust issues (who verifies the data?)
- Manipulation risk

### Our Solution: Chainlink CRE

We integrate **Chainlink Runtime Environment (CRE)** to create a **decentralized, verifiable price oracle**:

1. **Fetch** → CRE workflow pulls live stats from API-Football
2. **Calculate** → Multiple Chainlink nodes compute prices independently
3. **Consensus** → Byzantine Fault Tolerant protocol verifies results
4. **Execute** → Verified price written to Base Sepolia blockchain

Every price update is cryptographically verified by the Chainlink DON.

---

## 📁 Chainlink Integration Files

| File | Description |
|------|-------------|
| [`chainlink/workflow/src/index.ts`](workflow/src/index.ts) | Main CRE workflow with cron & HTTP triggers |
| [`chainlink/workflow/src/priceCalculator.ts`](workflow/src/priceCalculator.ts) | StockBaller pricing formula |
| [`chainlink/workflow/src/types.ts`](workflow/src/types.ts) | TypeScript type definitions |
| [`chainlink/workflow/config/workflow.yaml`](workflow/config/workflow.yaml) | Workflow configuration |
| [`chainlink/contracts/ProSpectVaultV2.sol`](contracts/ProSpectVaultV2.sol) | Smart contract with Chainlink authorization |

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

## 🎥 Demo Video

[Watch the 3-5 minute demo video](https://youtube.com/watch?v=COMING_SOON)

Demonstrates:
1. App overview with wallet connection
2. CRE workflow simulation
3. Real API-Football data fetch
4. Price calculation in action
5. On-chain price update

---

## 🔗 Links

| Resource | Link |
|----------|------|
| **Live App** | [stockballer.app](https://stockballer.app) |
| **GitHub** | [github.com/Fillmore3000/Stockballer-app](https://github.com/Fillmore3000/Stockballer-app) |
| **Contract (Base Sepolia)** | [basescan.org/address/0x...](https://sepolia.basescan.org/address/0x05C5D2A758AE2F79FD0Df800c949Eab3219da1D0) |
| **Chainlink CRE Docs** | [docs.chain.link/cre](https://docs.chain.link/cre) |

---

## 📋 Hackathon Checklist

- [x] Project description with use case and architecture
- [x] Public GitHub repository
- [x] README with links to Chainlink integration files
- [x] CRE Workflow built (TypeScript)
- [x] Workflow integrates blockchain (Base Sepolia) with external API (API-Football)
- [ ] CRE simulation successful
- [ ] 3-5 minute demo video
- [ ] Live deployment on CRE network (Early Access)

---

## 👥 Team

**StockBaller** - Trade athlete performance like stocks.

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.
