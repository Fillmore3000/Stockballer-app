/**
 * Badge Component - Atom
 * Small status indicator/tag
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  success: { bg: 'bg-success/20', text: 'text-success-light' },
  warning: { bg: 'bg-warning/20', text: 'text-warning-light' },
  danger: { bg: 'bg-danger/20', text: 'text-danger-light' },
  neutral: { bg: 'bg-surface-300/50', text: 'text-text-secondary' },
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, { container: string; text: string }> = {
  sm: { container: 'px-2 py-0.5 rounded', text: 'text-xs' },
  md: { container: 'px-3 py-1 rounded-md', text: 'text-sm' },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) => {
  const variantStyle = variantClasses[variant];
  const sizeStyle = sizeClasses[size];

  return (
    <View className={`${variantStyle.bg} ${sizeStyle.container} ${className}`}>
      <Text className={`${variantStyle.text} ${sizeStyle.text} font-medium`}>
        {label}
      </Text>
    </View>
  );
};

