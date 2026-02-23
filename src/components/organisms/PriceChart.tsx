/**
 * PriceChart Component - Organism
 * Line chart for athlete price history
 * Uses a simple SVG-based chart for cross-platform compatibility
 */
import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import { Text } from '../atoms';
import type { PricePoint } from '../../types';

export interface PriceChartProps {
  data: PricePoint[];
  height?: number;
  showGrid?: boolean;
  color?: string;
  className?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  height = 200,
  showGrid = false,
  color = '#0528F3',
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <View className={`h-48 items-center justify-center ${className}`}>
        <Text variant="body" color="secondary">
          No chart data available
        </Text>
      </View>
    );
  }

  const width = screenWidth - 32;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Determine if price went up or down
  const firstPrice = data[0]?.close ?? 0;
  const lastPrice = data[data.length - 1]?.close ?? 0;
  const priceUp = lastPrice >= firstPrice;
  const lineColor = priceUp ? '#10B981' : '#FF1744';

  // Calculate domain for better visualization
  const minY = Math.min(...data.map(d => d.low)) * 0.99;
  const maxY = Math.max(...data.map(d => d.high)) * 1.01;
  const yRange = maxY - minY;

  // Scale functions
  const scaleX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const scaleY = (value: number) => padding.top + chartHeight - ((value - minY) / yRange) * chartHeight;

  // Build the line path
  const linePath = data
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(point.close)}`)
    .join(' ');

  // Build the area path
  const areaPath = `${linePath} L ${scaleX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => minY + (yRange * i) / (yTickCount - 1));

  return (
    <View className={className}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={lineColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {showGrid && yTicks.map((tick, i) => (
          <Line
            key={i}
            x1={padding.left}
            y1={scaleY(tick)}
            x2={width - padding.right}
            y2={scaleY(tick)}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <SvgText
            key={i}
            x={padding.left - 8}
            y={scaleY(tick) + 4}
            fontSize={10}
            fill="#64748B"
            textAnchor="end"
          >
            ${tick.toFixed(0)}
          </SvgText>
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGradient)" />

        {/* Price line */}
        <Path
          d={linePath}
          stroke={lineColor}
          strokeWidth={2}
          fill="none"
        />

        {/* Current price dot */}
        <G>
          <Rect
            x={scaleX(data.length - 1) - 4}
            y={scaleY(lastPrice) - 4}
            width={8}
            height={8}
            rx={4}
            fill={lineColor}
          />
        </G>
      </Svg>
    </View>
  );
};
