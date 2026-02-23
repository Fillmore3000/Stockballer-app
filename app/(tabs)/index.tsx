import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../src/stores/walletStore';
import { usePortfolioStore } from '../../src/stores/portfolioStore';
import { useAthletesStore } from '../../src/stores/athletesStore';
import { requestUSDCFromFaucet } from '../../src/services/web3Service';
import { Text as ThemedText, WalletButton } from '../../src/components';

// StockBaller brand colors
const COLORS = {
  primary: '#0528F3',
  gold: '#F5CB3F',
  navy: '#0D2758',
  navyLight: '#132D5E',
  secondary: '#10B981',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
};

// Helper for web-compatible alerts
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

// ============================================
// STATE 1: Onboarding View (Not Connected)
// ============================================
const OnboardingView = () => {
  const { connect, isConnecting } = useWalletStore();

  const features = [
    {
      icon: 'trending-up',
      title: 'Trade Athlete Tokens',
      description: 'Buy and sell tokens tied to real athlete performance',
    },
    {
      icon: 'stats-chart',
      title: 'Real-Time Data',
      description: 'Prices update based on live match statistics',
    },
    {
      icon: 'shield-checkmark',
      title: 'Blockchain Secured',
      description: 'All trades are transparent and verifiable on-chain',
    },
  ];

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error: any) {
      if (!error.message?.includes('rejected')) {
        showAlert('Connection Failed', error.message || 'Could not connect wallet');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.navy }} edges={['top']}>
      {/* Top Header with Wallet */}
      <View className="px-4 py-3 flex-row justify-between items-center" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <View className="flex-row items-center">
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ height: 28, width: 120 }}
            resizeMode="contain"
          />
        </View>
        <WalletButton />
      </View>

      <ScrollView className="flex-1">
        {/* Hero Section */}
        <View className="px-6 pt-8 pb-8">
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: 'rgba(245, 203, 63, 0.2)' }}>
              <Ionicons name="football" size={40} color={COLORS.gold} />
            </View>
            <Text className="text-3xl font-bold text-white text-center mb-2">
              Welcome to StockBaller
            </Text>
            <Text className="text-lg text-center" style={{ color: COLORS.textSecondary }}>
              The Future of Sports Investment
            </Text>
          </View>

        {/* Main CTA */}
        <TouchableOpacity
          onPress={handleConnect}
          disabled={isConnecting}
          className="rounded-xl py-4 px-6 mb-8"
          style={{ backgroundColor: COLORS.gold }}
        >
          {isConnecting ? (
            <ActivityIndicator color={COLORS.navy} />
          ) : (
            <View className="flex-row items-center justify-center">
              <Ionicons name="wallet" size={24} color={COLORS.navy} />
              <Text className="font-bold text-lg ml-2" style={{ color: COLORS.navy }}>
                Connect Wallet to Start
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Feature Cards */}
        <View className="gap-4">
          {features.map((feature, index) => (
            <View
              key={index}
              className="rounded-xl p-4 flex-row items-center"
              style={{ backgroundColor: COLORS.navyLight }}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: 'rgba(245, 203, 63, 0.2)' }}>
                <Ionicons
                  name={feature.icon as any}
                  size={24}
                  color={COLORS.gold}
                />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">
                  {feature.title}
                </Text>
                <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Section */}
        <View className="px-6 py-8" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
          <Text className="text-gray-500 text-center text-sm">
            Built on Base Sepolia • Powered by Real Match Data
          </Text>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// STATE 2: Get Started View (Connected, $0 Balance)
// ============================================
const GetStartedView = () => {
  const { address, refreshBalances } = useWalletStore();
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false);

  const steps = [
    {
      step: 1,
      title: 'Get Test USDC',
      description: 'Claim free test tokens from the faucet',
      icon: 'gift',
      completed: false,
    },
    {
      step: 2,
      title: 'Browse Athletes',
      description: 'Discover promising players in the market',
      icon: 'search',
      completed: false,
    },
    {
      step: 3,
      title: 'Make Your First Trade',
      description: 'Buy tokens and start building your portfolio',
      icon: 'swap-horizontal',
      completed: false,
    },
  ];

  const handleClaimTokens = async () => {
    setIsRequestingFaucet(true);
    try {
      await requestUSDCFromFaucet();
      await refreshBalances();
      showAlert('Success!', 'Test USDC has been sent to your wallet!');
    } catch (error: any) {
      // Ignore user rejection
      if (error.message?.includes('rejected') || error.message?.includes('denied') || error.message?.includes('user rejected')) {
        // User cancelled - do nothing
      } else if (error.message?.includes('cooldown')) {
        showAlert('Cooldown Active', 'You can request from the faucet once per hour.');
      } else {
        showAlert('Faucet Error', error.message || 'Could not request tokens');
      }
    } finally {
      setIsRequestingFaucet(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.navy }} edges={['top']}>
      {/* Top Header with Wallet */}
      <View className="px-4 py-3 flex-row justify-between items-center" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <View className="flex-row items-center">
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ height: 28, width: 120 }}
            resizeMode="contain"
          />
        </View>
        <WalletButton />
      </View>

      <ScrollView className="flex-1">
        <View className="px-6 pt-6">
          {/* Welcome Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-white mb-1">
              Welcome to StockBaller! 🎉
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>
              Your wallet is connected. Let's get you started.
            </Text>
          </View>

          {/* Wallet Card */}
          <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: COLORS.navyLight }}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text style={{ color: COLORS.textSecondary }} className="text-sm">Connected Wallet</Text>
              <Text className="text-white font-mono text-base">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </Text>
            </View>
            <View className="bg-green-500/20 px-3 py-1 rounded-full">
              <Text className="text-green-400 text-sm font-medium">Connected</Text>
            </View>
          </View>
        </View>

        {/* Faucet CTA - Main Action */}
        <View className="rounded-xl p-6 mb-6" style={{ backgroundColor: COLORS.gold }}>
          <View className="flex-row items-center mb-3">
            <Ionicons name="gift" size={28} color={COLORS.navy} />
            <Text className="font-bold text-xl ml-2" style={{ color: COLORS.navy }}>
              Claim Free Test Tokens
            </Text>
          </View>
          <Text className="mb-4" style={{ color: COLORS.navy, opacity: 0.8 }}>
            Get 1,000 test USDC to start trading athlete tokens. These are test
            tokens on Base Sepolia - no real money involved!
          </Text>
          <TouchableOpacity
            onPress={handleClaimTokens}
            disabled={isRequestingFaucet}
            className="rounded-lg py-3 px-4" style={{ backgroundColor: COLORS.navy }}
          >
            {isRequestingFaucet ? (
              <ActivityIndicator color={COLORS.gold} />
            ) : (
              <View className="flex-row items-center justify-center">
                <Ionicons name="water" size={20} color={COLORS.gold} />
                <Text className="font-bold text-base ml-2" style={{ color: COLORS.gold }}>
                  Request from Faucet
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* How It Works */}
        <Text className="text-white font-bold text-lg mb-4">How It Works</Text>
        <View className="gap-3 mb-6">
          {steps.map((step) => (
            <View key={step.step} className="rounded-xl p-4 flex-row" style={{ backgroundColor: COLORS.navyLight }}>
              <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(245, 203, 63, 0.2)' }}>
                <Text style={{ color: COLORS.gold }} className="font-bold">{step.step}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{step.title}</Text>
                <Text className="text-sm" style={{ color: COLORS.textSecondary }}>{step.description}</Text>
              </View>
              <Ionicons
                name={step.icon as any}
                size={24}
                color={COLORS.textSecondary}
              />
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/market')}
            className="flex-1 rounded-xl p-4 items-center" style={{ backgroundColor: COLORS.navyLight }}
          >
            <Ionicons name="trending-up" size={24} color={COLORS.gold} />
            <Text className="text-white font-medium mt-2">Browse Market</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/discover')}
            className="flex-1 rounded-xl p-4 items-center" style={{ backgroundColor: COLORS.navyLight }}
          >
            <Ionicons name="compass" size={24} color={COLORS.secondary} />
            <Text className="text-white font-medium mt-2">Discover</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// STATE 3: Dashboard View (Active User)
// ============================================
const DashboardView = () => {
  const { address, usdcBalance, refreshBalances } = useWalletStore();
  const { positions, initializeFromWallet, refreshPositions, isLoading: portfolioLoading } = usePortfolioStore();
  const { athletes, fetchAthletes } = useAthletesStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshBalances(),
      address ? refreshPositions(address) : Promise.resolve(),
      fetchAthletes(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (address) {
      initializeFromWallet(address);
      fetchAthletes();
    }
  }, [address]);

  // Refresh data when tab is focused (after trades)
  useFocusEffect(
    useCallback(() => {
      if (address) {
        refreshPositions(address);
        refreshBalances();
      }
    }, [address, refreshPositions, refreshBalances])
  );

  // Calculate portfolio value from positions
  const portfolioValue = positions.reduce((total: number, position) => {
    const athlete = athletes.find((a) => a.id === position.playerId);
    if (athlete) {
      return total + position.quantity * athlete.currentPrice;
    }
    return total;
  }, 0);

  const totalValue = portfolioValue + parseFloat(usdcBalance || '0');

  // Get top movers from athletes
  const topMovers = [...athletes]
    .sort((a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h))
    .slice(0, 3);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.navy }} edges={['top']}>
      {/* Top Header with Wallet */}
      <View className="px-4 py-3 flex-row justify-between items-center" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <View className="flex-row items-center">
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ height: 28, width: 120 }}
            resizeMode="contain"
          />
        </View>
        <WalletButton />
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
        }
      >
        <View className="px-6 pt-6">
          {/* Portfolio Summary Card */}
          <View className="rounded-2xl p-5 mb-6" style={{ backgroundColor: COLORS.navyLight }}>
            <Text className="text-sm mb-1" style={{ color: COLORS.textSecondary }}>Total Portfolio Value</Text>
            <Text className="text-white text-3xl font-bold mb-4">
              ${totalValue.toFixed(2)}
            </Text>

          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-xs" style={{ color: COLORS.textSecondary }}>USDC Balance</Text>
              <Text className="text-white font-semibold">
                ${parseFloat(usdcBalance || '0').toFixed(2)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs" style={{ color: COLORS.textSecondary }}>Athlete Tokens</Text>
              <Text className="text-white font-semibold">
                ${portfolioValue.toFixed(2)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs" style={{ color: COLORS.textSecondary }}>Holdings</Text>
              <Text className="text-white font-semibold">{positions.length}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/market')}
            className="flex-1 rounded-xl py-3 items-center" style={{ backgroundColor: COLORS.gold }}
          >
            <Ionicons name="trending-up" size={20} color={COLORS.navy} />
            <Text className="font-medium mt-1" style={{ color: COLORS.navy }}>Trade</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/portfolio')}
            className="flex-1 rounded-xl py-3 items-center" style={{ backgroundColor: COLORS.navyLight }}
          >
            <Ionicons name="pie-chart" size={20} color={COLORS.gold} />
            <Text className="text-white font-medium mt-1">Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/discover')}
            className="flex-1 rounded-xl py-3 items-center" style={{ backgroundColor: COLORS.navyLight }}
          >
            <Ionicons name="compass" size={20} color={COLORS.secondary} />
            <Text className="text-white font-medium mt-1">Discover</Text>
          </TouchableOpacity>
        </View>

        {/* My Holdings */}
        {positions.length > 0 && (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-lg">My Holdings</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/portfolio')}>
                <Text style={{ color: COLORS.gold }}>View All</Text>
              </TouchableOpacity>
            </View>
            <View className="gap-2">
              {positions.slice(0, 3).map((position) => {
                const athlete = athletes.find((a) => a.id === position.playerId);
                if (!athlete) return null;
                const value = position.quantity * athlete.currentPrice;
                return (
                  <TouchableOpacity
                    key={position.playerId}
                    onPress={() => router.push(`/player/${position.playerId}`)}
                    className="rounded-xl p-4 flex-row items-center" style={{ backgroundColor: COLORS.navyLight }}
                  >
                    <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(245, 203, 63, 0.2)' }}>
                      <Text style={{ color: COLORS.gold }} className="font-bold">
                        {athlete.name.charAt(0)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-medium">{athlete.name}</Text>
                      <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
                        {position.quantity.toFixed(2)} tokens
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-white font-semibold">
                        ${value.toFixed(2)}
                      </Text>
                      <Text
                        className={
                          athlete.priceChange24h >= 0
                            ? 'text-green-400 text-sm'
                            : 'text-red-400 text-sm'
                        }
                      >
                        {athlete.priceChange24h >= 0 ? '+' : ''}
                        {athlete.priceChange24h.toFixed(2)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Movers */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-bold text-lg">Top Movers</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/market')}>
              <Text style={{ color: COLORS.gold }}>See Market</Text>
            </TouchableOpacity>
          </View>
          <View className="gap-2">
            {topMovers.map((athlete) => (
              <TouchableOpacity
                key={athlete.id}
                onPress={() => router.push(`/player/${athlete.id}`)}
                className="rounded-xl p-4 flex-row items-center" style={{ backgroundColor: COLORS.navyLight }}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(245, 203, 63, 0.2)' }}>
                  <Text style={{ color: COLORS.gold }} className="font-bold">
                    {athlete.name.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">{athlete.name}</Text>
                  <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
                    {athlete.team} • {athlete.position}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-white font-semibold">
                    ${athlete.currentPrice.toFixed(2)}
                  </Text>
                  <Text
                    className={
                      athlete.priceChange24h >= 0
                        ? 'text-green-400 text-sm'
                        : 'text-red-400 text-sm'
                    }
                  >
                    {athlete.priceChange24h >= 0 ? '+' : ''}
                    {athlete.priceChange24h.toFixed(2)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// Main Home Screen - State Router
// ============================================
export default function HomeScreen() {
  const { isConnected, usdcBalance, refreshBalances } = useWalletStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (isConnected) {
        await refreshBalances();
      }
      setIsLoading(false);
    };
    init();
  }, [isConnected]);

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.navy }}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  // State 1: Not connected - Show onboarding
  if (!isConnected) {
    return <OnboardingView />;
  }

  // State 2: Connected but $0 balance - Show get started
  const balance = parseFloat(usdcBalance || '0');
  if (balance === 0) {
    return <GetStartedView />;
  }

  // State 3: Active user - Show dashboard
  return <DashboardView />;
}
