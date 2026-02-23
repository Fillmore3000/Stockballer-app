/**
 * Text Component - Atom
 * Typography primitive with NativeWind styling
 */
import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning';
}

const variantClasses: Record<NonNullable<TextProps['variant']>, string> = {
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-bold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-semibold',
  body: 'text-sm',
  bodySmall: 'text-xs',
  caption: 'text-xs',
  label: 'text-xs font-medium',
};

const colorClasses: Record<NonNullable<TextProps['color']>, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
};

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  className = '',
  children,
  ...props
}) => {
  const classes = `${variantClasses[variant]} ${colorClasses[color]} ${className}`.trim();
  
  return (
    <RNText className={classes} {...props}>
      {children}
    </RNText>
  );
};

