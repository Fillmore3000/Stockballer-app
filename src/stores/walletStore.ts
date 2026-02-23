/**
 * Wallet Store
 * Zustand store for managing Web3 wallet state
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  connectWallet as web3Connect,
  disconnectWallet as web3Disconnect,
  getConnectedAddress,
  getETHBalance,
  getUSDCBalance,
  isWalletAvailable,
  onAccountsChanged,
  onChainChanged,
  removeAccountsListener,
  removeChainListener,
  switchToBaseNetwork,
} from '../services/web3Service';
import { CHAIN_CONFIG } from '../config/blockchain';

interface WalletStore {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  ethBalance: string;
  usdcBalance: string;
  isWalletAvailable: boolean;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  checkConnection: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  setError: (error: string | null) => void;
  setupListeners: () => void;
  removeListeners: () => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      address: null,
      chainId: null,
      ethBalance: '0',
      usdcBalance: '0',
      isWalletAvailable: false,
      error: null,

      // Connect wallet
      connect: async () => {
        set({ isConnecting: true, error: null });

        try {
          if (!isWalletAvailable()) {
            throw new Error('No wallet detected. Please install MetaMask.');
          }

          const address = await web3Connect();
          
          // Get balances
          const [ethBalance, usdcBalance] = await Promise.all([
            getETHBalance(address),
            getUSDCBalance(address),
          ]);

          set({
            isConnected: true,
            isConnecting: false,
            address,
            chainId: CHAIN_CONFIG.chainId,
            ethBalance,
            usdcBalance,
          });

          // Setup listeners after connection
          get().setupListeners();
        } catch (error: any) {
          set({
            isConnecting: false,
            error: error.message || 'Failed to connect wallet',
          });
          throw error;
        }
      },

      // Disconnect wallet
      disconnect: () => {
        get().removeListeners();
        web3Disconnect();
        set({
          isConnected: false,
          address: null,
          chainId: null,
          ethBalance: '0',
          usdcBalance: '0',
          error: null,
        });
        // Clear persisted storage
        AsyncStorage.removeItem('wallet-storage').catch(console.error);
      },

      // Refresh balances
      refreshBalances: async () => {
        const { address, isConnected } = get();
        console.log('[WalletStore] refreshBalances called, connected:', isConnected, 'address:', address);
        
        if (!isConnected || !address) {
          console.log('[WalletStore] Not connected, skipping refresh');
          return;
        }

        try {
          const [ethBalance, usdcBalance] = await Promise.all([
            getETHBalance(address),
            getUSDCBalance(address),
          ]);

          console.log('[WalletStore] Balances fetched - ETH:', ethBalance, 'USDC:', usdcBalance);
          set({ ethBalance, usdcBalance });
        } catch (error) {
          console.error('[WalletStore] Failed to refresh balances:', error);
        }
      },

      // Check existing connection on app load
      checkConnection: async () => {
        set({ isWalletAvailable: isWalletAvailable() });

        try {
          const address = await getConnectedAddress();
          
          if (address) {
            const [ethBalance, usdcBalance] = await Promise.all([
              getETHBalance(address),
              getUSDCBalance(address),
            ]);

            set({
              isConnected: true,
              address,
              chainId: CHAIN_CONFIG.chainId,
              ethBalance,
              usdcBalance,
            });

            get().setupListeners();
          }
        } catch (error) {
          console.error('Failed to check connection:', error);
        }
      },

      // Switch to correct network
      switchNetwork: async () => {
        try {
          await switchToBaseNetwork();
          set({ chainId: CHAIN_CONFIG.chainId, error: null });
        } catch (error: any) {
          set({ error: error.message || 'Failed to switch network' });
          throw error;
        }
      },

      // Set error
      setError: (error) => set({ error }),

      // Setup event listeners
      setupListeners: () => {
        const handleAccountsChanged = async (accounts: string[]) => {
          if (accounts.length === 0) {
            // User disconnected
            get().disconnect();
          } else {
            // Account changed
            const newAddress = accounts[0];
            const [ethBalance, usdcBalance] = await Promise.all([
              getETHBalance(newAddress),
              getUSDCBalance(newAddress),
            ]);
            set({ address: newAddress, ethBalance, usdcBalance });
          }
        };

        const handleChainChanged = (chainIdHex: string) => {
          const chainId = parseInt(chainIdHex, 16);
          set({ chainId });
          
          // Refresh balances on chain change
          get().refreshBalances();
        };

        onAccountsChanged(handleAccountsChanged);
        onChainChanged(handleChainChanged);
      },

      // Remove event listeners
      removeListeners: () => {
        // Can't easily remove specific listeners without storing references
        // For now, this is a placeholder
      },
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist address to check on reload
        address: state.address,
      }),
    }
  )
);

// Selector hooks
export const useIsConnected = () => useWalletStore((state) => state.isConnected);
export const useWalletAddress = () => useWalletStore((state) => state.address);
export const useUSDCBalance = () => useWalletStore((state) => state.usdcBalance);
export const useETHBalance = () => useWalletStore((state) => state.ethBalance);
