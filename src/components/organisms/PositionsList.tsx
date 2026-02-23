/**
 * PositionsList Component - Organism
 * List of portfolio positions
 */
import React from 'react';
import { FlatList, View, ActivityIndicator } from 'react-native';
import { PositionItem } from '../molecules';
import { Text, Divider } from '../atoms';
import type { EnrichedPortfolioPosition, AthleteMarket } from '../../types';

export interface PositionsListProps {
  positions: EnrichedPortfolioPosition[];
  athletes: Record<string, AthleteMarket>;
  onPositionPress?: (position: EnrichedPortfolioPosition, athlete: AthleteMarket) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export const PositionsList: React.FC<PositionsListProps> = ({
  positions,
  athletes,
  onPositionPress,
  loading = false,
  emptyMessage = 'No positions yet',
}) => {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="large" color="#0528F3" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: EnrichedPortfolioPosition }) => {
    const positionId = item.playerId;
    const athlete = positionId ? athletes[positionId] : undefined;
    if (!athlete) return null;
    
    return (
      <PositionItem
        position={item}
        athlete={athlete}
        onPress={() => onPositionPress?.(item, athlete)}
      />
    );
  };

  const renderSeparator = () => <Divider className="ml-16" />;

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-16">
      <Text variant="body" color="secondary">
        {emptyMessage}
      </Text>
      <Text variant="caption" color="tertiary" className="mt-2">
        Start trading to build your portfolio
      </Text>
    </View>
  );

  return (
    <FlatList
      data={positions}
      renderItem={renderItem}
      keyExtractor={(item) => item.playerId || `pos-${Math.random()}`}
      ItemSeparatorComponent={renderSeparator}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
};
