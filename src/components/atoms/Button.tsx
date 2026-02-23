/**
 * Button Component - Atom
 * Primary interactive button with variants
 */
import React from 'react';
import { Pressable, PressableProps, ActivityIndicator } from 'react-native';
import { Text } from './Text';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  label: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary-500 active:bg-primary-600',
    text: 'text-white font-semibold',
  },
  secondary: {
    container: 'bg-surface-200 active:bg-surface-300',
    text: 'text-white font-medium',
  },
  outline: {
    container: 'border border-primary-500 bg-transparent active:bg-primary-500/10',
    text: 'text-primary-500 font-medium',
  },
  ghost: {
    container: 'bg-transparent active:bg-surface-100',
    text: 'text-slate-400 font-medium',
  },
  danger: {
    container: 'bg-red-600 active:bg-red-700',
    text: 'text-white font-semibold',
  },
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, { container: string; text: string }> = {
  sm: {
    container: 'px-3 py-2 rounded-md',
    text: 'text-xs',
  },
  md: {
    container: 'px-4 py-3 rounded-lg',
    text: 'text-sm',
  },
  lg: {
    container: 'px-6 py-4 rounded-xl',
    text: 'text-base',
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  label,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const variantStyle = variantClasses[variant];
  const sizeStyle = sizeClasses[size];
  
  const containerClasses = `
    flex-row items-center justify-center
    ${variantStyle.container}
    ${sizeStyle.container}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50' : ''}
    ${className}
  `.trim();

  const textClasses = `${variantStyle.text} ${sizeStyle.text}`;

  return (
    <Pressable
      className={containerClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'ghost' ? '#0528F3' : '#FFFFFF'} 
        />
      ) : (
        <>
          {leftIcon}
          <Text className={`${textClasses} ${leftIcon ? 'ml-2' : ''} ${rightIcon ? 'mr-2' : ''}`}>
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
};
