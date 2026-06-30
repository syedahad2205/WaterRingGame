/**
 * store/index.ts
 * Central re-export for all Zustand store slices.
 *
 * Each slice lives in its own file and persists independently to MMKV.
 * Additional slices will be added in subsequent tasks (2.1.2 – 2.1.4).
 */

// Player slice — profile, XP, level, prestige, rank (Requirements 17.1, 18.1, 18.2)
export {
  usePlayerStore,
  selectPlayerLevel,
  selectPlayerXP,
  selectPrestige,
  selectPlayerRank,
  selectTotalStars,
  selectCompletionScorePercent,
  selectPlayerProfile,
  rankFromLevel,
  PLAYER_SLICE_MMKV_KEY,
} from './slices/playerSlice';

export type {
  PlayerRank,
  PlayerProfile,
  PlayerStateFields,
  PlayerActions,
  PlayerSlice,
} from './slices/playerSlice';

// Economy slice — added in task 2.1.2
export {
  useEconomyStore,
  selectCoinBalance,
  selectDailyAdCount,
  selectTransactionHistory,
  selectPurchaseState,
  selectFreeContinueTracking,
  ECONOMY_SLICE_MMKV_KEY,
} from './slices/economySlice';

export type { EconomyState, EconomyActions, EconomySlice } from './slices/economySlice';

// Challenge slice — added in task 2.1.3
// Settings / Cosmetics / Social / Onboarding slices — added in task 2.1.4
