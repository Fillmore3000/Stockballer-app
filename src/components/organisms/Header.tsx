/**
 * Header Component - Organism
 * Screen header with navigation
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../atoms';

export interface HeaderProps {
  title?: string;
  showBack?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  leftAction,
  rightAction,
  transparent = false,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <SafeAreaView 
      edges={['top']} 
      className={transparent ? '' : 'bg-background-primary'}
    >
      <View className="flex-row items-center justify-between h-14 px-4">
        <View className="flex-row items-center flex-1">
          {showBack && (
            <Pressable
              onPress={handleBack}
              className="mr-3 p-1"
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
            </Pressable>
          )}
          {leftAction}
          {title && (
            <Text variant="h4" className="flex-1">
              {title}
            </Text>
          )}
        </View>
        
        {rightAction && (
          <View className="ml-3">
            {rightAction}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};
