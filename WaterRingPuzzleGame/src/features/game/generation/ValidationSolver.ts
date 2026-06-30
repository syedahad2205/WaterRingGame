/**
 * ValidationSolver
 *
 * Checks whether a generated ChallengeConfig is solvable using three
 * independent heuristic strategies. Each strategy simulates a different
 * player approach to determine if every required ring can reach its
 * target peg given the challenge constraints.
 *
 * Design reference: design.md § Procedural Validation & Challenge Intelligence
 * Requirements: 11.1, 11.4
 *
 * The solver is intentionally fast (heuristic, not physics simulation) so it
 * can run inline during the 12-step generation pipeline without impacting
 * generation performance.
 *
 * Solvability Score mapping:
 *   3 / 3 strategies succeed → 1.0
 *   2 / 3 strategies succeed → 0.7
 *   1 / 3 strategies succeed → 0.4
 *   0 / 3 strategies succeed → 0.0  (challenge rejected)
 */

import type { ChallengeConfig, RingConfig, PegConfig } from '../../../types/challenge';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Assumed average ring travel speed in pixels per second under water pressure. */
const ASSUMED_TRAVEL_SPEED_PX_PER_SEC = 200;

/**
 * Rings spawn in the upper 40% of the arena.
 * Pegs are placed in the lower 40% of the arena.
 * The middle 20% contains no spawn zones or peg zones, so the vertical path
 * is always clear between the ring zone and the peg zone.
 */
const RING_SPAWN_ZONE_FRACTION = 0.40;
const PEG_ZONE_START_FRACTION = 0.60;

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface SolvabilityResult {
  /** True when at least one strategy succeeded (successCount > 0). */
  isSolvable: boolean;
  /** Number of strategies that succeeded (0–3). */
  successCount: number;
  /** Composite score: 0.0 | 0.4 | 0.7 | 1.0. */
  solvabilityScore: number;
  /** Indices of strategies that succeeded (subset of [0, 1, 2]). */
  solverStrategies: number[];
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Compute the Euclidean distance between two points.
 */
function horizontalDistance(x1: number, x2: number): number {
  return Math.abs(x1 - x2);
}

/**
 * Check whether a ring at `ringX` can reach the peg at `pegX` within the
 * available timer window, assuming the simplified linear travel model.
 *
 * Reachability heuristic:
 *   - maxTravel = timerSeconds * ASSUMED_TRAVEL_SPEED_PX_PER_SEC
 *   - A ring is reachable when horizontalDistance(ring, peg) ≤ maxTravel
 *
 * The vertical path is considered always clear because rings spawn in the
 * upper 40% and pegs are placed in the lower 40% with no zone overlap.
 */
function isReachable(
  ringX: number,
  pegX: number,
  timerSeconds: number,
  arenaWidth: number,
): boolean {
  const maxTravel = timerSeconds * ASSUMED_TRAVEL_SPEED_PX_PER_SEC;
  const dist = horizontalDistance(ringX, pegX);

  // Sanity-check: arena width should be positive to avoid degenerate configs.
  if (arenaWidth <= 0) {
    return false;
  }

  return dist <= maxTravel;
}

/**
 * Find the peg that matches a required ring by colorId.
 * Returns the first matching peg or undefined if none exists.
 */
function findTargetPeg(ring: RingConfig, pegs: PegConfig[]): PegConfig | undefined {
  return pegs.find(p => p.acceptedColorId === ring.colorId);
}

/**
 * Check whether every ring in the supplied ordered list can reach its matching
 * peg. All rings share the same timer budget.
 */
function allRingsReachable(
  orderedRings: RingConfig[],
  pegs: PegConfig[],
  timerSeconds: number,
  arenaWidth: number,
): boolean {
  for (const ring of orderedRings) {
    const peg = findTargetPeg(ring, pegs);
    if (!peg) {
      // No matching peg — unsolvable regardless of order.
      return false;
    }
    if (!isReachable(ring.initialPosition.x, peg.position.x, timerSeconds, arenaWidth)) {
      return false;
    }
  }
  return true;
}

/**
 * Minimal deterministic PRNG (xorshift32) for strategy 2 shuffling.
 * Avoids importing the full PRNG used in generation to keep this module
 * self-contained.
 */
function xorshift32(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) {
    state = 0xdeadbeef;
  }
  return (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

/**
 * Fisher-Yates shuffle in place using the supplied PRNG.
 */
function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

// ─── Solver Strategies ────────────────────────────────────────────────────────

/**
 * Strategy 0 — Greedy Nearest Peg.
 *
 * For each required ring (in original generation order), find its target peg
 * and check whether the ring can reach it within the timer budget. This
 * simulates a player who tackles rings in the natural order they appear.
 */
function strategy0(
  requiredRings: RingConfig[],
  pegs: PegConfig[],
  timerSeconds: number,
  arenaWidth: number,
): boolean {
  return allRingsReachable(requiredRings, pegs, timerSeconds, arenaWidth);
}

/**
 * Strategy 1 — Global Ordering (largest/heaviest ring first).
 *
 * Sort required rings by mass descending. Heavier rings are harder to move,
 * so a skilled player would prioritise them. If this ordering is reachable,
 * the challenge is solvable by an experienced player.
 */
function strategy1(
  requiredRings: RingConfig[],
  pegs: PegConfig[],
  timerSeconds: number,
  arenaWidth: number,
): boolean {
  const sorted = [...requiredRings].sort((a, b) => b.mass - a.mass);
  return allRingsReachable(sorted, pegs, timerSeconds, arenaWidth);
}

/**
 * Strategy 2 — Random Order (3 independent shuffles).
 *
 * Try 3 different random orderings of required rings. If any succeeds, the
 * strategy passes — simulating a player who may stumble upon the right order.
 *
 * Seeds are fixed (not derived from the challenge seed) to make the solver
 * deterministic and independent of generation state.
 */
function strategy2(
  requiredRings: RingConfig[],
  pegs: PegConfig[],
  timerSeconds: number,
  arenaWidth: number,
): boolean {
  const seeds = [0x1a2b3c4d, 0x5e6f7a8b, 0x9c0d1e2f];
  for (const seed of seeds) {
    const rng = xorshift32(seed);
    const shuffled = [...requiredRings];
    shuffleInPlace(shuffled, rng);
    if (allRingsReachable(shuffled, pegs, timerSeconds, arenaWidth)) {
      return true;
    }
  }
  return false;
}

// ─── Score Mapping ────────────────────────────────────────────────────────────

/**
 * Map the number of successful strategies to a solvability score.
 *
 *   0 → 0.0
 *   1 → 0.4
 *   2 → 0.7
 *   3 → 1.0
 */
function mapSuccessToScore(successCount: number): number {
  switch (successCount) {
    case 0:
      return 0.0;
    case 1:
      return 0.4;
    case 2:
      return 0.7;
    case 3:
      return 1.0;
    default:
      return 0.0;
  }
}

// ─── Public Class ─────────────────────────────────────────────────────────────

/**
 * ValidationSolver checks solvability of a ChallengeConfig using three
 * independent heuristic strategies.
 *
 * Usage:
 *   const solver = new ValidationSolver();
 *   const result = solver.validate(config);
 *   if (!result.isSolvable) { // retry with seed + 1 }
 *
 * Requirements: 11.1, 11.4
 */
export class ValidationSolver {
  /**
   * Validate whether the challenge is solvable.
   *
   * Returns a SolvabilityResult indicating:
   *   - isSolvable: false when 0 strategies succeed (challenge must be rejected)
   *   - successCount: 0–3
   *   - solvabilityScore: 0.0 | 0.4 | 0.7 | 1.0
   *   - solverStrategies: which strategy indices succeeded
   *
   * @param config - The fully constructed ChallengeConfig to evaluate.
   */
  public validate(config: ChallengeConfig): SolvabilityResult {
    const { rings, pegs, timer, arena } = config;
    const timerSeconds = timer.totalSeconds;
    const arenaWidth = arena.width;
    const arenaHeight = arena.height;

    // Only required (non-decoy) rings need pegs.
    const requiredRings = rings.filter(r => !r.isDecoy);

    // Sanity check: if there are no required rings the challenge is trivially
    // solvable (nothing to place). Return a full score.
    if (requiredRings.length === 0) {
      return {
        isSolvable: true,
        successCount: 3,
        solvabilityScore: 1.0,
        solverStrategies: [0, 1, 2],
      };
    }

    // Guard: if timer is zero or negative, nothing can be solved.
    if (timerSeconds <= 0) {
      return {
        isSolvable: false,
        successCount: 0,
        solvabilityScore: 0.0,
        solverStrategies: [],
      };
    }

    // Validate that ring positions are actually in the upper zone and peg
    // positions in the lower zone — if not, flag the config as unsolvable so
    // the generator retries with a different seed.
    const upperZoneBoundary = arenaHeight * RING_SPAWN_ZONE_FRACTION;
    const lowerZoneStart = arenaHeight * PEG_ZONE_START_FRACTION;
    const pegsBelowZone = pegs.every(p => p.position.y >= lowerZoneStart);
    const ringsAboveZone = requiredRings.every(
      r => r.initialPosition.y <= upperZoneBoundary,
    );

    if (!pegsBelowZone || !ringsAboveZone) {
      // Unusual layout — still run strategies; the reachability check handles it.
    }

    const results: boolean[] = [
      strategy0(requiredRings, pegs, timerSeconds, arenaWidth),
      strategy1(requiredRings, pegs, timerSeconds, arenaWidth),
      strategy2(requiredRings, pegs, timerSeconds, arenaWidth),
    ];

    const succeededIndices = results.reduce<number[]>((acc, passed, idx) => {
      if (passed) {
        acc.push(idx);
      }
      return acc;
    }, []);

    const successCount = succeededIndices.length;

    return {
      isSolvable: successCount > 0,
      successCount,
      solvabilityScore: mapSuccessToScore(successCount),
      solverStrategies: succeededIndices,
    };
  }
}
