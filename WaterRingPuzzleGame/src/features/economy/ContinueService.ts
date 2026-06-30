/**
 * ContinueService.ts
 *
 * Continue cost formula, bonus time formula, and max-continues logic.
 * Uses economySlice.debitCoins to deduct coins on useContinue().
 *
 * Design spec formulas:
 *   ContinueCost(D, n)  = BASE_CONTINUE_COST × (1 + ND) × 1.5^(n-1)
 *   BonusTime(D)        = max(30, 60 × (1 - 0.5 × ND))
 *   MaxContinues(D)     = clamp(3 - floor(ND × 2), 1, 3)
 *
 * Where ND = D / 100 (normalizedDifficulty), n = 1-based continue number.
 *
 * Requirements: 12.3, 16.2 (economy service interfaces)
 * Property 12: Cost(D, n+1) > Cost(D, n) for all valid D, n
 * Property 16: BonusTime(D) <= 60 for all D
 */

import { REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST } from '../../constants/remoteConfigDefaults';
import { useEconomyStore } from '../../store/slices/economySlice';

/** The base continue cost constant sourced from Remote Config defaults. */
const BASE_CONTINUE_COST = REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST; // 50

// ---------------------------------------------------------------------------
// Pure formula functions
// ---------------------------------------------------------------------------

/**
 * Compute the coin cost for a continue.
 *
 * Formula: BASE_CONTINUE_COST × (1 + ND) × 1.5^(n-1)
 *
 * @param difficultyScore  Raw difficulty score D in [0, 100].
 * @param continueNumber   1-based continue number within this challenge session.
 * @returns                Rounded integer coin cost.
 *
 * Property 12: computeContinueCost(D, n+1) > computeContinueCost(D, n)
 */
export function computeContinueCost(
  difficultyScore: number,
  continueNumber: number,
): number {
  const nd = Math.max(0, Math.min(1, difficultyScore / 100));
  const n = Math.max(1, Math.floor(continueNumber));
  const cost = BASE_CONTINUE_COST * (1 + nd) * Math.pow(1.5, n - 1);
  return Math.round(cost);
}

/**
 * Compute the bonus time (seconds) added to the timer after a continue.
 *
 * Formula: max(30, 60 × (1 - 0.5 × ND))
 *
 * @param difficultyScore  Raw difficulty score D in [0, 100].
 * @returns                Bonus seconds in [30, 60].
 *
 * Property 16: computeContinueBonusTime(D) <= 60 for all D
 */
export function computeContinueBonusTime(difficultyScore: number): number {
  const nd = Math.max(0, Math.min(1, difficultyScore / 100));
  return Math.max(30, 60 * (1 - 0.5 * nd));
}

/**
 * Compute the maximum number of continues allowed for a challenge.
 *
 * Formula: clamp(3 - floor(ND × 2), 1, 3)
 *
 * @param difficultyScore  Raw difficulty score D in [0, 100].
 * @returns                Integer in [1, 3].
 */
export function computeMaxContinues(difficultyScore: number): number {
  const nd = Math.max(0, Math.min(1, difficultyScore / 100));
  const raw = 3 - Math.floor(nd * 2);
  return Math.max(1, Math.min(3, raw));
}

// ---------------------------------------------------------------------------
// Use-continue: deducts coins and returns result
// ---------------------------------------------------------------------------

/**
 * Attempt to use a continue.
 * Deducts coins from the economy slice if balance is sufficient.
 *
 * @param difficultyScore  Raw difficulty score D in [0, 100].
 * @param continueNumber   1-based continue number.
 * @param _userId          Placeholder — cloud validation uses this in production.
 * @returns                Result indicating success, coins deducted, and bonus seconds.
 */
export function useContinue(
  difficultyScore: number,
  continueNumber: number,
  _userId: string,
): { success: boolean; coinsDeducted: number; bonusSeconds: number } {
  const cost = computeContinueCost(difficultyScore, continueNumber);
  const bonusSeconds = computeContinueBonusTime(difficultyScore);

  const debitSucceeded = useEconomyStore
    .getState()
    .debitCoins(cost, 'continue');

  if (!debitSucceeded) {
    return { success: false, coinsDeducted: 0, bonusSeconds };
  }

  return { success: true, coinsDeducted: cost, bonusSeconds };
}
