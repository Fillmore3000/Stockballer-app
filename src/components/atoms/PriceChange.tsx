/**
 * PriceChange Component - Atom
 * Display price change with color coding
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

export interface PriceChangeProps {
  value: number;
  percent?: number;
  showPercent?: boolean;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<PriceChangeProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const PriceChange: React.FC<PriceChangeProps> = ({
  value,
  percent,
  showPercent = true,
  showValue = true,
  size = 'md',
  className = '',
}) => {
  const isPositive = value >= 0;
  const colorClass = isPositive ? 'text-trading-bullish' : 'text-trading-bearish';
  const arrow = isPositive ? '▲' : '▼';
  
  const formatValue = (val: number): string => {
    const absVal = Math.abs(val);
    return `$${absVal.toFixed(2)}`;
  };

  const formatPercent = (val: number): string => {
    const absVal = Math.abs(val);
    return `${absVal.toFixed(2)}%`;
  };

  return (
    <View className={`flex-row items-center ${className}`}>
      <Text className={`${colorClass} ${sizeClasses[size]} font-semibold`}>
        {arrow}{' '}
        {showValue && formatValue(value)}
        {showValue && showPercent && percent !== undefined && ' '}
        {showPercent && percent !== undefined && `(${formatPercent(percent)})`}
      </Text>
    </View>
  );
};

