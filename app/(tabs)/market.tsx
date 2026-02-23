/**
 * Market Screen - The Dividend Scanner
 * Shows players generating the most yield/cash
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, WalletButton, PlayerImage, AnimatedPrice } from '../../src/components';
import { useAthletesStore, usePortfolioStore, useWalletStore } from '../../src/stores';
import type { AthleteMarket } from '../../src/types';

type FilterType = 'top_gainers' | 'top_losers' | 'best_form' | 'active' | 'all';

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(2)}`;
};

export default function MarketScreen() {
  const router = useRouter();
  const { athletes, fetchAthletes, isLoading } = useAthletesStore();
  const { positions, initialize: initPortfolio, refreshPositions } = usePortfolioStore();
  const { address, checkConnection } = useWalletStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAthletes();
    // Check wallet connection on mount
    checkConnection();
  }, []);

  // Initialize portfolio when wallet is connected
  useEffect(() => {
    if (address) {
      initPortfolio(address);
    }
  }, [address]);

  // Refresh positions when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (address) {
        refreshPositions(address);
      }
    }, [address, refreshPositions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAthletes();
    if (address) {
      await refreshPositions(address);
    }
    setRefreshing(false);
  };

  // Calculate total platform liquidity = sum of all token values (price × supply)
  const marketStats = React.useMemo(() => {
    // Total liquidity = each athlete's currentPrice × token_supply
    // marketCap from athlete data is already calculated as: currentPrice * token_supply
    const totalLiquidity = athletes.reduce((sum, a) => sum + a.marketCap, 0);

    // Also include user positions current value for real-time tracking
    const userPositionsValue = positions.reduce((sum, p) => {
      const athlete = athletes.find(a => a.id === p.playerId);
      return sum + (athlete ? p.quantity * athlete.currentPrice : p.costBasis);
    }, 0);

    const activeYieldPool = athletes.reduce((sum, a) => sum + (a.ytdYield * 10000), 0);
    return {
      totalLiquidity,
      userPositionsValue,
      activeYieldPool,
      totalPlayersListed: athletes.length,
      playersLiveNow: athletes.filter(a => a.isLive).length,
    };
  }, [athletes, positions]);

  const filteredPlayers = React.useMemo(() => {
    let sorted = [...athletes];
    switch (filter) {
      case 'top_gainers':
        sorted.sort((a, b) => b.priceChangePercent24h - a.priceChangePercent24h);
        break;
      case 'top_losers':
        sorted.sort((a, b) => a.priceChangePercent24h - b.priceChangePercent24h);
        break;
      case 'best_form':
        const formRank: Record<string, number> = { 'S_TIER': 10, 'A+': 9, 'A': 8, 'A-': 7, 'B+': 6, 'B': 5, 'C+': 4, 'C': 3, 'D': 2, 'D-': 1, 'F': 0 };
        sorted.sort((a, b) => (formRank[(b as any).riskProfile?.form_rating] || 0) - (formRank[(a as any).riskProfile?.form_rating] || 0));
        break;
      case 'active':
        sorted = sorted.filter(p => (p as any).riskProfile?.status === 'ACTIVE');
        break;
      case 'all':
      default:
        sorted.sort((a, b) => b.ytdYield - a.ytdYield);
    }
    return sorted;
  }, [athletes, filter]);

  const handlePlayerPress = (playerId: string) => {
    router.push(`/player/${playerId}` as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      {/* Top Header with Wallet */}
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-border-primary">
        <View className="flex-row items-center">
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ height: 28, width: 120 }}
            resizeMode="contain"
          />
        </View>
        <WalletButton />
      </View>

      {/* Header Stats */}
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-border-light">
        <View className="flex-row items-center">
          <Ionicons name="water" size={20} color="#0528F3" />
          <Text variant="body" className="ml-2 font-semibold">
            Liquidity: {formatCurrency(marketStats.totalLiquidity)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="people" size={20} color="#10B981" />
          <Text variant="body" color="success" className="ml-2 font-semibold">
            {marketStats.totalPlayersListed} Players
          </Text>
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2 flex-grow-0">
        <View className="flex-row gap-2">
          <FilterButton
            label="All"
            isActive={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterButton
            label="Top Gainers"
            isActive={filter === 'top_gainers'}
            onPress={() => setFilter('top_gainers')}
          />
          <FilterButton
            label="Top Losers"
            isActive={filter === 'top_losers'}
            onPress={() => setFilter('top_losers')}
          />
          <FilterButton
            label="Best Form"
            isActive={filter === 'best_form'}
            onPress={() => setFilter('best_form')}
          />
          <FilterButton
            label="Active"
            isActive={filter === 'active'}
            onPress={() => setFilter('active')}
          />
        </View>
      </ScrollView>

      {/* Table Header */}
      <View className="px-4 py-2 flex-row bg-surface-100 border-b border-border-light">
        <View className="flex-[2]">
          <Text variant="caption" color="secondary">Player</Text>
        </View>
        <View className="flex-1 items-end">
          <Text variant="caption" color="secondary">Price</Text>
        </View>
        <View className="flex-1 items-end">
          <Text variant="caption" color="secondary">Change</Text>
        </View>
        <View className="flex-[0.8] items-end">
          <Text variant="caption" color="secondary">Yield $</Text>
        </View>
      </View>

      {/* Player List */}
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
        {/* Loading State */}
        {isLoading && filteredPlayers.length === 0 && (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#0528F3" />
            <Text variant="body" color="secondary" className="mt-4">
              Loading players...
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && filteredPlayers.length === 0 && (
          <View className="py-12 px-4 items-center">
            <Ionicons name="football-outline" size={48} color="#64748B" />
            <Text variant="h4" color="secondary" className="mt-4">No Players Found</Text>
            <Text variant="body" color="tertiary" className="text-center mt-2">
              Try adjusting your filters
            </Text>
          </View>
        )}

        {filteredPlayers.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            onPress={() => handlePlayerPress(player.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// Filter Button Component
interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, isActive, onPress }) => (
  <Pressable
    onPress={onPress}
    className={`px-3 py-1.5 rounded-full ${isActive ? 'bg-primary-500' : 'bg-surface-200'
      }`}
  >
    <Text
      variant="caption"
      className={`font-medium ${isActive ? 'text-white' : 'text-text-secondary'}`}
    >
      {label}
    </Text>
  </Pressable>
);

// Player Row Component
interface PlayerRowProps {
  player: AthleteMarket;
  onPress: () => void;
}

const PlayerRow: React.FC<PlayerRowProps> = ({ player, onPress }) => {
  const extendedPlayer = player as any;
  const changePct = extendedPlayer.changePct || '+0%';
  const yieldPerShare = extendedPlayer.ytdYield || 0; // Yield per share in $
  const status = extendedPlayer.riskProfile?.status || 'ACTIVE';
  const isPositive = changePct.startsWith('+');

  // Status indicator colors
  const statusColors: Record<string, string> = {
    'ACTIVE': 'bg-trading-bullish',
    'INJURED': 'bg-trading-bearish',
    'BENCHED': 'bg-yellow-500',
    'RETURNING': 'bg-blue-500',
  };

  return (
    <Pressable
      onPress={onPress}
      className="px-4 py-3 flex-row items-center border-b border-border-light active:bg-surface-100"
    >
      {/* Player Info */}
      <View className="flex-[2] flex-row items-center">
        <View className="relative">
          <PlayerImage
            photoUrl={(player as any).photoUrl || player.imageUrl}
            name={player.name}
            size="md"
            borderColor={isPositive ? '#22c55e' : '#ef4444'}
            showBorder={true}
          />
          <View className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background-primary ${statusColors[status] || 'bg-gray-500'}`} />
        </View>
        <View className="ml-3 flex-1">
          <Text variant="body" className="font-semibold" numberOfLines={1}>
            {player.name}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {player.team}
          </Text>
        </View>
      </View>

      {/* Price */}
      <View className="flex-1 items-end">
        <Text variant="body" className="font-semibold">
          ${player.currentPrice.toFixed(2)}
        </Text>
        <Text variant="caption" color="secondary">
          IPO: ${extendedPlayer.ipoPrice?.toFixed(0) || '-'}
        </Text>
      </View>

      {/* Change */}
      <View className="flex-1 items-end">
        <Text variant="body" className={`font-semibold ${isPositive ? 'text-trading-bullish' : 'text-trading-bearish'}`}>
          {changePct}
        </Text>
      </View>

      {/* Yield $ */}
      <View className="flex-[0.8] items-end">
        <Text variant="body" className="font-bold text-primary-400">
          ${yieldPerShare.toFixed(2)}
        </Text>
      </View>
    </Pressable>
  );
};
