/**
 * AdaptiveAssistController.ts
 *
 * Invisible adaptive assistance layer. Monitors player struggle signals and
 * activates targeted assists to help players succeed without feeling patronised.
 *
 * Assists:
 *   near_miss_bonus    — +15s silent timer bonus on near-miss
 *   proximity_glow     — Enhanced peg glow radius (100px → 150px)
 *   show_skip_option   — Show "Skip this challenge?" option
 *   confusion_hint     — Animated arrow pointing to furthest ring's target peg
 *
 * Logic:
 *   consecutiveFailures >= 2       → proximity_glow
 *   ringsPlaced === total-1 AND
 *     timer expired (near-miss)    → near_miss_bonus (15s on next attempt)
 *   quitCount >= 3 in session      → show_skip_option
 *   lowInputRate < 0.3/s for 10s   → confusion_hint
 *
 * Session-only state — not persisted.
 *
 * Requirements: 16.2
 */

import { PlayerBehaviorMonitor } from './PlayerBehaviorMonitor';
import { SessionAnalyzer } from './SessionAnalyzer';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AssistFlag =
  | 'near_miss_bonus'
  | 'proximity_glow'
  | 'show_skip_option'
  | 'confusion_hint';

export interface AttemptResult {
  challengeNumber: number;
  ringsPlaced: number;
  totalRequired: number;
  timerExpired: boolean;
  timeRemaining: number;
  totalTime: number;
}

export interface AttemptProgress {
  challengeNumber: number;
  ringsPlaced: number;
  totalRequired: number;
  timeRemaining: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum consecutive failures to activate proximity_glow. */
const PROXIMITY_GLOW_FAILURE_THRESHOLD = 2;

/** Near-miss bonus seconds granted on the next attempt. */
const NEAR_MISS_BONUS_SECONDS = 15;

/** Minimum quit count to show the skip option. */
const SKIP_OPTION_QUIT_THRESHOLD = 3;

/** Input rate (inputs/sec) below which confusion_hint activates. */
const CONFUSION_INPUT_RATE_THRESHOLD = 0.3;

/** Window (ms) used to evaluate input rate for confusion detection. */
const CONFUSION_INPUT_RATE_WINDOW_MS = 10_000;

// ---------------------------------------------------------------------------
// Module-level state (session only)
// ---------------------------------------------------------------------------

interface ChallengeAssistState {
  consecutiveFailures: number;
  activeAssists: Set<AssistFlag>;
  nearMissBonusSeconds: number | null;
  /** Timestamps (ms since epoch) of quits on this challenge. */
  quitTimestamps: number[];
}

let _state: Map<number, ChallengeAssistState> = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreate(challengeNumber: number): ChallengeAssistState {
  if (!_state.has(challengeNumber)) {
    _state.set(challengeNumber, {
      consecutiveFailures: 0,
      activeAssists: new Set(),
      nearMissBonusSeconds: null,
      quitTimestamps: [],
    });
  }
  return _state.get(challengeNumber)!;
}

/** Count quits within the last 5 minutes for a challenge. */
function recentQuitCount(challengeState: ChallengeAssistState): number {
  const cutoff = Date.now() - 5 * 60 * 1000;
  return challengeState.quitTimestamps.filter((t) => t >= cutoff).length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record the result of a completed attempt (win or loss).
 *
 * Updates assist flags based on the attempt outcome.
 *
 * @param result  The outcome of the attempt.
 */
function recordAttempt(result: AttemptResult): void {
  const cs = getOrCreate(result.challengeNumber);

  if (result.timerExpired) {
    // Failure — increment consecutive failure count.
    cs.consecutiveFailures++;
    SessionAnalyzer.recordChallengeFrustration(result.challengeNumber);

    // proximity_glow: activate after 2+ consecutive failures.
    if (cs.consecutiveFailures >= PROXIMITY_GLOW_FAILURE_THRESHOLD) {
      cs.activeAssists.add('proximity_glow');
    }

    // near_miss_bonus: 1 ring away when timer expired.
    if (
      result.totalRequired > 0 &&
      result.ringsPlaced === result.totalRequired - 1
    ) {
      cs.activeAssists.add('near_miss_bonus');
      cs.nearMissBonusSeconds = NEAR_MISS_BONUS_SECONDS;
    }
  } else {
    // Win — reset consecutive failures.
    cs.consecutiveFailures = 0;
  }
}

/**
 * Record a quit event for a challenge.
 *
 * @param progress  Current in-progress state when the player quit.
 */
function recordQuit(progress: AttemptProgress): void {
  const cs = getOrCreate(progress.challengeNumber);
  cs.quitTimestamps.push(Date.now());
  SessionAnalyzer.recordChallengeQuit(progress.challengeNumber);

  // show_skip_option: 3+ quits in the last 5 minutes on the same challenge.
  if (recentQuitCount(cs) >= SKIP_OPTION_QUIT_THRESHOLD) {
    cs.activeAssists.add('show_skip_option');
  }
}

/**
 * Returns the set of currently active assist flags for the most recently
 * active challenge. Also checks real-time input rate for confusion_hint.
 *
 * Note: this checks the input rate at call time, so call it from the game
 * loop or a periodic timer rather than on every render.
 *
 * @returns  Array of active AssistFlag strings.
 */
function getActiveAssists(): AssistFlag[] {
  // Find the most recently used challenge state.
  const challengeNumbers = Array.from(_state.keys());
  if (challengeNumbers.length === 0) return [];

  const latestChallenge = challengeNumbers[challengeNumbers.length - 1];
  const cs = _state.get(latestChallenge)!;

  // Dynamically check input rate for confusion_hint.
  const inputRate = PlayerBehaviorMonitor.getInputRate(CONFUSION_INPUT_RATE_WINDOW_MS);
  if (inputRate < CONFUSION_INPUT_RATE_THRESHOLD) {
    cs.activeAssists.add('confusion_hint');
  } else {
    cs.activeAssists.delete('confusion_hint');
  }

  return Array.from(cs.activeAssists);
}

/**
 * Returns the active assists for a specific challenge number.
 *
 * @param challengeNumber  The challenge to query.
 */
function getActiveAssistsForChallenge(challengeNumber: number): AssistFlag[] {
  const cs = _state.get(challengeNumber);
  if (!cs) return [];
  return Array.from(cs.activeAssists);
}

/**
 * Returns true if the "skip this challenge?" option should be shown.
 * Based on the most recently active challenge.
 */
function shouldShowSkipOption(): boolean {
  const challengeNumbers = Array.from(_state.keys());
  if (challengeNumbers.length === 0) return false;
  const latestChallenge = challengeNumbers[challengeNumbers.length - 1];
  const cs = _state.get(latestChallenge)!;
  return cs.activeAssists.has('show_skip_option');
}

/**
 * Returns the near-miss bonus seconds if the near_miss_bonus assist is active,
 * or null if it is not.
 */
function getNearMissBonusSeconds(): number | null {
  const challengeNumbers = Array.from(_state.keys());
  if (challengeNumbers.length === 0) return null;
  const latestChallenge = challengeNumbers[challengeNumbers.length - 1];
  const cs = _state.get(latestChallenge)!;
  if (cs.activeAssists.has('near_miss_bonus')) {
    return cs.nearMissBonusSeconds ?? NEAR_MISS_BONUS_SECONDS;
  }
  return null;
}

/**
 * Reset all assist state for a specific challenge number.
 * Call when the player starts a new attempt or moves to a different challenge.
 *
 * @param challengeNumber  The challenge to reset.
 */
function reset(challengeNumber: number): void {
  _state.delete(challengeNumber);
}

/**
 * Reset all assist state across all challenges.
 * Call on session end.
 */
function resetAll(): void {
  _state = new Map();
  PlayerBehaviorMonitor.reset();
  SessionAnalyzer.reset();
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const AdaptiveAssistController = {
  recordAttempt,
  recordQuit,
  getActiveAssists,
  getActiveAssistsForChallenge,
  shouldShowSkipOption,
  getNearMissBonusSeconds,
  reset,
  resetAll,
} as const;
