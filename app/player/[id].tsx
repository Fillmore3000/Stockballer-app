/**
 * Player Detail Screen - Asset/Stock Page
 * Shows price chart, yield table, and trading actions
 * Web3 Only Mode
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Line, Text as SvgText, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Text, Card, Button, PlayerImage, AnimatedPrice } from '../../src/components';
import { useAthletesStore, useWalletStore } from '../../src/stores';
import { tradingApi, PortfolioPosition } from '../../src/services/tradingApiService';
import type { AthleteMarket, YieldRule, YieldEvent, PricePoint, TimeFrame } from '../../src/types';

const { width: screenWidth } = Dimensions.get('window');

// Position-based yield rules for soccer (enhanced with devaluation factors)
const getYieldRules = (position: string): YieldRule[] => {
  const baseRules: YieldRule[] = [
    { action: 'goal', payout: 0.25, description: 'Goal Scored' },
    { action: 'assist', payout: 0.12, description: 'Assist' },
    { action: 'motm', payout: 0.50, description: 'Man of the Match' },
    { action: 'win', payout: 0.02, description: 'Match Played' },
  ];

  if (position === 'defender' || position === 'goalkeeper') {
    baseRules.push({ action: 'clean_sheet', payout: 0.10, description: 'Clean Sheet' });
  }

  return baseRules;
};

// Penalty deduction rules (HIGH RISK)
const getPenaltyRules = (): { action: string; deduction: number; description: string }[] => {
  return [
    { action: 'yellow_card', deduction: 0.15, description: 'Yellow Card' },
    { action: 'red_card', deduction: 1.50, description: 'Red Card' },
    { action: 'penalty_miss', deduction: 0.50, description: 'Penalty Missed' },
    { action: 'own_goal', deduction: 0.75, description: 'Own Goal' },
    { action: 'missed_match', deduction: 0.10, description: 'Missed Match (per game)' },
  ];
};

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedAthlete, fetchAthleteById, chartData, fetchChartData, isLoading } = useAthletesStore();
  const { isConnected, address, usdcBalance, checkConnection } = useWalletStore();

  const [timeframe, setTimeframe] = useState<TimeFrame>('1M');
  const [yieldRules, setYieldRules] = useState<YieldRule[]>([]);
  const [penaltyRules, setPenaltyRules] = useState<{ action: string; deduction: number; description: string }[]>([]);
  const [position, setPosition] = useState<PortfolioPosition | null>(null);
  const [holdingLoading, setHoldingLoading] = useState(true);

  // Check wallet connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Fetch holding from backend - refresh on focus
  const fetchHolding = useCallback(async () => {
    if (!address || !id) {
      setHoldingLoading(false);
      return;
    }
    setHoldingLoading(true);
    try {
      const result = await tradingApi.getHolding(address, id);
      setPosition(result.holding);
    } catch (error) {
      console.log('[PlayerDetail] No holding for this player');
      setPosition(null);
    } finally {
      setHoldingLoading(false);
    }
  }, [address, id]);

  // Refresh holding when screen comes into focus (after trades)
  useFocusEffect(
    useCallback(() => {
      fetchHolding();
    }, [fetchHolding])
  );

  useEffect(() => {
    if (id) {
      fetchAthleteById(id);
      fetchChartData(id, timeframe);
    }
  }, [id]);

  useEffect(() => {
    if (selectedAthlete) {
      setYieldRules(getYieldRules(selectedAthlete.position as string));
      setPenaltyRules(getPenaltyRules());
    }
  }, [selectedAthlete]);

  useEffect(() => {
    if (id) {
      fetchChartData(id, timeframe);
    }
  }, [timeframe]);

  // Enrich position with current price and yield data from backend
  const enrichedPosition = position && selectedAthlete ? {
    ...position,
    // Backend already provides these, but recalculate with latest price
    averageCost: position.averagePrice,
    totalCost: position.costBasis,
    currentValue: position.quantity * selectedAthlete.currentPrice,
    unrealizedPnL: (position.quantity * selectedAthlete.currentPrice) - position.costBasis,
    unrealizedPnLPercent: position.costBasis > 0
      ? (((position.quantity * selectedAthlete.currentPrice) - position.costBasis) / position.costBasis) * 100
      : 0,
    // Yield fields from backend - calculate user's yield
    yieldPerShare: position.yieldData?.yieldPerShare ?? 0,
    estimatedYield: position.quantity * (position.yieldData?.yieldPerShare ?? 0),
    apy: position.yieldData?.apy ?? '0%',
    // Legacy fields for UI compatibility (unclaimed/claimed tracking not yet implemented)
    unclaimedYield: position.quantity * (position.yieldData?.yieldPerShare ?? 0),
    totalClaimedYield: 0,
  } : undefined;

  const handleBuy = () => {
    router.push(`/swap?playerId=${id}&side=buy`);
  };

  const handleSell = () => {
    router.push(`/swap?playerId=${id}&side=sell`);
  };

  if (isLoading || !selectedAthlete) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <ActivityIndicator size="large" color="#0528F3" />
        <Text variant="body" color="secondary" className="mt-4">Loading player...</Text>
      </SafeAreaView>
    );
  }

  const player = selectedAthlete;
  const extendedPlayer = player as any; // For accessing extended fields like category, stats

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-border-light">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </Pressable>
        <PlayerImage
          photoUrl={(player as any).photoUrl || player.imageUrl}
          name={player.name}
          size="md"
          borderColor={player.priceChange24h >= 0 ? '#22c55e' : '#ef4444'}
        />
        <View className="ml-3 flex-1">
          <Text variant="h4">{player.name}</Text>
          <Text variant="caption" color="secondary">{player.team}</Text>
        </View>
        <View className="items-end">
          <Text variant="h4">${player.currentPrice.toFixed(2)}</Text>
          <Text
            variant="caption"
            className={player.priceChange24h >= 0 ? 'text-trading-bullish' : 'text-trading-bearish'}
          >
            {player.priceChange24h >= 0 ? '+' : ''}{player.priceChangePercent24h.toFixed(2)}%
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Player Info Card */}
        <View className="px-4 py-4">
          <Card variant="elevated" padding="lg">
            {/* Price & Change */}
            <View className="flex-row justify-between mb-4">
              <View>
                <Text variant="caption" color="secondary">Current Price</Text>
                <Text variant="h3">${player.currentPrice.toFixed(2)}</Text>
              </View>
              <View className="items-end">
                <Text variant="caption" color="secondary">Change from IPO</Text>
                <Text variant="h4" className={extendedPlayer.changePct?.startsWith('+') ? 'text-trading-bullish' : 'text-trading-bearish'}>
                  {extendedPlayer.changePct || '0%'}
                </Text>
              </View>
            </View>

            {/* IPO & Token Info */}
            <View className="flex-row justify-between mb-4 pb-4 border-b border-border-light">
              <View>
                <Text variant="caption" color="secondary">IPO Price</Text>
                <Text variant="body" className="font-semibold">${extendedPlayer.ipoPrice?.toFixed(2) || '-'}</Text>
              </View>
              <View className="items-center">
                <Text variant="caption" color="secondary">Token Supply</Text>
                <Text variant="body" className="font-semibold">{extendedPlayer.tokenSupply?.toLocaleString() || '1,000'}</Text>
              </View>
              <View className="items-end">
                <Text variant="caption" color="secondary">Total Yield</Text>
                <Text variant="body" className="font-semibold text-trading-bullish">${extendedPlayer.totalYieldGenerated?.toFixed(2) || player.ytdYield.toFixed(2)}</Text>
              </View>
            </View>

            {/* Risk Profile */}
            {extendedPlayer.riskProfile && (
              <View className="mb-4">
                <Text variant="caption" color="secondary" className="mb-2">Risk Profile</Text>
                <View className="flex-row gap-2">
                  <View className="bg-primary-500/20 px-3 py-1.5 rounded-lg">
                    <Text variant="caption" color="secondary">Form</Text>
                    <Text variant="body" className="font-bold text-primary-400">{extendedPlayer.riskProfile.form_rating?.replace('_', ' ')}</Text>
                  </View>
                  <View className="bg-surface-200 px-3 py-1.5 rounded-lg">
                    <Text variant="caption" color="secondary">Volatility</Text>
                    <Text variant="body" className="font-semibold">{extendedPlayer.riskProfile.volatility?.replace('_', ' ')}</Text>
                  </View>
                  <View className={`px-3 py-1.5 rounded-lg ${extendedPlayer.riskProfile.status === 'ACTIVE' ? 'bg-trading-bullish/20' : extendedPlayer.riskProfile.status === 'INJURED' ? 'bg-trading-bearish/20' : 'bg-yellow-500/20'}`}>
                    <Text variant="caption" color="secondary">Status</Text>
                    <Text variant="body" className="font-semibold">{extendedPlayer.riskProfile.status}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Season Stats - Enhanced with Devaluation Factors */}
            {extendedPlayer.stats && (
              <View className="border-t border-border-light pt-4">
                <Text variant="caption" color="secondary" className="mb-2">Season Performance</Text>

                {/* Positive Stats */}
                <View className="flex-row flex-wrap mb-3">
                  <StatItem label="Matches" value={extendedPlayer.stats.matches_played} />
                  <StatItem label="Goals" value={extendedPlayer.stats.goals} highlight />
                  <StatItem label="Assists" value={extendedPlayer.stats.assists} highlight />
                  {extendedPlayer.stats.clean_sheets > 0 && (
                    <StatItem label="Clean Sheets" value={extendedPlayer.stats.clean_sheets} highlight />
                  )}
                </View>

                {/* Devaluation Factors */}
                {(extendedPlayer.stats.yellow_cards > 0 ||
                  extendedPlayer.stats.red_cards > 0 ||
                  extendedPlayer.stats.matches_missed > 0 ||
                  extendedPlayer.stats.penalties_missed > 0) && (
                    <View className="bg-trading-bearish/10 rounded-lg p-3 mb-3">
                      <Text variant="caption" className="text-trading-bearish mb-2 font-semibold">Risk Factors</Text>
                      <View className="flex-row flex-wrap">
                        {extendedPlayer.stats.yellow_cards > 0 && (
                          <View className="mr-4 mb-1">
                            <Text variant="caption" color="secondary">Yellow Cards</Text>
                            <Text variant="body" className="text-yellow-500 font-bold">{extendedPlayer.stats.yellow_cards} (-${(extendedPlayer.stats.yellow_cards * 0.05).toFixed(2)})</Text>
                          </View>
                        )}
                        {extendedPlayer.stats.red_cards > 0 && (
                          <View className="mr-4 mb-1">
                            <Text variant="caption" color="secondary">Red Cards</Text>
                            <Text variant="body" className="text-trading-bearish font-bold">{extendedPlayer.stats.red_cards} (-${(extendedPlayer.stats.red_cards * 0.50).toFixed(2)})</Text>
                          </View>
                        )}
                        {extendedPlayer.stats.matches_missed > 0 && (
                          <View className="mr-4 mb-1">
                            <Text variant="caption" color="secondary">Games Missed</Text>
                            <Text variant="body" className="text-trading-bearish font-bold">{extendedPlayer.stats.matches_missed} (-${(extendedPlayer.stats.matches_missed * 0.03).toFixed(2)})</Text>
                          </View>
                        )}
                        {extendedPlayer.stats.penalties_missed > 0 && (
                          <View className="mr-4 mb-1">
                            <Text variant="caption" color="secondary">Pen. Missed</Text>
                            <Text variant="body" className="text-trading-bearish font-bold">{extendedPlayer.stats.penalties_missed} (-${(extendedPlayer.stats.penalties_missed * 0.15).toFixed(2)})</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                {/* Form & Multipliers */}
                <View className="flex-row justify-between">
                  {extendedPlayer.formMultiplier && (
                    <View className="flex-1 mr-2">
                      <Text variant="caption" color="secondary">Form Multiplier</Text>
                      <Text variant="body" className={`font-bold ${extendedPlayer.formMultiplier >= 1.1 ? 'text-trading-bullish' :
                          extendedPlayer.formMultiplier <= 0.9 ? 'text-trading-bearish' :
                            'text-text-primary'
                        }`}>
                        {extendedPlayer.formMultiplier.toFixed(2)}x
                      </Text>
                    </View>
                  )}
                  {extendedPlayer.ageMultiplier && (
                    <View className="flex-1 mx-2">
                      <Text variant="caption" color="secondary">Age Multiplier</Text>
                      <Text variant="body" className="font-bold">{extendedPlayer.ageMultiplier}x</Text>
                    </View>
                  )}
                  {extendedPlayer.stats.rating > 0 && (
                    <View className="flex-1 ml-2 items-end">
                      <Text variant="caption" color="secondary">Avg Rating</Text>
                      <Text variant="body" className={`font-bold ${extendedPlayer.stats.rating >= 7 ? 'text-trading-bullish' :
                          extendedPlayer.stats.rating <= 6 ? 'text-trading-bearish' :
                            'text-text-primary'
                        }`}>
                        {extendedPlayer.stats.rating.toFixed(1)}/10
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Valuation Logic */}
            {extendedPlayer.valuationLogic && (
              <View className="border-t border-border-light pt-4 mt-4">
                <Text variant="caption" color="secondary" className="mb-1">Valuation Analysis</Text>
                <Text variant="body" color="secondary">{extendedPlayer.valuationLogic}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Section A: Price Chart */}
        <View className="px-4 py-4">
          <Text variant="h4" className="mb-3">Price History</Text>
          <PriceChartWithEvents data={chartData} height={200} />

          {/* Timeframe Selector */}
          <View className="flex-row justify-center gap-2 mt-3">
            {(['1D', '1W', '1M', '3M', '1Y'] as TimeFrame[]).map((tf) => (
              <Pressable
                key={tf}
                onPress={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg ${timeframe === tf ? 'bg-primary-500' : 'bg-surface-200'
                  }`}
              >
                <Text
                  variant="caption"
                  className={timeframe === tf ? 'text-white font-semibold' : 'text-text-secondary'}
                >
                  {tf}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Section B: Yield Table (The Contract) */}
        <View className="px-4 py-4">
          <Text variant="h4" className="mb-3">Yield Payouts</Text>
          <Card variant="flat" padding="none" className="overflow-hidden">
            <View className="bg-surface-200 px-4 py-2 flex-row">
              <Text variant="caption" color="secondary" className="flex-1 font-semibold">Action</Text>
              <Text variant="caption" color="secondary" className="font-semibold">Payout</Text>
            </View>
            {yieldRules.map((rule, index) => (
              <View
                key={rule.action}
                className={`px-4 py-3 flex-row items-center ${index < yieldRules.length - 1 ? 'border-b border-border-light' : ''
                  }`}
              >
                <View className="flex-row items-center flex-1">
                  <YieldActionIcon action={rule.action} />
                  <Text variant="body" className="ml-3">{rule.description}</Text>
                </View>
                <Text variant="body" className="font-bold text-trading-bullish">
                  ${rule.payout.toFixed(2)}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Section B2: Penalty Deductions (Risk Factors) */}
        <View className="px-4 py-4">
          <Text variant="h4" className="mb-3">Penalty Deductions</Text>
          <Card variant="flat" padding="none" className="overflow-hidden border border-trading-bearish/30">
            <View className="bg-trading-bearish/10 px-4 py-2 flex-row">
              <Text variant="caption" className="flex-1 font-semibold text-trading-bearish">Risk Factor</Text>
              <Text variant="caption" className="font-semibold text-trading-bearish">Deduction</Text>
            </View>
            {penaltyRules.map((rule, index) => (
              <View
                key={rule.action}
                className={`px-4 py-3 flex-row items-center ${index < penaltyRules.length - 1 ? 'border-b border-border-light' : ''
                  }`}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-8 h-8 rounded-full bg-trading-bearish/20 items-center justify-center">
                    <Ionicons
                      name={
                        rule.action.includes('Yellow') ? 'warning' :
                          rule.action.includes('Red') ? 'close-circle' :
                            rule.action.includes('Penalty') ? 'football' :
                              rule.action.includes('Own') ? 'arrow-back-circle' :
                                'calendar-outline'
                      }
                      size={16}
                      color="#EF4444"
                    />
                  </View>
                  <Text variant="body" className="ml-3">{rule.description}</Text>
                </View>
                <Text variant="body" className="font-bold text-trading-bearish">
                  -${rule.deduction.toFixed(2)}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Section C: Claimable Card - Only shows if user has position */}
        {enrichedPosition && (
          <View className="px-4 py-4">
            <Text variant="h4" className="mb-3">Your Position</Text>
            <Card variant="elevated" padding="lg">
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text variant="caption" color="secondary">Tokens Owned</Text>
                  <Text variant="h3">{enrichedPosition.quantity.toFixed(2)}</Text>
                </View>
                <View className="items-end">
                  <Text variant="caption" color="secondary">Current Value</Text>
                  <Text variant="h3">${enrichedPosition.currentValue.toFixed(2)}</Text>
                </View>
              </View>

              <View className="flex-row justify-between mb-4">
                <View>
                  <Text variant="caption" color="secondary">Avg Cost</Text>
                  <Text variant="body" className="font-semibold">${enrichedPosition.averageCost.toFixed(2)}</Text>
                </View>
                <View className="items-end">
                  <Text variant="caption" color="secondary">Unrealized P&L</Text>
                  <Text
                    variant="body"
                    className={`font-bold ${enrichedPosition.unrealizedPnL >= 0 ? 'text-trading-bullish' : 'text-trading-bearish'}`}
                  >
                    {enrichedPosition.unrealizedPnL >= 0 ? '+' : ''}${enrichedPosition.unrealizedPnL.toFixed(2)} ({enrichedPosition.unrealizedPnLPercent.toFixed(1)}%)
                  </Text>
                </View>
              </View>

              {enrichedPosition.unclaimedYield > 0 && (
                <View className="bg-trading-bullish/10 rounded-xl p-4 mb-4">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text variant="caption" color="secondary">Unclaimed Yield</Text>
                      <Text variant="h2" className="text-trading-bullish">
                        ${enrichedPosition.unclaimedYield.toFixed(2)}
                      </Text>
                    </View>
                    <Ionicons name="cash" size={32} color="#10B981" />
                  </View>
                </View>
              )}

              <View className="flex-row justify-between pt-4 border-t border-border-light">
                <Text variant="caption" color="secondary">Total Claimed (All Time)</Text>
                <Text variant="body" className="font-semibold">${enrichedPosition.totalClaimedYield.toFixed(2)}</Text>
              </View>
            </Card>
          </View>
        )}

        {/* Wallet Balance Info */}
        <View className="px-4 py-2">
          <Card variant="flat" padding="md" className="bg-surface-200">
            <View className="flex-row justify-between items-center">
              <Text variant="caption" color="secondary">Available Balance</Text>
              <Text variant="body" className="font-bold text-trading-bullish">
                ${parseFloat(usdcBalance || '0').toFixed(2)} mUSDC
              </Text>
            </View>
          </Card>
        </View>

        {/* Spacer for sticky footer */}
        <View className="h-24" />
      </ScrollView>

      {/* Sticky Footer - Buy/Sell Buttons */}
      <View className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-background-primary border-t border-border-light">
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleBuy}
            className="flex-1 bg-trading-bullish py-4 rounded-xl items-center flex-row justify-center"
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text variant="h4" className="text-white ml-2">Buy</Text>
          </Pressable>
          <Pressable
            onPress={handleSell}
            className="flex-1 bg-trading-bearish py-4 rounded-xl items-center flex-row justify-center"
          >
            <Ionicons name="remove-circle" size={20} color="white" />
            <Text variant="h4" className="text-white ml-2">Sell</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Yield Action Icon Component
const YieldActionIcon: React.FC<{ action: string }> = ({ action }) => {
  const icons: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
    goal: { name: 'football', color: '#10B981' },
    assist: { name: 'hand-right', color: '#0528F3' },
    clean_sheet: { name: 'shield-checkmark', color: '#8B5CF6' },
    motm: { name: 'star', color: '#F59E0B' },
    win: { name: 'trophy', color: '#10B981' },
    draw: { name: 'remove', color: '#64748B' },
  };

  const icon = icons[action] || { name: 'ellipse', color: '#64748B' };

  return (
    <View className="w-8 h-8 rounded-full bg-surface-200 items-center justify-center">
      <Ionicons name={icon.name} size={16} color={icon.color} />
    </View>
  );
};

// Price Chart with Yield Event Overlays
interface PriceChartWithEventsProps {
  data: PricePoint[];
  height: number;
}

const PriceChartWithEvents: React.FC<PriceChartWithEventsProps> = ({ data, height }) => {
  if (!data || data.length === 0) {
    return (
      <View className="h-48 items-center justify-center">
        <Text variant="body" color="secondary">No chart data</Text>
      </View>
    );
  }

  const width = screenWidth - 32;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const firstPrice = data[0]?.close ?? 0;
  const lastPrice = data[data.length - 1]?.close ?? 0;
  const priceUp = lastPrice >= firstPrice;
  const lineColor = priceUp ? '#10B981' : '#FF1744';

  const minY = Math.min(...data.map(d => d.low)) * 0.98;
  const maxY = Math.max(...data.map(d => d.high)) * 1.02;
  const yRange = maxY - minY;

  const scaleX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const scaleY = (value: number) => padding.top + chartHeight - ((value - minY) / yRange) * chartHeight;

  const linePath = data
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(point.close)}`)
    .join(' ');

  const areaPath = `${linePath} L ${scaleX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => minY + (yRange * i) / (yTickCount - 1));

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={lineColor} stopOpacity="0.05" />
        </LinearGradient>
      </Defs>

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <SvgText
          key={i}
          x={padding.left - 8}
          y={scaleY(tick) + 4}
          fontSize={10}
          fill="#64748B"
          textAnchor="end"
        >
          ${tick.toFixed(0)}
        </SvgText>
      ))}

      {/* Area fill */}
      <Path d={areaPath} fill="url(#chartGradient)" />

      {/* Price line */}
      <Path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" />

      {/* Yield Event Markers */}
      {data.map((point, i) => {
        if (!point.yieldEvent) return null;
        const x = scaleX(i);
        const y = scaleY(point.close);

        return (
          <React.Fragment key={i}>
            {/* Vertical line */}
            <Line
              x1={x}
              y1={padding.top}
              x2={x}
              y2={padding.top + chartHeight}
              stroke="#F59E0B"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
            {/* Event marker */}
            <Circle cx={x} cy={y} r={8} fill="#F59E0B" />
            <SvgText x={x} y={y + 4} fontSize={10} fill="white" textAnchor="middle">
              {point.yieldEvent.action === 'goal' ? '⚽' : '👋'}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Current price dot */}
      <Circle cx={scaleX(data.length - 1)} cy={scaleY(lastPrice)} r={5} fill={lineColor} />
    </Svg>
  );
};

// Stat Item Component
interface StatItemProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, highlight }) => (
  <View className="w-1/2 mb-2">
    <Text variant="caption" color="secondary">{label}</Text>
    <Text
      variant="h4"
      className={highlight ? 'text-trading-bullish' : ''}
    >
      {value}
    </Text>
  </View>
);
