/**
 * PrestigeSystem.ts
 * Prestige mechanics — resets level progression in exchange for permanent bonuses.
 * Requirement: 11.1.2
 */

import { usePlayerStore } from '../../store/slices/playerSlice';
import { useEconomyStore } from '../../store/slices/economySlice';

/** Minimum level required before a player may prestige */
export const PRESTIGE_LEVEL_REQUIREMENT = 500;

/** Additive XP multiplier bonus granted per prestige (10% each) */
export const PRESTIGE_XP_MULTIPLIER_PER_PRESTIGE = 0.1;

/** Maximum XP multiplier achievable through prestige */
const PRESTIGE_XP_MULTIPLIER_MAX = 2.0;

/**
 * Returns whether the player is eligible to prestige.
 * @param level - Current player level.
 */
export function canPrestige(level: number): boolean {
  return level >= PRESTIGE_LEVEL_REQUIREMENT;
}

/**
 * Returns the XP multiplier for the given prestige count.
 * Additive 10% per prestige, clamped to 2.0×.
 * @param prestigeCount - Number of times the player has prestiged.
 */
export function prestigeXPMultiplier(prestigeCount: number): number {
  const multiplier = 1 + prestigeCount * PRESTIGE_XP_MULTIPLIER_PER_PRESTIGE;
  return Math.min(multiplier, PRESTIGE_XP_MULTIPLIER_MAX);
}

/**
 * Applies prestige for the given user: resets progression via the player store
 * and credits a 1 000-coin prestige reward.
 * @param _userId - User identifier (reserved for future remote calls).
 */
export function applyPrestige(_userId: string): void {
  usePlayerStore.getState().applyPrestige();
  useEconomyStore.getState().creditCoins(1000, 'prestige_reward');
}
