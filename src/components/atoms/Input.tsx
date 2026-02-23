/**
 * Input Component - Atom
 * Text input field with variants
 */
import React, { useState } from 'react';
import { TextInput, TextInputProps, View, Pressable } from 'react-native';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerClassName = '',
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerClasses = `
    ${containerClassName}
  `.trim();

  const inputContainerClasses = `
    flex-row items-center
    bg-surface-100 rounded-lg border
    ${error ? 'border-red-500' : isFocused ? 'border-primary-500' : 'border-slate-700'}
  `.trim();

  const inputClasses = `
    flex-1 px-4 py-3 text-white text-sm
    ${leftIcon ? 'pl-2' : ''}
    ${rightIcon ? 'pr-2' : ''}
    ${className}
  `.trim();

  return (
    <View className={containerClasses}>
      {label && (
        <Text variant="label" color="secondary" className="mb-2">
          {label}
        </Text>
      )}
      
      <View className={inputContainerClasses}>
        {leftIcon && (
          <View className="pl-3">
            {leftIcon}
          </View>
        )}
        
        <TextInput
          className={inputClasses}
          placeholderTextColor="#64748B"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && (
          <Pressable onPress={onRightIconPress} className="pr-3">
            {rightIcon}
          </Pressable>
        )}
      </View>
      
      {error && (
        <Text variant="caption" color="danger" className="mt-1">
          {error}
        </Text>
      )}
    </View>
  );
};
