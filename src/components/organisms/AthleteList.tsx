/**
 * AthleteList Component - Organism
 * Scrollable list of athletes
 */
import React from 'react';
import { FlatList, FlatListProps, View, ActivityIndicator } from 'react-native';
import { AthleteListItem } from '../molecules';
import { Text, Divider } from '../atoms';
import type { AthleteMarket } from '../../types';

export interface AthleteListProps extends Omit<FlatListProps<AthleteMarket>, 'data' | 'renderItem'> {
  athletes: AthleteMarket[];
  onAthletePress?: (athlete: AthleteMarket) => void;
  showVolume?: boolean;
  showRank?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export const AthleteList: React.FC<AthleteListProps> = ({
  athletes,
  onAthletePress,
  showVolume = false,
  showRank = false,
  loading = false,
  emptyMessage = 'No athletes found',
  ...flatListProps
}) => {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="large" color="#0528F3" />
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: AthleteMarket; index: number }) => (
    <AthleteListItem
      athlete={item}
      rank={showRank ? index + 1 : undefined}
      showVolume={showVolume}
      onPress={() => onAthletePress?.(item)}
    />
  );

  const renderSeparator = () => <Divider className="ml-16" />;

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-16">
      <Text variant="body" color="secondary">
        {emptyMessage}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={athletes}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={renderSeparator}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      {...flatListProps}
    />
  );
};
