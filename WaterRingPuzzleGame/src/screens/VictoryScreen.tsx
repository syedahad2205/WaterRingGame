/**
 * VictoryScreen.tsx
 *
 * Modal screen shown when the player wins a challenge.
 *
 * Animation sequence (Requirement 34.3, 37.1) -- total >= 4 seconds:
 *   Step 1 (0ms):       Camera-like zoom -- panel scales from 0.85 to 1 over 400ms ease-out
 *   Step 2 (300ms):     Screen flash -- brief white overlay flash (200ms)
 *   Step 3 (500ms):     Modal visible; stars flip one-by-one (250ms each, 100ms gap)
 *   Step 4 (after stars): Coins arc label appears with trail animation (600-800ms)
 *   Step 5 (after coins): XP bar shimmer fill (600ms)
 *   Total: ~4.2 seconds minimum
 *
 * Reduced-motion: skip steps 1-2; fade in modal; no star flip animation.
 *
 * Requirements: 34.3, 37.1
 * Task: 8.3.3
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { DS } from '@/constants/designSystem';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Icon } from '@/components/icons/GameIcons';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { triggerHaptic } from '@/constants/hapticPatterns';
import { audioEngine } from '@/features/audio/AudioEngine';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ---------------------------------------------------------------------------
// Timing constants (exported for unit tests -- Task 8.3.3a)
// ---------------------------------------------------------------------------

export const VICTORY_TIMING = {
  panelZoomMs: 400,
  flashMs: 200,
  starFlipMs: 600,
  starGapMs: 300,
  coinsArcMs: 800,
  xpFillMs: 1200,
  /** Minimum total sequence duration in ms */
  minimumTotalMs: 4000,
} as const;

/** Compute star animation delays in order */
export function starAnimationDelays(starCount: 1 | 2 | 3): number[] {
  const base = VICTORY_TIMING.panelZoomMs + VICTORY_TIMING.flashMs;
  return Array.from({ length: starCount }, (_, i) =>
    base + i * (VICTORY_TIMING.starFlipMs + VICTORY_TIMING.starGapMs),
  );
}

// ---------------------------------------------------------------------------
// Sub-component: animated star
// ---------------------------------------------------------------------------

interface StarProps {
  active: boolean;
  delay: number;
  reducedMotion: boolean;
}

function VictoryStar({ active, delay, reducedMotion }: StarProps): React.JSX.Element {
  const rotateY = useSharedValue(reducedMotion ? 0 : 90);
  const opacity = useSharedValue(reducedMotion ? (active ? 1 : 0.3) : (active ? 0 : 0.3));

  useEffect((): void => {
    if (!active) {
      return;
    }
    // Fire haptic + SFX when star animates in
    const hapticTimeout = setTimeout(() => {
      triggerHaptic('reward');
      try {
        audioEngine.getSFXManager().play('achievement_unlock');
      } catch {
        // SFX failure is non-fatal
      }
    }, delay);
    if (reducedMotion) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
      return () => clearTimeout(hapticTimeout);
    }
    // Flip from 90deg (edge-on) to 0deg (face-on) over 250ms -- "flip into view"
    opacity.value = withDelay(delay, withTiming(1, { duration: 50 }));
    rotateY.value = withDelay(delay, withTiming(0, {
      duration: VICTORY_TIMING.starFlipMs,
      easing: Easing.out(Easing.back(1.3)),
    }));
    return () => clearTimeout(hapticTimeout);
  }, [active, delay, opacity, rotateY, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ perspective: 400 }, { rotateY: `${rotateY.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.starIcon, animStyle]} accessible={false}>
      <Icon
        name={active ? 'star-filled' : 'star-empty'}
        size={44}
        color={DS.colors.accent}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VictoryScreenProps {
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      stars?: 1 | 2 | 3;
      coinsEarned?: number;
      xpEarned?: number;
      challengeNumber?: number;
    };
  };
}

// ---------------------------------------------------------------------------
// VictoryScreen
// ---------------------------------------------------------------------------

/**
 * VictoryScreen -- animated victory result modal.
 *
 * Requirements: 34.3, 37.1
 * Task: 8.3.3
 */
// eslint-disable-next-line max-lines-per-function
export default function VictoryScreen({ navigation, route }: VictoryScreenProps): React.JSX.Element {
  const stars = route?.params?.stars ?? 1;
  const coinsEarned = route?.params?.coinsEarned ?? 0;
  const xpEarned = route?.params?.xpEarned ?? 100;
  const challengeNumber = route?.params?.challengeNumber ?? 1;

  const reducedMotion = useReducedMotion();
  const hasStartedSequence = useRef(false);
  const coinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // XP progress state driven by animation timing
  const [xpProgress, setXpProgress] = useState(0);

  // -- Shared values --------------------------------------------------------
  const panelScale = useSharedValue(0.85);
  const panelOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const coinsOpacity = useSharedValue(0);
  const xpBarWidth = useSharedValue(0);

  // Bridge xpBarWidth shared value to React state for ProgressBar
  useAnimatedReaction(
    () => xpBarWidth.value,
    (currentValue) => {
      runOnJS(setXpProgress)(currentValue);
    },
  );

  useEffect((): (() => void) => {
    if (!hasStartedSequence.current) {
      hasStartedSequence.current = true;
      startSequence(reducedMotion);
    }
    return (): void => {
      // Clean up pending timeouts on unmount to prevent memory leaks
      if (coinTimeoutRef.current) {
        clearTimeout(coinTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSequence = useCallback((reducedMotion: boolean): void => {
    if (reducedMotion) {
      // Reduced-motion: skip zoom and flash, just fade in
      panelOpacity.value = withTiming(1, { duration: 300 });
      panelScale.value = withTiming(1, { duration: 300 });
      coinsOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
      xpBarWidth.value = withDelay(1200, withTiming(1, { duration: VICTORY_TIMING.xpFillMs }));
      return;
    }

    // Step 1: Panel zoom in (400ms)
    panelScale.value = withTiming(1, {
      duration: VICTORY_TIMING.panelZoomMs,
      easing: Easing.out(Easing.ease),
    });
    panelOpacity.value = withTiming(1, { duration: 200 });

    // Step 2: Screen flash (at 300ms, lasts 200ms)
    flashOpacity.value = withDelay(
      300,
      withSequence(
        withTiming(0.6, { duration: 60, easing: Easing.linear }),
        withTiming(0, { duration: VICTORY_TIMING.flashMs - 60, easing: Easing.out(Easing.ease) }),
      ),
    );

    // Step 3+4: Stars are handled individually in VictoryStar components

    // Step 4: Coins arc label (after last star)
    const coinsDelay = VICTORY_TIMING.panelZoomMs + VICTORY_TIMING.flashMs +
      stars * (VICTORY_TIMING.starFlipMs + VICTORY_TIMING.starGapMs);
    coinsOpacity.value = withDelay(coinsDelay, withTiming(1, { duration: 400 }));

    // Coin SFX + haptic when coins label appears
    coinTimeoutRef.current = setTimeout(() => {
      triggerHaptic('coinEarned');
      try {
        audioEngine.getSFXManager().play('coin_earn');
      } catch {
        // SFX failure is non-fatal
      }
    }, coinsDelay);

    // Step 5: XP bar fill (after coins arc)
    xpBarWidth.value = withDelay(
      coinsDelay + VICTORY_TIMING.coinsArcMs,
      withTiming(1, { duration: VICTORY_TIMING.xpFillMs, easing: Easing.out(Easing.ease) }),
    );
  }, [panelScale, panelOpacity, flashOpacity, coinsOpacity, xpBarWidth, stars]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ scale: panelScale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const coinsStyle = useAnimatedStyle(() => ({
    opacity: coinsOpacity.value,
    transform: [{ translateY: coinsOpacity.value * 0 - (1 - coinsOpacity.value) * 10 }],
  }));

  const starDelays = starAnimationDelays(stars);

  return (
    <View style={styles.backdrop}>
      {/* White flash overlay (Step 2) */}
      <Animated.View
        style={[styles.flashOverlay, flashStyle]}
        pointerEvents="none"
        accessible={false}
      />

      <Animated.View
        style={[styles.panelWrapper, panelStyle]}
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel={`Victory! ${stars} star${stars !== 1 ? 's' : ''} earned. ${coinsEarned} coins earned.`}
        accessibilityLiveRegion="polite"
      >
        <GlassCard
          variant="frosted"
          glow={DS.colors.accent}
          noAnimation
          style={styles.panel}
        >
          <View style={styles.content}>
            {/* Header */}
            <Icon
              name="trophy"
              size={56}
              color={DS.colors.accent}
              accessibilityLabel="Trophy"
            />
            <Text style={styles.title} accessibilityRole="header">
              Challenge Complete!
            </Text>

            {/* Stars row (Step 3) */}
            <View style={styles.starsRow} accessibilityElementsHidden={true}>
              {([1, 2, 3] as const).map((s) => (
                <VictoryStar
                  key={s}
                  active={s <= stars}
                  delay={starDelays[s - 1] ?? 0}
                  reducedMotion={reducedMotion}
                />
              ))}
            </View>

            {/* Coins arc (Step 4) */}
            <Animated.View style={[styles.coinsRow, coinsStyle]}>
              <Icon
                name="coin"
                size={28}
                color={DS.colors.accent}
                accessibilityLabel="Coins"
              />
              <AnimatedNumber
                value={coinsEarned}
                prefix="+"
                style={styles.coinsLabel}
                accessibilityLabel={`${coinsEarned} coins earned`}
              />
            </Animated.View>

            {/* XP bar (Step 5) */}
            <View style={styles.xpSection}>
              <ProgressBar
                value={xpProgress}
                size="lg"
                color={DS.colors.secondary}
                showLabel
                label={`+${xpEarned} XP`}
                style={styles.xpBar}
                accessibilityLabel={`${xpEarned} XP earned`}
              />
            </View>

            {/* CTAs */}
            <View style={styles.buttonRow}>
              <GlassButton
                label="Next Challenge"
                variant="primary"
                iconRight="play"
                size="lg"
                onPress={(): void => navigation?.navigate('Game', { challengeNumber: challengeNumber + 1 })}
                accessibilityLabel="Play next challenge"
                style={styles.buttonFlex}
              />
              <GlassButton
                label="Home"
                variant="secondary"
                iconLeft="home"
                size="lg"
                onPress={(): void => navigation?.navigate('MainTabs')}
                accessibilityLabel="Go to Home"
                style={styles.buttonFlex}
              />
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
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DS.colors.text.primary,
    zIndex: DS.zIndex.modal,
  },
  panelWrapper: {
    width: 320,
  },
  panel: {
    width: '100%',
  },
  content: {
    padding: DS.spacing.xxl,
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  title: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title2,
    fontWeight: DS.typography.weight.heavy,
    letterSpacing: DS.typography.letterSpacing.title2,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: DS.spacing.sm,
    marginVertical: DS.spacing.sm,
  },
  starIcon: {
    // Container for the Icon component inside VictoryStar
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  coinsLabel: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.heavy,
  },
  xpSection: {
    width: '100%',
    gap: DS.spacing.xs,
  },
  xpBar: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: DS.spacing.md,
    marginTop: DS.spacing.sm,
    width: '100%',
  },
  buttonFlex: {
    flex: 1,
  },
});
