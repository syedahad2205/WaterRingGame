/**
 * AchievementUnlockBanner.tsx
 *
 * Slide-down banner that appears when an achievement is unlocked.
 *
 * Animation sequence (Requirement 34.5):
 *   1. Slide down from above screen edge: spring 400ms (stiffness 300, damping 30)
 *   2. Display for 2200ms
 *   3. Slide back up: timing 400ms ease-in
 *
 * Reduced-motion alternative: opacity fade-in/fade-out instead of slide.
 * Particle burst fires on appearance (signalled via onAppear callback).
 * Banner is dismissible by tap (calls onDismiss immediately).
 *
 * Requirements: 34.5, 34.6
 * Task: 8.3.4
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { DS } from '../constants/designSystem';
import { Icon, type IconName } from './icons/GameIcons';
import { useReducedMotion } from '../hooks/useReducedMotion';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BANNER_HEIGHT = 80;
const SLIDE_IN_DURATION = 400;
const DISPLAY_DURATION = 2200;
const SLIDE_OUT_DURATION = 400;

const SPRING_IN_CONFIG = {
  stiffness: 300,
  damping: 30,
};

// ---------------------------------------------------------------------------
// Exported timing constants for unit tests (Task 8.3.4b)
// ---------------------------------------------------------------------------
export const BANNER_TIMING = {
  slideIn: SLIDE_IN_DURATION,
  display: DISPLAY_DURATION,
  slideOut: SLIDE_OUT_DURATION,
  total: SLIDE_IN_DURATION + DISPLAY_DURATION + SLIDE_OUT_DURATION,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AchievementUnlockBannerProps {
  /** Achievement title */
  title: string;
  /** Short description */
  description: string;
  /** Icon name from GameIcons */
  iconName?: IconName;
  /** Called when the auto-dismiss or tap-dismiss sequence completes */
  onDismiss: () => void;
  /** Called at the moment the banner becomes visible (for particle burst) */
  onAppear?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AchievementUnlockBanner — slide-down achievement notification.
 *
 * Requirements: 34.5, 34.6
 * Task: 8.3.4
 */
// eslint-disable-next-line max-lines-per-function
export default function AchievementUnlockBanner({
  title,
  description,
  iconName = 'trophy',
  onDismiss,
  onAppear,
}: AchievementUnlockBannerProps): React.JSX.Element {
  // −BANNER_HEIGHT hides the banner above the screen; 0 shows it fully
  const translateY = useSharedValue(-BANNER_HEIGHT - 20);
  const opacity = useSharedValue(0);
  const isDismissed = useRef(false);
  const reducedMotion = useReducedMotion();

  const triggerDismiss = useCallback((): void => {
    if (isDismissed.current) {
      return;
    }
    isDismissed.current = true;
    onDismiss();
  }, [onDismiss]);

  useEffect((): (() => void) => {
    if (reducedMotion) {
      // Reduced-motion: fade in/out instead of slide
      opacity.value = withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
        withDelay(DISPLAY_DURATION, withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })),
      );
      const timeout = setTimeout(triggerDismiss, 300 + DISPLAY_DURATION + 300);
      return (): void => clearTimeout(timeout);
    }

    // Normal motion: spring slide-in → hold → slide-out
    opacity.value = withTiming(1, { duration: 80 });
    translateY.value = withSpring(0, SPRING_IN_CONFIG, (finished): void => {
      if (finished) {
        runOnJS(onAppear ?? ((): void => undefined))();
      }
    });

    // Slide out after display duration
    const timeout = setTimeout((): void => {
      translateY.value = withTiming(
        -(BANNER_HEIGHT + 20),
        { duration: SLIDE_OUT_DURATION, easing: Easing.in(Easing.ease) },
        (finished): void => {
          if (finished) {
            runOnJS(triggerDismiss)();
          }
        },
      );
    }, SLIDE_IN_DURATION + DISPLAY_DURATION);

    return (): void => clearTimeout(timeout);
  }, [translateY, opacity, onAppear, triggerDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleTap = useCallback((): void => {
    isDismissed.current = true;
    triggerDismiss();
  }, [triggerDismiss]);

  return (
    <Animated.View
      style={[styles.banner, animatedStyle]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`Achievement unlocked: ${title}. ${description}`}
      accessibilityLiveRegion="polite"
    >
      <Pressable
        onPress={handleTap}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityLabel="Dismiss achievement notification"
      >
        <View style={styles.iconContainer}>
          <Icon name={iconName} size={28} color={DS.colors.accent} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.achievementLabel} accessible={false}>Achievement Unlocked</Text>
          <Text style={styles.title} accessible={false} numberOfLines={1}>{title}</Text>
          <Text style={styles.description} accessible={false} numberOfLines={1}>{description}</Text>
        </View>
        <Icon name="close" size={14} color={DS.colors.text.tertiary} />
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: DS.spacing.lg,
    right: DS.spacing.lg,
    height: BANNER_HEIGHT,
    backgroundColor: 'rgba(15, 38, 70, 0.96)',
    borderRadius: DS.radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,64,0.5)',
    ...DS.shadows.lg,
    shadowColor: DS.colors.accent,
    zIndex: DS.zIndex.toast,
  },
  pressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.lg,
    gap: DS.spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,215,64,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 1,
  },
  achievementLabel: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.footnote,
    fontWeight: DS.typography.weight.bold,
  },
  description: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.caption1,
  },
});
