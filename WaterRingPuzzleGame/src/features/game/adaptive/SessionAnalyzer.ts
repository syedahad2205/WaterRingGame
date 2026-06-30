/**
 * SessionAnalyzer.ts
 *
 * Tracks per-challenge frustration signals across the session.
 * A challenge is considered "frustrating" when it has been quit 3+ times
 * or failed repeatedly. Used by AdaptiveAssistController to gate the
 * show_skip_option assist flag.
 *
 * Session-only state — not persisted to MMKV or Firestore.
 *
 * Requirements: 16.2 (AdaptiveAssistController interface), 7.2.2
 */

// ---------------------------------------------------------------------------
// Module-level state (session only)
// ---------------------------------------------------------------------------

/**
 * Maps challengeNumber → { quitCount, failureCount }.
 */
interface ChallengeRecord {
  quitCount: number;
  failureCount: number;
}

let _records: Map<number, ChallengeRecord> = new Map();

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Minimum quit count to mark a challenge as frustrating. */
const FRUSTRATION_QUIT_THRESHOLD = 3;
/** Minimum failure count to mark a challenge as frustrating via failures. */
const FRUSTRATION_FAILURE_THRESHOLD = 4;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Record a frustration signal (quit or failure) for a challenge.
 * Used by AdaptiveAssistController when it calls recordQuit or recordAttempt.
 *
 * @param challengeNumber  The challenge number to record frustration for.
 */
function recordChallengeFrustration(challengeNumber: number): void {
  const existing = _records.get(challengeNumber) ?? { quitCount: 0, failureCount: 0 };
  _records.set(challengeNumber, {
    ...existing,
    failureCount: existing.failureCount + 1,
  });
}

/**
 * Record a quit for the given challenge number.
 *
 * @param challengeNumber  The challenge that was quit.
 */
function recordChallengeQuit(challengeNumber: number): void {
  const existing = _records.get(challengeNumber) ?? { quitCount: 0, failureCount: 0 };
  _records.set(challengeNumber, {
    ...existing,
    quitCount: existing.quitCount + 1,
  });
}

/**
 * Returns true if the challenge has been flagged as frustrating.
 * A challenge is frustrating if quit count >= FRUSTRATION_QUIT_THRESHOLD
 * OR failure count >= FRUSTRATION_FAILURE_THRESHOLD.
 *
 * @param challengeNumber  The challenge to check.
 */
function isChallengeConsideredFrustrating(challengeNumber: number): boolean {
  const record = _records.get(challengeNumber);
  if (!record) return false;
  return (
    record.quitCount >= FRUSTRATION_QUIT_THRESHOLD ||
    record.failureCount >= FRUSTRATION_FAILURE_THRESHOLD
  );
}

/**
 * Get the quit count for a specific challenge (used by AdaptiveAssistController).
 *
 * @param challengeNumber  The challenge to query.
 */
function getQuitCount(challengeNumber: number): number {
  return _records.get(challengeNumber)?.quitCount ?? 0;
}

/**
 * Clear all session records.
 */
function reset(): void {
  _records = new Map();
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const SessionAnalyzer = {
  recordChallengeFrustration,
  recordChallengeQuit,
  isChallengeConsideredFrustrating,
  getQuitCount,
  reset,
} as const;
