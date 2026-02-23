/**
 * PositionItem Component - Molecule
 * Display a single portfolio position
 */
import React from 'react';
import { View, Pressable, PressableProps } from 'react-native';
import { Avatar, Text, PriceChange } from '../atoms';
import type { EnrichedPortfolioPosition, AthleteMarket } from '../../types';

export interface PositionItemProps extends Omit<PressableProps, 'children'> {
  position: EnrichedPortfolioPosition;
  athlete: AthleteMarket;
}

export const PositionItem: React.FC<PositionItemProps> = ({
  position,
  athlete,
  ...pressableProps
}) => {
  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <Pressable
      className="flex-row items-center py-3 px-4 active:bg-surface-100"
      {...pressableProps}
    >
      <Avatar
        source={{ uri: athlete.imageUrl }}
        name={athlete.name}
        size="md"
      />
      
      <View className="flex-1 ml-3">
        <Text variant="body" className="font-semibold">
          {athlete.name}
        </Text>
        <Text variant="caption" color="secondary">
          {position.quantity} shares @ {formatCurrency(position.averagePrice)}
        </Text>
      </View>
      
      <View className="items-end">
        <Text variant="body" className="font-bold">
          {formatCurrency(position.currentValue)}
        </Text>
        <PriceChange
          value={position.unrealizedPnL}
          percent={position.unrealizedPnLPercent}
          showValue={false}
          size="sm"
        />
      </View>
    </Pressable>
  );
};
