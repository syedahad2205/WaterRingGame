/**
 * useAnimationStyle — Epic 17 Task 17.2.2
 *
 * Returns animation configs that respect the reduced-motion preference.
 * In reduced-motion mode: all motion animations → opacity fade.
 * In normal mode: returns the provided animation config as-is.
 *
 * Requirements: 34.6
 */
import { useAccessibility } from './useAccessibility';

export interface MotionAnimationConfig {
  /** Duration in ms for the full animation */
  durationMs: number;
  /** The animation type to use in normal mode */
  type: 'spring' | 'timing' | 'sequence';
  /** Spring config (only used when type = 'spring' and !reduceMotion) */
  springConfig?: { damping: number; stiffness: number; mass?: number };
}

export interface ReducedAnimationConfig {
  /** Whether to use opacity fade instead of motion */
  useOpacityFade: boolean;
  /** Duration to use for the opacity fade */
  fadeDurationMs: number;
  /** Original config if motion is allowed */
  original: MotionAnimationConfig;
}

export function useAnimationConfig(config: MotionAnimationConfig): ReducedAnimationConfig {
  const { isReduceMotionEnabled } = useAccessibility();

  return {
    useOpacityFade: isReduceMotionEnabled,
    fadeDurationMs: Math.min(config.durationMs, 200), // fade always ≤200ms
    original: config,
  };
}
