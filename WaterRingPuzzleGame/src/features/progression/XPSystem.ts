/**
 * XPSystem.ts
 * Calculates XP rewards for challenge completions.
 * Requirement: 11.1.1
 */

/** Base XP awarded per challenge completion */
export const XP_BASE = 100;

/** Multipliers applied based on star rating */
export const STAR_MULTIPLIERS: Record<1 | 2 | 3, number> = {
  1: 0.5,
  2: 0.8,
  3: 1.0,
};

/**
 * Calculates XP earned for completing a challenge.
 * @param challengeNumber - The challenge index (1-based), affects difficulty scaling.
 * @param stars - Star rating achieved (1, 2, or 3).
 * @param continuesUsed - Number of continues used during the challenge.
 * @returns Integer XP amount.
 */
export function xpForChallenge(
  challengeNumber: number,
  stars: 1 | 2 | 3,
  continuesUsed: number,
): number {
  const starMultiplier = STAR_MULTIPLIERS[stars];

  const D = Math.min(challengeNumber / 100, 1.0);
  const difficultyMultiplier = 1 + D;

  let continuesPenalty: number;
  if (continuesUsed === 0) {
    continuesPenalty = 1.0;
  } else if (continuesUsed === 1) {
    continuesPenalty = 0.8;
  } else {
    continuesPenalty = 0.6;
  }

  return Math.round(
    XP_BASE * starMultiplier * difficultyMultiplier * continuesPenalty,
  );
}
