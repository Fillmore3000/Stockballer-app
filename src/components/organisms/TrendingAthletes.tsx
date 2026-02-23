/**
 * TrendingAthletes Component - Organism
 * Horizontal scroll of trending athlete cards
 */
import React from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { AthleteCard } from '../molecules';
import { Text } from '../atoms';
import type { AthleteMarket } from '../../types';

export interface TrendingAthletesProps {
  athletes: AthleteMarket[];
  title?: string;
  onAthletePress?: (athlete: AthleteMarket) => void;
  onSeeAllPress?: () => void;
  loading?: boolean;
  className?: string;
}

export const TrendingAthletes: React.FC<TrendingAthletesProps> = ({
  athletes,
  title = 'Trending',
  onAthletePress,
  onSeeAllPress,
  loading = false,
  className = '',
}) => {
  return (
    <View className={className}>
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text variant="h4">{title}</Text>
        {onSeeAllPress && (
          <Text 
            variant="bodySmall" 
            className="text-primary-500"
            onPress={onSeeAllPress}
          >
            See All
          </Text>
        )}
      </View>
      
      {loading ? (
        <View className="h-48 items-center justify-center">
          <ActivityIndicator size="large" color="#0528F3" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4 gap-3"
        >
          {athletes.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              athlete={athlete}
              onPress={() => onAthletePress?.(athlete)}
              size="md"
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};
