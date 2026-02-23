/**
 * AnimatedPrice Component - Atom
 * Animated price display with Reanimated for smooth transitions
 * Demonstrates real-time interactive experience capabilities
 */
import React, { useEffect, useRef } from 'react';
import { View, Text as RNText, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';

export interface AnimatedPriceProps {
  price: number;
  previousPrice?: number;
  size?: 'sm' | 'md' | 'lg';
  showFlash?: boolean;
  currency?: string;
}

const fontSizes = {
  sm: 14,
  md: 18,
  lg: 24,
};

export const AnimatedPrice: React.FC<AnimatedPriceProps> = ({
  price,
  previousPrice,
  size = 'md',
  showFlash = true,
  currency = '$',
}) => {
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(0);
  const prevPriceRef = useRef(previousPrice ?? price);

  const priceDirection = price > prevPriceRef.current ? 'up' : price < prevPriceRef.current ? 'down' : 'neutral';

  useEffect(() => {
    if (previousPrice !== undefined && previousPrice !== price && showFlash) {
      // Trigger animation on price change
      scale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 150 })
      );

      colorProgress.value = withSequence(
        withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.ease) })
      );
    }
    prevPriceRef.current = price;
  }, [price, previousPrice, showFlash, scale, colorProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['transparent', priceDirection === 'up' ? '#22c55e40' : priceDirection === 'down' ? '#ef444440' : 'transparent']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
    };
  });

  const textColor = priceDirection === 'up' ? '#22c55e' : priceDirection === 'down' ? '#ef4444' : '#ffffff';

  const formatPrice = (value: number): string => {
    return value.toFixed(2);
  };

  return (
    <Animated.View style={animatedStyle}>
      <RNText
        style={[
          styles.price,
          {
            fontSize: fontSizes[size],
            color: textColor,
          },
        ]}
      >
        {currency}{formatPrice(price)}
      </RNText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  price: {
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    fontVariant: ['tabular-nums'],
  },
});
