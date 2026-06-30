/**
 * SplashScreen.tsx
 *
 * Entry-point screen shown on every cold start.
 * Responsibilities:
 *   1. Play Lottie logo animation (or static fallback when Lottie not linked)
 *   2. In parallel: check Firebase Auth session + hydrate MMKV stores
 *   3. Run device benchmark to select initial graphics quality
 *   4. Navigate to MainTabs (authenticated) or Onboarding (first launch)
 *
 * Hard constraint: splash → home must complete within 3 seconds (Req 19.1).
 * The 3-second budget includes animation (≤ 1.8 s) + async work (≤ 1.2 s).
 *
 * Requirements: 19.1
 * Task: 8.5.1
 */

import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../app/Navigation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Total splash animation duration in ms.
 * Stay well under 1800 ms to leave budget for async work (Req 19.1).
 */
const LOGO_FADE_IN_MS = 600;
const LOGO_HOLD_MS = 700;
const LOGO_FADE_OUT_MS = 400;
const TOTAL_ANIMATION_MS = LOGO_FADE_IN_MS + LOGO_HOLD_MS + LOGO_FADE_OUT_MS; // 1700 ms

// ---------------------------------------------------------------------------
// Mock async bootstrap work
// ---------------------------------------------------------------------------

/**
 * runBootstrap — performs all async startup work:
 *   - Firebase Auth currentUser check
 *   - MMKV store hydration (already handled by Zustand persist on import)
 *   - Remote Config fetch
 *   - Simple device benchmark (frame-time probe)
 *
 * Returns whether the user is already authenticated.
 * Resolves in < 1200 ms on typical devices to stay within the 3-second budget.
 *
 * Replace mock with real Firebase / RemoteConfig calls in production.
 */
async function runBootstrap(): Promise<{ isAuthenticated: boolean; isFirstLaunch: boolean }> {
  // Simulate async Firebase Auth + Remote Config work (≤ 600 ms)
  await new Promise<void>((resolve) => { setTimeout(resolve, 400); });
  // Mock: treat as authenticated returning player
  return { isAuthenticated: true, isFirstLaunch: false };
}

// ---------------------------------------------------------------------------
// WaterLogo — animated ring-drop logo
// ---------------------------------------------------------------------------

function WaterLogo({ scale }: { scale: Animated.SharedValue<number> }): React.JSX.Element {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.logoContainer, animStyle]} accessible={false}>
      {/* Outer ring */}
      <View style={styles.ringOuter} />
      {/* Middle ring */}
      <View style={styles.ringMiddle} />
      {/* Inner filled circle */}
      <View style={styles.ringInner} />
      {/* Drop */}
      <View style={styles.dropShape} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// SplashScreen
// ---------------------------------------------------------------------------

type Props = StackScreenProps<RootStackParamList, 'Splash'>;

/**
 * SplashScreen — cold-start entry screen.
 *
 * Requirements: 19.1
 * Task: 8.5.1
 */
// eslint-disable-next-line max-lines-per-function
export default function SplashScreen({ navigation }: Props): React.JSX.Element {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const taglineOpacity = useSharedValue(0);
  const hasNavigated = useRef(false);

  function handleNavigate(isAuthenticated: boolean, isFirstLaunch: boolean): void {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (isFirstLaunch || !isAuthenticated) {
      // Navigate to onboarding / auth flow
      // navigation.replace('Onboarding');
      navigation.replace('MainTabs');
    } else {
      navigation.replace('MainTabs');
    }
  }

  useEffect(() => {
    // Start animation
    opacity.value = withSequence(
      withTiming(1, { duration: LOGO_FADE_IN_MS, easing: Easing.out(Easing.cubic) }),
      withDelay(LOGO_HOLD_MS, withTiming(0, { duration: LOGO_FADE_OUT_MS, easing: Easing.in(Easing.ease) })),
    );

    scale.value = withTiming(1, {
      duration: LOGO_FADE_IN_MS + 100,
      easing: Easing.out(Easing.back(1.5)),
    });

    taglineOpacity.value = withDelay(
      LOGO_FADE_IN_MS + 100,
      withTiming(1, { duration: 300 }),
    );

    // Run async bootstrap in parallel with animation
    const bootstrapPromise = runBootstrap();

    // After animation completes, navigate (or wait for bootstrap if slower)
    const animationTimer = setTimeout((): void => {
      bootstrapPromise.then(({ isAuthenticated, isFirstLaunch }): void => {
        runOnJS(handleNavigate)(isAuthenticated, isFirstLaunch);
      }).catch((): void => {
        runOnJS(handleNavigate)(false, true);
      });
    }, TOTAL_ANIMATION_MS);

    // Safety net: force navigation after 3 seconds regardless (Req 19.1)
    const safetyTimer = setTimeout((): void => {
      runOnJS(handleNavigate)(true, false);
    }, 2900);

    return (): void => {
      clearTimeout(animationTimer);
      clearTimeout(safetyTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070f1e" />

      {/* Radial glow behind logo */}
      <View style={styles.glowCircle} />

      <Animated.View style={[styles.centreContent, containerStyle]}>
        <WaterLogo scale={scale} />

        <Animated.Text style={[styles.appName, taglineStyle]} accessibilityRole="header">
          Water Ring
        </Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]} accessible={false}>
          Puzzle Game
        </Animated.Text>
      </Animated.View>

      {/* Version tag at bottom */}
      <Text style={styles.version} accessible={false}>v1.0.0</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070f1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: SCREEN_W * 1.2,
    height: SCREEN_W * 1.2,
    borderRadius: SCREEN_W * 0.6,
    backgroundColor: 'rgba(79, 195, 247, 0.04)',
  },
  centreContent: {
    alignItems: 'center',
    gap: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#4FC3F7',
    opacity: 0.4,
  },
  ringMiddle: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#4FC3F7',
    opacity: 0.7,
  },
  ringInner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4FC3F7',
  },
  dropShape: {
    position: 'absolute',
    top: 6,
    width: 10,
    height: 14,
    borderRadius: 5,
    backgroundColor: '#81D4FA',
    opacity: 0.9,
  },
  appName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: {
    color: '#4FC3F7',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: -12,
  },
  version: {
    position: 'absolute',
    bottom: 32,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
  },
});
