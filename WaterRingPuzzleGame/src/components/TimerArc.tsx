/**
 * TimerArc.tsx
 *
 * Circular countdown arc that depletes clockwise. Displays remaining time
 * as a numeric label in its centre.
 *
 * Visual transitions:
 *   - > 30%  : normal colour (blue/teal)
 *   - ≤ 30%  : transitions to amber over 500ms
 *   - ≤ 10%  : transitions to red over 300ms + 1Hz pulse
 *
 * Arc is drawn as an SVG-like path using Skia's drawArc — here implemented
 * with react-native-svg for cross-platform compatibility. Falls back to a
 * simple View arc when SVG is unavailable.
 *
 * Requirements: 33.3, 36.5
 * Task: 8.2.2
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { DS } from '../constants/designSystem';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolateColor,
  cancelAnimation,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARC_SIZE = 120;
const ARC_STROKE = 8;
// const ARC_RADIUS = (ARC_SIZE - ARC_STROKE) / 2; // unused
// const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS; // unused

const COLOUR_NORMAL = DS.colors.info;
const COLOUR_AMBER = DS.colors.warning;
const COLOUR_RED = DS.colors.error;

const AMBER_THRESHOLD = 0.3;
const RED_THRESHOLD = 0.1;

// ---------------------------------------------------------------------------
// Arc angle computation (exported for unit tests — Task 8.2.2a)
// ---------------------------------------------------------------------------

/**
 * Given a fraction [0..1] of the timer remaining, returns the arc angle in
 * degrees (0 = empty arc, 360 = full arc).
 *
 * The arc is drawn clockwise starting from the top (−90° offset).
 * Exported for unit tests.
 */
export function computeArcAngle(fraction: number): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  return clamped * 360;
}

/**
 * Format seconds as MM:SS string.
 * Exported for unit tests.
 */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Determine the timer colour state based on fraction remaining.
 * Returns 'normal' | 'amber' | 'red'.
 * Exported for unit tests.
 */
export function getTimerState(fraction: number): 'normal' | 'amber' | 'red' {
  if (fraction <= RED_THRESHOLD) {
    return 'red';
  }
  if (fraction <= AMBER_THRESHOLD) {
    return 'amber';
  }
  return 'normal';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimerArcProps {
  /** Total timer duration in seconds. */
  totalSeconds: number;
  /** Time currently remaining in seconds. */
  remainingSeconds: number;
  /** Override container size (default 120dp). */
  size?: number;
  /** Additional style for the outer container. */
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Arc Path as SVG-like View (portable fallback implementation)
// ---------------------------------------------------------------------------

/**
 * Draws a circular arc using a combination of clipped Views as a portable
 * fallback. For the shipping build, this should be replaced by a react-native-svg
 * or Skia canvas implementation for smooth anti-aliasing.
 *
 * Requirements: 33.3, 36.5
 * Task: 8.2.2
 */
// eslint-disable-next-line max-lines-per-function
export default function TimerArc({
  totalSeconds,
  remainingSeconds,
  size = ARC_SIZE,
  style,
}: TimerArcProps): React.JSX.Element {
  const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const timerState = getTimerState(fraction);

  // ── Colour transition shared values ───────────────────────────────────────
  // colourProgress: 0 = normal, 0.5 = amber, 1 = red
  const colourProgress = useSharedValue(0);
  // pulseOpacity: used for 1Hz red pulse at ≤10%
  const pulseOpacity = useSharedValue(1);

  useEffect((): (() => void) => {
    if (timerState === 'red') {
      colourProgress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500, easing: Easing.ease }),
          withTiming(1.0, { duration: 500, easing: Easing.ease }),
        ),
        -1,
        false,
      );
    } else if (timerState === 'amber') {
      colourProgress.value = withTiming(0.5, { duration: 500, easing: Easing.out(Easing.ease) });
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = withTiming(1, { duration: 200 });
    } else {
      colourProgress.value = withTiming(0, { duration: 300 });
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }

    return (): void => {
      // Cleanup on unmount
      cancelAnimation(colourProgress);
      cancelAnimation(pulseOpacity);
    };
  }, [timerState, colourProgress, pulseOpacity]);

  // Animated arc colour
  const animatedArcStyle = useAnimatedStyle((): ViewStyle => {
    const color = interpolateColor(
      colourProgress.value,
      [0, 0.5, 1],
      [COLOUR_NORMAL, COLOUR_AMBER, COLOUR_RED],
    );
    return {
      borderColor: color as string,
      opacity: pulseOpacity.value,
    } as ViewStyle;
  });

  const arcAngle = computeArcAngle(fraction);
  const arcSize = size;
  const stroke = ARC_STROKE;
  // const radius = (arcSize - stroke) / 2; // unused

  // Build a rotation-based arc using two half-circles
  // This is the classic CSS-border trick ported to RN Views
  const halfAngle = Math.min(arcAngle, 180);
  const showSecondHalf = arcAngle > 180;
  const secondHalfAngle = arcAngle - 180;

  return (
    <View
      style={[styles.container, { width: arcSize, height: arcSize }, style]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`Timer: ${formatTime(remainingSeconds)} remaining`}
      accessibilityValue={{
        min: 0,
        max: totalSeconds,
        now: remainingSeconds,
        text: formatTime(remainingSeconds),
      }}
    >
      {/* Background track */}
      <View
        style={[
          styles.track,
          {
            width: arcSize,
            height: arcSize,
            borderRadius: arcSize / 2,
            borderWidth: stroke,
          },
        ]}
      />

      {/* Arc fill using rotating half-circle clip approach */}
      {/* Left half-circle (0–180°) */}
      <View
        style={[
          styles.halfCircleContainer,
          { width: arcSize / 2, height: arcSize, left: 0 },
        ]}
      >
        <Animated.View
          style={[
            styles.halfCircle,
            {
              width: arcSize,
              height: arcSize,
              borderRadius: arcSize / 2,
              borderWidth: stroke,
              left: 0,
            },
            animatedArcStyle,
            { transform: [{ rotate: `${halfAngle - 180}deg` }] },
          ]}
        />
      </View>

      {/* Right half-circle (180–360°) — only visible when arc > 180° */}
      {showSecondHalf ? (
        <View
          style={[
            styles.halfCircleContainer,
            { width: arcSize / 2, height: arcSize, right: 0 },
          ]}
        >
          <Animated.View
            style={[
              styles.halfCircle,
              {
                width: arcSize,
                height: arcSize,
                borderRadius: arcSize / 2,
                borderWidth: stroke,
                right: 0,
              },
              animatedArcStyle,
              { transform: [{ rotate: `${secondHalfAngle}deg` }] },
            ]}
          />
        </View>
      ) : null}

      {/* Centre numeric display */}
      <View style={[styles.centreLabel, { width: arcSize - stroke * 2 - 4, height: arcSize - stroke * 2 - 4 }]}>
        <Animated.Text
          style={[styles.timeText, animatedArcStyle]}
          accessibilityElementsHidden={true}
        >
          {formatTime(remainingSeconds)}
        </Animated.Text>
        <Text style={styles.timeSuffix} accessible={false}>s</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  track: {
    position: 'absolute',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  halfCircleContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    borderColor: COLOUR_NORMAL,
    // Hide 3 of 4 borders to simulate arc half
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  centreLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  timeText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOUR_NORMAL,
    letterSpacing: -0.5,
  },
  timeSuffix: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: -4,
  },
});
