# StockBaller

> **Trade athlete performance like stocks** - Tokenized sports trading with blockchain-powered price oracles

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Overview

StockBaller is a decentralized platform where users can buy and sell tokenized shares of professional footballers. Token prices move based on real match performance (goals, assists, ratings) - think Robinhood for sports fans.

### Core Features

- **Athlete Token Trading** - Buy/sell fractional shares of footballers
- **Performance-Based Pricing** - Prices update based on real match statistics
- **AI Prediction Markets** - GPT-4 powered match predictions with on-chain settlement
- **Decentralized Price Oracle** - Verifiable, transparent price feeds from live data

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
│   Trading, Portfolio, Market Data, Predictions                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    PRICE ORACLE LAYER                            │
│   Fetch Stats → Calculate Prices → Write On-Chain               │
│   (Pluggable: Chainlink CRE, Soroban, custom oracles)           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    SMART CONTRACTS                               │
│   Athlete Vault | Prediction Markets | USDC                      │
│   (EVM, Soroban, or other blockchain)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Blockchain Integrations

StockBaller is designed to be **blockchain-agnostic**. See specific integration documentation:

| Integration | Documentation | Status |
|-------------|---------------|--------|
| Chainlink CRE (Base Sepolia) | [`chainlink/README.md`](chainlink/README.md) | ✅ Active |
| Soroban (Stellar) | `soroban/README.md` | 🔜 Planned |
| Other chains | TBD | 🔜 Planned |

---

## 📁 Project Structure

```
stockballer/
├── app/                    # React Native screens (Expo Router)
├── api/                    # NestJS backend
│   ├── src/
│   │   ├── market/         # Market data & pricing
│   │   ├── trading/        # Buy/sell execution
│   │   ├── prediction/     # AI predictions & betting
│   │   ├── blockchain/     # On-chain integration
│   │   └── leads/          # Waitlist management
│   └── prisma/             # Database schema
├── blockchain/             # Smart contracts (Hardhat/EVM)
│   └── contracts/
├── chainlink/              # Chainlink CRE integration
│   ├── workflow/           # Price oracle workflow
│   └── contracts/          # Chainlink-specific contracts
├── src/                    # Frontend components & services
└── simulation-dashboard/   # Landing page (stockballer.app)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Wallet (MetaMask or compatible)

### Installation

```bash
# Clone
git clone https://github.com/Fillmore3000/Stockballer-app.git
cd Stockballer-app

# Install frontend
npm install

# Install backend
cd api && npm install
```

### Run Development

```bash
# Terminal 1: Backend
cd api && npm run start:dev

# Terminal 2: Frontend
npm run web
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

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
