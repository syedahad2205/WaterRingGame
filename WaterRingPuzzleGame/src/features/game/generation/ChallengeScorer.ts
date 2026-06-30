/**
 * ChallengeScorer
 *
 * Computes a composite quality score for a generated ChallengeConfig, given
 * the result from the ValidationSolver.
 *
 * Design reference: design.md § Procedural Validation & Challenge Intelligence
 * Requirements: 11.1, 11.5
 *
 * Quality Formula:
 *   QualityScore = 0.30 × solvability
 *                + 0.25 × fun
 *                + 0.20 × fairness
 *                + 0.15 × variety
 *                + 0.10 × pacing
 *
 * A challenge meets the quality threshold when overall >= QUALITY_THRESHOLD (0.65).
 * Challenges below the threshold are retried or difficulty-reduced per Requirement 11.5.
 */

import type { ChallengeConfig } from '../../../types/challenge';
import type { SolvabilityResult } from './ValidationSolver';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum overall score a challenge must achieve to be accepted. */
export const QUALITY_THRESHOLD = 0.65;

/** Timer utilization ideal range: [LOW, HIGH]. */
const TIMER_UTIL_IDEAL_LOW = 0.5;
const TIMER_UTIL_IDEAL_HIGH = 0.8;

/** Movement diversity breakpoints (ring count → score). */
const RING_COUNT_SCORES: [number, number][] = [
  [1, 0.3],
  [2, 0.55],
  [3, 0.75],
  [4, 1.0],
];

/**
 * Number of distinct size tiers present → size variety score.
 * 1 tier = 0.4, 2 tiers = 0.7, 3 tiers = 1.0
 */
const SIZE_TIER_SCORES: Record<number, number> = {
  1: 0.4,
  2: 0.7,
  3: 1.0,
};

/** Base fun score constant. */
const FUN_BASE_SCORE = 0.8;

/** Fairness base score when a specific condition isn't fully met. */
const FAIRNESS_BASE_SCORE = 0.7;

/** Variety score: fixed placeholder (history context not available). */
const VARIETY_PLACEHOLDER = 0.8;

/** Pacing score: fixed placeholder. */
const PACING_PLACEHOLDER = 0.8;

/** Difficulty threshold below which ring count is considered "reasonable". */
const ND_RING_COUNT_THRESHOLD = 0.5;

/** Max ring count considered reasonable for challenges below the ND threshold. */
const REASONABLE_RING_COUNT_FOR_EASY = 4;

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ChallengeQualityScore {
  /** Composite weighted score in [0.0, 1.0]. */
  overall: number;
  /** Solvability component (from SolvabilityResult). */
  solvability: number;
  /** Fun component. */
  fun: number;
  /** Fairness component. */
  fairness: number;
  /** Variety component (placeholder 0.8 until session-aware tracking). */
  variety: number;
  /** Pacing component (placeholder 0.8 until challenge-number tracking). */
  pacing: number;
  /** True when overall >= QUALITY_THRESHOLD. */
  meetsThreshold: boolean;
}

// ─── Component Scorers ───────────────────────────────────────────────────────

/**
 * SolvabilityScore (0.0–1.0)
 *
 * Directly maps the SolvabilityResult.solvabilityScore from the ValidationSolver.
 * 3 strategies → 1.0, 2 → 0.7, 1 → 0.4, 0 → 0.0.
 */
function computeSolvabilityScore(solverResult: SolvabilityResult): number {
  return solverResult.solvabilityScore;
}

/**
 * FunScore (0.0–1.0)
 *
 * Fun = 0.3 × timerUtilization
 *     + 0.3 × movementDiversity
 *     + 0.2 × sizeVariety
 *     + 0.2 × baseScore (constant 0.8)
 *
 * timerUtilizationScore:
 *   - estimatedSolveTime / totalSeconds in [0.5, 0.8] → 1.0
 *   - Outside that range → linearly scaled down toward 0.
 *
 * movementDiversityScore:
 *   - Based on required ring count (more rings = more movement variety).
 *   - 1 ring → 0.3, 2 rings → 0.55, 3 rings → 0.75, 4+ rings → 1.0
 *
 * sizeVarietyScore:
 *   - Count distinct size tiers among required rings.
 *   - 1 tier → 0.4, 2 tiers → 0.7, 3 tiers → 1.0
 */
function computeFunScore(config: ChallengeConfig): number {
  const { rings, timer, intelligenceMetadata } = config;
  const requiredRings = rings.filter(r => !r.isDecoy);
  const totalSeconds = timer.totalSeconds;

  // Timer utilization score
  let timerUtilScore = 0.0;
  if (totalSeconds > 0) {
    const utilRatio = intelligenceMetadata.estimatedSolveTimeSecs / totalSeconds;
    if (utilRatio >= TIMER_UTIL_IDEAL_LOW && utilRatio <= TIMER_UTIL_IDEAL_HIGH) {
      timerUtilScore = 1.0;
    } else if (utilRatio < TIMER_UTIL_IDEAL_LOW) {
      // Below ideal: scale from 0 at 0 to 1 at 0.5
      timerUtilScore = utilRatio / TIMER_UTIL_IDEAL_LOW;
    } else {
      // Above ideal: scale from 1 at 0.8 to 0 at 1.6 (and beyond)
      const excess = utilRatio - TIMER_UTIL_IDEAL_HIGH;
      const range = 1.0 - TIMER_UTIL_IDEAL_HIGH; // 0.2
      timerUtilScore = Math.max(0, 1.0 - excess / range);
    }
  }

  // Movement diversity score (by required ring count)
  const ringCount = requiredRings.length;
  let movementDivScore = 0.3; // floor
  for (const [threshold, score] of RING_COUNT_SCORES) {
    if (ringCount >= threshold) {
      movementDivScore = score;
    }
  }

  // Size variety score (count distinct size tiers)
  const distinctTiers = new Set(requiredRings.map(r => r.sizeCategory)).size;
  const sizeVarietyScore = SIZE_TIER_SCORES[Math.min(distinctTiers, 3)] ?? 0.4;

  const funScore =
    0.3 * timerUtilScore +
    0.3 * movementDivScore +
    0.2 * sizeVarietyScore +
    0.2 * FUN_BASE_SCORE;

  return Math.min(1.0, Math.max(0.0, funScore));
}

/**
 * FairnessScore (0.0–1.0)
 *
 * Evaluates whether the challenge is achievable without requiring
 * near-perfect play.
 *
 * Components:
 *   - All pegs reachable from ring initial positions (horizontal overlap
 *     within arena): score 1.0, otherwise 0.5.
 *   - Ring count reasonable for difficulty (requiredRings <= 4 when ND < 0.5):
 *     score 1.0, otherwise 0.5.
 *   - Base score: 0.7 (challenge is inherently fair to attempt).
 *
 * Final fairness = average of the three component scores.
 */
function computeFairnessScore(config: ChallengeConfig): number {
  const { rings, pegs, normalizedDifficulty, arena } = config;
  const requiredRings = rings.filter(r => !r.isDecoy);

  // Component 1: all peg X positions are within the arena width
  // (i.e., reachable by any ring that starts within the arena).
  const allPegsWithinArena = pegs.every(
    p => p.position.x >= 0 && p.position.x <= arena.width,
  );
  const pegsReachableScore = allPegsWithinArena ? 1.0 : 0.5;

  // Component 2: ring count is reasonable for the difficulty tier.
  const isRingCountReasonable =
    normalizedDifficulty >= ND_RING_COUNT_THRESHOLD ||
    requiredRings.length <= REASONABLE_RING_COUNT_FOR_EASY;
  const ringCountScore = isRingCountReasonable ? 1.0 : 0.5;

  // Component 3: fixed base fairness.
  const baseScore = FAIRNESS_BASE_SCORE;

  const fairnessScore = (pegsReachableScore + ringCountScore + baseScore) / 3;
  return Math.min(1.0, Math.max(0.0, fairnessScore));
}

/**
 * VarietyScore (0.0–1.0)
 *
 * Always 0.8 as a placeholder. Real variety scoring requires knowledge of
 * the player's challenge history (recently seen templates, colors, layouts),
 * which is not available in the pure generator context.
 *
 * Requirements: 11.1 (pure function, no state access)
 */
function computeVarietyScore(_config: ChallengeConfig): number {
  return VARIETY_PLACEHOLDER;
}

/**
 * PacingScore (0.0–1.0)
 *
 * Always 0.8 as a placeholder. Real pacing scoring requires awareness of
 * surrounding challenge numbers and player session history, which are not
 * available during pure generation.
 *
 * Requirements: 11.1 (pure function, no state access)
 */
function computePacingScore(_config: ChallengeConfig): number {
  return PACING_PLACEHOLDER;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Score the quality of a ChallengeConfig given the result from ValidationSolver.
 *
 * This is a pure function: same inputs always produce the same output.
 *
 * @param config       - The ChallengeConfig to evaluate.
 * @param solverResult - The result from ValidationSolver.validate(config).
 * @returns            ChallengeQualityScore with all component scores and overall.
 *
 * Requirements: 11.1, 11.5
 */
export function scoreChallenge(
  config: ChallengeConfig,
  solverResult: SolvabilityResult,
): ChallengeQualityScore {
  const solvability = computeSolvabilityScore(solverResult);
  const fun = computeFunScore(config);
  const fairness = computeFairnessScore(config);
  const variety = computeVarietyScore(config);
  const pacing = computePacingScore(config);

  const overall =
    0.30 * solvability +
    0.25 * fun +
    0.20 * fairness +
    0.15 * variety +
    0.10 * pacing;

  return {
    overall: Math.min(1.0, Math.max(0.0, overall)),
    solvability,
    fun,
    fairness,
    variety,
    pacing,
    meetsThreshold: overall >= QUALITY_THRESHOLD,
  };
}
