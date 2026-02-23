/**
 * Card Component - Atom
 * Container with elevated surface styling
 */
import React from 'react';
import { View, ViewProps, Pressable, PressableProps } from 'react-native';

export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: PressableProps['onPress'];
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  elevated: 'bg-surface-100 shadow-md',
  outlined: 'bg-transparent border border-slate-700',
  flat: 'bg-surface-100',
};

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'md',
  onPress,
  className = '',
  children,
  ...props
}) => {
  const classes = `
    rounded-xl overflow-hidden
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${className}
  `.trim();

  if (onPress) {
    return (
      <Pressable 
        className={`${classes} active:opacity-80`}
        onPress={onPress}
        {...(props as PressableProps)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={classes} {...props}>
      {children}
    </View>
  );
};
