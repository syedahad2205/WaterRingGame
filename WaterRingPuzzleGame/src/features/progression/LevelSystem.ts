/**
 * LevelSystem.ts
 * Level progression calculations based on accumulated XP.
 * Requirement: 11.1.2
 */

/** Maximum player level */
export const MAX_LEVEL = 2000;

/**
 * Returns total XP required to reach the given level from level 1.
 * @param level - Target level.
 */
export function xpRequired(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Derives the current level from total accumulated XP.
 * Iterates upward until the next level threshold exceeds totalXP.
 * @param totalXP - Accumulated XP.
 * @returns Current level (minimum 1).
 */
export function levelFromXP(totalXP: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xpRequired(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/**
 * Returns progress within the current level.
 * @param totalXP - Accumulated XP.
 * @returns current XP in this level, XP needed to next level, and fractional progress.
 */
export function xpProgressInLevel(totalXP: number): {
  current: number;
  needed: number;
  fraction: number;
} {
  const level = levelFromXP(totalXP);
  const currentLevelXP = xpRequired(level);

  if (level >= MAX_LEVEL) {
    return { current: 0, needed: 0, fraction: 1 };
  }

  const nextLevelXP = xpRequired(level + 1);
  const current = Math.max(0, totalXP - currentLevelXP);
  const needed = nextLevelXP - currentLevelXP;
  const fraction = needed > 0 ? Math.min(1, Math.max(0, current / needed)) : 1;

  return { current, needed, fraction };
}
