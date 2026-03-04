/**
 * Tabs Layout - Bottom Tab Navigation
 */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

export default function TabsLayout() {
  const getTabBarIcon = (name: IconName, focusedName: IconName) => {
    return ({ focused, color }: TabBarIconProps) => (
      <Ionicons
        name={focused ? focusedName : name}
        size={24}
        color={color}
      />
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#132D5E',
          borderTopColor: 'rgba(148, 163, 184, 0.1)',
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 70 : 85,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'web' ? 8 : 25,
        },
        tabBarActiveTintColor: '#0528F3',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
          padding: 2,
        },
        tabBarItemStyle: {
          padding: 2,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: getTabBarIcon('home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: getTabBarIcon('trending-up-outline', 'trending-up'),
        }}
      />
      <Tabs.Screen
        name="predict"
        options={{
          title: 'Predict',
          tabBarIcon: getTabBarIcon('flash-outline', 'flash'),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: getTabBarIcon('wallet-outline', 'wallet'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: getTabBarIcon('person-outline', 'person'),
        }}
      />
      {/* Hide discover - merged into market */}
      <Tabs.Screen name="discover" options={{ href: null }} />
    </Tabs>
  );
}

