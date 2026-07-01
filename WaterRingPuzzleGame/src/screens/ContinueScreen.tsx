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
import { AdService } from '../features/economy/AdService';
import { DS } from '@/constants/designSystem';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Icon } from '@/components/icons/GameIcons';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { triggerHaptic } from '@/constants/hapticPatterns';

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
  const ringsTotal = Math.max(1, route?.params?.ringsTotal ?? 1);
  const challengeNumber = route?.params?.challengeNumber ?? 1;

  const continueCost = computeContinueCost(continueCount);
  const canAfford = coinBalance >= continueCost;

  const [adLoading, setAdLoading] = useState(false);

  // Track whether we already navigated away to prevent double navigation
  const hasNavigatedRef = useRef(false);

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
        // Auto-dismiss → navigate to Defeat (guard against double navigation)
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigation?.navigate('Defeat', { challengeNumber });
        }
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
    if (!canAfford || hasNavigatedRef.current) {
      return;
    }
    hasNavigatedRef.current = true;
    triggerHaptic('continueGranted');
    useEconomyStore.getState().debitCoins(continueCost, 'continue');
    useChallengeStore.getState().useContinue();
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    navigation?.goBack(); // Return to GameScreen — timer is refreshed there
  }, [canAfford, continueCost, navigation]);

  const handleWatchAd = useCallback(async (): Promise<void> => {
    triggerHaptic('buttonPress');
    const adService = AdService.getInstance();
    if (!adService.canWatchRewardedAd()) return;

    // Pause countdown while ad is showing to prevent race condition
    isPaused.current = true;
    cancelAnimation(progressWidth);
    setAdLoading(true);
    try {
      const reward = await adService.showRewardedAd('coins');
      if (reward && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        useEconomyStore.getState().creditCoins(reward.amount, 'ad_reward');
        if (countdownRef.current) clearInterval(countdownRef.current);
        useChallengeStore.getState().useContinue();
        navigation?.goBack();
      } else {
        // Ad dismissed without reward — resume countdown
        isPaused.current = false;
        progressWidth.value = withTiming(
          secondsLeftRef.current / AUTO_DISMISS_SECONDS,
          { duration: secondsLeftRef.current * 1000, easing: Easing.linear },
        );
      }
    } catch {
      // Ad failed — resume countdown, user can still pay coins
      isPaused.current = false;
      progressWidth.value = withTiming(
        secondsLeftRef.current / AUTO_DISMISS_SECONDS,
        { duration: secondsLeftRef.current * 1000, easing: Easing.linear },
      );
    } finally {
      setAdLoading(false);
    }
  }, [navigation, progressWidth]);

  const handleCancel = useCallback((): void => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    navigation?.navigate('Defeat', { challengeNumber });
  }, [navigation, challengeNumber]);

  return (
    <View style={styles.backdrop}>
      {/* Touch-pause overlay — must remain as absoluteFill behind the card */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPressIn={handleTouchStart}
        onPressOut={handleTouchEnd}
        accessible={false}
      />

      <Animated.View style={[styles.panelWrapper, panelStyle]}>
        <GlassCard
          variant="frosted"
          glow={DS.colors.accent}
          noAnimation
          borderRadius={DS.radius.dialog}
          style={styles.card}
        >
          {/* Title */}
          <Text style={styles.title} accessibilityRole="header">
            Continue?
          </Text>

          {/* Large countdown number */}
          <View style={styles.countdownNumber}>
            <Icon name="timer" size={28} color={secondsLeft <= 3 ? DS.colors.warning : DS.colors.text.secondary} />
            <AnimatedNumber
              value={secondsLeft}
              style={{
                fontSize: DS.typography.size.display,
                fontWeight: DS.typography.weight.black,
                color: secondsLeft <= 3 ? DS.colors.warning : DS.colors.text.primary,
              }}
              animationMode="spring"
              duration={300}
            />
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Icon name="ring" size={20} color={DS.colors.secondary} />
                <Text style={styles.statValue}>{ringsPlaced}/{ringsTotal}</Text>
              </View>
              <Text style={styles.statLabel}>RINGS PLACED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Icon name="bolt" size={20} color={DS.colors.accent} />
                <Text style={styles.statValue}>+{BONUS_TIME_SECONDS}s</Text>
              </View>
              <Text style={styles.statLabel}>BONUS TIME</Text>
            </View>
          </View>

          {/* Rings progress bar */}
          <ProgressBar
            value={ringsPlaced / ringsTotal}
            size="md"
            color={DS.colors.secondary}
            style={styles.ringsProgress}
          />

          {/* Cost display */}
          <View style={styles.costRow}>
            <Icon name="coin" size={24} color={DS.colors.accent} />
            <Text style={styles.costText}>{continueCost}</Text>
          </View>

          {/* Continue button */}
          <GlassButton
            label={`Continue - ${continueCost}`}
            variant="accent"
            iconLeft="coin"
            size="lg"
            disabled={!canAfford}
            onPress={handleContinueCoins}
            style={styles.continueButton}
          />
          {!canAfford && (
            <Text style={styles.insufficientLabel}>Insufficient coins</Text>
          )}

          {/* Watch Ad button */}
          <GlassButton
            label={adLoading ? 'Loading...' : 'Watch Ad - Free'}
            variant="primary"
            iconLeft="play"
            size="lg"
            disabled={adLoading || !AdService.getInstance().canWatchRewardedAd()}
            onPress={handleWatchAd}
            style={styles.fullWidth}
          />

          {/* Give Up button */}
          <GlassButton
            label="Give Up"
            variant="ghost"
            iconLeft="close"
            size="md"
            onPress={handleCancel}
            style={styles.fullWidth}
          />

          {/* Auto-dismiss countdown bar */}
          <View style={styles.countdownSection}>
            <Text style={styles.autoDismissLabel}>
              Auto-closing in {secondsLeft}s
            </Text>
            <View style={styles.countdownBarOuter}>
              <Animated.View style={[styles.countdownBarFill, progressBarStyle]} />
              <View style={styles.countdownBarRemaining} />
            </View>
          </View>
        </GlassCard>
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
    backgroundColor: 'rgba(10,14,26,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: DS.zIndex.modal,
  },
  panelWrapper: {
    width: 340,
  },
  card: {
    padding: DS.spacing.xxl,
    gap: DS.spacing.lg,
    alignItems: 'center',
  },
  title: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title2,
    fontWeight: DS.typography.weight.heavy,
    letterSpacing: DS.typography.letterSpacing.title2,
  },
  countdownNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xl,
    width: '100%',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xs,
  },
  statValue: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.headline,
    fontWeight: DS.typography.weight.bold,
  },
  statLabel: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: DS.typography.letterSpacing.caption2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: DS.colors.glass.border,
  },
  ringsProgress: {
    width: '100%',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  costText: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.bold,
  },
  insufficientLabel: {
    color: DS.colors.warning,
    fontSize: DS.typography.size.caption2,
    marginTop: -DS.spacing.sm,
  },
  countdownSection: {
    width: '100%',
    gap: DS.spacing.xs,
  },
  autoDismissLabel: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
    textAlign: 'center',
  },
  countdownBarOuter: {
    flexDirection: 'row',
    width: '100%',
    height: 4,
    borderRadius: DS.radius.pill,
    overflow: 'hidden',
    backgroundColor: DS.colors.glass.border,
  },
  countdownBarFill: {
    height: '100%',
    backgroundColor: DS.colors.accent,
    borderRadius: DS.radius.pill,
  },
  countdownBarRemaining: {
    flex: 0,
    height: '100%',
  },
  continueButton: {
    width: '100%',
    ...DS.shadows.glow.accent,
  },
  fullWidth: {
    width: '100%',
  },
});
