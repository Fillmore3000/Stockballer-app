/**
 * PortfolioSummary Component - Molecule
 * Portfolio value and P&L display
 */
import React from 'react';
import { View } from 'react-native';
import { Card, Text, PriceChange } from '../atoms';
import type { Portfolio } from '../../types';

export interface PortfolioSummaryProps {
  portfolio: Portfolio;
  showDetails?: boolean;
  className?: string;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  portfolio,
  showDetails = true,
  className = '',
}) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card variant="flat" padding="md" className={className}>
      <Text variant="caption" color="secondary" className="mb-1">
        Portfolio Value
      </Text>
      <Text variant="h2" className="mb-2">
        {formatCurrency(portfolio.totalValue)}
      </Text>
      
      <View className="flex-row items-center mb-4">
        <PriceChange
          value={portfolio.dayPnL}
          percent={portfolio.dayPnLPercent}
          size="md"
        />
        <Text variant="caption" color="tertiary" className="ml-2">
          Today
        </Text>
      </View>
      
      {showDetails && (
        <View className="flex-row border-t border-slate-700/50 pt-4">
          <View className="flex-1">
            <Text variant="caption" color="secondary">
              Invested
            </Text>
            <Text variant="body" className="font-semibold">
              {formatCurrency(portfolio.investedValue)}
            </Text>
          </View>
          
          <View className="flex-1">
            <Text variant="caption" color="secondary">
              Cash
            </Text>
            <Text variant="body" className="font-semibold">
              {formatCurrency(portfolio.cashBalance)}
            </Text>
          </View>
          
          <View className="flex-1 items-end">
            <Text variant="caption" color="secondary">
              Total P&L
            </Text>
            <PriceChange
              value={portfolio.totalPnL}
              percent={portfolio.totalPnLPercent}
              showValue={false}
              size="md"
            />
          </View>
        </View>
      )}
    </Card>
  );
};
