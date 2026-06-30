/**
 * PlayerBehaviorMonitor.ts
 *
 * Tracks button-press timestamps and computes input rate within a sliding window.
 * Used by AdaptiveAssistController to detect confusion (low input rate).
 *
 * Session-only state — not persisted to MMKV or Firestore.
 *
 * Requirements: 16.2 (AdaptiveAssistController interface), 7.2.2
 */

// ---------------------------------------------------------------------------
// Module-level state (session only)
// ---------------------------------------------------------------------------

/** Timestamps (ms) of all recorded button presses. */
let _pressTimestamps: number[] = [];

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Record a button press event at the given timestamp.
 *
 * @param timestamp  Milliseconds (e.g. Date.now() or performance.now()).
 */
function recordButtonPress(timestamp: number): void {
  _pressTimestamps.push(timestamp);
}

/**
 * Compute the input rate (presses per second) within the last `windowMs` milliseconds.
 *
 * @param windowMs  Look-back window in milliseconds.
 * @returns         Inputs per second over the given window.
 */
function getInputRate(windowMs: number): number {
  if (windowMs <= 0) return 0;
  const cutoff = Date.now() - windowMs;
  const count = _pressTimestamps.filter((t) => t >= cutoff).length;
  return count / (windowMs / 1000);
}

/**
 * Clear all recorded press timestamps.
 * Call at the start of a new challenge or session.
 */
function reset(): void {
  _pressTimestamps = [];
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const PlayerBehaviorMonitor = {
  recordButtonPress,
  getInputRate,
  reset,
} as const;
