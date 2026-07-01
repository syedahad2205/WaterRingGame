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

/** Weights for variety sub-components. */
const VARIETY_WEIGHT_TEMPLATE = 0.30;
const VARIETY_WEIGHT_COLOR = 0.25;
const VARIETY_WEIGHT_SIZE = 0.25;
const VARIETY_WEIGHT_OBSTACLE = 0.20;

/** Ideal timer utilization band for pacing: challenges should use 40%–70% of timer. */
const PACING_TIMER_IDEAL_LOW = 0.40;
const PACING_TIMER_IDEAL_HIGH = 0.70;

/** Pacing ring count ideal range for engagement. */
const PACING_RING_IDEAL_MIN = 2;
const PACING_RING_IDEAL_MAX = 5;

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
 * Measures the intrinsic variety within a single challenge configuration:
 *   - Template complexity: non-Classic templates with special mechanics score higher.
 *   - Color diversity: more distinct ring colors = more visual variety.
 *   - Size diversity: more distinct ring size tiers = more gameplay variety.
 *   - Obstacle presence: obstacles add spatial variety.
 *
 * Weighted sum:
 *   0.30 × templateComplexity + 0.25 × colorDiversity
 *   + 0.25 × sizeDiversity + 0.20 × obstaclePresence
 *
 * Requirements: 11.1 (pure function, no state access)
 */
function computeVarietyScore(config: ChallengeConfig): number {
  const { rings, obstacles, templateId } = config;
  const requiredRings = rings.filter(r => !r.isDecoy);

  // Template complexity: Classic = 0.4, templates with special mechanics score higher.
  const hasSpecialMechanic =
    templateId !== 'Classic' && templateId !== 'MultiplierRush';
  const templateScore = hasSpecialMechanic ? 0.9 : 0.4;

  // Color diversity: distinct colors among all rings (including decoys).
  const distinctColors = new Set(rings.map(r => r.colorId)).size;
  // 1 color = 0.3, 2 = 0.5, 3 = 0.7, 4 = 0.85, 5+ = 1.0
  const colorScore = Math.min(1.0, 0.15 + distinctColors * 0.20);

  // Size diversity: distinct size tiers among required rings.
  const distinctSizes = new Set(requiredRings.map(r => r.sizeCategory)).size;
  const sizeScore = SIZE_TIER_SCORES[Math.min(distinctSizes, 3)] ?? 0.4;

  // Obstacle presence: having obstacles adds spatial variety.
  const obstacleScore = obstacles.length > 0
    ? Math.min(1.0, 0.6 + obstacles.length * 0.15)
    : 0.3;

  const variety =
    VARIETY_WEIGHT_TEMPLATE * templateScore +
    VARIETY_WEIGHT_COLOR * colorScore +
    VARIETY_WEIGHT_SIZE * sizeScore +
    VARIETY_WEIGHT_OBSTACLE * obstacleScore;

  return Math.min(1.0, Math.max(0.0, variety));
}

/**
 * PacingScore (0.0–1.0)
 *
 * Evaluates whether the challenge's internal pacing feels well-balanced:
 *   - Timer headroom: the estimated solve time should use 40%–70% of the
 *     total timer. Too tight feels frustrating; too loose feels boring.
 *   - Ring count balance: 2–5 required rings is the ideal engagement band.
 *     Fewer feels trivial; more feels overwhelming.
 *   - Difficulty alignment: normalized difficulty should roughly match the
 *     mechanical complexity (ring count + obstacle count) to avoid spikes.
 *
 * Final pacing = 0.40 × timerHeadroom + 0.35 × ringCountBalance
 *              + 0.25 × difficultyAlignment
 *
 * Requirements: 11.1 (pure function, no state access)
 */
function computePacingScore(config: ChallengeConfig): number {
  const { rings, timer, intelligenceMetadata, normalizedDifficulty: nd, obstacles } = config;
  const requiredRings = rings.filter(r => !r.isDecoy);
  const totalSeconds = timer.totalSeconds;

  // Timer headroom: ideal when estimated solve uses 40%–70% of timer.
  let timerHeadroomScore = 0.0;
  if (totalSeconds > 0) {
    const utilRatio = intelligenceMetadata.estimatedSolveTimeSecs / totalSeconds;
    if (utilRatio >= PACING_TIMER_IDEAL_LOW && utilRatio <= PACING_TIMER_IDEAL_HIGH) {
      timerHeadroomScore = 1.0;
    } else if (utilRatio < PACING_TIMER_IDEAL_LOW) {
      timerHeadroomScore = Math.max(0, utilRatio / PACING_TIMER_IDEAL_LOW);
    } else {
      const excess = utilRatio - PACING_TIMER_IDEAL_HIGH;
      const range = 1.0 - PACING_TIMER_IDEAL_HIGH;
      timerHeadroomScore = Math.max(0, 1.0 - excess / range);
    }
  }

  // Ring count balance: 2–5 required rings is ideal.
  const ringCount = requiredRings.length;
  let ringCountBalance: number;
  if (ringCount >= PACING_RING_IDEAL_MIN && ringCount <= PACING_RING_IDEAL_MAX) {
    ringCountBalance = 1.0;
  } else if (ringCount < PACING_RING_IDEAL_MIN) {
    ringCountBalance = ringCount === 1 ? 0.5 : 0.3;
  } else {
    // Above 5: gradually decrease, floor at 0.3.
    ringCountBalance = Math.max(0.3, 1.0 - (ringCount - PACING_RING_IDEAL_MAX) * 0.15);
  }

  // Difficulty alignment: mechanical complexity should roughly match nd.
  // Complexity proxy: (requiredRings + obstacles) normalized to [0, 1].
  const complexityProxy = Math.min(1.0, (requiredRings.length + obstacles.length) / 8);
  const alignmentDelta = Math.abs(nd - complexityProxy);
  // Perfect alignment = 1.0, max divergence (1.0) = 0.2.
  const difficultyAlignment = Math.max(0.2, 1.0 - alignmentDelta);

  const pacing =
    0.40 * timerHeadroomScore +
    0.35 * ringCountBalance +
    0.25 * difficultyAlignment;

  return Math.min(1.0, Math.max(0.0, pacing));
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
