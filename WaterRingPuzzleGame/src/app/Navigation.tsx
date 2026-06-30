/**
 * Navigation.tsx
 *
 * Registers all 18 screen routes using React Navigation 6.
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
 *   ├── PauseScreen
 *   ├── VictoryScreen
 *   ├── DefeatScreen
 *   ├── ContinueScreen
 *   ├── AchievementsScreen
 *   ├── InventoryScreen
 *   ├── CollectionScreen
 *   ├── SettingsScreen
 *   ├── DailyChallengeScreen
 *   ├── StatisticsScreen
 *   └── ReplayViewerScreen
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
  Game: undefined;
  Pause: undefined;
  Victory: undefined;
  Defeat: undefined;
  Continue: undefined;
  Achievements: undefined;
  Inventory: undefined;
  Collection: undefined;
  Settings: undefined;
  DailyChallenge: undefined;
  Statistics: undefined;
  ReplayViewer: undefined;
};

// ---------------------------------------------------------------------------
// Navigators
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

/** Bottom tab navigator housing the four primary destinations. */
function MainTabs(): JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Store" component={StoreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/** Root stack navigator — wraps the entire navigation tree. */
export default function Navigation(): JSX.Element {
  return (
    <NavigationContainer>
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
        <Stack.Screen name="Pause" component={PauseScreen} />
        <Stack.Screen name="Victory" component={VictoryScreen} />
        <Stack.Screen name="Defeat" component={DefeatScreen} />
        <Stack.Screen name="Continue" component={ContinueScreen} />

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
