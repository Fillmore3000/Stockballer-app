/**
 * AthleteCard Component - Molecule
 * Card display for featured athletes
 */
import React from 'react';
import { View, Image, ImageBackground } from 'react-native';
import { Card, Text, PriceChange, Badge } from '../atoms';
import type { AthleteMarket, Sport } from '../../types';

export interface AthleteCardProps {
  athlete: AthleteMarket;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
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

const sizeClasses: Record<NonNullable<AthleteCardProps['size']>, { card: string; image: string }> = {
  sm: { card: 'w-32', image: 'h-24' },
  md: { card: 'w-40', image: 'h-32' },
  lg: { card: 'w-48', image: 'h-40' },
};

export const AthleteCard: React.FC<AthleteCardProps> = ({
  athlete,
  onPress,
  size = 'md',
}) => {
  const sizeStyle = sizeClasses[size];

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  return (
    <Card
      variant="elevated"
      padding="none"
      onPress={onPress}
      className={sizeStyle.card}
    >
      <ImageBackground
        source={{ uri: athlete.imageUrl }}
        className={`${sizeStyle.image} justify-end`}
        resizeMode="cover"
      >
        <View className="bg-gradient-to-t from-black/80 to-transparent p-2">
          <Badge 
            label={sportLabels[athlete.sport]} 
            variant="primary" 
            size="sm" 
          />
        </View>
      </ImageBackground>
      
      <View className="p-3">
        <Text variant="bodySmall" className="font-semibold" numberOfLines={1}>
          {athlete.name}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {athlete.team}
        </Text>
        
        <View className="flex-row items-center justify-between mt-2">
          <Text variant="body" className="font-bold">
            {formatPrice(athlete.currentPrice)}
          </Text>
          <PriceChange
            value={athlete.priceChange24h}
            percent={athlete.priceChangePercent24h}
            showValue={false}
            size="sm"
          />
        </View>
      </View>
    </Card>
  );
};
