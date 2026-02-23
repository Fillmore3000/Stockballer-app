/**
 * TimeFrameSelector Component - Molecule
 * Horizontal selector for chart time frames
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../atoms';
import type { TimeFrame } from '../../types';

export interface TimeFrameSelectorProps {
  selected: TimeFrame;
  onSelect: (timeframe: TimeFrame) => void;
  className?: string;
}

const timeframes: TimeFrame[] = ['1H', '1D', '1W', '1M', '3M', '1Y', 'ALL'];

export const TimeFrameSelector: React.FC<TimeFrameSelectorProps> = ({
  selected,
  onSelect,
  className = '',
}) => {
  return (
    <View className={`flex-row justify-between bg-surface-100 rounded-lg p-1 ${className}`}>
      {timeframes.map((tf) => {
        const isSelected = tf === selected;
        
        return (
          <Pressable
            key={tf}
            onPress={() => onSelect(tf)}
            className={`
              flex-1 items-center py-2 rounded-md
              ${isSelected ? 'bg-primary-500' : ''}
            `}
          >
            <Text
              variant="caption"
              className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-400'}`}
            >
              {tf}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
