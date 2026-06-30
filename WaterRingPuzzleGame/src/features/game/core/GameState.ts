/**
 * GameState.ts
 *
 * Pure-data snapshot type and serialisation helpers for the active game state.
 *
 * The GameLoop (GameLoop.ts, 749 lines) drives physics and owns the live
 * simulation. This module provides a serialisable snapshot that can be
 * persisted to MMKV, diffed for dirty-flag rendering, and sent to analytics.
 *
 * All exports are pure functions — no side effects, no store access.
 *
 * Requirements: 9.3, 9.6, 18.3, 18.4
 */

import type {
  ChallengeConfig,
  RingPosition,
  RingVelocity,
  PegState,
  WinLossState,
} from '../../../types/challenge';

// Re-export ChallengeConfig so callers that need it can import from one place.
export type { ChallengeConfig };

// ---------------------------------------------------------------------------
// GameStateSnapshot
// ---------------------------------------------------------------------------

/**
 * A point-in-time, fully serialisable snapshot of active challenge state.
 * Produced by the GameLoop at 1-second checkpoints (Requirement 9.3) and on
 * terminal events (win / loss / continue).
 */
export interface GameStateSnapshot {
  /** Canonical challenge number (matches ChallengeConfig.challengeNumber). */
  challengeNumber: number;
  /** Timer value in seconds at the moment of the snapshot. */
  timerRemaining: number;
  /** Live ring positions (position + rotation). */
  ringPositions: RingPosition[];
  /** Live ring velocities (linear + angular). */
  ringVelocities: RingVelocity[];
  /** Live peg states (which ring has settled on each peg). */
  pegStates: PegState[];
  /** Win/loss lifecycle state at the moment of the snapshot. */
  winLossState: WinLossState;
  /** Number of continues consumed in this challenge session. */
  continueCount: number;
  /** Number of ring-press events fired by the player so far. */
  pressCount: number;
  /** Active adaptive assist flags (AssistFlag identifiers). */
  adaptiveAssistFlags: string[];
  /** Unix timestamp (ms) when this snapshot was created. */
  snapshotAt: number;
}

// ---------------------------------------------------------------------------
// IDLE_SNAPSHOT — zero / default sentinel
// ---------------------------------------------------------------------------

/**
 * Zero-value snapshot representing the "no active challenge" state.
 * Useful as an initial value before any challenge is loaded.
 */
export const IDLE_SNAPSHOT: GameStateSnapshot = {
  challengeNumber: 0,
  timerRemaining: 0,
  ringPositions: [],
  ringVelocities: [],
  pegStates: [],
  winLossState: 'idle',
  continueCount: 0,
  pressCount: 0,
  adaptiveAssistFlags: [],
  snapshotAt: 0,
};

// ---------------------------------------------------------------------------
// createSnapshot
// ---------------------------------------------------------------------------

/**
 * Build a new snapshot from the supplied parameters, stamping snapshotAt
 * with the current wall-clock time.
 */
export function createSnapshot(
  params: Omit<GameStateSnapshot, 'snapshotAt'>,
): GameStateSnapshot {
  return {
    ...params,
    snapshotAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/**
 * Returns true while a challenge is actively being played.
 * False during idle, victory, and defeat states.
 */
export function isActiveGame(snapshot: GameStateSnapshot): boolean {
  return snapshot.winLossState === 'playing';
}

/**
 * Returns true when the challenge has reached a terminal outcome
 * (won or lost). False for 'idle' and 'playing'.
 */
export function isTerminal(snapshot: GameStateSnapshot): boolean {
  return snapshot.winLossState === 'won' || snapshot.winLossState === 'lost';
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

/**
 * Serialise a snapshot to a JSON string suitable for MMKV storage or
 * network transmission.
 */
export function serializeSnapshot(snapshot: GameStateSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Deserialise a JSON string back into a GameStateSnapshot.
 * Returns null if the string is malformed or the parse throws.
 */
export function deserializeSnapshot(raw: string): GameStateSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as GameStateSnapshot;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// diffSnapshots
// ---------------------------------------------------------------------------

/**
 * Compute a shallow diff between two snapshots.
 * Returns an object containing only the keys whose values differ between
 * `prev` and `next`. Array-valued keys are compared by reference (same
 * array reference = unchanged), which matches the GameLoop's update pattern
 * of replacing arrays on each tick.
 */
export function diffSnapshots(
  prev: GameStateSnapshot,
  next: GameStateSnapshot,
): Partial<GameStateSnapshot> {
  const diff: Partial<GameStateSnapshot> = {};

  (Object.keys(next) as Array<keyof GameStateSnapshot>).forEach((key) => {
    if (prev[key] !== next[key]) {
      // Cast required because TypeScript cannot narrow the union of all value
      // types when iterating over keys generically.
      (diff as Record<string, unknown>)[key] = next[key];
    }
  });

  return diff;
}
