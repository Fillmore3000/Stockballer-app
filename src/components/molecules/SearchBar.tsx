/**
 * SearchBar Component - Molecule
 * Search input with icon
 */
import React from 'react';
import { View } from 'react-native';
import { Input, InputProps } from '../atoms';
import { Ionicons } from '@expo/vector-icons';

export interface SearchBarProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onClear,
  showClearButton = true,
  placeholder = 'Search athletes...',
  ...inputProps
}) => {
  const showClear = showClearButton && value && value.length > 0;

  return (
    <Input
      value={value}
      placeholder={placeholder}
      leftIcon={
        <Ionicons name="search" size={20} color="#64748B" />
      }
      rightIcon={
        showClear ? (
          <Ionicons name="close-circle" size={20} color="#64748B" />
        ) : undefined
      }
      onRightIconPress={onClear}
      {...inputProps}
    />
  );
};
