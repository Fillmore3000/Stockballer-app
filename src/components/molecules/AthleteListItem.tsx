/**
 * AthleteListItem Component - Molecule
 * Compact athlete row for lists
 */
import React from 'react';
import { View, Pressable, PressableProps } from 'react-native';
import { Text, PriceChange, Badge, PlayerImage, AnimatedPrice } from '../atoms';
import type { AthleteMarket, Sport } from '../../types';

export interface AthleteListItemProps extends Omit<PressableProps, 'children'> {
  athlete: AthleteMarket;
  showVolume?: boolean;
  rank?: number;
}

const sportLabels: Record<Sport, string> = {
  football: 'NFL',
  basketball: 'NBA',
  baseball: 'MLB',
  soccer: 'Soccer',
  hockey: 'NHL',
  tennis: 'Tennis',
  golf: 'Golf',
  mma: 'MMA',
  boxing: 'Boxing',
};

export const AthleteListItem: React.FC<AthleteListItemProps> = ({
  athlete,
  showVolume = false,
  rank,
  ...pressableProps
}) => {
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  return (
    <Pressable
      className="flex-row items-center py-3 px-4 active:bg-surface-100"
      {...pressableProps}
    >
      {rank !== undefined && (
        <Text variant="label" color="tertiary" className="w-6 mr-2">
          {rank}
        </Text>
      )}
      
      <PlayerImage
        photoUrl={athlete.imageUrl || athlete.photoUrl}
        name={athlete.name}
        size="md"
        borderColor={athlete.priceChange24h >= 0 ? '#22c55e' : '#ef4444'}
      />
      
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text variant="body" className="font-semibold mr-2">
            {athlete.name}
          </Text>
          <Badge 
            label={sportLabels[athlete.sport]} 
            variant="neutral" 
            size="sm" 
          />
        </View>
        <Text variant="caption" color="secondary">
          {athlete.team} • {athlete.position}
        </Text>
      </View>
      
      <View className="items-end">
        <Text variant="body" className="font-bold">
          {formatPrice(athlete.currentPrice)}
        </Text>
        <PriceChange
          value={athlete.priceChange24h}
          percent={athlete.priceChangePercent24h}
          showValue={false}
          size="sm"
        />
        {showVolume && athlete.volume24h !== undefined && (
          <Text variant="caption" color="tertiary" className="mt-0.5">
            Vol: {formatVolume(athlete.volume24h)}
          </Text>
        )}
      </View>
    </Pressable>
  );
};
