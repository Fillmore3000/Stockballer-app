/**
 * Discover Screen - Browse Athletes Tab
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Badge } from '../../src/components';
import { SearchBar, AthleteList } from '../../src/components';
import { useAthletesStore } from '../../src/stores';
import type { AthleteMarket } from '../../src/types';

type SortFilter = 'all' | 'forwards' | 'midfielders' | 'wingers' | 'defenders' | 'active_only';

const sortOptions: { label: string; value: SortFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Forwards', value: 'forwards' },
  { label: 'Midfielders', value: 'midfielders' },
  { label: 'Wingers', value: 'wingers' },
  { label: 'Defenders', value: 'defenders' },
  { label: 'Active', value: 'active_only' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const {
    athletes,
    searchResults,
    fetchAthletes,
    searchAthletes,
    clearSearch,
    isLoading,
    isSearching,
  } = useAthletesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<SortFilter>('all');

  useEffect(() => {
    fetchAthletes();
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    searchAthletes(query);
  }, [searchAthletes]);

  const handleClearSearch = () => {
    setSearchQuery('');
    clearSearch();
  };

  const handleAthletePress = (athlete: AthleteMarket) => {
    router.push(`/player/${athlete.id}` as any);
  };

  const filteredAthletes = React.useMemo(() => {
    const source = searchQuery ? searchResults : athletes;
    let filtered = [...source];

    switch (selectedSort) {
      case 'forwards':
        filtered = filtered.filter(a => a.position === 'forward');
        break;
      case 'midfielders':
        filtered = filtered.filter(a => a.position === 'midfielder');
        break;
      case 'wingers':
        filtered = filtered.filter(a => a.position === 'winger');
        break;
      case 'defenders':
        filtered = filtered.filter(a => a.position === 'defender');
        break;
      case 'active_only':
        filtered = filtered.filter(a => (a as any).riskProfile?.status === 'ACTIVE');
        break;
    }

    // Sort by yield by default
    filtered.sort((a, b) => b.ytdYield - a.ytdYield);

    return filtered;
  }, [athletes, searchResults, searchQuery, selectedSort]);

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4">
        <Text variant="h2">Discover</Text>
        <Text variant="body" color="secondary">
          Find athletes to invest in
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 mb-4">
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={handleClearSearch}
          placeholder="Search athletes..."
        />
      </View>

      {/* Sort Filter */}
      <View className="mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
          <View className="flex-row gap-2">
            {sortOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSelectedSort(opt.value)}
                className={`px-4 py-2 rounded-full ${selectedSort === opt.value ? 'bg-primary-500' : 'bg-surface-200'
                  }`}
              >
                <Text
                  variant="caption"
                  className={`font-medium ${selectedSort === opt.value ? 'text-white' : 'text-text-secondary'}`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Athletes List */}
      <AthleteList
        athletes={filteredAthletes}
        onAthletePress={handleAthletePress}
        showVolume
        showRank={!searchQuery}
        loading={isLoading || isSearching}
        emptyMessage={searchQuery ? 'No athletes match your search' : 'No athletes available'}
        className="flex-1"
      />
    </SafeAreaView>
  );
}
