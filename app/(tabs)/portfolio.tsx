/**
 * Portfolio Screen - Real Holdings from Backend API
 * Fetches portfolio data from trading API
 * Web3 Only Mode - Uses MetaMask wallet on Base Sepolia
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, PlayerImage } from '../../src/components';
import { useWalletStore } from '../../src/stores';
import { tradingApi, PortfolioPosition } from '../../src/services/tradingApiService';
import { BASE_SEPOLIA_CONFIG, CONTRACT_ADDRESSES } from '../../src/config/blockchain';

const formatCurrency = (value: number): string => {
  return `$${value.toFixed(2)}`;
};

export default function PortfolioScreen() {
  const router = useRouter();
  
  // Web3 wallet state - this is the ONLY mode
  const {
    isConnected,
    address,
    usdcBalance,
    refreshBalances,
    checkConnection,
  } = useWalletStore();
  
  // Portfolio state from backend
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [totals, setTotals] = useState({
    totalValue: 0,
    totalCost: 0,
    totalPnL: 0,
    totalPnLPercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync from blockchain and then fetch portfolio
  const syncAndFetchPortfolio = useCallback(async (showSyncing = true) => {
    if (!address) {
      console.log('[Portfolio] No wallet address');
      setIsLoading(false);
      return;
    }

    try {
      // First sync from blockchain to update database with on-chain holdings
      if (showSyncing) setIsSyncing(true);
      console.log('[Portfolio] Syncing from blockchain...');
      const syncResult = await tradingApi.syncFromBlockchain(address);
      console.log(`[Portfolio] Sync complete: ${syncResult.holdingChanges.length} changes`);
      if (showSyncing) setIsSyncing(false);

      // Then fetch the updated portfolio
      const response = await tradingApi.getPortfolio(address);
      setPositions(response.portfolio.positions);
      setTotals({
        totalValue: response.portfolio.totalValue,
        totalCost: response.portfolio.totalCost,
        totalPnL: response.portfolio.totalPnL,
        totalPnLPercent: response.portfolio.totalPnLPercent,
      });
      console.log(`[Portfolio] Loaded ${response.portfolio.positions.length} positions`);
    } catch (error) {
      console.error('[Portfolio] Error syncing/fetching:', error);
      setIsSyncing(false);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Legacy fetch without sync (for initial load to be faster)
  const fetchPortfolio = useCallback(async () => {
    if (!address) {
      console.log('[Portfolio] No wallet address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await tradingApi.getPortfolio(address);
      setPositions(response.portfolio.positions);
      setTotals({
        totalValue: response.portfolio.totalValue,
        totalCost: response.portfolio.totalCost,
        totalPnL: response.portfolio.totalPnL,
        totalPnLPercent: response.portfolio.totalPnLPercent,
      });
      console.log(`[Portfolio] Loaded ${response.portfolio.positions.length} positions`);
    } catch (error) {
      console.error('[Portfolio] Error fetching:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Check wallet connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Sync and fetch portfolio when wallet is connected
  useEffect(() => {
    if (address) {
      // Initial load: sync from blockchain to ensure database is up to date
      syncAndFetchPortfolio(false);
    }
  }, [address, syncAndFetchPortfolio]);

  // Refresh when tab is focused - always sync to catch any external transactions
  useFocusEffect(
    useCallback(() => {
      if (address) {
        syncAndFetchPortfolio(false);
        refreshBalances();
      }
    }, [address, syncAndFetchPortfolio, refreshBalances])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncAndFetchPortfolio(true);
    await refreshBalances();
    setRefreshing(false);
  };

  const handlePositionPress = (playerId: string) => {
    router.push(`/player/${playerId}` as any);
  };

  const handleSell = (position: PortfolioPosition) => {
    router.push({
      pathname: '/swap',
      params: { playerId: position.playerId, side: 'sell' },
    } as any);
  };

  // If wallet not connected, show connect prompt
  if (!isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
        <View className="px-4 py-4">
          <Text variant="h2">Portfolio</Text>
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="wallet-outline" size={64} color="#64748B" />
          <Text variant="h3" color="secondary" className="mt-4 text-center">
            Connect Your Wallet
          </Text>
          <Text variant="body" color="tertiary" className="text-center mt-2">
            Connect your MetaMask wallet to view your portfolio and start trading athlete tokens
          </Text>
          <Text variant="caption" color="tertiary" className="text-center mt-4">
            Use the Connect button in the top right of the Market tab
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F5CB3F"
          />
        }
      >
        {/* Header */}
        <View className="px-4 py-4">
          <Text variant="h2">Portfolio</Text>
        </View>

        {/* Portfolio Summary Card */}
        <View className="px-4 mb-4">
          <Card variant="flat" padding="lg">
            {/* Wallet Balance */}
            <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-border-light">
              <View className="flex-row items-center">
                <Ionicons name="wallet" size={20} color="#0528F3" />
                <Text variant="body" className="ml-2">mUSDC Balance</Text>
                {isConnected && (
                  <View className="bg-green-500/20 px-2 py-0.5 rounded-full ml-2">
                    <Text variant="caption" className="text-green-500 text-xs">On-Chain</Text>
                  </View>
                )}
              </View>
              <Text variant="h4" className="text-primary-500">
                {formatCurrency(parseFloat(usdcBalance || '0'))}
              </Text>
            </View>

            <View className="flex-row justify-between mb-4">
              <View>
                <Text variant="caption" color="secondary">Invested Value</Text>
                <Text variant="h2">{formatCurrency(totals.totalValue)}</Text>
              </View>
              <View className="items-end">
                <Text variant="caption" color="secondary">Total P&L</Text>
                <Text
                  variant="h4"
                  className={totals.totalPnL >= 0 ? 'text-trading-bullish' : 'text-trading-bearish'}
                >
                  {totals.totalPnL >= 0 ? '+' : ''}{formatCurrency(totals.totalPnL)}
                  <Text variant="caption" className={totals.totalPnL >= 0 ? 'text-trading-bullish' : 'text-trading-bearish'}>
                    {` (${totals.totalPnLPercent >= 0 ? '+' : ''}${totals.totalPnLPercent.toFixed(1)}%)`}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Cost Basis Summary */}
            <View className="flex-row justify-between pt-4 border-t border-border-light">
              <Text variant="caption" color="secondary">Total Cost Basis</Text>
              <Text variant="body" className="font-semibold">
                {formatCurrency(totals.totalCost)}
              </Text>
            </View>
          </Card>
        </View>

        {/* Holdings Header */}
        <View className="px-4 py-2 flex-row items-center justify-between">
          <Text variant="h4">Holdings</Text>
          <Text variant="caption" color="secondary">
            {positions.length} position{positions.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Loading State */}
        {isLoading && positions.length === 0 && (
          <View className="px-4 py-12 items-center">
            <ActivityIndicator size="large" color="#0528F3" />
            <Text variant="body" color="secondary" className="mt-4">
              Loading your portfolio...
            </Text>
          </View>
        )}

        {/* Empty State */}
        {positions.length === 0 && !isLoading && (
          <View className="px-4 py-8">
            <Card variant="flat" padding="lg" className="items-center">
              <Ionicons name="wallet-outline" size={48} color="#64748B" />
              <Text variant="h4" color="secondary" className="mt-4">No Holdings Yet</Text>
              <Text variant="body" color="tertiary" className="text-center mt-2">
                Start investing in athlete tokens to build your portfolio
              </Text>
              <Pressable
                onPress={() => router.push('/market' as any)}
                className="bg-primary-500 px-6 py-3 rounded-lg mt-4"
              >
                <Text variant="body" className="text-white font-semibold">Browse Market</Text>
              </Pressable>
            </Card>
          </View>
        )}

        {/* Positions List */}
        {positions.map((position) => (
          <PositionRow
            key={position.playerId}
            position={position}
            onPress={() => handlePositionPress(position.playerId)}
            onSell={() => handleSell(position)}
            onViewExplorer={() => {
              const explorerUrl = `${BASE_SEPOLIA_CONFIG.blockExplorer}/token/${CONTRACT_ADDRESSES.VAULT}?a=${address}#inventory`;
              Linking.openURL(explorerUrl);
            }}
          />
        ))}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

// Position Row Component
interface PositionRowProps {
  position: PortfolioPosition;
  onPress: () => void;
  onSell: () => void;
  onViewExplorer: () => void;
}

const PositionRow: React.FC<PositionRowProps> = ({ position, onPress, onSell, onViewExplorer }) => {
  const pnlColor = position.unrealizedPnL >= 0 ? 'text-trading-bullish' : 'text-trading-bearish';

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3"
    >
      <Card variant="elevated" padding="md">
        <View className="flex-row items-center">
          <PlayerImage
            photoUrl={(position as any).photoUrl}
            name={position.playerName}
            size="md"
            borderColor={position.unrealizedPnL >= 0 ? '#22c55e' : '#ef4444'}
          />
          <View className="ml-3 flex-1">
            <Text variant="body" className="font-semibold">{position.playerName}</Text>
            <Text variant="caption" color="secondary">
              {position.quantity.toFixed(2)} tokens @ ${position.averagePrice.toFixed(2)}
            </Text>
          </View>
          <View className="items-end">
            <Text variant="body" className="font-semibold">
              ${position.currentValue.toFixed(2)}
            </Text>
            <Text variant="caption" className={pnlColor}>
              {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)} ({position.unrealizedPnLPercent.toFixed(1)}%)
            </Text>
          </View>
        </View>

        {/* Action Row */}
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border-light">
          {/* Team & Position */}
          <View className="flex-row items-center flex-1">
            <Ionicons name="football" size={16} color="#64748B" />
            <Text variant="caption" color="secondary" className="ml-2">
              {position.team} • {position.position}
            </Text>
          </View>

          {/* View on Explorer Button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onViewExplorer();
            }}
            className="bg-primary-100 px-3 py-1.5 rounded-lg mr-2"
          >
            <Ionicons name="open-outline" size={14} color="#0528F3" />
          </Pressable>

          {/* Sell Button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onSell();
            }}
            className="bg-trading-bearish/20 px-3 py-1.5 rounded-lg"
          >
            <Text variant="caption" className="text-trading-bearish font-semibold">Sell</Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
};

