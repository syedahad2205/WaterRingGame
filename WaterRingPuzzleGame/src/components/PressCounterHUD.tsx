/**
 * PressCounterHUD.tsx
 *
 * HUD overlay shown only in the "Limited Presses" challenge template.
 * Displays the remaining press budget with a shake + red-shift animation
 * when the count falls to ≤ 10.
 *
 * Requirements: 33.5
 * Task: 8.2.3
 */

import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Remaining presses at which the shake + red-shift activates */
const SHAKE_THRESHOLD = 10;

// ---------------------------------------------------------------------------
// Helpers — exported for unit tests (Task 8.2.3a)
// ---------------------------------------------------------------------------

/**
 * Returns true when the pressCount is at or below the shake threshold.
 * Exported for unit tests.
 */
export function shouldShake(pressCount: number): boolean {
  return pressCount <= SHAKE_THRESHOLD && pressCount >= 0;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PressCounterHUDProps {
  /** Remaining presses available. */
  pressesRemaining: number;
  /** Additional container style. */
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PressCounterHUD — shows remaining press budget for Limited Presses template.
 *
 * Requirements: 33.5
 * Task: 8.2.3
 */
// eslint-disable-next-line max-lines-per-function
export default function PressCounterHUD({
  pressesRemaining,
  style,
}: PressCounterHUDProps): React.JSX.Element {
  const translateX = useSharedValue(0);
  const prevCountRef = React.useRef(pressesRemaining);

  // Trigger shake animation when count first drops to threshold or below
  useEffect((): (() => void) => {
    const wasAboveThreshold = prevCountRef.current > SHAKE_THRESHOLD;
    const nowAtOrBelow = pressesRemaining <= SHAKE_THRESHOLD;

    if (wasAboveThreshold && nowAtOrBelow) {
      // Initial threshold-crossing shake: more intense
      translateX.value = withSequence(
        withTiming(-8, { duration: 50, easing: Easing.linear }),
        withRepeat(
          withSequence(
            withTiming(8, { duration: 60, easing: Easing.linear }),
            withTiming(-8, { duration: 60, easing: Easing.linear }),
          ),
          4,
          true,
        ),
        withTiming(0, { duration: 50, easing: Easing.linear }),
      );
    } else if (nowAtOrBelow && pressesRemaining < prevCountRef.current) {
      // Subsequent decrements while at threshold: lighter shake
      translateX.value = withSequence(
        withTiming(-4, { duration: 40, easing: Easing.linear }),
        withTiming(4, { duration: 60, easing: Easing.linear }),
        withTiming(0, { duration: 40, easing: Easing.linear }),
      );
    }

    prevCountRef.current = pressesRemaining;
    return (): void => {
      cancelAnimation(translateX);
    };
  }, [pressesRemaining, translateX]);

  const animatedStyle = useAnimatedStyle((): ViewStyle => ({
    transform: [{ translateX: translateX.value }],
  }));

  const isLow = shouldShake(pressesRemaining);
  const isCritical = pressesRemaining <= 5;

  return (
    <Animated.View
      style={[styles.container, isLow && styles.containerLow, style, animatedStyle]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`${pressesRemaining} presses remaining`}
      accessibilityValue={{ min: 0, now: pressesRemaining }}
    >
      <Animated.Text
        style={[
          styles.label,
          isLow && styles.labelLow,
          isCritical && styles.labelCritical,
        ]}
      >
        👆 {pressesRemaining}
      </Animated.Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(79,195,247,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(79,195,247,0.4)',
    alignItems: 'center',
  },
  containerLow: {
    backgroundColor: 'rgba(255,87,34,0.22)',
    borderColor: 'rgba(255,87,34,0.55)',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelLow: {
    color: '#FFB74D',
  },
  labelCritical: {
    color: '#EF5350',
  },
});
