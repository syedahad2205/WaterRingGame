/**
 * useTimer
 *
 * Reads the remaining challenge timer from challengeSlice and exposes derived
 * helpers for formatting and progress display.
 *
 * Uses a granular selector so components that only render the timer do not
 * re-render on unrelated challenge state changes (Requirement 17.8).
 *
 * Requirements: 17.3, 17.8
 */

import { useCallback } from 'react';
import {
  useChallengeStore,
  selectTimerRemaining,
} from '../store/slices/challengeSlice';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseTimerResult {
  /** Remaining time in seconds. Counts down from totalSeconds → 0. */
  timerRemaining: number;
  /**
   * Fraction of total time remaining, clamped to [0.0, 1.0].
   * Useful for progress bars / TimerArc.
   * @param totalSeconds  The challenge's original totalSeconds value.
   */
  timerPercent: (totalSeconds: number) => number;
  /** True when timerRemaining has reached zero. */
  isExpired: boolean;
  /**
   * Format a raw seconds value as "MM:SS" with leading zeros.
   * @example formatTime(75) === "01:15"
   */
  formatTime: (seconds: number) => string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTimer(): UseTimerResult {
  const timerRemaining = useChallengeStore(selectTimerRemaining);

  const isExpired = timerRemaining <= 0;

  const timerPercent = useCallback(
    (totalSeconds: number): number => {
      if (totalSeconds <= 0) return 0;
      const raw = timerRemaining / totalSeconds;
      // Clamp to [0, 1].
      return Math.min(1, Math.max(0, raw));
    },
    [timerRemaining],
  );

  const formatTime = useCallback((seconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    return `${mm}:${ss}`;
  }, []);

  return {
    timerRemaining,
    timerPercent,
    isExpired,
    formatTime,
  };
}
