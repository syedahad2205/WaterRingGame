/**
 * DifficultyCalculator
 *
 * Pure, side-effect-free module that computes the deterministic difficulty
 * score D(N) for a given challenge number N and derives all component
 * parameters from it.
 *
 * Design reference: design.md § Difficulty System (Algorithm 2)
 * Requirements: 11.2
 *
 * No imports except from src/constants/ — no state, no network, no side effects.
 */

import {
  D_MAX_PHASE1,
  D_CEILING,
  PHASE1_CAP,
  SCALE_FACTOR,
  TIMER_BASE_MAX_SECONDS,
  TIMER_BASE_RANGE_SECONDS,
  REQUIRED_RINGS_ND_COEFFICIENT,
  REQUIRED_RINGS_MIN,
  REQUIRED_RINGS_MAX,
  DECOY_RINGS_ND_COEFFICIENT,
  DECOY_RINGS_MIN,
  DECOY_RINGS_MAX,
  MAX_OBSTACLES,
  MODIFIER_CHANCE_ND_COEFFICIENT,
  MAX_MODIFIER_CHANCE,
  CURRENT_STRENGTH_ND_COEFFICIENT,
  REWARD_MULTIPLIER_BASE,
  REWARD_MULTIPLIER_ND_COEFFICIENT,
  PEG_RADIUS_REDUCTION_FACTOR,
  PEG_SPACING_REDUCTION_FACTOR,
} from '@constants/difficulty';

// ─── Core Difficulty Score ──────────────────────────────────────────────────

/**
 * Compute the two-phase difficulty score D(N) for challenge number N.
 *
 * Phase 1 (N ≤ 1000): logarithmic ramp from ~0 to 50.
 *   D(N) = D_MAX_PHASE1 × log(1 + N) / log(1 + PHASE1_CAP)
 *
 * Phase 2 (N > 1000): exponential approach toward D_CEILING (100).
 *   D(N) = D_MAX_PHASE1 + (D_CEILING - D_MAX_PHASE1) × (1 − exp(−(N−1000) / SCALE_FACTOR))
 *
 * Postconditions:
 *   - D(N+1) ≥ D(N)  (non-decreasing)
 *   - 0 ≤ D(N) ≤ 100
 *
 * @param challengeNumber - Challenge number N, must be ≥ 1.
 * @returns Difficulty score in the range [0, 100].
 */
export function difficultyScore(challengeNumber: number): number {
  if (challengeNumber <= PHASE1_CAP) {
    return D_MAX_PHASE1 * Math.log(1 + challengeNumber) / Math.log(1 + PHASE1_CAP);
  }
  return (
    D_MAX_PHASE1 +
    (D_CEILING - D_MAX_PHASE1) * (1 - Math.exp(-(challengeNumber - PHASE1_CAP) / SCALE_FACTOR))
  );
}

/**
 * Normalized difficulty ND(N) = D(N) / D_CEILING, always in [0.0, 1.0].
 *
 * All component formula parameters are expressed in terms of ND.
 *
 * @param challengeNumber - Challenge number N, must be ≥ 1.
 * @returns Normalized difficulty in [0.0, 1.0].
 */
export function normalizedDifficulty(challengeNumber: number): number {
  return difficultyScore(challengeNumber) / D_CEILING;
}

// ─── Component Formulas ─────────────────────────────────────────────────────
//
// All functions below accept the raw difficulty score D (not ND or N) as their
// first argument so callers only need to compute D(N) once and can pass it
// into any component formula without repeating the lookup.

/**
 * Compute the base timer duration in seconds.
 *
 * TimerBase(D) = 180 − 120 × ND
 * Minimum: 45 seconds
 *
 * @param d - Difficulty score in [0, 100].
 * @returns Timer duration in seconds.
 */
export function timerBase(d: number): number {
  const nd = d / D_CEILING;
  const raw = TIMER_BASE_MAX_SECONDS - TIMER_BASE_RANGE_SECONDS * nd;
  return Math.max(45, raw);
}

/**
 * Compute the number of required (non-decoy) rings.
 *
 * RequiredRings = clamp(1 + floor(ND × 5), 1, 6)
 *
 * @param d - Difficulty score in [0, 100].
 * @returns Required ring count in [1, 6].
 */
export function requiredRings(d: number): number {
  const nd = d / D_CEILING;
  const value = 1 + Math.floor(nd * REQUIRED_RINGS_ND_COEFFICIENT);
  return Math.min(REQUIRED_RINGS_MAX, Math.max(REQUIRED_RINGS_MIN, value));
}

/**
 * Compute the number of decoy (non-target) rings.
 *
 * DecoyRings = clamp(floor(ND × 4), 0, 4)
 *
 * @param d - Difficulty score in [0, 100].
 * @returns Decoy ring count in [0, 4].
 */
export function decoyRings(d: number): number {
  const nd = d / D_CEILING;
  const value = Math.floor(nd * DECOY_RINGS_ND_COEFFICIENT);
  return Math.min(DECOY_RINGS_MAX, Math.max(DECOY_RINGS_MIN, value));
}

/**
 * Compute the total ring count (required + decoy).
 *
 * @param d - Difficulty score in [0, 100].
 * @returns Total ring count.
 */
export function totalRings(d: number): number {
  return requiredRings(d) + decoyRings(d);
}

/**
 * Compute the obstacle count.
 *
 * ObstacleCount = floor(ND × 6)
 * First obstacle appears when D > 10.
 *
 * @param d - Difficulty score in [0, 100].
 * @returns Obstacle count in [0, 6].
 */
export function obstacleCount(d: number): number {
  if (d <= 10) {
    return 0;
  }
  const nd = d / D_CEILING;
  return Math.floor(nd * MAX_OBSTACLES);
}

/**
 * Compute the probability that a physics modifier is active for this challenge.
 *
 * ModifierChance = min(0.6, ND × 0.8)
 *
 * @param d - Difficulty score in [0, 100].
 * @returns Modifier activation probability in [0.0, 0.6].
 */
export function modifierChance(d: number): number {
  const nd = d / D_CEILING;
  return Math.min(MAX_MODIFIER_CHANCE, nd * MODIFIER_CHANCE_ND_COEFFICIENT);
}

/**
 * Compute the current strength multiplier applied to the base water current.
 *
 * MaxCurrentStrength = BASE_CURRENT × (1 + 2 × ND)
 *
 * This function returns the multiplier `(1 + 2 × ND)` — the caller multiplies
 * their base current value by this result.
 *
 * @param d - Difficulty score in [0, 100].
 * @returns Multiplier ≥ 1.0.
 */
export function currentStrengthMultiplier(d: number): number {
  const nd = d / D_CEILING;
  return 1 + CURRENT_STRENGTH_ND_COEFFICIENT * nd;
}

/**
 * Compute the coin reward multiplier for completing this challenge.
 *
 * RewardMultiplier = 1.0 + 3.0 × ND
 *
 * @param d - Difficulty score in [0, 100].
 * @returns Reward multiplier ≥ 1.0.
 */
export function rewardMultiplier(d: number): number {
  const nd = d / D_CEILING;
  return REWARD_MULTIPLIER_BASE + REWARD_MULTIPLIER_ND_COEFFICIENT * nd;
}

/**
 * Compute the peg base radius as a fraction of the supplied maximum radius.
 *
 * PegBaseRadius = maxRadius × (1 − 0.5 × ND)
 *
 * @param d - Difficulty score in [0, 100].
 * @param maxRadius - Maximum peg radius in layout units.
 * @returns Peg radius in the same units as maxRadius.
 */
export function pegBaseRadius(d: number, maxRadius: number): number {
  const nd = d / D_CEILING;
  return maxRadius * (1 - PEG_RADIUS_REDUCTION_FACTOR * nd);
}

/**
 * Compute the minimum peg-to-peg spacing as a fraction of the maximum spacing.
 *
 * MinPegSpacing = maxSpacing × (1 − 0.4 × ND)
 *
 * @param d - Difficulty score in [0, 100].
 * @param maxSpacing - Maximum peg spacing in layout units.
 * @returns Minimum spacing in the same units as maxSpacing.
 */
export function minPegSpacing(d: number, maxSpacing: number): number {
  const nd = d / D_CEILING;
  return maxSpacing * (1 - PEG_SPACING_REDUCTION_FACTOR * nd);
}
