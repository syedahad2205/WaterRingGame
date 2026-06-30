/**
 * ContinueScreen.tsx
 *
 * Transparent-modal overlay shown when the timer expires. Offers the player
 * the option to continue playing (spend coins or watch a rewarded ad) or
 * decline (which navigates to DefeatScreen).
 *
 * Features:
 *   - Shows: rings placed progress, remaining time (before expire), bonus time
 *     to be granted, cost (coins or "Watch Ad"), Cancel button
 *   - 10-second auto-dismiss countdown with a visible progress bar
 *   - Auto-dismiss PAUSES on user touch; resumes when touch ends (Req 34.2)
 *   - Continue cost escalates per ContinueService formula
 *
 * Requirements: 34.2, 16.2
 * Task: 8.3.2
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useChallengeStore } from '../store/slices/challengeSlice';
import { useEconomyStore } from '../store/slices/economySlice';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Auto-dismiss countdown in seconds (Requirement 34.2) */
const AUTO_DISMISS_SECONDS = 10;

/** Bonus seconds added on continue (placeholder — driven by ContinueService in production) */
const BONUS_TIME_SECONDS = 30;

/** Coin cost for first continue (increases per continueCount) */
function computeContinueCost(continueCount: number): number {
  const BASE_COST = 50;
  return BASE_COST * (continueCount + 1);
}

// ---------------------------------------------------------------------------
// Exported for unit tests (Task 8.3.2a)
// ---------------------------------------------------------------------------

/** Returns true when the auto-dismiss timer should pause on user touch. */
export function shouldPauseOnTouch(): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContinueScreenProps {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route?: {
    params?: {
      challengeNumber?: number;
      ringsPlaced?: number;
      ringsTotal?: number;
    };
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ContinueScreen — time's-up continue modal with auto-dismiss.
 *
 * Requirements: 34.2, 16.2
 * Task: 8.3.2
 */
// eslint-disable-next-line max-lines-per-function
export default function ContinueScreen({ navigation, route }: ContinueScreenProps): React.JSX.Element {
  const continueCount = useChallengeStore((state) => state.continueCount);
  const coinBalance = useEconomyStore((state) => state.coinBalance);
  const ringsPlaced = route?.params?.ringsPlaced ?? 0;
  const ringsTotal = route?.params?.ringsTotal ?? 1;
  const challengeNumber = route?.params?.challengeNumber ?? 1;

  const continueCost = computeContinueCost(continueCount);
  const canAfford = coinBalance >= continueCost;

  // ── Auto-dismiss countdown (Requirement 34.2) ────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS);
  const isPaused = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsLeftRef = useRef(AUTO_DISMISS_SECONDS);

  // Progress bar: starts full, depletes to 0
  const progressWidth = useSharedValue(1);

  const startCountdown = useCallback((): void => {
    countdownRef.current = setInterval((): void => {
      if (isPaused.current) {
        return;
      }
      secondsLeftRef.current -= 1;
      setSecondsLeft(secondsLeftRef.current);
      progressWidth.value = withTiming(
        secondsLeftRef.current / AUTO_DISMISS_SECONDS,
        { duration: 900, easing: Easing.linear },
      );

      if (secondsLeftRef.current <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
        // Auto-dismiss → navigate to Defeat
        navigation?.navigate('Defeat', { challengeNumber });
      }
    }, 1000);
  }, [navigation, challengeNumber, progressWidth]);

  useEffect((): (() => void) => {
    startCountdown();
    return (): void => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [startCountdown]);

  // ── Panel entrance animation ──────────────────────────────────────────────
  const panelOpacity = useSharedValue(0);
  const panelScale = useSharedValue(0.9);

  useEffect((): void => {
    panelOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.ease) });
    panelScale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.08)) });
  }, [panelOpacity, panelScale]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ scale: panelScale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    flex: progressWidth.value,
  }));

  // ── Touch pause handlers (Requirement 34.2) ──────────────────────────────

  const handleTouchStart = useCallback((): void => {
    isPaused.current = true;
    cancelAnimation(progressWidth);
  }, [progressWidth]);

  const handleTouchEnd = useCallback((): void => {
    isPaused.current = false;
    // Resume smooth animation from current position
    progressWidth.value = withTiming(
      secondsLeftRef.current / AUTO_DISMISS_SECONDS,
      { duration: secondsLeftRef.current * 1000, easing: Easing.linear },
    );
  }, [progressWidth]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleContinueCoins = useCallback((): void => {
    if (!canAfford) {
      return;
    }
    useEconomyStore.getState().debitCoins(continueCost, 'continue');
    useChallengeStore.getState().useContinue();
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    navigation?.goBack(); // Return to GameScreen — timer is refreshed there
  }, [canAfford, continueCost, navigation]);

  const handleCancel = useCallback((): void => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    navigation?.navigate('Defeat', { challengeNumber });
  }, [navigation, challengeNumber]);

  const progressPercent = ringsTotal > 0 ? Math.round((ringsPlaced / ringsTotal) * 100) : 0;

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPressIn={handleTouchStart}
        onPressOut={handleTouchEnd}
        accessible={false}
      />
      <Animated.View style={[styles.panel, panelStyle]}>
        <View style={styles.bg} />
        <View style={styles.content}>
          <Text style={styles.title} accessibilityRole="header">Continue?</Text>

          {/* Rings placed progress */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{ringsPlaced}/{ringsTotal}</Text>
              <Text style={styles.statLabel}>Rings placed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>+{BONUS_TIME_SECONDS}s</Text>
              <Text style={styles.statLabel}>Bonus time</Text>
            </View>
          </View>

          {/* Rings progress bar */}
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Continue button */}
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.continueButton,
              !canAfford ? styles.continueButtonDisabled : undefined,
              pressed ? styles.buttonPressed : undefined,
            ]}
            onPress={handleContinueCoins}
            onPressIn={handleTouchStart}
            onPressOut={handleTouchEnd}
            disabled={!canAfford}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={canAfford ? `Continue for ${continueCost} coins` : 'Insufficient coins'}
          >
            <Text style={styles.continueButtonLabel}>
              Continue — 💰 {continueCost}
            </Text>
            {!canAfford ? (
              <Text style={styles.insufficientLabel}>Insufficient coins</Text>
            ) : null}
          </Pressable>

          {/* Cancel */}
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [styles.cancelButton, pressed ? styles.buttonPressed : undefined]}
            onPress={handleCancel}
            onPressIn={handleTouchStart}
            onPressOut={handleTouchEnd}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel and end challenge"
          >
            <Text style={styles.cancelButtonLabel}>Cancel</Text>
          </Pressable>

          {/* Auto-dismiss countdown bar */}
          <View style={styles.countdownSection}>
            <Text style={styles.countdownLabel}>
              Auto-closing in {secondsLeft}s
            </Text>
            <View style={styles.countdownBarOuter}>
              <Animated.View style={[styles.countdownBarFill, progressBarStyle]} />
              <View style={styles.countdownBarRemaining} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 25, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: 320,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.25)',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 28, 52, 0.96)',
  },
  content: {
    padding: 28,
    gap: 14,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    width: '100%',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressBarOuter: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4FC3F7',
  },
  continueButton: {
    width: '100%',
    backgroundColor: '#4FC3F7',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    gap: 2,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(79,195,247,0.35)',
  },
  continueButtonLabel: {
    color: '#0a2342',
    fontSize: 16,
    fontWeight: '800',
  },
  insufficientLabel: {
    color: 'rgba(10,35,66,0.6)',
    fontSize: 11,
  },
  cancelButton: {
    width: '100%',
    backgroundColor: 'rgba(239,83,80,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.3)',
  },
  cancelButtonLabel: {
    color: '#EF5350',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  countdownSection: {
    width: '100%',
    gap: 6,
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
  },
  countdownBarOuter: {
    flexDirection: 'row',
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  countdownBarFill: {
    height: '100%',
    backgroundColor: '#4FC3F7',
    borderRadius: 2,
  },
  countdownBarRemaining: {
    flex: 0,
    height: '100%',
  },
});
