# StockBaller

> **Trade athlete performance like stocks** - Tokenized sports trading powered by Chainlink CRE

[![Chainlink](https://img.shields.io/badge/Chainlink-CRE-blue)](https://docs.chain.link/cre)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-green)](https://sepolia.basescan.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Overview

StockBaller is a decentralized platform where users can buy and sell tokenized shares of professional footballers. Token prices move based on real match performance (goals, assists, ratings) - think Robinhood for sports fans.

### Key Innovation: Chainlink CRE Price Oracle

Instead of a centralized backend updating prices, we use **Chainlink Runtime Environment (CRE)** workflows to:

1. Fetch live statistics from API-Football
2. Calculate prices using our performance formula
3. Write verified prices on-chain via DON consensus

Every price update is cryptographically verified by multiple independent Chainlink nodes.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│   React Native (Expo) | iOS | Android | Web                     │
│   stockballer.app                                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      BACKEND API                                 │
│   NestJS | Prisma | MongoDB                                      │
│   Trading, Portfolio, Market Data                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   CHAINLINK CRE WORKFLOW                         │
│   Cron Trigger → HTTP Fetch → Price Calculation → EVM Write     │
│   Decentralized, Verifiable, Consensus-Based                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    SMART CONTRACTS                               │
│   ProSpectVaultV2.sol | MockUSDC.sol                             │
│   Base Sepolia (Chain ID: 84532)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Chainlink Integration

**See full documentation:** [`chainlink/README.md`](chainlink/README.md)

### Chainlink Files

| File | Description |
|------|-------------|
| [`chainlink/workflow/src/index.ts`](chainlink/workflow/src/index.ts) | Main CRE workflow entry point |
| [`chainlink/workflow/src/priceCalculator.ts`](chainlink/workflow/src/priceCalculator.ts) | Pricing formula implementation |
| [`chainlink/workflow/config/workflow.yaml`](chainlink/workflow/config/workflow.yaml) | Workflow configuration |
| [`chainlink/contracts/ProSpectVaultV2.sol`](chainlink/contracts/ProSpectVaultV2.sol) | Smart contract with oracle auth |

### How It Works

```typescript
// CRE Workflow - Runs every hour
cre.Handler(
  cron.Trigger({ schedule: '0 0 * * * *' }),
  async (config, runtime, trigger) => {
    const httpClient = http.Client(runtime);
    const evmClient = evm.Client(runtime, { chainId: 84532 });
    
    // 1. Fetch stats from API-Football
    const stats = await httpClient.fetch({
      url: `https://v3.football.api-sports.io/players?id=${playerId}`,
    });
    
    // 2. Calculate price (consensus across DON nodes)
    const newPrice = calculateAthletePrice(stats, age, tokenId);
    
    // 3. Write to blockchain (verified by BFT consensus)
    await evmClient.write({
      contract: vaultAddress,
      method: 'updatePriceFromOracle',
      args: [tokenId, newPrice],
    });
  }
);
```

---

## 📁 Project Structure

```
stockballer/
├── app/                    # React Native screens (Expo Router)
├── api/                    # NestJS backend
│   ├── src/
│   │   ├── market/         # Market data & pricing
│   │   ├── trading/        # Buy/sell execution
│   │   ├── blockchain/     # On-chain integration
│   │   └── leads/          # Waitlist management
│   └── prisma/             # Database schema
├── blockchain/             # Smart contracts (Hardhat)
│   └── contracts/
│       ├── ProSpectVault.sol
│       └── MockUSDC.sol
├── chainlink/              # 🆕 Chainlink CRE integration
│   ├── workflow/           # TypeScript CRE workflow
│   └── contracts/          # ProSpectVaultV2.sol
├── src/                    # Frontend components & services
└── simulation-dashboard/   # Landing page (stockballer.app)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- MetaMask with Base Sepolia
- CRE CLI (for Chainlink workflow)

### Installation

```bash
# Clone
git clone https://github.com/Fillmore3000/Stockballer-app.git
cd Stockballer-app

# Install frontend
npm install

# Install backend
cd api && npm install

# Install Chainlink workflow
cd ../chainlink/workflow && npm install
```

### Run Development

```bash
# Terminal 1: Backend
cd api && npm run start:dev

# Terminal 2: Frontend
npm run web

# Terminal 3: CRE Simulation (optional)
cd chainlink/workflow && cre simulate
```

---

## 💰 Pricing Formula

```
Price = IPO + (Net_Yield × Form_Multiplier × Age_Multiplier)
```

| Factor | Value |
|--------|-------|
| Goal | +$0.25 |
| Assist | +$0.12 |
| Match Played | +$0.02 |
| Yellow Card | -$0.15 |
| Red Card | -$1.50 |
| Penalty Missed | -$0.50 |

| Age | Multiplier |
|-----|------------|
| < 20 | 15x |
| 20-27 | 12x |
| > 27 | 8x |

---

## 🔗 Links

| Resource | Link |
|----------|------|
| Live App | [stockballer.app](https://stockballer.app) |
| GitHub | [github.com/Fillmore3000/Stockballer-app](https://github.com/Fillmore3000/Stockballer-app) |
| Contract | [Base Sepolia](https://sepolia.basescan.org/address/0x05C5D2A758AE2F79FD0Df800c949Eab3219da1D0) |
| Chainlink Docs | [docs.chain.link/cre](https://docs.chain.link/cre) |

---

## 🏆 Hackathon

**Chainlink Convergence**

This project demonstrates:
- ✅ CRE Workflow with cron & HTTP triggers
- ✅ External API integration (API-Football)
- ✅ Blockchain read/write (Base Sepolia)
- ✅ Decentralized price oracle via DON consensus

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for **Chainlink Convergence Hackathon**
