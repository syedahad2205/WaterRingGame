/**
 * QualityEvaluator
 *
 * Thin orchestrator that combines ValidationSolver and ChallengeScorer to
 * produce a complete quality evaluation for a ChallengeConfig.
 *
 * This module exists as a convenience entry-point so the ChallengeGenerator
 * (and tests) can call a single function to get both the solvability result
 * and the quality score without wiring up the two modules manually.
 *
 * Design reference: design.md § Procedural Validation & Challenge Intelligence
 * Requirements: 11.1, 11.4, 11.5
 *
 * Pure function — no side effects, no network calls, no store access.
 */

import type { ChallengeConfig } from '../../../types/challenge';
import { ValidationSolver } from './ValidationSolver';
import type { SolvabilityResult } from './ValidationSolver';
import { scoreChallenge } from './ChallengeScorer';
import type { ChallengeQualityScore } from './ChallengeScorer';

export { QUALITY_THRESHOLD } from './ChallengeScorer';
export type { SolvabilityResult } from './ValidationSolver';
export type { ChallengeQualityScore } from './ChallengeScorer';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface QualityEvaluationResult {
  solvability: SolvabilityResult;
  quality: ChallengeQualityScore;
  /** True when the challenge passes both the solvability check and the quality threshold. */
  isAccepted: boolean;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluate the full quality of a ChallengeConfig.
 *
 * Runs the ValidationSolver (3 heuristic strategies) and the ChallengeScorer
 * (5-component quality formula), then combines both results into a single
 * acceptance decision.
 *
 * Acceptance criteria (per Requirement 11.4 and 11.5):
 *   - solvability.isSolvable must be true (at least 1 of 3 strategies succeeded)
 *   - quality.meetsThreshold must be true (overall >= 0.65)
 *
 * @param config - The ChallengeConfig to evaluate.
 * @returns A QualityEvaluationResult containing all evaluation details.
 *
 * Requirements: 11.1, 11.4, 11.5
 */
export function evaluateChallenge(config: ChallengeConfig): QualityEvaluationResult {
  const solver = new ValidationSolver();
  const solvability = solver.validate(config);
  const quality = scoreChallenge(config, solvability);

  const isAccepted = solvability.isSolvable && quality.meetsThreshold;

  return {
    solvability,
    quality,
    isAccepted,
  };
}

/**
 * QualityEvaluator class — wraps the pure pipeline functions for use
 * in contexts that prefer a class API (e.g., ChallengeGenerator.scoreQuality).
 *
 * Requirements: 11.1
 */
export class QualityEvaluator {
  private readonly solver: ValidationSolver;

  constructor() {
    this.solver = new ValidationSolver();
  }

  /**
   * Run full evaluation: solvability + quality scoring.
   *
   * @param config - The ChallengeConfig to evaluate.
   */
  public evaluate(config: ChallengeConfig): QualityEvaluationResult {
    return evaluateChallenge(config);
  }

  /**
   * Run solvability check only.
   *
   * @param config - The ChallengeConfig to validate.
   */
  public validate(config: ChallengeConfig): SolvabilityResult {
    return this.solver.validate(config);
  }

  /**
   * Run quality scoring only, given a pre-computed SolvabilityResult.
   *
   * @param config       - The ChallengeConfig to score.
   * @param solverResult - A pre-computed SolvabilityResult.
   */
  public score(
    config: ChallengeConfig,
    solverResult: SolvabilityResult,
  ): ChallengeQualityScore {
    return scoreChallenge(config, solverResult);
  }
}
