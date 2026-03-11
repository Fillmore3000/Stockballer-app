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
- **Automated Trading Bots** - 500+ bot fleet with multiple strategies for market simulation
- **Admin Dashboard** - Password-protected control panel for monitoring and management

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
│   │   ├── bots/           # Automated trading bot system
│   │   └── leads/          # Waitlist management
│   └── prisma/             # Database schema
├── blockchain/             # Smart contracts (Hardhat/EVM)
│   └── contracts/
├── chainlink/              # Chainlink CRE integration
│   ├── workflow/           # Price oracle workflow
│   └── contracts/          # Chainlink-specific contracts
├── src/                    # Frontend components & services
└── simulation-dashboard/   # Landing page & admin dashboard
    └── admin.html          # Bot fleet management UI
```

---

## 🤖 Bot Trading System

StockBaller includes an automated trading bot system for market simulation and testing:

### Bot Strategies
| Strategy | Description |
|----------|-------------|
| **VALUE_INVESTOR** | Buys undervalued young players, holds long-term |
| **DAY_TRADER** | High-frequency trading, small profits |
| **MOMENTUM** | Follows hot performers, trend-based |
| **RANDOM** | Random trades for market noise |

### Trading Mode Toggle
```env
# api/.env
BLOCKCHAIN_TRADING_ENABLED=false  # Simulated (database only)
BLOCKCHAIN_TRADING_ENABLED=true   # Live on-chain transactions
```

### Bot API Endpoints
```bash
# Create bot fleet
POST /api/bots/fleet { "count": 20, "startingBalance": 5000 }

# Fund all bots with ETH + USDC
POST /api/bots/fund-all { "ethAmount": 0.005, "usdcAmount": 5000 }

# Get blockchain status
GET /api/bots/blockchain-status
```

---

## 🖥️ Admin Dashboard

Password-protected dashboard at `simulation-dashboard/admin.html`:

- **Bot Fleet Overview** - Grid view with search, filter, pagination (500+ bots ready)
- **Portfolio Holdings** - Aggregated holdings with player photos
- **Blockchain Status** - Trading mode, contract addresses
- **Quick Actions** - Activate/deactivate bots, trigger trades, fund wallets

**Default Password:** `stockballer2026` (change in admin.html)

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
| Admin Dashboard | `simulation-dashboard/admin.html` |

---

## � Production Deployment

### Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build API image manually
cd api && docker build -t stockballer-api .
```

### CI/CD

GitHub Actions workflow included (`.github/workflows/ci.yml`):
- ✅ API linting & tests
- ✅ Mobile TypeScript check
- ✅ Smart contract compilation & tests
- ✅ Docker image build

### API Documentation

Swagger UI available at: `http://localhost:3001/api/docs`

### Health Check

```bash
curl http://localhost:3001/api/health
```

---

## 📋 Recent Updates (March 2026)

### Production Readiness
- ✅ GitHub Actions CI/CD pipeline
- ✅ Docker containerization
- ✅ Swagger API documentation
- ✅ Health check endpoint
- ✅ Landing page conversion optimization (email capture, exit popup, countdown)

### Bot Trading System
- ✅ Created automated trading bot infrastructure with 4 strategies
- ✅ Blockchain trading toggle (simulated vs live mode)
- ✅ USDC minting for testnet bot funding
- ✅ Batch funding endpoint for all bots

### Admin Dashboard
- ✅ Password-protected login portal
- ✅ Scalable bot fleet UI (grid view, search, filter, pagination)
- ✅ Portfolio holdings with player photos and expandable cards
- ✅ One-click "Fund All Bots" button
- ✅ Trading mode indicator (Simulated/Real)

### API Enhancements
- ✅ `POST /bots/fund-all` - Batch fund bots with ETH + USDC
- ✅ `POST /bots/:id/fund-usdc` - Mint USDC to specific bot
- ✅ `GET /bots/blockchain-status` - Check trading mode

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
