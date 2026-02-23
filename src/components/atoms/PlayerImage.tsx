/**
 * PlayerImage Component - Atom
 * Displays player photo with fallback and loading states
 * Supports animated transitions on load
 */
import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

export interface PlayerImageProps {
  photoUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  borderColor?: string;
  showBorder?: boolean;
}

const sizes = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export const PlayerImage: React.FC<PlayerImageProps> = ({
  photoUrl,
  name,
  size = 'md',
  borderColor = '#0528F3',
  showBorder = true,
}) => {
  const [error, setError] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const dimension = sizes[size];

  const handleLoad = () => {
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    scale.value = withSpring(1, { damping: 12, stiffness: 150 });
  };

  const handleError = () => {
    setError(true);
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 12, stiffness: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Get initials for fallback
  const getInitials = (fullName: string): string => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  // We need to use regular Image for React Native
  if (Platform.OS !== 'web') {
    const { Image } = require('react-native');
    
    if (error || !photoUrl) {
      return (
        <View
          style={[
            styles.fallback,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              borderWidth: showBorder ? 2 : 0,
              borderColor,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.initials,
              { fontSize: dimension * 0.35 },
            ]}
          >
            {initials}
          </Animated.Text>
        </View>
      );
    }

    return (
      <Animated.View
        style={[
          animatedStyle,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            overflow: 'hidden',
            borderWidth: showBorder ? 2 : 0,
            borderColor,
          },
        ]}
      >
        <Image
          source={{ uri: photoUrl }}
          style={{ width: dimension, height: dimension }}
          onLoad={handleLoad}
          onError={handleError}
        />
      </Animated.View>
    );
  }

  // Web version - simplified without opacity animation to ensure images display
  if (error || !photoUrl) {
    return (
      <div
        style={{
          width: dimension,
          height: dimension,
          borderRadius: '50%',
          backgroundColor: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: showBorder ? `2px solid ${borderColor}` : 'none',
        }}
      >
        <span
          style={{
            color: '#9ca3af',
            fontSize: dimension * 0.35,
            fontWeight: 'bold',
          }}
        >
          {initials}
        </span>
      </div>
    );
  }

  // Web: render image directly without opacity animation that can hide it
  return (
    <div
      style={{
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        overflow: 'hidden',
        border: showBorder ? `2px solid ${borderColor}` : 'none',
        backgroundColor: '#1f2937',
      }}
    >
      <img
        src={photoUrl}
        alt={name}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#9ca3af',
    fontWeight: 'bold',
  },
});
