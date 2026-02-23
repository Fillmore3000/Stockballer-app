/**
 * Avatar Component - Atom
 * Circular image for athlete/user profiles
 */
import React from 'react';
import { Image, View, ImageProps } from 'react-native';
import { Text } from './Text';

export interface AvatarProps {
  source?: ImageProps['source'];
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, { container: string; text: string; imageSize: number }> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', imageSize: 24 },
  sm: { container: 'w-8 h-8', text: 'text-sm', imageSize: 32 },
  md: { container: 'w-12 h-12', text: 'text-base', imageSize: 48 },
  lg: { container: 'w-16 h-16', text: 'text-xl', imageSize: 64 },
  xl: { container: 'w-24 h-24', text: 'text-3xl', imageSize: 96 },
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  className = '',
}) => {
  const sizeStyle = sizeClasses[size];
  
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const containerClasses = `
    ${sizeStyle.container}
    rounded-full overflow-hidden
    bg-primary-600 items-center justify-center
    ${className}
  `.trim();

  if (source) {
    return (
      <View className={containerClasses}>
        <Image
          source={source}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View className={containerClasses}>
      <Text className={`${sizeStyle.text} font-bold text-white`}>
        {name ? getInitials(name) : '?'}
      </Text>
    </View>
  );
};
