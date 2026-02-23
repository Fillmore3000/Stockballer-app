# Web3 Integration Guide

## Overview

This guide explains how to deploy the smart contracts and configure the app for on-chain trading on Base Sepolia.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Expo Web)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ WalletButton │  │ WalletStore  │  │   Web3Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ ethers.js
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Base Sepolia (Testnet)                    │
│  ┌──────────────────┐     ┌─────────────────────────────┐  │
│  │    MockUSDC      │     │      ProSpectVault          │  │
│  │  (ERC-20 Token)  │◄───►│  (ERC-1155 Athlete Tokens)  │  │
│  └──────────────────┘     └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Smart Contracts

### MockUSDC.sol
A test stablecoin with 6 decimals (same as real USDC):
- **Faucet**: Anyone can request $10,000 mUSDC once per hour
- **Mint**: Anyone can mint up to $1M per transaction
- **Owner**: Deployer gets 1M initial supply

### ProSpectVault.sol
The main trading contract:
- **ERC-1155**: Each athlete is a token ID
- **Fixed Supply**: 1,000 tokens per athlete
- **Price Bounds**: $5 - $100 per token
- **Trading Fee**: 0.5% (50 basis points)
- **Oracle**: Owner sets prices (backend updates via cron)

## Deployment Steps

### 1. Set Environment Variables

```bash
cd blockchain
cp .env.example .env
```

Edit `.env`:
```env
RPC_URL=https://sepolia.base.org
ADMIN_PRIVATE_KEY=0x... # Your deployer private key (with Base Sepolia ETH)
BASESCAN_API_KEY=...    # Optional, for verification
```

### 2. Get Base Sepolia ETH

Get testnet ETH from:
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)

### 3. Deploy MockUSDC

```bash
cd blockchain
npx hardhat run scripts/deploy-mock-usdc.js --network baseSepolia
```

This outputs:
```
✅ MockUSDC deployed to: 0x...
```

Copy the address and add to `.env`:
```env
MOCK_USDC_ADDRESS=0x...
```

### 4. Deploy ProSpectVault

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

This outputs:
```
✅ ProSpectVault deployed to: 0x...
```

Copy the address.

### 5. Configure Frontend

Create/update `.env` in the root project directory:

```env
EXPO_PUBLIC_MOCK_USDC_ADDRESS=0x... # MockUSDC address
EXPO_PUBLIC_VAULT_ADDRESS=0x...     # ProSpectVault address
```

### 6. Verify Contracts (Optional)

```bash
# Verify MockUSDC
npx hardhat verify --network baseSepolia <MOCK_USDC_ADDRESS>

# Verify ProSpectVault
npx hardhat verify --network baseSepolia <VAULT_ADDRESS> "<MOCK_USDC_ADDRESS>"
```

## Using the App

### 1. Connect Wallet

1. Install MetaMask browser extension
2. Add Base Sepolia network (app will prompt automatically)
3. Click "Connect" button in the header
4. Approve the connection in MetaMask

### 2. Get Test USDC

1. Open the wallet modal (click your address)
2. Click "Get Test USDC (Faucet)"
3. Approve the transaction in MetaMask
4. You'll receive $10,000 mUSDC

### 3. Buy Athlete Tokens

1. Navigate to a player's page
2. Click "Buy"
3. Enter the amount
4. Approve USDC spending (first time only)
5. Confirm the buy transaction
6. Your tokens appear in the portfolio

### 4. View on Block Explorer

- Click "View on Explorer" in the wallet modal
- See your transactions and token holdings

## Contract Addresses

| Contract | Network | Address |
|----------|---------|---------|
| MockUSDC | Base Sepolia | TBD after deployment |
| ProSpectVault | Base Sepolia | TBD after deployment |

## Network Details

| Property | Value |
|----------|-------|
| Network Name | Base Sepolia |
| Chain ID | 84532 |
| RPC URL | https://sepolia.base.org |
| Block Explorer | https://sepolia.basescan.org |
| Currency | ETH |

## Troubleshooting

### "No wallet detected"
- Install MetaMask: https://metamask.io/download/

### "Wrong network"
- Click the network switching prompt
- Or manually add Base Sepolia in MetaMask

### "Faucet cooldown active"
- Wait 1 hour between faucet requests
- Or use the mint function directly

### "Insufficient ETH for gas"
- Get testnet ETH from faucet links above

### Transaction Stuck
- Increase gas price in MetaMask
- Or wait for network congestion to clear

## Development Notes

### Local Hardhat Network

For local development:
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy to local
npx hardhat run scripts/deploy-mock-usdc.js --network localhost
npx hardhat run scripts/deploy.js --network localhost
```

### Testing Contracts

```bash
npx hardhat test
```

### Generating ABIs

After contract changes:
```bash
npx hardhat compile
```

ABIs are in `artifacts/contracts/<Name>.sol/<Name>.json`
