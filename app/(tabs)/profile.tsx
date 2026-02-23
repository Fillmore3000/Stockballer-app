/**
 * Profile Screen - Web3 Wallet & Transaction History
 * Shows Web3 wallet balance (mUSDC) and transaction activity
 * Only mode: MetaMask wallet on Base Sepolia
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, ScrollView, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, Card, Divider } from '../../src/components';
import { useAuthStore, useWalletStore } from '../../src/stores';
import { tradingApi } from '../../src/services/tradingApiService';
import { requestUSDCFromFaucet } from '../../src/services/web3Service';
import type { TransactionRecord } from '../../src/types';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, value, valueColor, onPress, danger }) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center py-4 active:opacity-70"
  >
    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${danger ? 'bg-red-500/20' : 'bg-surface-200'}`}>
      <Ionicons name={icon} size={20} color={danger ? '#FF1744' : '#94A3B8'} />
    </View>
    <Text variant="body" className={`flex-1 ${danger ? 'text-red-500' : ''}`}>
      {label}
    </Text>
    {value && (
      <Text variant="body" className={`mr-2 font-semibold ${valueColor || 'text-text-secondary'}`}>
        {value}
      </Text>
    )}
    {onPress && <Ionicons name="chevron-forward" size={20} color="#64748B" />}
  </Pressable>
);

// Transaction Row Component
const TransactionRow: React.FC<{ tx: TransactionRecord }> = ({ tx }) => {
  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (tx.type) {
      case 'buy': return 'arrow-down-circle';
      case 'sell': return 'arrow-up-circle';
      case 'claim': return 'gift';
      default: return 'swap-horizontal';
    }
  };

  const getColor = () => {
    switch (tx.type) {
      case 'buy': return '#0528F3';
      case 'sell': return '#EF4444';
      case 'claim': return '#10B981';
      default: return '#64748B';
    }
  };

  const getLabel = () => {
    switch (tx.type) {
      case 'buy': return `Bought ${tx.playerName || 'tokens'}`;
      case 'sell': return `Sold ${tx.playerName || 'tokens'}`;
      case 'claim': return 'Claimed Yield';
      default: return tx.type;
    }
  };

  const getAmount = () => {
    const sign = tx.type === 'buy' ? '-' : '+';
    return `${sign}$${tx.usdcAmount.toFixed(2)}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View className="flex-row items-center py-3">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${getColor()}20` }}
      >
        <Ionicons name={getIcon()} size={20} color={getColor()} />
      </View>
      <View className="flex-1">
        <Text variant="body" className="font-medium">{getLabel()}</Text>
        <Text variant="caption" color="tertiary">{formatTime(tx.timestamp)}</Text>
      </View>
      <Text
        variant="body"
        className={`font-semibold ${tx.type === 'buy' ? 'text-text-primary' : 'text-trading-bullish'}`}
      >
        {getAmount()}
      </Text>
    </View>
  );
};

// Web-compatible alert helper
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ProfileScreen() {
  const { user, transactions, syncWithWallet, loadTransactionHistory, logout } = useAuthStore();
  
  // Web3 wallet state - this is the ONLY mode
  const {
    isConnected,
    isConnecting,
    address,
    usdcBalance,
    ethBalance,
    connect,
    disconnect,
    refreshBalances,
    isWalletAvailable: hasWallet,
    checkConnection,
  } = useWalletStore();
  
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [positionsCount, setPositionsCount] = useState(0);
  const [totalYieldClaimed, setTotalYieldClaimed] = useState(0);
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false);

  // Initialize wallet and sync auth on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Sync auth store when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      syncWithWallet();
    }
  }, [isConnected, address, syncWithWallet]);

  // Fetch portfolio stats from backend
  const fetchProfileData = useCallback(async () => {
    if (!address) return;
    try {
      const response = await tradingApi.getPortfolio(address);
      setPositionsCount(response.portfolio.totalPositions);
      setTotalYieldClaimed(0);
    } catch (error) {
      console.log('[Profile] Error fetching portfolio:', error);
    }
  }, [address]);

  // Fetch on mount
  useEffect(() => {
    const loadData = async () => {
      if (address) {
        console.log('[Profile] Loading data for wallet:', address);
        await fetchProfileData();
        await loadTransactionHistory();
        console.log('[Profile] Data loaded');
      }
    };
    loadData();
  }, [address, fetchProfileData, loadTransactionHistory]);

  // Refresh when tab is focused
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        if (address) {
          console.log('[Profile] Tab focused, refreshing data');
          await fetchProfileData();
          await loadTransactionHistory();
          await refreshBalances();
        }
      };
      refreshData();
    }, [address, fetchProfileData, loadTransactionHistory, refreshBalances])
  );

  // Calculate stats
  const stats = useMemo(() => {
    const totalTrades = transactions.filter(t => t.type === 'buy' || t.type === 'sell').length;
    return { totalTrades, totalClaimed: totalYieldClaimed };
  }, [transactions, totalYieldClaimed]);

  const handleRequestFaucet = async () => {
    console.log('[Profile] Faucet button pressed, isConnected:', isConnected);
    if (!isConnected) {
      showAlert('Connect Wallet', 'Please connect your wallet first.');
      return;
    }
    setIsRequestingFaucet(true);
    try {
      console.log('[Profile] Calling requestUSDCFromFaucet...');
      const txHash = await requestUSDCFromFaucet();
      console.log('[Profile] Faucet success, tx:', txHash);
      console.log('[Profile] Refreshing balances...');
      await refreshBalances();
      console.log('[Profile] Balances refreshed');
      showAlert('Success!', 'You received $10,000 mUSDC from the faucet!');
    } catch (err: any) {
      console.error('[Profile] Faucet error:', err);
      if (err.message?.includes('cooldown')) {
        showAlert('Cooldown Active', 'You can request from the faucet once per hour.');
      } else if (err.message?.includes('user rejected')) {
        // User cancelled - don't show error alert
        console.log('[Profile] User rejected transaction');
      } else {
        showAlert('Faucet Error', err.message || 'Failed to request from faucet');
      }
    } finally {
      setIsRequestingFaucet(false);
    }
  };

  const handleConnectWallet = async () => {
    if (Platform.OS !== 'web') {
      showAlert('Web Only', 'Wallet connection is only available on web.');
      return;
    }
    if (!hasWallet) {
      showAlert(
        'MetaMask Required',
        'Please install MetaMask browser extension to connect your Web3 wallet.'
      );
      return;
    }

    try {
      await connect();
      showAlert('Wallet Connected', 'Your MetaMask wallet is now connected!');
    } catch (error) {
      showAlert('Connection Failed', error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnectWallet = () => {
    // On web, use window.confirm for better compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('This will disconnect your Web3 wallet. You can reconnect anytime. Continue?');
      if (confirmed) {
        logout(); // logout internally calls disconnect
      }
    } else {
      Alert.alert(
        'Disconnect Wallet',
        'This will disconnect your Web3 wallet. You can reconnect anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              logout(); // logout internally calls disconnect
            },
          },
        ]
      );
    }
  };

  // Display data
  const displayUser = user || {
    displayName: isConnected && address 
      ? `${address.slice(0, 6)}...${address.slice(-4)}` 
      : 'Not Connected',
    username: isConnected && address ? `user_${address.slice(2, 8)}` : 'guest',
    walletAddress: address || '0x...',
  };

  const displayedTransactions = showAllTransactions
    ? transactions.slice(0, 20)
    : transactions.slice(0, 5);

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-4 py-4">
          <Text variant="h2">Profile</Text>
        </View>

        {/* User Info with Wallet */}
        <View className="px-4 mb-6">
          <Card variant="flat" padding="md">
            <View className="flex-row items-center">
              <Avatar name={displayUser.displayName} size="lg" />
              <View className="ml-4 flex-1">
                <Text variant="h4">{displayUser.displayName}</Text>
                <Text variant="body" color="secondary">
                  @{displayUser.username}
                </Text>
                {isConnected && address && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="wallet-outline" size={12} color="#64748B" />
                    <Text variant="caption" color="tertiary" className="ml-1">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Wallet Balance Card */}
        <View className="px-4 mb-6">
          <Card variant="elevated" padding="lg" className="bg-gradient-to-r from-primary-600 to-primary-500">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons name="wallet" size={24} color="#FFFFFF" />
                <Text variant="body" className="ml-2 text-white/80">
                  mUSDC Balance
                </Text>
              </View>
              <View className="flex-row items-center">
                {isConnected && (
                  <View className="bg-green-500/30 px-2 py-1 rounded-full mr-2">
                    <Text variant="caption" className="text-green-300">● On-Chain</Text>
                  </View>
                )}
                <View className="bg-white/20 px-2 py-1 rounded-full">
                  <Text variant="caption" className="text-white">
                    Base Sepolia
                  </Text>
                </View>
              </View>
            </View>
            <Text variant="h1" className="text-white">
              ${isConnected 
                ? parseFloat(usdcBalance || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '0.00'
              }
            </Text>
            {isConnected ? (
              <View className="mt-2">
                <Pressable
                  onPress={() => refreshBalances()}
                  className="flex-row items-center"
                >
                  <Ionicons name="refresh" size={12} color="#FFFFFF80" />
                  <Text variant="caption" className="text-white/60 ml-1">
                    Refresh Balance
                  </Text>
                </Pressable>
                <Text variant="caption" className="text-white/40 mt-1">
                  ETH: {parseFloat(ethBalance || '0').toFixed(4)}
                </Text>
              </View>
            ) : (
              <Text variant="caption" className="text-white/60 mt-2">
                Connect wallet to view balance
              </Text>
            )}
          </Card>
        </View>

        {/* Web3 Wallet Connection */}
        <View className="px-4 mb-6">
          <Card variant="outlined" padding="md">
            {isConnected && address ? (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    <Text variant="body" className="font-semibold">Wallet Connected</Text>
                  </View>
                  <Pressable
                    onPress={handleDisconnectWallet}
                    className="bg-red-500/10 px-3 py-1 rounded-full"
                  >
                    <Text variant="caption" className="text-red-500">Disconnect</Text>
                  </Pressable>
                </View>
                <View className="flex-row items-center mb-3">
                  <Ionicons name="wallet-outline" size={16} color="#64748B" />
                  <Text variant="caption" color="secondary" className="ml-2">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </Text>
                </View>
                {/* Faucet Button */}
                <Pressable
                  onPress={handleRequestFaucet}
                  disabled={isRequestingFaucet}
                  className="flex-row items-center justify-center bg-primary-500 rounded-lg py-2"
                >
                  {isRequestingFaucet ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="water" size={16} color="#FFFFFF" />
                      <Text variant="body" className="text-white ml-2 font-semibold">
                        Get Test mUSDC (Faucet)
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleConnectWallet}
                disabled={isConnecting}
                className="flex-row items-center justify-center py-2"
              >
                <Ionicons 
                  name="link" 
                  size={20} 
                  color={isConnecting ? '#64748B' : '#0528F3'} 
                />
                <Text 
                  variant="body" 
                  className={`ml-2 font-semibold ${isConnecting ? 'text-text-tertiary' : 'text-primary-500'}`}
                >
                  {isConnecting ? 'Connecting...' : 'Connect MetaMask Wallet'}
                </Text>
              </Pressable>
            )}
          </Card>
        </View>

        {/* Account Stats */}
        <View className="px-4 mb-6">
          <Card variant="outlined" padding="md">
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text variant="h3" className="text-primary-500">
                  {positionsCount}
                </Text>
                <Text variant="caption" color="secondary">
                  Positions
                </Text>
              </View>
              <Divider orientation="vertical" className="mx-4" />
              <View className="flex-1 items-center">
                <Text variant="h3">{stats.totalTrades}</Text>
                <Text variant="caption" color="secondary">
                  Trades
                </Text>
              </View>
              <Divider orientation="vertical" className="mx-4" />
              <View className="flex-1 items-center">
                <Text variant="h3" className="text-trading-bullish">
                  ${stats.totalClaimed.toFixed(0)}
                </Text>
                <Text variant="caption" color="secondary">
                  Yield Claimed
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Transaction History */}
        <View className="px-4 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text variant="label" color="secondary">Transaction History</Text>
            {transactions.length > 5 && (
              <Pressable onPress={() => setShowAllTransactions(!showAllTransactions)}>
                <Text variant="caption" className="text-primary-500">
                  {showAllTransactions ? 'Show Less' : 'See All'}
                </Text>
              </Pressable>
            )}
          </View>
          <Card variant="flat" padding="md">
            {displayedTransactions.length > 0 ? (
              displayedTransactions.map((tx, index) => (
                <View key={tx.id}>
                  <TransactionRow tx={tx} />
                  {index < displayedTransactions.length - 1 && <Divider />}
                </View>
              ))
            ) : (
              <View className="py-4 items-center">
                <Ionicons name="receipt-outline" size={32} color="#64748B" />
                <Text variant="body" color="tertiary" className="mt-2">
                  No transactions yet
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Settings Menu */}
        <View className="px-4">
          <Text variant="label" color="secondary" className="mb-2">
            Settings
          </Text>
          <Card variant="flat" padding="md">
            <MenuItem icon="notifications-outline" label="Notifications" />
            <Divider />
            <MenuItem icon="shield-outline" label="Security" />
            <Divider />
            <MenuItem icon="color-palette-outline" label="Appearance" value="Dark" />
          </Card>
        </View>

        {/* Support */}
        <View className="px-4 mt-6">
          <Text variant="label" color="secondary" className="mb-2">
            Support
          </Text>
          <Card variant="flat" padding="md">
            <MenuItem icon="help-circle-outline" label="Help Center" />
            <Divider />
            <MenuItem icon="document-text-outline" label="Terms of Service" />
          </Card>
        </View>

        {/* Disconnect Wallet */}
        {isConnected && (
          <View className="px-4 mt-6">
            <Card variant="flat" padding="md">
              <MenuItem
                icon="log-out-outline"
                label="Disconnect Wallet"
                onPress={handleDisconnectWallet}
                danger
              />
            </Card>
          </View>
        )}

        {/* Version */}
        <View className="items-center mt-8 mb-6">
          <Text variant="caption" color="tertiary">
            StockBaller v1.0.0
          </Text>
          <Text variant="caption" color="tertiary" className="mt-1">
            Base Sepolia Testnet
          </Text>
          <Text variant="caption" color="tertiary" className="mt-1">
            © 2026 Apaw Holdings Ltd.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
