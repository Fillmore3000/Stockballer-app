/**
 * Services Index
 * Export all data services
 */
export * from './athleteService';
export { default as athleteService } from './athleteService';

// API-Football service for live player data
export * from './apiFootballService';
export { default as apiFootballService } from './apiFootballService';

// Trading API service (connects to backend) - Primary trading interface
export {
  tradingApi,
  type BalanceResponse,
  type DepositResponse,
  type QuoteResponse,
  type BuyResponse,
  type SellResponse,
  type PortfolioPosition,
  type PortfolioPositionYieldData,
  type PortfolioResponse,
  type ApiTransactionRecord,
} from './tradingApiService';

// Web3 wallet service
export * from './web3Service';
