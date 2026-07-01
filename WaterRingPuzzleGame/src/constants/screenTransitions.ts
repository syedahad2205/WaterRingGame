/**
 * ============================================================================
 * Screen Transition Configs
 * ============================================================================
 *
 * React Navigation transition presets for `@react-navigation/stack`.
 *
 * Each export provides `transitionSpec` and `cardStyleInterpolator` compatible
 * with StackNavigationOptions so they can be spread directly:
 *
 * ```ts
 * import { defaultStackTransition } from '@/constants/screenTransitions';
 *
 * <Stack.Screen
 *   name="Game"
 *   options={{ ...defaultStackTransition }}
 * />
 * ```
 *
 * @module screenTransitions
 */

import { Animated, Easing } from 'react-native';
import type {
  StackCardInterpolationProps,
  StackCardStyleInterpolator,
  TransitionSpec,
} from '@react-navigation/stack';

import { DS } from './designSystem';

// ============================================================================
// Helpers
// ============================================================================

/** Shorthand for a spring TransitionSpec using DS tokens. */
function springSpec(config: {
  mass: number;
  damping: number;
  stiffness: number;
}): TransitionSpec {
  return {
    animation: 'spring',
    config: {
      mass: config.mass,
      damping: config.damping,
      stiffness: config.stiffness,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    },
  };
}

/** Shorthand for a timing TransitionSpec. */
function timingSpec(duration: number, easing?: (value: number) => number): TransitionSpec {
  return {
    animation: 'timing',
    config: {
      duration,
      easing: easing ?? Easing.out(Easing.cubic),
    },
  };
}

// ============================================================================
// SECTION: Default Stack — Slide from Right with Spring
// ============================================================================

const defaultStackCardStyleInterpolator: StackCardStyleInterpolator = ({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  const progress = Animated.add(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        })
      : 0,
  );

  return {
    cardStyle: {
      transform: [
        {
          translateX: Animated.multiply(
            progress.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [screen.width, 0, screen.width * -0.3],
              extrapolate: 'clamp',
            }),
            inverted,
          ),
        },
      ],
      opacity: current.progress.interpolate({
        inputRange: [0, 0.5, 0.9, 1],
        outputRange: [0, 0.25, 0.7, 1],
        extrapolate: 'clamp',
      }),
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
        extrapolate: 'clamp',
      }),
    },
  };
};

/**
 * Default stack transition — slide from right with spring physics.
 * Use for all standard push/pop screen transitions.
 */
export const defaultStackTransition = {
  transitionSpec: {
    open: springSpec(DS.animation.spring.snappy),
    close: springSpec(DS.animation.spring.snappy),
  },
  cardStyleInterpolator: defaultStackCardStyleInterpolator,
} as const;

// ============================================================================
// SECTION: Modal — Slide Up with Spring
// ============================================================================

const modalCardStyleInterpolator: StackCardStyleInterpolator = ({
  current,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      transform: [
        {
          translateY: Animated.multiply(
            current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [screen.height, 0],
              extrapolate: 'clamp',
            }),
            inverted,
          ),
        },
      ],
      borderTopLeftRadius: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [DS.radius.sheet, DS.radius.sheet],
        extrapolate: 'clamp',
      }),
      borderTopRightRadius: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [DS.radius.sheet, DS.radius.sheet],
        extrapolate: 'clamp',
      }),
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
        extrapolate: 'clamp',
      }),
    },
  };
};

/**
 * Modal transition — slide up from bottom with spring physics.
 * Use for full-screen modals, settings, pause menu, etc.
 */
export const modalTransition = {
  transitionSpec: {
    open: springSpec(DS.animation.spring.gentle),
    close: timingSpec(DS.animation.duration.normal, Easing.in(Easing.cubic)),
  },
  cardStyleInterpolator: modalCardStyleInterpolator,
} as const;

// ============================================================================
// SECTION: Transparent Modal — Fade In
// ============================================================================

const transparentModalCardStyleInterpolator: StackCardStyleInterpolator = ({
  current,
}: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 0.5, 0.9, 1],
        outputRange: [0, 0.25, 0.7, 1],
        extrapolate: 'clamp',
      }),
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.7],
        extrapolate: 'clamp',
      }),
    },
  };
};

/**
 * Transparent modal transition — simple fade in/out.
 * Use for alert dialogs, confirmation popups, and overlays
 * that show content underneath.
 */
export const transparentModalTransition = {
  transitionSpec: {
    open: timingSpec(DS.animation.duration.fast),
    close: timingSpec(DS.animation.duration.fast, Easing.in(Easing.cubic)),
  },
  cardStyleInterpolator: transparentModalCardStyleInterpolator,
  cardOverlayEnabled: true,
} as const;

// ============================================================================
// SECTION: Tab Switch — Crossfade
// ============================================================================

const crossfadeCardStyleInterpolator: StackCardStyleInterpolator = ({
  current,
  next,
}: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    },
    overlayStyle: {
      opacity: next
        ? next.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.3],
            extrapolate: 'clamp',
          })
        : 0,
    },
  };
};

/**
 * Crossfade transition — symmetric fade between screens.
 * Use for tab-style navigation where directionality is not meaningful.
 */
export const crossfadeTransition = {
  transitionSpec: {
    open: timingSpec(DS.animation.duration.fast),
    close: timingSpec(DS.animation.duration.fast),
  },
  cardStyleInterpolator: crossfadeCardStyleInterpolator,
} as const;

// ============================================================================
// SECTION: Scale Fade — Game Entry
// ============================================================================

const scaleFadeCardStyleInterpolator: StackCardStyleInterpolator = ({
  current,
}: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.3, 1],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.92, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
        extrapolate: 'clamp',
      }),
    },
  };
};

/**
 * Scale-fade transition — scale up from 92% with fade.
 * Use for entering the game screen or other immersive views.
 */
export const scaleFadeTransition = {
  transitionSpec: {
    open: springSpec(DS.animation.spring.snappy),
    close: timingSpec(DS.animation.duration.fast, Easing.in(Easing.cubic)),
  },
  cardStyleInterpolator: scaleFadeCardStyleInterpolator,
} as const;
