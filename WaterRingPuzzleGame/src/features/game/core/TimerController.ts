/**
 * TimerController.ts
 *
 * Manages the countdown timer for an active challenge.
 * Provides formatted display values and threshold notifications.
 *
 * This controller is driven by the GameLoop (which decrements the timer
 * internally). TimerController provides utility functions for threshold
 * detection and formatting — it does NOT own the authoritative timer value,
 * which lives in the GameLoop and the challengeSlice.
 *
 * Requirements: 7.1 (TimerController.ts in core/)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Amber (warning) threshold: 30% of total time. */
export const AMBER_THRESHOLD_FRACTION = 0.3;

/** Critical (red) threshold: 10% of total time. */
export const CRITICAL_THRESHOLD_FRACTION = 0.1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Urgency phase for visual/haptic/audio feedback. */
export type TimerPhase = 'normal' | 'amber' | 'critical' | 'expired';

export interface TimerDisplayState {
  /** Remaining seconds (whole number). */
  secondsRemaining: number;
  /** MM:SS formatted string, e.g. "1:30". */
  formatted: string;
  /** Current urgency phase. */
  phase: TimerPhase;
  /** 0.0 (no time) → 1.0 (full time). */
  progressFraction: number;
}

// ---------------------------------------------------------------------------
// Pure utility functions
// ---------------------------------------------------------------------------

/**
 * Determine the timer phase given the remaining and total seconds.
 */
export function getTimerPhase(
  secondsRemaining: number,
  totalSeconds: number,
): TimerPhase {
  if (secondsRemaining <= 0) return 'expired';
  const fraction = secondsRemaining / totalSeconds;
  if (fraction <= CRITICAL_THRESHOLD_FRACTION) return 'critical';
  if (fraction <= AMBER_THRESHOLD_FRACTION) return 'amber';
  return 'normal';
}

/**
 * Format seconds as "M:SS" string.
 * E.g. 90 → "1:30", 5 → "0:05", 0 → "0:00".
 */
export function formatSeconds(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Compute the full display state for a given timer snapshot.
 */
export function getTimerDisplayState(
  secondsRemaining: number,
  totalSeconds: number,
): TimerDisplayState {
  return {
    secondsRemaining: Math.max(0, Math.floor(secondsRemaining)),
    formatted: formatSeconds(secondsRemaining),
    phase: getTimerPhase(secondsRemaining, totalSeconds),
    progressFraction: totalSeconds > 0 ? Math.max(0, Math.min(1, secondsRemaining / totalSeconds)) : 0,
  };
}

/**
 * Returns true if the phase just crossed the amber threshold.
 * Used by the GameScreen to fire AudioEngine.onTimerAmber() exactly once.
 *
 * @param prevSeconds - Timer value on the previous tick
 * @param currentSeconds - Timer value on the current tick
 * @param totalSeconds - Total challenge time
 */
export function didCrossAmberThreshold(
  prevSeconds: number,
  currentSeconds: number,
  totalSeconds: number,
): boolean {
  const amberSecs = totalSeconds * AMBER_THRESHOLD_FRACTION;
  return prevSeconds > amberSecs && currentSeconds <= amberSecs;
}

/**
 * Returns true if the phase just crossed the critical threshold.
 */
export function didCrossCriticalThreshold(
  prevSeconds: number,
  currentSeconds: number,
  totalSeconds: number,
): boolean {
  const criticalSecs = totalSeconds * CRITICAL_THRESHOLD_FRACTION;
  return prevSeconds > criticalSecs && currentSeconds <= criticalSecs;
}

// ---------------------------------------------------------------------------
// Module export — static controller (no mutable state needed here since
// the GameLoop owns the authoritative timer value)
// ---------------------------------------------------------------------------

export const TimerController = {
  getTimerPhase,
  formatSeconds,
  getTimerDisplayState,
  didCrossAmberThreshold,
  didCrossCriticalThreshold,
} as const;
