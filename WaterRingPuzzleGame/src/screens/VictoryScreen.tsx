/**
 * VictoryScreen.tsx
 *
 * Modal screen shown when the player wins a challenge.
 *
 * Animation sequence (Requirement 34.3, 37.1) — total ≥ 4 seconds:
 *   Step 1 (0ms):       Camera-like zoom — panel scales from 0.85 to 1 over 400ms ease-out
 *   Step 2 (300ms):     Screen flash — brief white overlay flash (200ms)
 *   Step 3 (500ms):     Modal visible; stars flip one-by-one (250ms each, 100ms gap)
 *   Step 4 (after stars): Coins arc label appears with trail animation (600–800ms)
 *   Step 5 (after coins): XP bar shimmer fill (600ms)
 *   Total: ~4.2 seconds minimum
 *
 * Reduced-motion: skip steps 1–2; fade in modal; no star flip animation.
 *
 * Requirements: 34.3, 37.1
 * Task: 8.3.3
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Timing constants (exported for unit tests — Task 8.3.3a)
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
    if (reducedMotion) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
      return;
    }
    // Flip from 90° (edge-on) to 0° (face-on) over 250ms — "flip into view"
    opacity.value = withDelay(delay, withTiming(1, { duration: 50 }));
    rotateY.value = withDelay(delay, withTiming(0, {
      duration: VICTORY_TIMING.starFlipMs,
      easing: Easing.out(Easing.back(1.3)),
    }));
  }, [active, delay, opacity, rotateY, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ perspective: 400 }, { rotateY: `${rotateY.value}deg` }],
  }));

  return (
    <Animated.Text style={[styles.starIcon, animStyle]} accessible={false}>
      {active ? '★' : '☆'}
    </Animated.Text>
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
 * VictoryScreen — animated victory result modal.
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

  const isReducedMotion = useRef(false);

  // ── Shared values ─────────────────────────────────────────────────────────
  const panelScale = useSharedValue(0.85);
  const panelOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const coinsOpacity = useSharedValue(0);
  const xpBarWidth = useSharedValue(0);

  useEffect((): void => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced): void => {
      isReducedMotion.current = reduced;
      startSequence(reduced);
    });
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

  const xpBarStyle = useAnimatedStyle(() => ({
    flex: xpBarWidth.value,
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
        style={[styles.panel, panelStyle]}
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel={`Victory! ${stars} star${stars !== 1 ? 's' : ''} earned. ${coinsEarned} coins earned.`}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.bg} />

        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.titleEmoji} accessible={false}>🎉</Text>
          <Text style={styles.title} accessibilityRole="header">Challenge Complete!</Text>

          {/* Stars row (Step 3) */}
          <View style={styles.starsRow} accessibilityElementsHidden={true}>
            {([1, 2, 3] as const).map((s) => (
              <VictoryStar
                key={s}
                active={s <= stars}
                delay={starDelays[s - 1] ?? 0}
                reducedMotion={isReducedMotion.current}
              />
            ))}
          </View>

          {/* Coins arc (Step 4) */}
          <Animated.View style={[styles.coinsRow, coinsStyle]}>
            <Text style={styles.coinsIcon} accessible={false}>💰</Text>
            <Text
              style={styles.coinsLabel}
              accessible={true}
              accessibilityLabel={`${coinsEarned} coins earned`}
            >
              +{coinsEarned}
            </Text>
          </Animated.View>

          {/* XP bar (Step 5) */}
          <View style={styles.xpSection}>
            <Text style={styles.xpLabel} accessible={true} accessibilityLabel={`${xpEarned} XP earned`}>
              +{xpEarned} XP
            </Text>
            <View style={styles.xpBarOuter}>
              <Animated.View style={[styles.xpBarFill, xpBarStyle]} />
              <View style={styles.xpBarRemaining} />
            </View>
          </View>

          {/* CTAs */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }: { pressed: boolean }) => [styles.primaryButton, pressed ? styles.buttonPressed : undefined]}
              onPress={(): void => navigation?.navigate('Game', { challengeNumber: challengeNumber + 1 })}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Play next challenge"
            >
              <Text style={styles.primaryButtonLabel}>Next ▶</Text>
            </Pressable>
            <Pressable
              style={({ pressed }: { pressed: boolean }) => [styles.secondaryButton, pressed ? styles.buttonPressed : undefined]}
              onPress={(): void => navigation?.navigate('MainTabs')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Go to Home"
            >
              <Text style={styles.secondaryButtonLabel}>Home</Text>
            </Pressable>
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
    backgroundColor: 'rgba(5, 15, 30, 0.90)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 100,
  },
  panel: {
    width: 320,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,64,0.35)',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 28, 55, 0.97)',
  },
  content: {
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  titleEmoji: {
    fontSize: 44,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  starIcon: {
    fontSize: 44,
    color: '#FFD740',
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinsIcon: {
    fontSize: 24,
  },
  coinsLabel: {
    color: '#FFD740',
    fontSize: 26,
    fontWeight: '800',
  },
  xpSection: {
    width: '100%',
    gap: 6,
  },
  xpLabel: {
    color: '#81D4FA',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  xpBarOuter: {
    flexDirection: 'row',
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#4FC3F7',
    borderRadius: 6,
  },
  xpBarRemaining: {
    flex: 0,
    height: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4FC3F7',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#0a2342',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(79,195,247,0.12)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.3)',
  },
  secondaryButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
