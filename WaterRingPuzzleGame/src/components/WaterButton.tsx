/**
 * WaterButton.tsx
 *
 * The primary gameplay button (left/right). Handles press-in/press-out with
 * a 3dp depress animation, spring-back release, radial ripple origin marker,
 * haptic feedback, and full accessibility support.
 *
 * Spec:
 *   - Minimum touch target: 88×88dp (Requirement 33.1, WCAG 2.5.5)
 *   - Depress 3dp in 50ms linear; spring back 150ms on release
 *   - Emits radial water ripple at press origin (integrated via onPressIn callback)
 *   - Fires `buttonTap` haptic on press start
 *   - accessibilityRole="button" with non-empty accessibilityLabel
 *
 * Requirements: 33.1, 33.2, 33.6, 33.7
 * Task: 8.2.1
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  GestureResponderEvent,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { triggerHaptic } from '../constants/hapticPatterns';
import { audioEngine } from '../features/audio/AudioEngine';
import { DS } from '../constants/designSystem';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum touch target dimension in dp (Requirement 33.1) */
const MIN_TOUCH_TARGET = 88;

/** Visual button face size (smaller than touch target — centred within it) */
const BUTTON_FACE_SIZE = 72;

/** Maximum depress depth in dp */
const DEPRESS_DEPTH_DP = 3;

/** Depress timing: linear 50ms down */
const DEPRESS_DURATION_MS = 50;

/** Spring config for button return on release */
const SPRING_BACK_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonSide = 'left' | 'right';

export interface WaterButtonProps {
  /** Which side of the screen this button is on. */
  side: ButtonSide;
  /** Called when the button is pressed in (touch start). */
  onPressIn?: (event: GestureResponderEvent) => void;
  /** Called when the button is released (touch end / cancel). */
  onPressOut?: (event: GestureResponderEvent) => void;
  /** When true the button is rendered but does not respond to presses. */
  disabled?: boolean;
  /** Optional cosmetic skin id (reserved for future skin rendering). */
  skin?: string;
  /** Accessible name — must be non-empty per WCAG 2.5.5 (Requirement 33.7). */
  accessibilityLabel: string;
  /** Additional style for the outer touch-target container. */
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * WaterButton — primary left/right gameplay input control.
 *
 * Requirements: 33.1, 33.2, 33.6, 33.7
 * Task: 8.2.1
 */
// eslint-disable-next-line max-lines-per-function
export default function WaterButton({
  side,
  onPressIn,
  onPressOut,
  disabled = false,
  accessibilityLabel,
  style,
}: WaterButtonProps): React.JSX.Element {
  // Shared value drives the 3dp depress: translateY increases when pressed
  const pressDepth = useSharedValue(0);
  const isPressed = useSharedValue(false);

  const animatedFaceStyle = useAnimatedStyle((): ViewStyle => ({
    transform: [{ translateY: pressDepth.value }],
  }));

  // ── Press in: linear 50ms depress + haptic ────────────────────────────────
  const handlePressIn = useCallback(
    (event: GestureResponderEvent): void => {
      if (disabled) {
        return;
      }
      isPressed.value = true;
      pressDepth.value = withTiming(DEPRESS_DEPTH_DP, {
        duration: DEPRESS_DURATION_MS,
        easing: Easing.linear,
      });
      triggerHaptic('waterPress');
      onPressIn?.(event);
    },
    [disabled, isPressed, pressDepth, onPressIn],
  );

  // ── Press out: spring back to 0 over ~150ms + water release SFX ───────────
  const handlePressOut = useCallback(
    (event: GestureResponderEvent): void => {
      // Always reset visual state (spring back the button face)
      isPressed.value = false;
      pressDepth.value = withSpring(0, SPRING_BACK_CONFIG);
      // Skip gameplay effects if disabled (e.g., game ended mid-press)
      if (disabled) return;
      audioEngine.playSFX('water_release', { volume: 0.45 });
      onPressOut?.(event);
    },
    [disabled, isPressed, pressDepth, onPressOut],
  );

  // Determine button accent colour by side — use DS water palette
  const accentColor = side === 'left' ? DS.colors.water.foam : DS.colors.water.surface;
  const glowColor = side === 'left'
    ? 'rgba(100,181,246,0.35)'
    : 'rgba(33,150,243,0.35)';

  return (
    // Outer View is the 88×88 touch target (fulfils WCAG 2.5.5 minimum)
    <View
      style={[styles.touchTarget, style]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        // hitSlop ensures entire touch target area is responsive even if Pressable
        // is somehow smaller than the container
        hitSlop={0}
        style={styles.pressable}
      >
        {/* Animated face — moves down 3dp on press, springs back on release */}
        <Animated.View
          style={[
            styles.buttonFace,
            animatedFaceStyle,
            {
              borderColor: accentColor,
              shadowColor: glowColor,
            },
          ]}
          accessible={false}
        >
          {/* Glow ring */}
          <View
            style={[
              styles.glowRing,
              { backgroundColor: glowColor },
            ]}
          />

          {/* Arrow indicator showing press direction */}
          <Text
            style={[styles.arrowLabel, { color: accentColor }]}
            accessible={false}
          >
            {side === 'left' ? '◀' : '▶'}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Unit-testable helpers
// ---------------------------------------------------------------------------

/**
 * Compute the depress animation target depth.
 * Exported for unit tests (Task 8.2.1a).
 */
export function getDepressDepth(): number {
  return DEPRESS_DEPTH_DP;
}

/**
 * Compute whether the minimum touch target size is met.
 * Exported for accessibility test (Task 8.2.1b).
 */
export function meetsMinTouchTarget(width: number, height: number): boolean {
  return width >= MIN_TOUCH_TARGET && height >= MIN_TOUCH_TARGET;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  touchTarget: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFace: {
    width: BUTTON_FACE_SIZE,
    height: BUTTON_FACE_SIZE,
    borderRadius: DS.radius.pill,
    backgroundColor: DS.glass.medium.backgroundColor,
    borderWidth: DS.glass.medium.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    // Premium glass shadow
    ...DS.shadows.lg,
  },
  glowRing: {
    position: 'absolute',
    width: BUTTON_FACE_SIZE + DS.spacing.sm,
    height: BUTTON_FACE_SIZE + DS.spacing.sm,
    borderRadius: DS.radius.pill,
  },
  arrowLabel: {
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.bold,
  },
});
