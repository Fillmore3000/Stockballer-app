/**
 * Blockchain Configuration
 * Configuration for Base Sepolia network and smart contracts
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';

// Base Sepolia Chain Configuration (Testnet)
export const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  chainIdHex: '0x14A34',
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
};

// Base Mainnet Configuration (Production)
export const BASE_MAINNET_CONFIG = {
  chainId: 8453,
  chainIdHex: '0x2105',
  name: 'Base',
  rpcUrl: 'https://mainnet.base.org',
  blockExplorer: 'https://basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
};

// Active chain config based on environment
export const CHAIN_CONFIG = isDevelopment ? BASE_SEPOLIA_CONFIG : BASE_MAINNET_CONFIG;

// Contract Addresses - Update after deployment
// Run: npx hardhat run scripts/deploy-mock-usdc.js --network baseSepolia
// Then: npx hardhat run scripts/deploy.js --network baseSepolia
export const CONTRACT_ADDRESSES = {
  // MockUSDC contract address - update after deployment
  MOCK_USDC: process.env.EXPO_PUBLIC_MOCK_USDC_ADDRESS || '',
  // ProSpectVault contract address - update after deployment
  VAULT: process.env.EXPO_PUBLIC_VAULT_ADDRESS || '',
};

// ERC20 ABI for MockUSDC
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  // MockUSDC specific
  'function mint(address to, uint256 amount)',
  'function faucet()',
  'function canUseFaucet(address user) view returns (bool canUse, uint256 cooldownRemaining)',
];

// ProSpectVault ABI (simplified for frontend)
export const VAULT_ABI = [
  // Read functions
  'function usdc() view returns (address)',
  'function tokenPrices(uint256 tokenId) view returns (uint256)',
  'function tokenSupply(uint256 tokenId) view returns (uint256)',
  'function athleteActive(uint256 tokenId) view returns (bool)',
  'function balanceOf(address account, uint256 tokenId) view returns (uint256)',
  'function getTokenPrice(uint256 tokenId) view returns (uint256)',
  'function getAthleteInfo(uint256 tokenId) view returns (bool active, uint256 price, uint256 supply, uint256 remaining)',
  'function getBuyQuote(uint256 tokenId, uint256 amount) view returns (uint256 subtotal, uint256 fee, uint256 total)',
  'function getSellQuote(uint256 tokenId, uint256 amount) view returns (uint256 subtotal, uint256 fee, uint256 total)',
  // Write functions
  'function buyTokens(uint256 tokenId, uint256 amount)',
  'function sellTokens(uint256 tokenId, uint256 amount)',
  // Events
  'event TokensPurchased(address indexed buyer, uint256 indexed tokenId, uint256 amount, uint256 totalCost)',
  'event TokensSold(address indexed seller, uint256 indexed tokenId, uint256 amount, uint256 totalReceived)',
];

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

// Format USDC amount for display
export const formatUSDC = (amount: bigint | string | number): string => {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount);
  const formatted = Number(value) / 10 ** USDC_DECIMALS;
  return formatted.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Parse USDC amount from string to smallest units
export const parseUSDC = (amount: string | number): bigint => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.round(value * 10 ** USDC_DECIMALS));
};

// Short address display (0x1234...5678)
export const shortenAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Get block explorer URL for address
export const getExplorerAddressUrl = (address: string): string => {
  return `${CHAIN_CONFIG.blockExplorer}/address/${address}`;
};

// Get block explorer URL for transaction
export const getExplorerTxUrl = (txHash: string): string => {
  return `${CHAIN_CONFIG.blockExplorer}/tx/${txHash}`;
};
