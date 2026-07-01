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
export {
  useChallengeStore,
  selectActiveChallengeConfig,
  selectTimerRemaining,
  selectRingPositions,
  selectRingVelocities,
  selectPegStates,
  selectWinLossState,
  selectContinueCount,
  selectAdaptiveAssistFlags,
  CHALLENGE_SLICE_MMKV_KEY,
} from './slices/challengeSlice';

export type {
  ChallengeState,
  ChallengeActions,
  ChallengeSlice,
} from './slices/challengeSlice';

// Settings slice — added in task 2.1.4
export {
  useSettingsStore,
  selectMasterVolume,
  selectMusicVolume,
  selectSfxVolume,
  selectHapticsEnabled,
  selectHapticIntensity,
  selectReducedMotion,
  selectColorBlindMode,
  selectColorBlindPreset,
  selectHighContrast,
  selectLanguage,
  selectGraphicsQuality,
  selectReducedMotionOverride,
  selectMotorAccessibilityMode,
  selectLargeTextMode,
} from './slices/settingsSlice';

export type {
  ColorBlindPreset,
  GraphicsQuality,
  AudioSettings,
  HapticSettings,
  AccessibilitySettings,
  SettingsState,
  SettingsActions,
  SettingsStore,
} from './slices/settingsSlice';

// Cosmetics slice — added in task 2.1.4
export {
  useCosmeticsStore,
  selectOwnedCosmeticIds,
  selectEquippedCosmeticIds,
  selectIsOwned,
  selectEquipped,
} from './slices/cosmeticsSlice';

export type {
  CosmeticsState,
  CosmeticsActions,
  CosmeticsStore,
} from './slices/cosmeticsSlice';

// Social slice — added in task 2.1.4
export {
  useSocialStore,
  selectFriendIds,
  selectLeaderboardCache,
  selectCachedLeaderboard,
  selectGhostCache,
  selectCachedGhost,
  selectPendingNotifications,
  selectLastLeaderboardFetch,
} from './slices/socialSlice';

export type {
  SocialState,
  SocialActions,
  SocialStore,
} from './slices/socialSlice';

// Onboarding slice — added in task 2.1.4
export {
  useOnboardingStore,
  selectTutorialComplete,
  selectHighestChallengeShown,
  selectFeatureUnlockFlags,
  selectIsFeatureUnlocked,
  selectAccountPromptShownAtChallenges,
  selectWasAccountPromptShownAt,
} from './slices/onboardingSlice';

export type {
  OnboardingState,
  OnboardingActions,
  OnboardingStore,
} from './slices/onboardingSlice';

// Player progression slice — streaks, daily rewards, missions, lifetime stats
export {
  usePlayerProgressionStore,
  selectCurrentStreak,
  selectLongestStreak,
  selectLastLoginDate,
  selectTotalLoginDays,
  selectLastDailyClaimDate,
  selectDailyRewardsClaimed,
  selectDailyMissions,
  selectWeeklyMissions,
  selectLifetimeCoinsEarned,
  selectLifetimeRingsLanded,
  selectLifetimeGamesPlayed,
  selectBestCombo,
  selectPerfectGames,
  PLAYER_PROGRESSION_MMKV_KEY,
} from './slices/playerProgressionSlice';

export type {
  PlayerProgressionState,
  PlayerProgressionActions,
  PlayerProgressionSlice,
} from './slices/playerProgressionSlice';
