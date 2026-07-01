/**
 * TimerController.ts
 *
 * Manages the countdown timer for an active challenge.
 *
 * Exposes two layers:
 *
 * 1. **Pure utility functions** — stateless helpers for phase detection,
 *    formatting, and threshold crossings used by UI and audio systems.
 *
 * 2. **Stateful singleton controller** — `initialize`, `tick`, `addBonusTime`,
 *    `getPhase`, `isExpired`, `getTimeRemaining`, `reset`.  The GameLoop calls
 *    `tick(dt)` once per fixed-timestep tick; ContinueService calls
 *    `addBonusTime(ms)` when the player purchases additional time (Req 16.2).
 *
 * Requirements: 7.1 (TimerController.ts in core/), 9.1, 16.2
 */

import { formatSeconds } from '../../../utils/time';

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
  if (secondsRemaining <= 0 || totalSeconds <= 0) return 'expired';
  const fraction = secondsRemaining / totalSeconds;
  if (fraction <= CRITICAL_THRESHOLD_FRACTION) return 'critical';
  if (fraction <= AMBER_THRESHOLD_FRACTION) return 'amber';
  return 'normal';
}

// formatSeconds is imported from utils/time.ts (single source of truth).
// It remains accessible via TimerController.formatSeconds for backward compat.

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
// Stateful TimerController singleton
//
// Manages the countdown timer for an active challenge.  The GameLoop calls
// `tick(dt)` once per physics step; ContinueService calls `addBonusTime(ms)`
// when the player purchases additional time.
//
// Design note: the GameLoop also tracks `timerRemainingMs` internally for
// fast access during the tick loop.  These two sources are kept in sync: the
// GameLoop delegates phase / expiry queries to this controller when needed,
// and ContinueService uses this API to add bonus time (the GameLoop reads the
// updated value on the next tick via `getTimeRemaining()`).
//
// Requirements: 9.1, 16.2
// ---------------------------------------------------------------------------

interface TimerState {
  /** Remaining time in milliseconds. */
  remainingMs: number;
  /** Total time originally set, used for phase calculations. */
  totalMs: number;
  /** Whether the timer has been initialised. */
  initialised: boolean;
  /** Whether the timer has fired its expiry (to prevent double-firing). */
  expired: boolean;
}

const _timerState: TimerState = {
  remainingMs: 0,
  totalMs: 0,
  initialised: false,
  expired: false,
};

/**
 * Initialise the timer for a new challenge.
 *
 * @param totalSeconds - Total challenge duration in seconds.
 */
function initialize(totalSeconds: number): void {
  _timerState.totalMs = totalSeconds * 1000;
  _timerState.remainingMs = totalSeconds * 1000;
  _timerState.initialised = true;
  _timerState.expired = false;
}

/**
 * Advance the timer by `dt` milliseconds (called once per physics tick).
 * Clamps remaining time to 0 — never goes negative.
 *
 * @param dt - Delta time in milliseconds (typically FIXED_TIMESTEP_MS ≈ 16.67).
 * @returns `true` if the timer just expired this tick, `false` otherwise.
 */
function tick(dt: number): boolean {
  if (!_timerState.initialised || _timerState.expired) {
    return false;
  }
  _timerState.remainingMs = Math.max(0, _timerState.remainingMs - dt);
  if (_timerState.remainingMs <= 0 && !_timerState.expired) {
    _timerState.expired = true;
    return true;
  }
  return false;
}

/**
 * Add bonus time (e.g. from a continue grant).
 * Revives an expired timer — clears the expired flag so the timer keeps running.
 *
 * @param ms - Bonus milliseconds to add.
 *
 * Requirements: 16.2
 */
function addBonusTime(ms: number): void {
  if (!_timerState.initialised || ms <= 0) {
    return;
  }
  _timerState.remainingMs += ms;
  // Revive the timer if it was expired.
  if (_timerState.expired && _timerState.remainingMs > 0) {
    _timerState.expired = false;
  }
}

/**
 * Return the current urgency phase based on remaining / total time.
 * Returns 'expired' when the timer has reached zero.
 *
 * Note: phase thresholds from the ChallengeConfig (amberThresholdSecs /
 * criticalThresholdSecs) are in seconds and stored on the config — the
 * static `getTimerPhase()` helper below accepts those values.  This method
 * uses the global fraction constants (AMBER_THRESHOLD_FRACTION = 30%,
 * CRITICAL_THRESHOLD_FRACTION = 10%) which mirror the design spec.
 *
 * Returns only 'normal' | 'amber' | 'critical' (not 'expired') per the
 * public contract; callers should check isExpired() separately.
 */
function getPhase(): 'normal' | 'amber' | 'critical' {
  if (_timerState.totalMs <= 0) {
    return 'normal';
  }
  const secondsRemaining = _timerState.remainingMs / 1000;
  const totalSeconds = _timerState.totalMs / 1000;
  const phase = getTimerPhase(secondsRemaining, totalSeconds);
  // Map 'expired' to 'critical' for the narrower return type.
  return phase === 'expired' ? 'critical' : phase;
}

/**
 * Returns `true` when the countdown has reached zero.
 */
function isExpired(): boolean {
  return _timerState.expired || _timerState.remainingMs <= 0;
}

/**
 * Returns the remaining time in milliseconds.
 */
function getTimeRemaining(): number {
  return _timerState.remainingMs;
}

/**
 * Reset all timer state (call before each new challenge or after stop()).
 */
function reset(): void {
  _timerState.remainingMs = 0;
  _timerState.totalMs = 0;
  _timerState.initialised = false;
  _timerState.expired = false;
}

// ---------------------------------------------------------------------------
// Module export — combines pure utilities + stateful controller
// ---------------------------------------------------------------------------

export const TimerController = {
  // Pure utility helpers
  getTimerPhase,
  formatSeconds,
  getTimerDisplayState,
  didCrossAmberThreshold,
  didCrossCriticalThreshold,
  // Stateful controller methods (Requirements 9.1, 16.2)
  initialize,
  tick,
  addBonusTime,
  getPhase,
  isExpired,
  getTimeRemaining,
  reset,
} as const;
