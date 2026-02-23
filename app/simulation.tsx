/**
 * Simulation Screen - Yield Formula Testing
 * Hidden test page - access via /simulation URL
 * NOT in main navigation
 */
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '../src/components';
import { API_BASE_URL } from '../src/config/api';

interface SimulationResult {
  rawYield: number;
  penalties: number;
  netYield: number;
  formMultiplier: number;
  ageMultiplier: number;
  calculatedPrice: number;
  clampedPrice: number;
  breakdown: {
    goalYield: number;
    assistYield: number;
    matchYield: number;
    cleanSheetYield: number;
    yellowCardPenalty: number;
    redCardPenalty: number;
    penaltyMissPenalty: number;
    ownGoalPenalty: number;
    missedMatchPenalty: number;
  };
}

interface Scenario {
  name: string;
  description: string;
  stats: {
    goals: number;
    assists: number;
    matches: number;
    cleanSheets: number;
    yellowCards: number;
    redCards: number;
    penaltiesMissed: number;
    ownGoals: number;
    age: number;
    rating: number;
  };
  expectedPriceRange: { min: number; max: number };
}

const DEFAULT_STATS = {
  goals: 15,
  assists: 8,
  matches: 30,
  cleanSheets: 0,
  yellowCards: 3,
  redCards: 0,
  penaltiesMissed: 0,
  ownGoals: 0,
  age: 24,
  rating: 7.0,
};

export default function SimulationScreen() {
  const router = useRouter();
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load scenarios on mount
  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/market/simulation/scenarios`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setScenarios(data.data);
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  const runSimulation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/market/calculate-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stats: {
            goals: stats.goals,
            assists: stats.assists,
            matches: stats.matches,
            cleanSheets: stats.cleanSheets,
            yellowCards: stats.yellowCards,
            redCards: stats.redCards,
            penaltiesMissed: stats.penaltiesMissed,
            ownGoals: stats.ownGoals,
            rating: stats.rating,
          },
          age: stats.age,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || data.error || 'Simulation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run simulation');
    } finally {
      setIsLoading(false);
    }
  };

  const applyScenario = (scenario: Scenario) => {
    setStats({
      goals: scenario.stats.goals,
      assists: scenario.stats.assists,
      matches: scenario.stats.matches,
      cleanSheets: scenario.stats.cleanSheets,
      yellowCards: scenario.stats.yellowCards,
      redCards: scenario.stats.redCards,
      penaltiesMissed: scenario.stats.penaltiesMissed,
      ownGoals: scenario.stats.ownGoals,
      age: scenario.stats.age,
      rating: scenario.stats.rating,
    });
    // Auto-run simulation
    setTimeout(() => runSimulation(), 100);
  };

  const updateStat = (key: keyof typeof stats, value: string) => {
    const numValue = parseFloat(value) || 0;
    setStats(prev => ({ ...prev, [key]: numValue }));
  };

  const StatInput = ({ label, field, min = 0, max = 100, step = 1 }: {
    label: string;
    field: keyof typeof stats;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <View className="flex-row items-center justify-between py-2 border-b border-border-light">
      <Text variant="body" className="flex-1">{label}</Text>
      <View className="flex-row items-center">
        <Pressable
          onPress={() => updateStat(field, Math.max(min, stats[field] - step).toString())}
          className="bg-surface-200 w-8 h-8 rounded-l-lg items-center justify-center"
        >
          <Ionicons name="remove" size={16} color="#F8FAFC" />
        </Pressable>
        <TextInput
          value={stats[field].toString()}
          onChangeText={(v) => updateStat(field, v)}
          keyboardType="numeric"
          className="bg-surface-100 w-16 h-8 text-center text-text-primary"
        />
        <Pressable
          onPress={() => updateStat(field, Math.min(max, stats[field] + step).toString())}
          className="bg-surface-200 w-8 h-8 rounded-r-lg items-center justify-center"
        >
          <Ionicons name="add" size={16} color="#F8FAFC" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-border-light">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </Pressable>
        <View className="flex-1">
          <Text variant="h4">🧪 Yield Formula Simulator</Text>
          <Text variant="caption" color="secondary">Test pricing calculations</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Quick Scenarios */}
        <Card className="mb-4 p-4">
          <Text variant="h4" className="mb-3">📋 Quick Scenarios</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {scenarios.length > 0 ? scenarios.map((scenario, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => applyScenario(scenario)}
                  className="bg-surface-200 px-4 py-2 rounded-lg mr-2"
                >
                  <Text variant="caption" className="font-semibold">{scenario.name}</Text>
                  <Text variant="caption" color="secondary" className="text-xs">
                    ${scenario.expectedPriceRange.min}-${scenario.expectedPriceRange.max}
                  </Text>
                </Pressable>
              )) : (
                <Text variant="caption" color="secondary">Loading scenarios...</Text>
              )}
            </View>
          </ScrollView>
        </Card>

        {/* Stats Input */}
        <Card className="mb-4 p-4">
          <Text variant="h4" className="mb-3">📊 Player Stats</Text>
          
          <Text variant="caption" color="success" className="mb-2">✅ Positive Factors</Text>
          <StatInput label="⚽ Goals" field="goals" max={50} />
          <StatInput label="🅰️ Assists" field="assists" max={30} />
          <StatInput label="🏃 Matches Played" field="matches" max={60} />
          <StatInput label="🧤 Clean Sheets" field="cleanSheets" max={30} />
          
          <Text variant="caption" color="danger" className="mt-4 mb-2">❌ Negative Factors (Penalties)</Text>
          <StatInput label="🟨 Yellow Cards" field="yellowCards" max={20} />
          <StatInput label="🟥 Red Cards" field="redCards" max={5} />
          <StatInput label="❌ Penalties Missed" field="penaltiesMissed" max={10} />
          <StatInput label="😱 Own Goals" field="ownGoals" max={5} />

          <Text variant="caption" color="secondary" className="mt-4 mb-2">📈 Multipliers</Text>
          <StatInput label="🎂 Age" field="age" min={16} max={40} />
          <StatInput label="⭐ Rating (0-10)" field="rating" min={0} max={10} step={0.1} />
        </Card>

        {/* Run Button */}
        <Pressable
          onPress={runSimulation}
          disabled={isLoading}
          className={`py-4 rounded-xl mb-4 ${isLoading ? 'bg-surface-200' : 'bg-accent-primary'}`}
        >
          {isLoading ? (
            <ActivityIndicator color="#F8FAFC" />
          ) : (
            <Text variant="body" className="text-center font-bold text-white">
              🧮 Calculate Price
            </Text>
          )}
        </Pressable>

        {/* Error */}
        {error && (
          <Card className="mb-4 p-4 bg-red-500/20">
            <Text variant="body" color="danger">{error}</Text>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Card className="mb-4 p-4">
            <Text variant="h4" className="mb-4">💰 Calculation Results</Text>

            {/* Final Price */}
            <View className="bg-accent-primary/20 rounded-xl p-4 mb-4 items-center">
              <Text variant="caption" color="secondary">Calculated Price</Text>
              <Text variant="h2" className="text-accent-primary">
                ${result.clampedPrice.toFixed(2)}
              </Text>
              <Text variant="caption" color="secondary">
                IPO: $100.00 → {result.clampedPrice > 100 ? '📈' : '📉'} {((result.clampedPrice / 100 - 1) * 100).toFixed(1)}%
              </Text>
            </View>

            {/* Breakdown */}
            <Text variant="body" className="font-semibold mb-2">📊 Yield Breakdown</Text>
            
            <View className="bg-green-500/10 rounded-lg p-3 mb-2">
              <Text variant="caption" color="success" className="font-semibold mb-1">Positive Yield: +${result.rawYield.toFixed(2)}</Text>
              <View className="flex-row flex-wrap">
                <Text variant="caption" color="secondary" className="mr-3">
                  Goals: +${result.breakdown.goalYield.toFixed(2)}
                </Text>
                <Text variant="caption" color="secondary" className="mr-3">
                  Assists: +${result.breakdown.assistYield.toFixed(2)}
                </Text>
                <Text variant="caption" color="secondary" className="mr-3">
                  Matches: +${result.breakdown.matchYield.toFixed(2)}
                </Text>
                <Text variant="caption" color="secondary">
                  Clean Sheets: +${result.breakdown.cleanSheetYield.toFixed(2)}
                </Text>
              </View>
            </View>

            <View className="bg-red-500/10 rounded-lg p-3 mb-2">
              <Text variant="caption" color="danger" className="font-semibold mb-1">Penalties: -${result.penalties.toFixed(2)}</Text>
              <View className="flex-row flex-wrap">
                <Text variant="caption" color="secondary" className="mr-3">
                  Yellow: -${result.breakdown.yellowCardPenalty.toFixed(2)}
                </Text>
                <Text variant="caption" color="secondary" className="mr-3">
                  Red: -${result.breakdown.redCardPenalty.toFixed(2)}
                </Text>
                <Text variant="caption" color="secondary" className="mr-3">
                  Pen Miss: -${result.breakdown.penaltyMissPenalty.toFixed(2)}
                </Text>
                <Text variant="caption" color="secondary">
                  Own Goal: -${result.breakdown.ownGoalPenalty.toFixed(2)}
                </Text>
              </View>
            </View>

            <View className="bg-blue-500/10 rounded-lg p-3 mb-2">
              <Text variant="caption" className="text-blue-400 font-semibold mb-1">Net Yield: ${result.netYield.toFixed(2)}</Text>
              <Text variant="caption" color="secondary">
                = Positive (${result.rawYield.toFixed(2)}) - Penalties (${result.penalties.toFixed(2)})
              </Text>
            </View>

            {/* Multipliers */}
            <Text variant="body" className="font-semibold mt-4 mb-2">🔢 Multipliers Applied</Text>
            <View className="flex-row justify-between mb-1">
              <Text variant="caption" color="secondary">Age Multiplier (Age {stats.age}):</Text>
              <Text variant="caption" className="font-semibold">{result.ageMultiplier}x</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text variant="caption" color="secondary">Form Multiplier (Rating {stats.rating}):</Text>
              <Text variant="caption" className="font-semibold">{result.formMultiplier.toFixed(3)}x</Text>
            </View>

            {/* Formula */}
            <View className="bg-surface-200 rounded-lg p-3 mt-4">
              <Text variant="caption" color="secondary" className="font-mono text-xs">
                Price = IPO + (Net_Yield × Form × Age){'\n'}
                ${result.clampedPrice.toFixed(2)} = $100 + (${result.netYield.toFixed(2)} × {result.formMultiplier.toFixed(3)} × {result.ageMultiplier}){'\n'}
                ${result.clampedPrice.toFixed(2)} = $100 + ${(result.netYield * result.formMultiplier * result.ageMultiplier).toFixed(2)}
              </Text>
            </View>
          </Card>
        )}

        {/* Formula Reference */}
        <Card className="mb-8 p-4">
          <Text variant="h4" className="mb-3">📖 Formula Reference</Text>
          
          <Text variant="caption" color="secondary" className="mb-2">
            <Text className="font-bold text-text-primary">Price = IPO + (Net_Yield × Form × Age)</Text>
          </Text>

          <Text variant="caption" color="secondary" className="mb-1">
            • IPO Starting Price: $100.00
          </Text>
          <Text variant="caption" color="secondary" className="mb-1">
            • Minimum Price: $1.00 (floor)
          </Text>
          <Text variant="caption" color="secondary" className="mb-1">
            • Maximum Price: No cap
          </Text>

          <Text variant="body" className="font-semibold mt-3 mb-2">Yield Values:</Text>
          <Text variant="caption" color="secondary">
            Goal: $0.25 | Assist: $0.12 | Match: $0.02 | Clean Sheet: $0.10
          </Text>

          <Text variant="body" className="font-semibold mt-3 mb-2">Penalty Values:</Text>
          <Text variant="caption" color="secondary">
            Yellow: -$0.15 | Red: -$1.50 | Pen Miss: -$0.50 | Own Goal: -$0.75
          </Text>

          <Text variant="body" className="font-semibold mt-3 mb-2">Age Multipliers:</Text>
          <Text variant="caption" color="secondary">
            Under 20: 15x | 20-27: 12x | Over 27: 8x
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
