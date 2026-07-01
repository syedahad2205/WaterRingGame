/**
 * ============================================================================
 * Animation Presets
 * ============================================================================
 *
 * Reusable animation configuration objects for react-native-reanimated.
 * Components consume these configs directly with withTiming / withSpring /
 * withSequence to guarantee consistent motion across the entire game.
 *
 * All durations are in milliseconds. Spring configs use the mass / damping /
 * stiffness model. Keyframe arrays represent sequential values driven by
 * withSequence(withTiming(...), ...).
 *
 * Usage:
 *   import { SCREEN_TRANSITIONS, INTERACTION, GAME_ANIMATIONS, STAGGER } from '@/constants/animations';
 *
 * @module animations
 */

import { DS } from './designSystem';

// ============================================================================
// Helpers — timing & spring config shapes
// ============================================================================

/** Configuration for a timing-based animation. */
export interface TimingConfig {
  readonly duration: number;
  /** Easing hint string — resolve to actual Easing function at call site. */
  readonly easing: string;
}

/** Configuration for a spring-based animation. */
export interface SpringConfig {
  readonly mass: number;
  readonly damping: number;
  readonly stiffness: number;
}

/** A single property transition (from -> to) with either timing or spring. */
export interface PropertyTransition {
  readonly from: number;
  readonly to: number;
  readonly timing?: TimingConfig;
  readonly spring?: SpringConfig;
}

/** A keyframe sequence for a single property. */
export interface KeyframeSequence {
  readonly values: readonly number[];
  readonly duration: number;
  readonly easing?: string;
}

/** Continuous oscillation config for looping animations. */
export interface OscillationConfig {
  readonly amplitude: number;
  readonly period: number;
}

// ============================================================================
// SECTION: Screen Transitions
// ============================================================================

/**
 * Screen-level transition presets.
 *
 * Each preset defines the animated properties and their from/to values
 * along with the physics model (timing or spring) used to drive them.
 */
export const SCREEN_TRANSITIONS = {
  /** Simple opacity crossfade. */
  fadeIn: {
    opacity: {
      from: 0,
      to: 1,
      timing: {
        duration: DS.animation.duration.normal,
        easing: DS.animation.easing.easeOut,
      },
    },
  },

  /** Fade out — inverse of fadeIn. */
  fadeOut: {
    opacity: {
      from: 1,
      to: 0,
      timing: {
        duration: DS.animation.duration.fast,
        easing: DS.animation.easing.easeIn,
      },
    },
  },

  /** Slide up from 50 px below with spring physics. */
  slideUp: {
    translateY: {
      from: 50,
      to: 0,
      spring: DS.animation.spring.gentle,
    },
    opacity: {
      from: 0,
      to: 1,
      timing: {
        duration: DS.animation.duration.fast,
        easing: DS.animation.easing.easeOut,
      },
    },
  },

  /** Slide down — inverse direction of slideUp. */
  slideDown: {
    translateY: {
      from: -50,
      to: 0,
      spring: DS.animation.spring.gentle,
    },
    opacity: {
      from: 0,
      to: 1,
      timing: {
        duration: DS.animation.duration.fast,
        easing: DS.animation.easing.easeOut,
      },
    },
  },

  /** Slide in from the right (standard stack push). */
  slideRight: {
    translateX: {
      from: 300,
      to: 0,
      spring: DS.animation.spring.snappy,
    },
    opacity: {
      from: 0.5,
      to: 1,
      timing: {
        duration: DS.animation.duration.fast,
        easing: DS.animation.easing.easeOut,
      },
    },
  },

  /** Scale in from 90% with spring. */
  scaleIn: {
    scale: {
      from: 0.9,
      to: 1,
      spring: DS.animation.spring.snappy,
    },
    opacity: {
      from: 0,
      to: 1,
      timing: {
        duration: DS.animation.duration.fast,
        easing: DS.animation.easing.easeOut,
      },
    },
  },

  /** Modal entrance — slide up from bottom with spring. */
  modalEnter: {
    translateY: {
      from: 400,
      to: 0,
      spring: DS.animation.spring.gentle,
    },
    opacity: {
      from: 0,
      to: 1,
      timing: {
        duration: DS.animation.duration.fast,
        easing: DS.animation.easing.easeOut,
      },
    },
  },

  /** Modal exit — slide down. */
  modalExit: {
    translateY: {
      from: 0,
      to: 400,
      timing: {
        duration: DS.animation.duration.normal,
        easing: DS.animation.easing.easeIn,
      },
    },
    opacity: {
      from: 1,
      to: 0,
      timing: {
        duration: DS.animation.duration.fast,
        easing: DS.animation.easing.easeIn,
      },
    },
  },
} as const;

// ============================================================================
// SECTION: Interaction Feedback
// ============================================================================

/**
 * Micro-interaction feedback configs for interactive elements.
 *
 * `scale` is the target value during press; `duration` is how long the
 * press-down animation takes. Release always springs back to 1.0.
 */
export const INTERACTION = {
  /** GlassButton press — subtle scale-down. */
  buttonPress: {
    scale: 0.96,
    duration: DS.animation.duration.instant,
    spring: DS.animation.spring.snappy,
  },

  /** Card / list-item press — very gentle scale. */
  cardPress: {
    scale: 0.98,
    duration: 150,
    spring: DS.animation.spring.snappy,
  },

  /** Tab bar item switch — horizontal slide indicator. */
  tabSwitch: {
    translateX: 0,
    duration: DS.animation.duration.fast,
    spring: DS.animation.spring.snappy,
  },

  /** Toggle switch knob travel. */
  toggleSwitch: {
    translateX: 20,
    spring: DS.animation.spring.bouncy,
  },

  /** Slider thumb tick — tiny bump. */
  sliderTick: {
    scale: 1.15,
    duration: 80,
    spring: DS.animation.spring.snappy,
  },

  /** Long-press hold feedback — slow scale-up. */
  longPressHold: {
    scale: 0.94,
    duration: DS.animation.duration.smooth,
    spring: DS.animation.spring.heavy,
  },

  /** Icon tap bounce. */
  iconTap: {
    scale: 0.88,
    duration: DS.animation.duration.instant,
    spring: DS.animation.spring.bouncy,
  },
} as const;

// ============================================================================
// SECTION: Game-Specific Animations
// ============================================================================

/**
 * Animation configs specific to gameplay elements.
 *
 * - Oscillation configs (`ringFloat`) drive continuous looping with
 *   `withRepeat(withSequence(...))`.
 * - Keyframe configs (`ringLand`, `pegGlow`) list values for
 *   `withSequence(withTiming(v1), withTiming(v2), ...)`.
 * - Particle configs (`victoryBurst`) are consumed by ConfettiSystem.
 */
export const GAME_ANIMATIONS = {
  // ── Ring physics ──────────────────────────────────────────────────────────

  /** Gentle floating bob for idle rings in the water chamber. */
  ringFloat: {
    translateY: { amplitude: 3, period: 2000 } as OscillationConfig,
    rotation: { amplitude: 0.02, period: 3000 } as OscillationConfig,
  },

  /** Bounce sequence when a ring successfully lands on a peg. */
  ringLand: {
    scale: {
      values: [1, 1.15, 0.95, 1.02, 1] as readonly number[],
      duration: 400,
      easing: DS.animation.easing.easeOut,
    } as KeyframeSequence,
  },

  /** Ring spinning while airborne / being pushed by water. */
  ringSpin: {
    rotation: { amplitude: Math.PI * 2, period: 1200 } as OscillationConfig,
  },

  // ── Peg effects ───────────────────────────────────────────────────────────

  /** Pulsating glow when a ring approaches its matching peg. */
  pegGlow: {
    opacity: {
      values: [0.3, 0.8, 0.3] as readonly number[],
      duration: 1200,
      easing: DS.animation.easing.easeInOut,
    } as KeyframeSequence,
    scale: {
      values: [1, 1.1, 1] as readonly number[],
      duration: 1200,
      easing: DS.animation.easing.easeInOut,
    } as KeyframeSequence,
  },

  // ── Water effects ─────────────────────────────────────────────────────────

  /** Horizontal pulse when the water-push button is pressed. */
  waterPulse: {
    scaleX: {
      values: [1, 1.02, 1] as readonly number[],
      duration: DS.animation.duration.normal,
      easing: DS.animation.easing.easeOut,
    } as KeyframeSequence,
  },

  /** Water surface ripple triggered by button press intensity. */
  waterRipple: {
    scale: {
      values: [0, 1.5] as readonly number[],
      duration: DS.animation.duration.smooth,
      easing: DS.animation.easing.easeOut,
    } as KeyframeSequence,
    opacity: {
      values: [0.6, 0] as readonly number[],
      duration: DS.animation.duration.smooth,
      easing: DS.animation.easing.easeOut,
    } as KeyframeSequence,
  },

  // ── Scoring / combo ───────────────────────────────────────────────────────

  /** Flash when combo multiplier increments. */
  comboFlash: {
    scale: {
      values: [1, 1.3, 1] as readonly number[],
      duration: DS.animation.duration.fast,
      easing: DS.animation.easing.easeOut,
    } as KeyframeSequence,
    opacity: {
      values: [1, 0.8, 1] as readonly number[],
      duration: DS.animation.duration.fast,
      easing: DS.animation.easing.easeOut,
    } as KeyframeSequence,
  },

  /** Score number tick-up animation. */
  scoreTick: {
    scale: {
      values: [1, 1.12, 1] as readonly number[],
      duration: 150,
      easing: DS.animation.easing.easeOut,
    } as KeyframeSequence,
  },

  // ── Rewards / celebrations ────────────────────────────────────────────────

  /** Confetti / sparkle burst on victory. */
  victoryBurst: {
    particleCount: 50,
    spread: 360,
    duration: 2000,
    colors: [
      DS.colors.accent,
      DS.colors.secondary,
      DS.colors.success,
      DS.colors.rings.coral,
      DS.colors.rings.lavender,
      DS.colors.rings.mint,
    ] as readonly string[],
  },

  /** Coin arc animation — coin flies from source to the HUD counter. */
  coinCollect: {
    arcHeight: 100,
    duration: DS.animation.duration.slow,
    spring: DS.animation.spring.snappy,
  },

  /** Star flip-reveal at end-of-level. */
  starReveal: {
    flipDuration: DS.animation.duration.normal,
    staggerDelay: 200,
    spring: DS.animation.spring.bouncy,
  },

  // ── Timer ─────────────────────────────────────────────────────────────────

  /** Timer bar pulse when time is running low. */
  timerWarning: {
    scale: {
      values: [1, 1.04, 1] as readonly number[],
      duration: 600,
      easing: DS.animation.easing.easeInOut,
    } as KeyframeSequence,
    opacity: {
      values: [1, 0.7, 1] as readonly number[],
      duration: 600,
      easing: DS.animation.easing.easeInOut,
    } as KeyframeSequence,
  },

  /** Timer critical — faster, more urgent pulse. */
  timerCritical: {
    scale: {
      values: [1, 1.06, 1] as readonly number[],
      duration: 350,
      easing: DS.animation.easing.easeInOut,
    } as KeyframeSequence,
    opacity: {
      values: [1, 0.5, 1] as readonly number[],
      duration: 350,
      easing: DS.animation.easing.easeInOut,
    } as KeyframeSequence,
  },
} as const;

// ============================================================================
// SECTION: Stagger Configs
// ============================================================================

/**
 * Stagger delay presets for list / grid entrance animations.
 *
 * `delayPerItem` is the incremental delay between each child element.
 * `maxDelay` caps the total entrance time so long lists don't feel sluggish.
 *
 * Usage:
 *   const delay = Math.min(index * STAGGER.normal.delayPerItem, STAGGER.normal.maxDelay);
 */
export const STAGGER = {
  /** Rapid stagger — small lists, tabs, chips. */
  fast: {
    delayPerItem: 50,
    maxDelay: 300,
  },

  /** Default stagger — settings rows, menu items. */
  normal: {
    delayPerItem: 80,
    maxDelay: 500,
  },

  /** Slow stagger — grid tiles, achievement cards. */
  slow: {
    delayPerItem: 120,
    maxDelay: 800,
  },
} as const;

// ============================================================================
// SECTION: Convenience Helpers
// ============================================================================

/**
 * Compute the stagger delay for a given item index, respecting the max cap.
 *
 * @param index - Zero-based position of the item in the list.
 * @param preset - One of the STAGGER preset keys.
 * @returns Delay in milliseconds.
 */
export function getStaggerDelay(
  index: number,
  preset: keyof typeof STAGGER = 'normal',
): number {
  const { delayPerItem, maxDelay } = STAGGER[preset];
  return Math.min(index * delayPerItem, maxDelay);
}
