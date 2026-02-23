/**
 * Web3 Service
 * Handles wallet connection and blockchain interactions using ethers.js v5
 */
import { ethers } from 'ethers';
import {
  CHAIN_CONFIG,
  CONTRACT_ADDRESSES,
  ERC20_ABI,
  VAULT_ABI,
  USDC_DECIMALS,
} from '../config/blockchain';

// Ethereum provider from window (MetaMask injects this)
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  usdcBalance: string;
  ethBalance: string;
}

export interface TokenBalance {
  tokenId: number;
  balance: ethers.BigNumber;
  formattedBalance: string;
}

/**
 * Check if MetaMask or another wallet is available
 */
export const isWalletAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.ethereum;
};

/**
 * Get the browser provider (MetaMask) - ethers v5
 */
export const getProvider = (): ethers.providers.Web3Provider | null => {
  if (!isWalletAvailable()) return null;
  return new ethers.providers.Web3Provider(window.ethereum);
};

/**
 * Request wallet connection
 * @returns Connected wallet address
 */
export const connectWallet = async (): Promise<string> => {
  if (!isWalletAvailable()) {
    throw new Error('No wallet detected. Please install MetaMask.');
  }

  const provider = getProvider()!;
  
  // Request account access
  const accounts = await provider.send('eth_requestAccounts', []);
  
  if (accounts.length === 0) {
    throw new Error('No accounts found');
  }

  // Check if on correct network
  const network = await provider.getNetwork();
  if (network.chainId !== CHAIN_CONFIG.chainId) {
    await switchToBaseNetwork();
  }

  return accounts[0];
};

/**
 * Switch to Base Sepolia network
 */
export const switchToBaseNetwork = async (): Promise<void> => {
  if (!isWalletAvailable()) {
    throw new Error('No wallet detected');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_CONFIG.chainIdHex }],
    });
  } catch (error: any) {
    // Chain not added, let's add it
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: CHAIN_CONFIG.chainIdHex,
            chainName: CHAIN_CONFIG.name,
            nativeCurrency: CHAIN_CONFIG.nativeCurrency,
            rpcUrls: [CHAIN_CONFIG.rpcUrl],
            blockExplorerUrls: [CHAIN_CONFIG.blockExplorer],
          },
        ],
      });
    } else {
      throw error;
    }
  }
};

/**
 * Disconnect wallet (clear local state - MetaMask doesn't have true disconnect)
 */
export const disconnectWallet = async (): Promise<void> => {
  // MetaMask doesn't support programmatic disconnect
  // The app will just clear its local state
  console.log('Wallet disconnected from app');
};

/**
 * Get current connected address
 */
export const getConnectedAddress = async (): Promise<string | null> => {
  if (!isWalletAvailable()) return null;
  
  const provider = getProvider()!;
  const accounts = await provider.send('eth_accounts', []);
  return accounts[0] || null;
};

/**
 * Get ETH balance
 */
export const getETHBalance = async (address: string): Promise<string> => {
  const provider = getProvider();
  if (!provider) return '0';
  
  const balance = await provider.getBalance(address);
  return ethers.utils.formatEther(balance);
};

/**
 * Get USDC balance from MockUSDC contract
 */
export const getUSDCBalance = async (address: string): Promise<string> => {
  const provider = getProvider();
  if (!provider) {
    console.log('[Balance] No provider, returning 0');
    return '0';
  }
  
  if (!CONTRACT_ADDRESSES.MOCK_USDC) {
    console.log('[Balance] No MOCK_USDC address configured, returning 0');
    return '0';
  }

  try {
    const usdcContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MOCK_USDC,
      ERC20_ABI,
      provider
    );

    const balance = await usdcContract.balanceOf(address);
    const formatted = ethers.utils.formatUnits(balance, USDC_DECIMALS);
    console.log(`[Balance] USDC balance for ${address}: ${formatted}`);
    return formatted;
  } catch (error) {
    console.error('[Balance] Error getting USDC balance:', error);
    return '0';
  }
};

/**
 * Request USDC from faucet
 */
export const requestUSDCFromFaucet = async (): Promise<string> => {
  console.log('[Faucet] Starting faucet request...');
  
  const provider = getProvider();
  if (!provider) {
    console.error('[Faucet] No provider available');
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }
  
  if (!CONTRACT_ADDRESSES.MOCK_USDC) {
    console.error('[Faucet] MOCK_USDC address not configured:', CONTRACT_ADDRESSES.MOCK_USDC);
    throw new Error('MockUSDC contract address not configured. Check EXPO_PUBLIC_MOCK_USDC_ADDRESS in .env');
  }

  console.log('[Faucet] Using USDC contract:', CONTRACT_ADDRESSES.MOCK_USDC);

  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();
  console.log('[Faucet] Signer address:', signerAddress);
  
  const usdcContract = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_USDC,
    ERC20_ABI,
    signer
  );

  try {
    console.log('[Faucet] Sending faucet transaction...');
    const tx = await usdcContract.faucet();
    console.log('[Faucet] Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('[Faucet] Transaction confirmed:', receipt.transactionHash);
    
    return receipt.transactionHash;
  } catch (error: any) {
    // Parse nested error messages from ethers/MetaMask
    const errorMessage = error?.error?.data?.message || error?.data?.message || error?.reason || error?.message || 'Unknown error';
    console.error('[Faucet] Transaction failed:', errorMessage);
    
    if (errorMessage.toLowerCase().includes('cooldown')) {
      throw new Error('Faucet cooldown active. You can request once per hour.');
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Approve USDC spending by Vault contract
 */
export const approveUSDC = async (amount: string): Promise<string> => {
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESSES.MOCK_USDC || !CONTRACT_ADDRESSES.VAULT) {
    throw new Error('Wallet or contracts not available');
  }

  const signer = provider.getSigner();
  const usdcContract = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_USDC,
    ERC20_ABI,
    signer
  );

  const amountInUnits = ethers.utils.parseUnits(amount, USDC_DECIMALS);
  const tx = await usdcContract.approve(CONTRACT_ADDRESSES.VAULT, amountInUnits);
  const receipt = await tx.wait();
  
  return receipt.transactionHash;
};

/**
 * Get USDC allowance for Vault
 */
export const getUSDCAllowance = async (owner: string): Promise<string> => {
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESSES.MOCK_USDC || !CONTRACT_ADDRESSES.VAULT) {
    return '0';
  }

  const usdcContract = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_USDC,
    ERC20_ABI,
    provider
  );

  const allowance = await usdcContract.allowance(owner, CONTRACT_ADDRESSES.VAULT);
  return ethers.utils.formatUnits(allowance, USDC_DECIMALS);
};

/**
 * Buy athlete tokens from Vault
 */
export const buyAthleteTokens = async (
  tokenId: number,
  amount: number
): Promise<{ txHash: string; totalCost: string }> => {
  console.log('[web3Service] buyAthleteTokens called:', { tokenId, amount, tokenIdType: typeof tokenId });
  
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESSES.VAULT) {
    throw new Error('Wallet or Vault contract not available');
  }

  console.log('[web3Service] Vault contract address:', CONTRACT_ADDRESSES.VAULT);

  const signer = provider.getSigner();
  const vaultContract = new ethers.Contract(
    CONTRACT_ADDRESSES.VAULT,
    VAULT_ABI,
    signer
  );

  // Check if athlete is active first
  try {
    const isActive = await vaultContract.athleteActive(tokenId);
    console.log(`[web3Service] athleteActive(${tokenId}) = ${isActive}`);
    
    if (!isActive) {
      throw new Error(`Athlete with tokenId ${tokenId} is not registered on the contract. Please contact admin.`);
    }
  } catch (checkError: any) {
    console.error('[web3Service] Error checking athlete status:', checkError);
    throw checkError;
  }

  // Get signer address for balance/allowance checks
  const signerAddress = await signer.getAddress();
  
  // Get quote first
  console.log(`[web3Service] Getting buy quote for tokenId=${tokenId}, amount=${amount}...`);
  const quote = await vaultContract.getBuyQuote(tokenId, amount);
  const totalCost = ethers.utils.formatUnits(quote.total, USDC_DECIMALS);
  const totalCostRaw = quote.total;
  console.log('[web3Service] Quote received:', { subtotal: quote.subtotal?.toString(), fee: quote.fee?.toString(), total: quote.total?.toString(), totalCost });

  // Check USDC balance before attempting buy
  const usdcContract = new ethers.Contract(
    CONTRACT_ADDRESSES.MOCK_USDC!,
    ERC20_ABI,
    signer
  );
  
  const usdcBalance = await usdcContract.balanceOf(signerAddress);
  console.log(`[web3Service] USDC balance: ${ethers.utils.formatUnits(usdcBalance, USDC_DECIMALS)}, required: ${totalCost}`);
  
  if (usdcBalance.lt(totalCostRaw)) {
    throw new Error(`Insufficient USDC balance. You have $${ethers.utils.formatUnits(usdcBalance, USDC_DECIMALS)} but need $${totalCost}. Please get more from the faucet.`);
  }

  // Check USDC allowance before attempting buy
  const allowance = await usdcContract.allowance(signerAddress, CONTRACT_ADDRESSES.VAULT);
  console.log(`[web3Service] USDC allowance: ${ethers.utils.formatUnits(allowance, USDC_DECIMALS)}, required: ${totalCost}`);
  
  if (allowance.lt(totalCostRaw)) {
    throw new Error(`USDC not approved. Please approve at least $${totalCost} first. Current allowance: $${ethers.utils.formatUnits(allowance, USDC_DECIMALS)}`);
  }

  // Execute buy with manual gas limit to avoid estimation issues
  try {
    console.log('[web3Service] Executing buyTokens transaction...');
    const tx = await vaultContract.buyTokens(tokenId, amount, {
      gasLimit: 500000, // Manual gas limit
    });
    console.log('[web3Service] Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('[web3Service] Transaction confirmed:', receipt.transactionHash);

    return {
      txHash: receipt.transactionHash,
      totalCost,
    };
  } catch (buyError: any) {
    console.error('[web3Service] Buy transaction failed:', buyError);
    
    // Try to extract more specific error
    const reason = buyError?.error?.data?.message || 
                   buyError?.reason || 
                   buyError?.data?.message ||
                   buyError?.message || 
                   'Unknown error';
    
    if (reason.includes('insufficient') || reason.includes('USDC')) {
      throw new Error('Insufficient USDC balance. Please get more from the faucet.');
    }
    if (reason.includes('allowance') || reason.includes('approve')) {
      throw new Error('USDC not approved for trading. Please approve first.');
    }
    if (reason.includes('not active') || reason.includes('not registered')) {
      throw new Error(`Athlete tokenId ${tokenId} is not registered on-chain.`);
    }
    
    throw new Error(`Buy failed: ${reason}`);
  }
};

/**
 * Sell athlete tokens to Vault
 */
export const sellAthleteTokens = async (
  tokenId: number,
  amount: number
): Promise<{ txHash: string; totalReceived: string }> => {
  console.log('[web3Service] sellAthleteTokens called:', { tokenId, amount, tokenIdType: typeof tokenId });
  
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESSES.VAULT) {
    throw new Error('Wallet or Vault contract not available');
  }

  console.log('[web3Service] Vault contract address:', CONTRACT_ADDRESSES.VAULT);

  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();
  
  const vaultContract = new ethers.Contract(
    CONTRACT_ADDRESSES.VAULT,
    VAULT_ABI,
    signer
  );

  // Check current token balance first
  const balance = await vaultContract.balanceOf(signerAddress, tokenId);
  console.log(`[web3Service] Current token balance for tokenId ${tokenId}: ${balance.toString()}`);
  
  if (balance.lt(amount)) {
    throw new Error(`Insufficient token balance. You have ${balance.toString()} but trying to sell ${amount}`);
  }

  // Get quote first to show expected return
  console.log(`[web3Service] Getting sell quote for tokenId=${tokenId}, amount=${amount}...`);
  const quote = await vaultContract.getSellQuote(tokenId, amount);
  const expectedReceived = ethers.utils.formatUnits(quote.total, USDC_DECIMALS);
  console.log('[web3Service] Sell quote:', { subtotal: quote.subtotal?.toString(), fee: quote.fee?.toString(), total: quote.total?.toString() });

  // Execute sell with manual gas limit
  try {
    console.log('[web3Service] Executing sell transaction...');
    const tx = await vaultContract.sellTokens(tokenId, amount, {
      gasLimit: 500000, // Manual gas limit
    });
    console.log('[web3Service] Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('[web3Service] Transaction confirmed:', receipt.transactionHash);

    return {
      txHash: receipt.transactionHash,
      totalReceived: expectedReceived,
    };
  } catch (sellError: any) {
    console.error('[web3Service] Sell transaction failed:', sellError);
    
    const reason = sellError?.error?.data?.message || 
                   sellError?.reason || 
                   sellError?.data?.message ||
                   sellError?.message || 
                   'Unknown error';
    
    if (reason.includes('insufficient') || reason.includes('balance')) {
      throw new Error('Insufficient token balance.');
    }
    
    throw new Error(`Sell failed: ${reason}`);
  }
};

/**
 * Get athlete token balance for an address
 */
export const getAthleteTokenBalance = async (
  address: string,
  tokenId: number
): Promise<string> => {
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESSES.VAULT) return '0';

  const vaultContract = new ethers.Contract(
    CONTRACT_ADDRESSES.VAULT,
    VAULT_ABI,
    provider
  );

  const balance = await vaultContract.balanceOf(address, tokenId);
  return balance.toString();
};

/**
 * Get athlete info from contract
 */
export const getAthleteInfo = async (tokenId: number): Promise<{
  active: boolean;
  price: string;
  supply: string;
  remaining: string;
} | null> => {
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESSES.VAULT) return null;

  const vaultContract = new ethers.Contract(
    CONTRACT_ADDRESSES.VAULT,
    VAULT_ABI,
    provider
  );

  try {
    const info = await vaultContract.getAthleteInfo(tokenId);
    return {
      active: info.active,
      price: ethers.utils.formatUnits(info.price, USDC_DECIMALS),
      supply: info.supply.toString(),
      remaining: info.remaining.toString(),
    };
  } catch {
    return null;
  }
};

/**
 * Get buy quote from contract
 */
export const getBuyQuote = async (
  tokenId: number,
  amount: number
): Promise<{ subtotal: string; fee: string; total: string } | null> => {
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESSES.VAULT) return null;

  const vaultContract = new ethers.Contract(
    CONTRACT_ADDRESSES.VAULT,
    VAULT_ABI,
    provider
  );

  try {
    const quote = await vaultContract.getBuyQuote(tokenId, amount);
    return {
      subtotal: ethers.utils.formatUnits(quote.subtotal, USDC_DECIMALS),
      fee: ethers.utils.formatUnits(quote.fee, USDC_DECIMALS),
      total: ethers.utils.formatUnits(quote.total, USDC_DECIMALS),
    };
  } catch {
    return null;
  }
};

/**
 * Get sell quote from contract
 */
export const getSellQuote = async (
  tokenId: number,
  amount: number
): Promise<{ subtotal: string; fee: string; total: string } | null> => {
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESSES.VAULT) return null;

  const vaultContract = new ethers.Contract(
    CONTRACT_ADDRESSES.VAULT,
    VAULT_ABI,
    provider
  );

  try {
    const quote = await vaultContract.getSellQuote(tokenId, amount);
    return {
      subtotal: ethers.utils.formatUnits(quote.subtotal, USDC_DECIMALS),
      fee: ethers.utils.formatUnits(quote.fee, USDC_DECIMALS),
      total: ethers.utils.formatUnits(quote.total, USDC_DECIMALS),
    };
  } catch {
    return null;
  }
};

/**
 * Listen for account changes
 */
export const onAccountsChanged = (callback: (accounts: string[]) => void): void => {
  if (!isWalletAvailable()) return;
  window.ethereum.on('accountsChanged', callback);
};

/**
 * Listen for chain changes
 */
export const onChainChanged = (callback: (chainId: string) => void): void => {
  if (!isWalletAvailable()) return;
  window.ethereum.on('chainChanged', callback);
};

/**
 * Remove account change listener
 */
export const removeAccountsListener = (callback: (accounts: string[]) => void): void => {
  if (!isWalletAvailable()) return;
  window.ethereum.removeListener('accountsChanged', callback);
};

/**
 * Remove chain change listener
 */
export const removeChainListener = (callback: (chainId: string) => void): void => {
  if (!isWalletAvailable()) return;
  window.ethereum.removeListener('chainChanged', callback);
};
