# StockBaller x Chainlink Convergence Hackathon

## Implementation Plan

**Hackathon:** Chainlink Convergence  
**Project:** StockBaller - Tokenized Athlete Performance Trading  
**Integration:** Chainlink Runtime Environment (CRE) Workflow

---

## 📋 Executive Summary

StockBaller will integrate **Chainlink CRE** to create a decentralized, verifiable price oracle for athlete tokens. The CRE workflow will:

1. **Fetch** real-time athlete statistics from API-Football
2. **Calculate** token prices using our performance formula
3. **Write** verified prices on-chain to Base Sepolia

This replaces the current centralized `setPrice()` function with decentralized, consensus-verified price updates.

---

## 🎯 Hackathon Requirements Checklist

| Requirement | How We Meet It |
|-------------|----------------|
| Project description | ✅ Full README with use case and architecture |
| 3-5 minute video | 📹 Demo showing workflow execution |
| Public source code | ✅ GitHub public repo |
| README with Chainlink file links | ✅ Links to all CRE workflow files |
| CRE Workflow built/simulated | ✅ TypeScript workflow with CLI simulation |
| Blockchain + external API | ✅ Base Sepolia + API-Football |

---

## 🏗️ Architecture

### Current Architecture (Centralized)
```
┌────────────────────────────────────────────────────────────┐
│                      BACKEND (NestJS)                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ API-Football │ → │ Calculate    │ → │ Call setPrice │  │
│  │ (fetch stats)│    │ Price        │    │ (Owner only) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│              SMART CONTRACT (Base Sepolia)                  │
│         ProSpectVault.setPrice() - CENTRALIZED              │
└────────────────────────────────────────────────────────────┘
```

### New Architecture (Chainlink CRE)
```
┌────────────────────────────────────────────────────────────┐
│                 CHAINLINK CRE WORKFLOW                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Cron Trigger │ → │ HTTP Fetch   │ → │ Calculate    │  │
│  │ (every hour) │    │ API-Football │    │ Price Logic  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                               │             │
│  ┌────────────────────────────────────────────▼──────────┐  │
│  │              EVM Write (Base Sepolia)                 │  │
│  │   updatePriceFromOracle(tokenId, newPrice)            │  │
│  │   - Verified by DON consensus                         │  │
│  │   - Cryptographically signed                          │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│             SMART CONTRACT (Base Sepolia)                   │
│   ProSpectVault.updatePriceFromOracle() - DECENTRALIZED    │
│   - Only accepts calls from authorized Chainlink DON       │
└────────────────────────────────────────────────────────────┘
```

---

## 📁 New Files to Create

### Directory Structure
```
chainlink/
├── workflow/
│   ├── package.json           # TypeScript CRE project
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts           # Main workflow entry point
│   │   ├── priceCalculator.ts # Price calculation logic
│   │   └── types.ts           # TypeScript interfaces
│   └── config/
│       └── workflow.yaml      # Workflow configuration
├── contracts/
│   └── ChainlinkPriceOracleV2.sol  # Updated contract with Chainlink auth
└── README.md                  # Chainlink-specific documentation
```

---

## 📝 Implementation Details

### 1. CRE Workflow (TypeScript)

**File: `chainlink/workflow/src/index.ts`**
```typescript
import { cre, cron, http, evm } from "@chainlink/cre-sdk";

// Configuration
const config = {
  apiFootballKey: process.env.API_FOOTBALL_KEY,
  baseSepoliaRpc: "https://sepolia.base.org",
  vaultContract: "0x...", // ProSpectVault address
  athleteTokenIds: [1, 2, 3, 4, 5], // Token IDs to update
};

// Trigger: Run every hour
cre.Handler(
  cron.Trigger({ schedule: "0 0 * * * *" }), // Every hour
  onPriceUpdateTrigger
);

// Callback: Main workflow logic
async function onPriceUpdateTrigger(
  cfg: typeof config,
  runtime: cre.Runtime,
  trigger: cron.Payload
) {
  const httpClient = http.Client(runtime);
  const evmClient = evm.Client(runtime, { chainId: 84532 }); // Base Sepolia

  // Process each athlete
  for (const tokenId of cfg.athleteTokenIds) {
    // 1. Fetch stats from API-Football
    const statsResponse = await httpClient.fetch({
      url: `https://v3.football.api-sports.io/players?id=${tokenId}&season=2024`,
      headers: {
        "x-rapidapi-key": cfg.apiFootballKey,
      },
    });

    const stats = await statsResponse.json();
    
    // 2. Calculate price using our formula
    const newPrice = calculateAthletePrice(stats, tokenId);
    
    // 3. Write to blockchain (consensus-verified)
    await evmClient.write({
      contract: cfg.vaultContract,
      abi: VAULT_ABI,
      method: "updatePriceFromOracle",
      args: [tokenId, newPrice],
    });
  }

  return { updated: cfg.athleteTokenIds.length };
}

// Price calculation (ported from existing TypeScript)
function calculateAthletePrice(stats: any, tokenId: number): bigint {
  const basePrice = 5_000_000n; // $5.00 in USDC (6 decimals)
  
  const goals = stats.statistics?.[0]?.goals?.total || 0;
  const assists = stats.statistics?.[0]?.goals?.assists || 0;
  const appearances = stats.statistics?.[0]?.games?.appearences || 0;
  const rating = parseFloat(stats.statistics?.[0]?.games?.rating || "6.5");
  
  // Price formula: basePrice + (goals * 0.5) + (assists * 0.3) + (rating * 0.1)
  const goalBonus = BigInt(goals) * 500_000n;        // $0.50 per goal
  const assistBonus = BigInt(assists) * 300_000n;    // $0.30 per assist
  const ratingBonus = BigInt(Math.floor((rating - 6.5) * 1_000_000)); // Rating multiplier
  
  const newPrice = basePrice + goalBonus + assistBonus + ratingBonus;
  
  // Clamp between $1 and $100
  const MIN_PRICE = 1_000_000n;
  const MAX_PRICE = 100_000_000n;
  
  return newPrice < MIN_PRICE ? MIN_PRICE : newPrice > MAX_PRICE ? MAX_PRICE : newPrice;
}
```

### 2. Smart Contract Modifications

**File: `blockchain/contracts/ProSpectVaultV2.sol`**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ProSpectVaultV2 is ERC1155, Ownable, ReentrancyGuard {
    // ... existing code ...
    
    // Chainlink CRE authorized address
    address public chainlinkOracleAddress;
    
    // Events
    event OraclePriceUpdate(uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice, address indexed oracle);
    event OracleAddressUpdated(address indexed oldOracle, address indexed newOracle);
    
    // Modifier for Chainlink-only functions
    modifier onlyChainlinkOracle() {
        require(msg.sender == chainlinkOracleAddress, "Only Chainlink oracle");
        _;
    }
    
    /**
     * @dev Set the authorized Chainlink oracle address
     */
    function setChainlinkOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        address oldOracle = chainlinkOracleAddress;
        chainlinkOracleAddress = _oracle;
        emit OracleAddressUpdated(oldOracle, _oracle);
    }
    
    /**
     * @dev Update price from Chainlink CRE workflow (decentralized)
     * This is called by the Chainlink DON after consensus
     */
    function updatePriceFromOracle(
        uint256 tokenId, 
        uint256 newPrice
    ) external onlyChainlinkOracle {
        require(athleteActive[tokenId], "Athlete does not exist");
        require(newPrice >= MIN_PRICE && newPrice <= MAX_PRICE, "Price out of bounds");
        
        uint256 oldPrice = tokenPrices[tokenId];
        tokenPrices[tokenId] = newPrice;
        
        emit OraclePriceUpdate(tokenId, oldPrice, newPrice, msg.sender);
    }
    
    /**
     * @dev Legacy setPrice - still available for owner emergencies
     */
    function setPrice(uint256 tokenId, uint256 newPrice) external onlyOwner {
        // Existing implementation unchanged
        require(athleteActive[tokenId], "Athlete does not exist");
        require(newPrice >= MIN_PRICE && newPrice <= MAX_PRICE, "Price out of bounds");
        
        uint256 oldPrice = tokenPrices[tokenId];
        tokenPrices[tokenId] = newPrice;
        
        emit PriceUpdated(tokenId, oldPrice, newPrice);
    }
}
```

### 3. Workflow Configuration

**File: `chainlink/workflow/config/workflow.yaml`**
```yaml
name: stockballer-athlete-price-oracle
version: 1.0.0
description: "Decentralized athlete token price oracle using API-Football data"

triggers:
  - name: hourly-price-update
    type: cron
    config:
      schedule: "0 0 * * * *"  # Every hour

capabilities:
  - http    # Fetch from API-Football
  - evm     # Write to Base Sepolia

networks:
  base-sepolia:
    chainId: 84532
    rpc: "https://sepolia.base.org"
    
secrets:
  - API_FOOTBALL_KEY  # Encrypted via CRE secrets manager

contracts:
  ProSpectVault:
    address: "0x..."  # Deployed contract address
    abi: "./abis/ProSpectVault.json"
```

---

## ⏱️ Implementation Timeline

### Day 1 (8 hours)

| Task | Time | Status |
|------|------|--------|
| CRE account setup + CLI install | 1h | ⬜ |
| Initialize TypeScript CRE project | 1h | ⬜ |
| Port price calculation logic | 2h | ⬜ |
| Create HTTP fetch workflow | 2h | ⬜ |
| Test workflow simulation | 2h | ⬜ |

### Day 2 (8 hours)

| Task | Time | Status |
|------|------|--------|
| Update smart contract for Chainlink auth | 2h | ⬜ |
| Deploy updated contract to Base Sepolia | 1h | ⬜ |
| Add EVM write to workflow | 2h | ⬜ |
| End-to-end simulation testing | 2h | ⬜ |
| Document Chainlink files in README | 1h | ⬜ |

### Day 3 (4-6 hours)

| Task | Time | Status |
|------|------|--------|
| Record 3-5 min demo video | 2h | ⬜ |
| Clean up GitHub repo | 1h | ⬜ |
| Write hackathon submission | 1h | ⬜ |
| Final testing | 1h | ⬜ |
| Submit | 0.5h | ⬜ |

**Total: ~20-22 hours (2.5-3 days)**

---

## 🎥 Demo Video Outline

**Duration: 3-5 minutes**

1. **Intro (30s)**
   - "StockBaller: Trade athlete performance like stocks"
   - Show app home screen with wallet connected

2. **Problem Statement (30s)**
   - "Current sports trading platforms use centralized oracles"
   - "No transparency, single point of failure"

3. **Solution with Chainlink CRE (1m)**
   - Show architecture diagram
   - Explain: "CRE fetches API-Football data, calculates prices, writes to blockchain"
   - "Every price update is verified by Chainlink DON consensus"

4. **Live Demo (2m)**
   - Run `cre simulate` command
   - Show workflow fetching stats from API-Football
   - Show price calculation in action
   - Show EVM write to Base Sepolia
   - Open app, show updated price on player card

5. **Conclusion (30s)**
   - "Decentralized, verifiable, real-time athlete pricing"
   - "Built with Chainlink CRE on Base Sepolia"

---

## 📚 Key CRE CLI Commands

```bash
# Install CRE CLI
irm https://cre.chain.link/install.ps1 | iex

# Login
cre login

# Initialize project
cre init stockballer-oracle --template typescript

# Simulate workflow (no deployment needed!)
cre simulate --config ./config/workflow.yaml

# Upload secrets
cre secrets set API_FOOTBALL_KEY="your_key_here"

# Deploy (Early Access required)
cre deploy --config ./config/workflow.yaml

# View logs
cre logs --workflow stockballer-oracle
```

---

## 🔗 README Chainlink Links Section

Add to main README.md:

```markdown
## Chainlink Integration

This project uses **Chainlink Runtime Environment (CRE)** for decentralized price oracles.

### Chainlink Files

| File | Description |
|------|-------------|
| [`chainlink/workflow/src/index.ts`](chainlink/workflow/src/index.ts) | Main CRE workflow |
| [`chainlink/workflow/src/priceCalculator.ts`](chainlink/workflow/src/priceCalculator.ts) | Price calculation logic |
| [`chainlink/workflow/config/workflow.yaml`](chainlink/workflow/config/workflow.yaml) | Workflow configuration |
| [`blockchain/contracts/ProSpectVaultV2.sol`](blockchain/contracts/ProSpectVaultV2.sol) | Smart contract with Chainlink auth |

### How It Works

1. **Cron Trigger**: Workflow runs every hour
2. **HTTP Fetch**: Pulls live stats from API-Football
3. **Price Calculation**: Applies performance formula
4. **EVM Write**: Updates on-chain price via Chainlink DON

### Run Simulation

```bash
cd chainlink/workflow
npm install
cre simulate
```
```

---

## ✅ Sponsor Prize Alignment

Potential prize categories to target:

| Category | Fit | Strategy |
|----------|-----|----------|
| **Best CRE Workflow** | ⭐⭐⭐ | Novel use case (sports data) |
| **Best DeFi Integration** | ⭐⭐⭐ | Tokenized trading on Base |
| **Best Use of External Data** | ⭐⭐⭐ | API-Football integration |
| **Most Innovative** | ⭐⭐ | RWA + sports + DeFi combo |
| **Base Ecosystem** | ⭐⭐⭐ | Built on Base Sepolia |

---

## 🚀 Quick Start Commands

```bash
# 1. Clone and setup
git clone https://github.com/youruser/stockballer
cd stockballer/chainlink/workflow

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env
# Add API_FOOTBALL_KEY

# 4. Run simulation
cre login
cre simulate

# 5. View results
# Workflow executes, fetches stats, calculates prices, writes to chain
```

---

## 📞 Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [CRE Getting Started](https://docs.chain.link/cre/getting-started/overview)
- [CRE Templates](https://docs.chain.link/cre-templates)
- [Chainlink Discord](https://discord.gg/aSK4zew)
- [Convergence Hackathon](https://chain.link/hackathon)
