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
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DS } from '@/constants/designSystem';
import { triggerHaptic } from '@/constants/hapticPatterns';
import {
  defaultStackTransition,
  modalTransition,
  transparentModalTransition,
  scaleFadeTransition,
  crossfadeTransition,
} from '@/constants/screenTransitions';
import { Icon, type IconName } from '../components/icons/GameIcons';

// Screens
import SplashScreen from '@screens/SplashScreen';
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
  MainTabs: undefined;
  Game: { challengeNumber?: number | string; isDaily?: boolean } | undefined;
  Pause: undefined;
  Victory: {
    stars?: 1 | 2 | 3;
    coinsEarned?: number;
    xpEarned?: number;
    challengeNumber?: number;
  } | undefined;
  Defeat: {
    ringsPlaced?: number;
    ringsTotal?: number;
    challengeNumber?: number;
  } | undefined;
  Continue: {
    challengeNumber?: number;
    ringsPlaced?: number;
    ringsTotal?: number;
  } | undefined;
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

const ACCENT_UNDERLINE_HEIGHT = 3;

/** Maps tab route name to the corresponding Icon component name. */
const TAB_ICON_NAMES: Record<string, IconName> = {
  Home: 'home',
  Leaderboard: 'leaderboard',
  Store: 'store',
  Profile: 'profile',
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
  const iconName = TAB_ICON_NAMES[name] ?? 'home';
  return (
    <View style={styles.tabIconContainer} accessible={false}>
      <Icon name={iconName} size={24} color={color} />
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
 * - Haptic `tabSwitch` (navigationTap) is fired on each tab press via screenListeners
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
        tabBarActiveTintColor: DS.colors.primary,
        tabBarInactiveTintColor: DS.colors.text.tertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarAccessibilityLabel: route.name,
        // eslint-disable-next-line react/display-name
        tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }): React.ReactNode => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
      })}
      screenListeners={{
        tabPress: () => {
          triggerHaptic('tabSwitch');
        },
      }}
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
        screenOptions={{
          headerShown: false,
          ...defaultStackTransition,
        }}
      >
        {/* Entry flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        {/* Primary tab area */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ ...crossfadeTransition }}
        />

        {/* Gameplay */}
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{ ...scaleFadeTransition, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Pause"
          component={PauseScreen}
          options={{
            presentation: 'transparentModal',
            gestureEnabled: false,
            cardStyle: { backgroundColor: 'transparent' },
            ...transparentModalTransition,
          }}
        />
        <Stack.Screen
          name="Victory"
          component={VictoryScreen}
          options={{
            presentation: 'modal',
            gestureEnabled: false,
            ...modalTransition,
          }}
        />
        <Stack.Screen
          name="Defeat"
          component={DefeatScreen}
          options={{
            presentation: 'modal',
            gestureEnabled: false,
            ...modalTransition,
          }}
        />
        <Stack.Screen
          name="Continue"
          component={ContinueScreen}
          options={{
            presentation: 'transparentModal',
            gestureEnabled: false,
            cardStyle: { backgroundColor: 'transparent' },
            ...transparentModalTransition,
          }}
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
    backgroundColor: DS.colors.surfaceDark,
    borderTopColor: DS.colors.glass.border,
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
  tabActiveUnderline: {
    position: 'absolute',
    bottom: -6,
    width: 28,
    height: ACCENT_UNDERLINE_HEIGHT,
    borderRadius: ACCENT_UNDERLINE_HEIGHT / 2,
    backgroundColor: DS.colors.primary,
  },
});
