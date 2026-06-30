/**
 * WinCondition.ts
 *
 * Evaluates whether all required ring–peg pairs are settled on each physics
 * tick and fires a win callback after a continuous 500 ms stability window.
 *
 * Algorithm:
 *  - Each tick receives the current peg states (which rings are settled) and
 *    the required ring–peg pairs from the ChallengeConfig.
 *  - If every required ring is settled on its matching peg: increment
 *    stableTimer by dt.
 *  - If any required ring is NOT settled: reset stableTimer to 0.
 *  - Once stableTimer >= WIN_STABLE_WINDOW_MS (500 ms), fire the win callback
 *    and mark as triggered so it only fires once.
 *
 * Requirements: 9.1, 23.5
 */

import type { ChallengeConfig, PegState } from '../../../types/challenge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Continuous stability window required before declaring a win (ms). */
export const WIN_STABLE_WINDOW_MS = 500;

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * A required ring–peg pair: the ring identified by `ringId` must be settled
 * on the peg identified by `pegId` for the win condition to be satisfied.
 */
export interface RingPegPair {
  ringId: string;
  pegId: string;
}

/** Result returned by each call to `checkWinCondition`. */
export interface WinCheckResult {
  /** True when the win has just been triggered this tick. */
  didWin: boolean;
  /** How many ms the stable state has been maintained (0 if not stable). */
  stableElapsedMs: number;
  /** True when all required rings are currently settled. */
  allSettled: boolean;
}

// ---------------------------------------------------------------------------
// WinCondition state — one instance per active challenge
// ---------------------------------------------------------------------------

interface WinConditionState {
  /** Required ring–peg pairs derived from the ChallengeConfig. */
  requiredPairs: RingPegPair[];
  /** Accumulated stable time in ms. Reset whenever the condition breaks. */
  stableTimerMs: number;
  /** Set to true once the win has been fired; prevents double-firing. */
  winTriggered: boolean;
}

let _state: WinConditionState | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive required ring–peg pairs from a ChallengeConfig.
 * For each non-decoy ring there should be a matching peg with the same colorId.
 * We pair them by matching ring.colorId === peg.acceptedColorId.
 * If a ring has no matching peg (misconfigured challenge) it is ignored —
 * solvability validation should have caught this earlier.
 */
function deriveRequiredPairs(config: ChallengeConfig): RingPegPair[] {
  const pairs: RingPegPair[] = [];
  for (const ring of config.rings) {
    if (ring.isDecoy) {
      continue;
    }
    const matchingPeg = config.pegs.find((p) => p.acceptedColorId === ring.colorId);
    if (matchingPeg) {
      pairs.push({ ringId: ring.id, pegId: matchingPeg.id });
    }
  }
  return pairs;
}

/**
 * Check whether every required ring is settled on its matching peg.
 */
function areAllPairsSettled(
  requiredPairs: RingPegPair[],
  pegStates: PegState[],
): boolean {
  const pegStateMap = new Map<string, string | null>();
  for (const ps of pegStates) {
    pegStateMap.set(ps.id, ps.settledRingId);
  }

  for (const pair of requiredPairs) {
    const settledRingId = pegStateMap.get(pair.pegId);
    if (settledRingId !== pair.ringId) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize (or reset) the win condition state for a new challenge.
 * Must be called at the start of each challenge before any tick.
 *
 * Requirements: 9.1
 */
function initialize(config: ChallengeConfig): void {
  _state = {
    requiredPairs: deriveRequiredPairs(config),
    stableTimerMs: 0,
    winTriggered: false,
  };
}

/**
 * Evaluate the win condition for the current tick.
 *
 * @param pegStates — current peg occupancy states from PhysicsWorld
 * @param dt        — elapsed time for this tick in milliseconds (typically 16.67)
 * @param onWin     — callback fired exactly once when the win condition is met
 *
 * Returns a WinCheckResult with diagnostics useful for tests and debug overlays.
 *
 * Requirements: 9.1, 23.5
 */
function checkWinCondition(
  pegStates: PegState[],
  dt: number,
  onWin: () => void,
): WinCheckResult {
  if (!_state) {
    // No active challenge — nothing to check.
    return { didWin: false, stableElapsedMs: 0, allSettled: false };
  }

  // Win already triggered — no further action needed.
  if (_state.winTriggered) {
    return { didWin: false, stableElapsedMs: _state.stableTimerMs, allSettled: true };
  }

  // A challenge with no required pairs (all decoys) is considered immediately won.
  const allSettled =
    _state.requiredPairs.length === 0 ||
    areAllPairsSettled(_state.requiredPairs, pegStates);

  if (allSettled) {
    _state.stableTimerMs += dt;
  } else {
    _state.stableTimerMs = 0;
  }

  if (allSettled && _state.stableTimerMs >= WIN_STABLE_WINDOW_MS) {
    _state.winTriggered = true;
    onWin();
    return { didWin: true, stableElapsedMs: _state.stableTimerMs, allSettled: true };
  }

  return { didWin: false, stableElapsedMs: _state.stableTimerMs, allSettled };
}

/**
 * Reset win condition state — call when challenge ends, user retries, or
 * a continue is granted.
 *
 * Requirements: 9.1
 */
function reset(): void {
  _state = null;
}

/**
 * Retrieve the current stable timer value (ms) for debugging and tests.
 */
function getStableTimerMs(): number {
  return _state?.stableTimerMs ?? 0;
}

/**
 * True if the win has already been triggered for the current challenge.
 */
function isWinTriggered(): boolean {
  return _state?.winTriggered ?? false;
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const WinCondition = {
  initialize,
  checkWinCondition,
  reset,
  getStableTimerMs,
  isWinTriggered,
  /** Exposed for testing — derived pairs from the last initialize() call. */
  getRequiredPairs: (): RingPegPair[] => _state?.requiredPairs ?? [],
} as const;
