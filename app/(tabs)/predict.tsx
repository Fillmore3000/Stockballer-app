/**
 * Predict Screen - AI Match Prediction Market
 * 
 * Users can view AI predictions for upcoming matches and bet on 
 * whether the AI will correctly predict the final score.
 * Win £100 bonus if the AI prediction matches the actual result!
 * 
 * Hackathon: Chainlink Convergence - Prediction Markets track
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, WalletButton } from '../../src/components';
import { useWalletStore } from '../../src/stores';
import { API_BASE_URL } from '../../src/config/api';

// Contract addresses for Base Sepolia
const PREDICTION_MARKET_ADDRESS = '0x2D86C73e9709C5e9f76c45291077e87b4D5E1A56';
const BASESCAN_URL = 'https://sepolia.basescan.org';

interface Fixture {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  matchStartTime: number;
  venue: string;
  status: string;
  league: string;
  round?: string;
}

interface AIPrediction {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  predictedScore: string;
  confidence: number;
  reasoning: string;
  matchStartTime: number;
  totalPool: number;
  totalBets: number;
  txHash?: string;
}

interface PlatformStats {
  totalMatches: number;
  aiAccuracy: string;
  totalVolumeUSD: number;
  bonusPerWin: number;
}

interface UserStats {
  totalBets: number;
  totalWinnings: number;
  correctPredictions: number;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function PredictScreen() {
  const { address, checkConnection } = useWalletStore();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [betAmount, setBetAmount] = useState('10');
  const [activeTab, setActiveTab] = useState<'fixtures' | 'predictions'>('fixtures');

  // Live mode - fetch real fixtures and generate AI predictions
  const [demoMode, setDemoMode] = useState(false);
  const [demoHomeTeam, setDemoHomeTeam] = useState('');
  const [demoAwayTeam, setDemoAwayTeam] = useState('');
  const [demoPrediction, setDemoPrediction] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    checkConnection();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch upcoming fixtures (live from API-Football)
      const fixturesRes = await fetch(`${API_BASE_URL}/predictions/fixtures`);
      if (fixturesRes.ok) {
        const data = await fixturesRes.json();
        setFixtures(data.fixtures || []);
      }

      // Fetch upcoming predictions
      const predRes = await fetch(`${API_BASE_URL}/predictions/upcoming`);
      if (predRes.ok) {
        const data = await predRes.json();
        setPredictions(data.predictions || []);
      }

      // Fetch platform stats
      const statsRes = await fetch(`${API_BASE_URL}/predictions/stats`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Fetch user stats if connected
      if (address) {
        const userRes = await fetch(`${API_BASE_URL}/predictions/user/${address}`);
        if (userRes.ok) {
          const data = await userRes.json();
          setUserStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Generate AI prediction and submit to blockchain
  const generatePredictionForFixture = async (fixture: Fixture) => {
    setSelectedFixture(fixture);
    setIsGenerating(true);
    try {
      // 1. Generate AI prediction
      const predRes = await fetch(`${API_BASE_URL}/predictions/demo/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
        }),
      });
      
      if (!predRes.ok) {
        throw new Error('Failed to generate AI prediction');
      }

      const aiPrediction = await predRes.json();
      const [homeScore, awayScore] = aiPrediction.predictedScore.split('-').map(Number);

      // 2. Submit prediction to blockchain
      const submitRes = await fetch(`${API_BASE_URL}/predictions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: fixture.matchId,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore,
          confidence: aiPrediction.confidence,
          reasoning: aiPrediction.reasoning,
          matchStartTime: fixture.matchStartTime,
        }),
      });

      if (submitRes.ok) {
        const result = await submitRes.json();
        if (result.txHash) {
          Alert.alert(
            'Prediction Submitted On-Chain!',
            `AI predicts: ${fixture.homeTeam} ${aiPrediction.predictedScore} ${fixture.awayTeam}\n\nTx: ${result.txHash.slice(0, 10)}...`,
            [
              { text: 'View on BaseScan', onPress: () => Linking.openURL(`${BASESCAN_URL}/tx/${result.txHash}`) },
              { text: 'OK' }
            ]
          );
        } else {
          Alert.alert('Prediction Created', `AI predicts: ${fixture.homeTeam} ${aiPrediction.predictedScore} ${fixture.awayTeam}`);
        }
        fetchData();
        setActiveTab('predictions');
      } else {
        const error = await submitRes.json();
        Alert.alert('Error', error.message || 'Failed to submit prediction');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate prediction');
    } finally {
      setIsGenerating(false);
      setSelectedFixture(null);
    }
  };

  const generateDemoPrediction = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/predictions/demo/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: demoHomeTeam,
          awayTeam: demoAwayTeam,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setDemoPrediction(data);
      } else {
        Alert.alert('Error', 'Failed to generate prediction');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  const placeBet = async (matchId: number) => {
    if (!address) {
      Alert.alert('Connect Wallet', 'Please connect your wallet to place a bet');
      return;
    }

    const amount = parseFloat(betAmount) * 1_000_000; // Convert to USDC (6 decimals)
    if (isNaN(amount) || amount < 1_000_000) {
      Alert.alert('Invalid Amount', 'Minimum bet is $1');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/predictions/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          walletAddress: address,
          amount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        Alert.alert('Bet Placed!', `You backed the AI prediction. If correct, you win $100 bonus!`);
        setSelectedMatch(null);
        fetchData();
      } else {
        const error = await res.json();
        Alert.alert('Error', error.message || 'Failed to place bet');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d2758]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F5CB3F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0d2758]">
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5CB3F" />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
          <View>
            <Text className="text-white/60 text-sm">Chainlink AI</Text>
            <Text className="text-white text-2xl font-bold">Prediction Market</Text>
          </View>
          <WalletButton />
        </View>

        {/* AI Badge */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center bg-emerald-500/20 self-start px-3 py-2 rounded-full">
            <Ionicons name="flash" size={16} color="#10b981" />
            <Text className="text-emerald-400 ml-2 font-semibold text-sm">
              Powered by GPT-4 + Chainlink CRE
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="px-4 mb-4">
          <View className="flex-row gap-3">
            <Card className="flex-1 p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
              <Text className="text-white/60 text-xs mb-1">AI Accuracy</Text>
              <Text className="text-emerald-400 text-2xl font-bold">{stats?.aiAccuracy || '0'}%</Text>
            </Card>
            <Card className="flex-1 p-4 bg-gradient-to-br from-[#F5CB3F]/20 to-[#F5CB3F]/5">
              <Text className="text-white/60 text-xs mb-1">Win Bonus</Text>
              <Text className="text-[#F5CB3F] text-2xl font-bold">£100</Text>
            </Card>
            <Card className="flex-1 p-4 bg-gradient-to-br from-blue-500/20 to-blue-500/5">
              <Text className="text-white/60 text-xs mb-1">Total Volume</Text>
              <Text className="text-blue-400 text-2xl font-bold">{formatCurrency(stats?.totalVolumeUSD || 0)}</Text>
            </Card>
          </View>
        </View>

        {/* User Stats (if connected) */}
        {address && userStats && (
          <View className="px-4 mb-4">
            <Card className="p-4">
              <Text className="text-white font-semibold mb-3">Your Stats</Text>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-white/60 text-xs">Bets Placed</Text>
                  <Text className="text-white text-lg font-bold">{userStats.totalBets}</Text>
                </View>
                <View>
                  <Text className="text-white/60 text-xs">Correct</Text>
                  <Text className="text-emerald-400 text-lg font-bold">{userStats.correctPredictions}</Text>
                </View>
                <View>
                  <Text className="text-white/60 text-xs">Winnings</Text>
                  <Text className="text-[#F5CB3F] text-lg font-bold">{formatCurrency(userStats.totalWinnings / 1e6)}</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Tab Navigation */}
        <View className="px-4 mb-4">
          <View className="flex-row bg-white/5 rounded-xl p-1">
            <Pressable
              className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'fixtures' ? 'bg-emerald-500' : ''}`}
              onPress={() => setActiveTab('fixtures')}
            >
              <View className="flex-row items-center">
                <Ionicons name="football" size={16} color={activeTab === 'fixtures' ? 'white' : 'rgba(255,255,255,0.5)'} />
                <Text className={`ml-2 font-semibold ${activeTab === 'fixtures' ? 'text-white' : 'text-white/50'}`}>
                  Fixtures ({fixtures.length})
                </Text>
              </View>
            </Pressable>
            <Pressable
              className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'predictions' ? 'bg-[#F5CB3F]' : ''}`}
              onPress={() => setActiveTab('predictions')}
            >
              <View className="flex-row items-center">
                <Ionicons name="flash" size={16} color={activeTab === 'predictions' ? '#0d2758' : 'rgba(255,255,255,0.5)'} />
                <Text className={`ml-2 font-semibold ${activeTab === 'predictions' ? 'text-[#0d2758]' : 'text-white/50'}`}>
                  AI Predictions ({predictions.length})
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Fixtures Tab */}
        {activeTab === 'fixtures' && (
          <View className="px-4 mb-4">
            <Text className="text-white font-semibold text-lg mb-3">Upcoming Premier League</Text>
            
            {fixtures.length === 0 ? (
              <Card className="p-6 items-center">
                <Ionicons name="football-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text className="text-white/60 mt-3 text-center">
                  Loading fixtures from API-Football...
                </Text>
              </Card>
            ) : (
              fixtures.map((fixture) => (
                <Card key={fixture.matchId} className="p-4 mb-3">
                  {/* Match Header */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
                      <Text className="text-white/50 text-xs ml-1">{formatTime(fixture.matchStartTime)}</Text>
                    </View>
                    <View className="bg-blue-500/20 px-2 py-1 rounded">
                      <Text className="text-blue-400 text-xs font-semibold">{fixture.league}</Text>
                    </View>
                  </View>

                  {/* Teams */}
                  <View className="flex-row justify-center items-center mb-3">
                    <Text className="text-white font-semibold flex-1 text-right">{fixture.homeTeam}</Text>
                    <View className="mx-4">
                      <Text className="text-white/40 text-lg">vs</Text>
                    </View>
                    <Text className="text-white font-semibold flex-1">{fixture.awayTeam}</Text>
                  </View>

                  {/* Venue */}
                  <View className="flex-row items-center justify-center mb-3">
                    <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.4)" />
                    <Text className="text-white/40 text-xs ml-1">{fixture.venue}</Text>
                  </View>

                  {/* Check if already has prediction */}
                  {predictions.find(p => p.matchId === fixture.matchId) ? (
                    <View className="bg-emerald-500/20 py-2 rounded-lg items-center">
                      <Text className="text-emerald-400 font-semibold">AI Prediction Generated</Text>
                    </View>
                  ) : (
                    <Pressable
                      className={`py-3 rounded-xl items-center ${isGenerating && selectedFixture?.matchId === fixture.matchId ? 'bg-emerald-500/50' : 'bg-emerald-500'}`}
                      onPress={() => generatePredictionForFixture(fixture)}
                      disabled={isGenerating}
                    >
                      {isGenerating && selectedFixture?.matchId === fixture.matchId ? (
                        <View className="flex-row items-center">
                          <ActivityIndicator size="small" color="white" />
                          <Text className="text-white font-semibold ml-2">AI Generating...</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center">
                          <Ionicons name="flash" size={18} color="white" />
                          <Text className="text-white font-semibold ml-2">Generate AI Prediction</Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <>
            {/* Demo Prediction Generator */}
            <View className="px-4 mb-4">
              <Card className="p-4 border border-[#F5CB3F]/30">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="sparkles" size={20} color="#F5CB3F" />
                  <Text className="text-white font-semibold ml-2">Demo: Generate AI Prediction</Text>
                </View>
                
                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1">
                    <Text className="text-white/60 text-xs mb-1">Home Team</Text>
                    <TextInput
                      className="bg-white/10 rounded-lg px-3 py-2 text-white"
                      value={demoHomeTeam}
                      onChangeText={setDemoHomeTeam}
                      placeholder="Arsenal"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                  <View className="items-center justify-end pb-2">
                    <Text className="text-white/40 text-sm">vs</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white/60 text-xs mb-1">Away Team</Text>
                    <TextInput
                      className="bg-white/10 rounded-lg px-3 py-2 text-white"
                      value={demoAwayTeam}
                      onChangeText={setDemoAwayTeam}
                      placeholder="Chelsea"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                </View>

                <Pressable
                  className={`py-3 rounded-xl items-center ${isGenerating ? 'bg-emerald-500/50' : 'bg-emerald-500'}`}
                  onPress={generateDemoPrediction}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-semibold ml-2">AI Thinking...</Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="flash" size={18} color="white" />
                      <Text className="text-white font-semibold ml-2">Generate Prediction</Text>
                    </View>
                  )}
                </Pressable>

                {/* Demo Prediction Result */}
                {demoPrediction && (
                  <View className="mt-4 p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-xl">
                    <View className="flex-row justify-center items-center mb-3">
                      <Text className="text-white font-semibold">{demoPrediction.homeTeam}</Text>
                      <View className="mx-4 flex-row items-center">
                        <View className="bg-[#F5CB3F] px-4 py-2 rounded-lg">
                          <Text className="text-[#0d2758] text-2xl font-bold">{demoPrediction.predictedScore}</Text>
                        </View>
                      </View>
                      <Text className="text-white font-semibold">{demoPrediction.awayTeam}</Text>
                    </View>
                    
                    <View className="items-center mb-3">
                      <Text className="text-white/60 text-xs">AI Confidence</Text>
                      <View className="w-full bg-white/10 h-2 rounded-full mt-1">
                        <View 
                          className="bg-emerald-500 h-2 rounded-full" 
                          style={{ width: `${demoPrediction.confidence}%` }} 
                        />
                      </View>
                      <Text className="text-emerald-400 text-sm mt-1">{demoPrediction.confidence}%</Text>
                    </View>

                    <Text className="text-white/70 text-sm text-center italic">
                      "{demoPrediction.reasoning}"
                    </Text>

                    <View className="mt-3 flex-row items-center justify-center">
                      <Text className="text-white/40 text-xs">Model: {demoPrediction.model}</Text>
                    </View>
                  </View>
                )}
              </Card>
            </View>

            {/* Upcoming Predictions */}
            <View className="px-4 mb-4">
              <Text className="text-white font-semibold text-lg mb-3">Active Predictions</Text>
              
              {predictions.length === 0 ? (
                <Card className="p-6 items-center">
                  <Ionicons name="football-outline" size={48} color="rgba(255,255,255,0.3)" />
                  <Text className="text-white/60 mt-3 text-center">
                    No predictions yet.{'\n'}Go to Fixtures tab to generate AI predictions!
                  </Text>
                </Card>
              ) : (
                predictions.map((pred) => (
                  <Card key={pred.matchId} className="p-4 mb-3">
                    {/* Match Header */}
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
                        <Text className="text-white/50 text-xs ml-1">{formatTime(pred.matchStartTime)}</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {pred.txHash && (
                          <Pressable 
                            className="bg-blue-500/20 px-2 py-1 rounded"
                            onPress={() => Linking.openURL(`${BASESCAN_URL}/tx/${pred.txHash}`)}
                          >
                            <Text className="text-blue-400 text-xs font-semibold">On-Chain ↗</Text>
                          </Pressable>
                        )}
                        <View className="bg-emerald-500/20 px-2 py-1 rounded">
                          <Text className="text-emerald-400 text-xs font-semibold">{pred.confidence}% conf</Text>
                        </View>
                      </View>
                    </View>

                    {/* Teams & Score */}
                    <View className="flex-row justify-center items-center mb-3">
                      <Text className="text-white font-semibold flex-1 text-right">{pred.homeTeam}</Text>
                      <View className="mx-4">
                        <View className="bg-[#F5CB3F] px-4 py-2 rounded-lg">
                          <Text className="text-[#0d2758] text-xl font-bold">{pred.predictedScore}</Text>
                        </View>
                      </View>
                      <Text className="text-white font-semibold flex-1">{pred.awayTeam}</Text>
                    </View>

                    {/* Reasoning */}
                    <Text className="text-white/60 text-sm text-center mb-3 italic">"{pred.reasoning}"</Text>

                    {/* Pool Info */}
                    <View className="flex-row justify-between items-center mb-3 py-2 border-t border-b border-white/10">
                      <View>
                        <Text className="text-white/50 text-xs">Pool Size</Text>
                        <Text className="text-white font-semibold">{formatCurrency(pred.totalPool / 1e6)}</Text>
                      </View>
                      <View>
                        <Text className="text-white/50 text-xs">Bettors</Text>
                        <Text className="text-white font-semibold">{pred.totalBets}</Text>
                      </View>
                      <View>
                        <Text className="text-white/50 text-xs">Win Bonus</Text>
                        <Text className="text-[#F5CB3F] font-semibold">£100</Text>
                      </View>
                    </View>

                    {/* Bet Section */}
                    {selectedMatch === pred.matchId ? (
                      <View>
                        <View className="flex-row gap-2 mb-2">
                          <TextInput
                            className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white"
                            value={betAmount}
                            onChangeText={setBetAmount}
                            keyboardType="numeric"
                            placeholder="Amount in USD"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                          />
                          <Pressable 
                            className="bg-emerald-500 px-4 rounded-lg items-center justify-center"
                            onPress={() => placeBet(pred.matchId)}
                          >
                            <Text className="text-white font-semibold">Bet</Text>
                          </Pressable>
                        </View>
                        <Pressable onPress={() => setSelectedMatch(null)}>
                          <Text className="text-white/50 text-center text-sm">Cancel</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 rounded-xl items-center"
                        onPress={() => setSelectedMatch(pred.matchId)}
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="flash" size={18} color="white" />
                          <Text className="text-white font-semibold ml-2">Back This Prediction</Text>
                        </View>
                      </Pressable>
                    )}
                  </Card>
                ))
              )}
            </View>
          </>
        )}

        {/* Contract Info */}
        <View className="px-4 mb-4">
          <Pressable 
            className="flex-row items-center justify-center py-3 bg-blue-900/30 rounded-xl border border-blue-500/20"
            onPress={() => Linking.openURL(`${BASESCAN_URL}/address/${PREDICTION_MARKET_ADDRESS}`)}
          >
            <Ionicons name="link" size={16} color="#375bd2" />
            <Text className="text-blue-400 ml-2 text-sm">
              View Contract on BaseScan
            </Text>
          </Pressable>
        </View>

        {/* How It Works */}
        <View className="px-4 mb-4">
          <Card className="p-4">
            <Text className="text-white font-semibold mb-3">How It Works</Text>
            
            <View className="gap-3">
              <View className="flex-row items-start">
                <View className="w-6 h-6 bg-emerald-500/20 rounded-full items-center justify-center mr-3">
                  <Text className="text-emerald-400 font-bold text-xs">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">AI Predicts Score</Text>
                  <Text className="text-white/60 text-sm">Chainlink CRE calls GPT-4 to predict exact scores</Text>
                </View>
              </View>
              
              <View className="flex-row items-start">
                <View className="w-6 h-6 bg-emerald-500/20 rounded-full items-center justify-center mr-3">
                  <Text className="text-emerald-400 font-bold text-xs">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">You Back the AI</Text>
                  <Text className="text-white/60 text-sm">Bet that the AI prediction will be correct</Text>
                </View>
              </View>
              
              <View className="flex-row items-start">
                <View className="w-6 h-6 bg-[#F5CB3F]/20 rounded-full items-center justify-center mr-3">
                  <Text className="text-[#F5CB3F] font-bold text-xs">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">Win £100 Bonus</Text>
                  <Text className="text-white/60 text-sm">If AI matches the exact final score, you win!</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Chainlink Badge */}
        <View className="px-4 mb-6">
          <View className="flex-row items-center justify-center py-4 bg-blue-900/30 rounded-xl border border-blue-500/20">
            <Ionicons name="link" size={20} color="#375bd2" />
            <Text className="text-blue-400 ml-2 font-medium text-sm">
              Powered by Chainlink CRE & Functions
            </Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
