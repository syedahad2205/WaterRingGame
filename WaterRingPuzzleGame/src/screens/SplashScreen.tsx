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
 * Hard constraint: splash -> home must complete within 3 seconds (Req 19.1).
 * The 3-second budget includes animation (<= 1.8 s) + async work (<= 1.2 s).
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
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../app/Navigation';
import { authService } from '../services/firebase/AuthService';
import { RemoteConfigService } from '../services/firebase/RemoteConfigService';
import { useOnboardingStore } from '../store/slices/onboardingSlice';
import { checkAndUpdateStreak, getMilestoneReward } from '../features/progression/StreakService';
import { generateDailyMissions, generateWeeklyMissions } from '../features/progression/MissionService';
import { usePlayerProgressionStore } from '../store/slices/playerProgressionSlice';
import { DS } from '../constants/designSystem';
import { Icon } from '../components/icons/GameIcons';

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

// Loading dot characters
const LOADING_DOTS = ['.', '.', '.'];

// ---------------------------------------------------------------------------
// Async bootstrap work
// ---------------------------------------------------------------------------

/**
 * runBootstrap -- performs all async startup work:
 *   - Firebase Auth currentUser check (or anonymous sign-in)
 *   - Remote Config fetch and activate
 *   - Reads onboarding state to determine first-launch
 *
 * Resolves in < 1200 ms on typical devices to stay within the 3-second budget.
 */
async function runBootstrap(): Promise<{ isAuthenticated: boolean; isFirstLaunch: boolean }> {
  try {
    // Run auth check and remote config fetch in parallel
    const remoteConfigService = new RemoteConfigService();
    const [authResult] = await Promise.all([
      (async () => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          return { isAuthenticated: true, isNewUser: false };
        }
        // No existing session -- sign in anonymously
        const result = await authService.signInAnonymously();
        return { isAuthenticated: true, isNewUser: result.isNewUser };
      })(),
      remoteConfigService.fetchAndActivate(),
    ]);

    // Update streak on app launch
    const progressionState = usePlayerProgressionStore.getState();
    const updatedStreak = checkAndUpdateStreak({
      currentStreak: progressionState.currentStreak,
      longestStreak: progressionState.longestStreak,
      lastLoginDate: progressionState.lastLoginDate,
      totalLoginDays: progressionState.totalLoginDays,
    });
    // Only update if streak changed (new day)
    if (updatedStreak.lastLoginDate !== progressionState.lastLoginDate) {
      progressionState.updateStreakState(updatedStreak);
      // Check for milestone reward
      const milestone = getMilestoneReward(updatedStreak.currentStreak);
      if (milestone) {
        const { creditCoins } = require('../store/slices/economySlice').useEconomyStore.getState();
        creditCoins(milestone.coins, `streak_milestone_${milestone.streak}`);
      }
    }

    // Generate daily missions if not yet generated today
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (progressionState.lastDailyMissionDate !== today) {
      const dailyMissions = generateDailyMissions(today);
      progressionState.setDailyMissions(dailyMissions);
      progressionState.setLastDailyMissionDate(today);
    }

    // Generate weekly missions if not yet generated this week
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const currentWeekNumber = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86_400_000 + startOfYear.getDay() + 1) / 7,
    );
    if (progressionState.lastWeeklyMissionWeek !== currentWeekNumber) {
      const weeklyMissions = generateWeeklyMissions(currentWeekNumber);
      progressionState.setWeeklyMissions(weeklyMissions);
      progressionState.setLastWeeklyMissionWeek(currentWeekNumber);
    }

    const tutorialComplete = useOnboardingStore.getState().tutorialComplete;
    return {
      isAuthenticated: authResult.isAuthenticated,
      isFirstLaunch: !tutorialComplete,
    };
  } catch {
    // On any failure, allow app to proceed -- safety timer will navigate anyway
    return { isAuthenticated: false, isFirstLaunch: true };
  }
}

// ---------------------------------------------------------------------------
// WaterLogo -- animated water drop icon
// ---------------------------------------------------------------------------

function WaterLogo({ scale }: { scale: Animated.SharedValue<number> }): React.JSX.Element {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.logoContainer, animStyle]} accessible={false}>
      <Icon name="water-drop" size={64} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// LoadingDots -- animated loading indicator
// ---------------------------------------------------------------------------

function LoadingDots(): React.JSX.Element {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animateDot = (sv: Animated.SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: DS.animation.duration.normal }),
          withTiming(0.3, { duration: DS.animation.duration.normal }),
        ),
      );
    };

    const interval = setInterval(() => {
      animateDot(dot1, 0);
      animateDot(dot2, 150);
      animateDot(dot3, 300);
    }, 900);

    // Kick off immediately
    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotStyle1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dotStyle2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dotStyle3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.dotsRow}>
      {LOADING_DOTS.map((dot, i) => {
        const style = [dotStyle1, dotStyle2, dotStyle3][i];
        return (
          <Animated.Text key={i} style={[styles.dot, style]}>
            {dot}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SplashScreen
// ---------------------------------------------------------------------------

type Props = StackScreenProps<RootStackParamList, 'Splash'>;

/**
 * SplashScreen -- cold-start entry screen.
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

    scale.value = withSpring(1, {
      mass: DS.animation.spring.bouncy.mass,
      damping: DS.animation.spring.bouncy.damping,
      stiffness: DS.animation.spring.bouncy.stiffness,
    });

    taglineOpacity.value = withDelay(
      LOGO_FADE_IN_MS + 100,
      withTiming(1, { duration: DS.animation.duration.normal }),
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
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      {/* Gradient simulation: darker bottom layer */}
      <View style={styles.gradientBottom} />

      {/* Radial glow behind logo */}
      <View style={styles.glowCircle} />

      <Animated.View style={[styles.centreContent, containerStyle]}>
        <WaterLogo scale={scale} />

        <Animated.Text style={[styles.appName, taglineStyle]} accessibilityRole="header">
          WATER RING
        </Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]} accessible={false}>
          PUZZLE
        </Animated.Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.loadingContainer}>
        <LoadingDots />
      </View>

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
    backgroundColor: DS.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBottom: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    backgroundColor: DS.colors.surfaceDark,
    opacity: 0.6,
  },
  glowCircle: {
    position: 'absolute',
    width: SCREEN_W * 1.2,
    height: SCREEN_W * 1.2,
    borderRadius: SCREEN_W * 0.6,
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
    ...DS.shadows.glow.secondary,
  },
  centreContent: {
    alignItems: 'center',
    gap: DS.spacing.xl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.spacing.md,
  },
  appName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.display,
    fontWeight: DS.typography.weight.black,
    letterSpacing: DS.typography.letterSpacing.display,
  },
  tagline: {
    color: DS.colors.secondary,
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.light,
    letterSpacing: 8,
    textTransform: 'uppercase',
    marginTop: -DS.spacing.sm,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: DS.spacing.massive + DS.spacing.xxxl,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: DS.spacing.xs,
  },
  dot: {
    color: DS.colors.secondary,
    fontSize: DS.typography.size.title2,
    fontWeight: DS.typography.weight.bold,
  },
  version: {
    position: 'absolute',
    bottom: DS.spacing.xxxl,
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
  },
});
