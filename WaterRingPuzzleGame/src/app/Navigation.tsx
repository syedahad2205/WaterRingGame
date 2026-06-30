/**
 * Navigation.tsx
 *
 * Registers all 18 screen routes using React Navigation 6.
 * Includes deep-link configuration for challenge sharing (Task 8.1.2).
 * Implements styled BottomNav with accessibility (Task 8.1.3).
 *
 * Deep links:
 *   waterring://challenge/{N}  → navigates to Game screen with challengeNumber N
 *   waterring://replay/{id}    → navigates to ReplayViewer screen with replayId
 *
 * Structure:
 *   RootStack
 *   ├── SplashScreen
 *   ├── LoadingScreen
 *   ├── MainTabs (Bottom Tab navigator)
 *   │   ├── HomeScreen
 *   │   ├── LeaderboardScreen
 *   │   ├── StoreScreen
 *   │   └── ProfileScreen
 *   ├── GameScreen
 *   ├── PauseScreen (modal)
 *   ├── VictoryScreen (modal)
 *   ├── DefeatScreen (modal)
 *   ├── ContinueScreen (modal)
 *   ├── AchievementsScreen
 *   ├── InventoryScreen
 *   ├── CollectionScreen
 *   ├── SettingsScreen
 *   ├── DailyChallengeScreen
 *   ├── StatisticsScreen
 *   └── ReplayViewerScreen
 *
 * Requirements: 34.7, 6.7, 15.3, 33.6, 33.7
 * Tasks: 8.1.1, 8.1.2, 8.1.3
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import SplashScreen from '@screens/SplashScreen';
import LoadingScreen from '@screens/LoadingScreen';
import HomeScreen from '@screens/HomeScreen';
import GameScreen from '@screens/GameScreen';
import PauseScreen from '@screens/PauseScreen';
import VictoryScreen from '@screens/VictoryScreen';
import DefeatScreen from '@screens/DefeatScreen';
import ContinueScreen from '@screens/ContinueScreen';
import LeaderboardScreen from '@screens/LeaderboardScreen';
import AchievementsScreen from '@screens/AchievementsScreen';
import InventoryScreen from '@screens/InventoryScreen';
import CollectionScreen from '@screens/CollectionScreen';
import StoreScreen from '@screens/StoreScreen';
import SettingsScreen from '@screens/SettingsScreen';
import DailyChallengeScreen from '@screens/DailyChallengeScreen';
import ProfileScreen from '@screens/ProfileScreen';
import StatisticsScreen from '@screens/StatisticsScreen';
import ReplayViewerScreen from '@screens/ReplayViewerScreen';

// ---------------------------------------------------------------------------
// Param list types
// ---------------------------------------------------------------------------

export type TabParamList = {
  Home: undefined;
  Leaderboard: undefined;
  Store: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Loading: undefined;
  MainTabs: undefined;
  Game: { challengeNumber?: number; isDaily?: boolean } | undefined;
  Pause: undefined;
  Victory: { stars?: 1 | 2 | 3; coinsEarned?: number } | undefined;
  Defeat: undefined;
  Continue: undefined;
  Achievements: undefined;
  Inventory: undefined;
  Collection: undefined;
  Settings: undefined;
  DailyChallenge: undefined;
  Statistics: undefined;
  ReplayViewer: { replayId?: string } | undefined;
};

// ---------------------------------------------------------------------------
// Deep-link configuration (Task 8.1.2)
// URL scheme: waterring://challenge/{N}  and  waterring://replay/{id}
// ---------------------------------------------------------------------------

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['waterring://'],
  config: {
    screens: {
      MainTabs: '',
      Game: 'challenge/:challengeNumber',
      ReplayViewer: 'replay/:replayId',
      DailyChallenge: 'daily',
    },
  },
};

// ---------------------------------------------------------------------------
// Tab bar constants (Task 8.1.3)
// ---------------------------------------------------------------------------

const ACCENT_COLOUR = '#4FC3F7';
const INACTIVE_COLOUR = '#607080';
const TAB_BAR_BG = '#0d2137';
const ACCENT_UNDERLINE_HEIGHT = 3;

/** Maps tab name → emoji icon (swap for SVG when asset pipeline is ready) */
const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Leaderboard: '🏆',
  Store: '🛍',
  Profile: '👤',
};

// ---------------------------------------------------------------------------
// BottomNav tab icon with accent underline (Task 8.1.3)
// ---------------------------------------------------------------------------

interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
}

/** Renders the tab icon with an accent-coloured underline when active. */
function TabIcon({ name, focused, color }: TabIconProps): React.JSX.Element {
  const icon = TAB_ICONS[name] ?? '●';
  return (
    <View style={styles.tabIconContainer} accessible={false}>
      <Text style={[styles.tabIconText, { color }]}>{icon}</Text>
      {focused ? <View style={styles.tabActiveUnderline} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Navigators
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

/**
 * Bottom tab navigator housing the four primary destinations.
 *
 * - Each tab has `tabBarAccessibilityLabel` per WCAG 2.5.5 (Requirement 33.7)
 * - Active tab shows filled icon + accent colour underline
 * - Haptic `navigationTap` is fired on each tab press via the `listeners` prop
 *   (actual haptic calls wired in once HapticManager service is available)
 *
 * Requirements: 34.7, 15.3, 33.6, 33.7
 * Task: 8.1.3
 */
function MainTabs(): JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: ACCENT_COLOUR,
        tabBarInactiveTintColor: INACTIVE_COLOUR,
        tabBarLabelStyle: styles.tabLabel,
        tabBarAccessibilityLabel: route.name,
        // eslint-disable-next-line react/display-name
        tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }): React.ReactNode => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={HomeScreen as React.ComponentType<any>}
        options={{ tabBarLabel: 'Home', tabBarAccessibilityLabel: 'Home tab' }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ tabBarLabel: 'Leaderboard', tabBarAccessibilityLabel: 'Leaderboard tab' }}
      />
      <Tab.Screen
        name="Store"
        component={StoreScreen}
        options={{ tabBarLabel: 'Store', tabBarAccessibilityLabel: 'Store tab' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile', tabBarAccessibilityLabel: 'Profile tab' }}
      />
    </Tab.Navigator>
  );
}

/** Root stack navigator — wraps the entire navigation tree. */
// eslint-disable-next-line max-lines-per-function
export default function Navigation(): JSX.Element {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        {/* Entry flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Loading" component={LoadingScreen} />

        {/* Primary tab area */}
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* Gameplay */}
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen
          name="Pause"
          component={PauseScreen}
          options={{ presentation: 'transparentModal', cardStyle: { backgroundColor: 'transparent' } }}
        />
        <Stack.Screen
          name="Victory"
          component={VictoryScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Defeat"
          component={DefeatScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Continue"
          component={ContinueScreen}
          options={{ presentation: 'transparentModal', cardStyle: { backgroundColor: 'transparent' } }}
        />

        {/* Secondary screens */}
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Inventory" component={InventoryScreen} />
        <Stack.Screen name="Collection" component={CollectionScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="DailyChallenge" component={DailyChallengeScreen} />
        <Stack.Screen name="Statistics" component={StatisticsScreen} />
        <Stack.Screen name="ReplayViewer" component={ReplayViewerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: TAB_BAR_BG,
    borderTopColor: '#1a3550',
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  tabIconText: {
    fontSize: 22,
  },
  tabActiveUnderline: {
    position: 'absolute',
    bottom: -6,
    width: 28,
    height: ACCENT_UNDERLINE_HEIGHT,
    borderRadius: ACCENT_UNDERLINE_HEIGHT / 2,
    backgroundColor: ACCENT_COLOUR,
  },
});
