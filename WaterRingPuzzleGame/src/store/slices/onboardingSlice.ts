/**
 * onboardingSlice — owns tutorial completion flag, highest challenge shown,
 * feature unlock flags, and the challenge numbers where the account prompt
 * was shown.
 *
 * Requirements: 17.7, 18.1, 18.2, 7.3.2
 * Persists to MMKV key: 'onboarding_slice'
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';
import { FeatureUnlockManager } from '../../features/game/core/FeatureUnlockManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingState {
  /** True once the user has completed the initial tutorial. */
  tutorialComplete: boolean;
  /**
   * The highest challenge number that has been presented/shown to the player.
   * Used to determine which new challenges unlock UI hints.
   */
  highestChallengeShown: number;
  /**
   * Flags marking whether specific features have been revealed/unlocked in the UI
   * (e.g. 'replay_viewer', 'leaderboard', 'daily_challenge').
   */
  featureUnlockFlags: Record<string, boolean>;
  /**
   * List of challenge numbers at which the "Create an account to save progress"
   * prompt was shown to the player.
   */
  accountPromptShownAtChallenges: number[];
}

export interface OnboardingActions {
  completeTutorial: () => void;
  updateHighestChallenge: (challengeNumber: number) => void;
  unlockFeature: (featureKey: string) => void;
  recordAccountPrompt: (challengeNumber: number) => void;
  /**
   * Progress the tutorial after completing a challenge:
   * 1. Updates highestChallengeShown
   * 2. Unlocks newly gated features via FeatureUnlockManager
   * 3. Records account prompt if it should be shown at this challenge
   *
   * Requirements: 7.3.2
   */
  progressTutorial: (challengeNumber: number) => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultOnboardingState: OnboardingState = {
  tutorialComplete: false,
  highestChallengeShown: 0,
  featureUnlockFlags: {},
  accountPromptShownAtChallenges: [],
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...defaultOnboardingState,

      completeTutorial: (): void => set({ tutorialComplete: true }),

      updateHighestChallenge: (challengeNumber: number): void =>
        set((state) => ({
          highestChallengeShown: Math.max(state.highestChallengeShown, challengeNumber),
        })),

      unlockFeature: (featureKey: string): void =>
        set((state) => ({
          featureUnlockFlags: {
            ...state.featureUnlockFlags,
            [featureKey]: true,
          },
        })),

      recordAccountPrompt: (challengeNumber: number): void =>
        set((state) => {
          if (state.accountPromptShownAtChallenges.includes(challengeNumber)) {
            return state;
          }
          return {
            accountPromptShownAtChallenges: [
              ...state.accountPromptShownAtChallenges,
              challengeNumber,
            ],
          };
        }),

      progressTutorial: (challengeNumber: number): void =>
        set((state) => {
          const newHighest = Math.max(state.highestChallengeShown, challengeNumber);

          // Discover newly unlocked features at this challenge number.
          const newlyUnlocked = FeatureUnlockManager.getNewlyUnlockedFeatures(challengeNumber);
          const updatedFlags = { ...state.featureUnlockFlags };
          for (const key of newlyUnlocked) {
            updatedFlags[key] = true;
          }

          // Check if account prompt should be shown.
          const shouldShowPrompt = FeatureUnlockManager.shouldShowAccountPrompt(
            challengeNumber,
            state.accountPromptShownAtChallenges,
          );
          const updatedPrompts = shouldShowPrompt
            ? [...state.accountPromptShownAtChallenges, challengeNumber]
            : state.accountPromptShownAtChallenges;

          return {
            highestChallengeShown: newHighest,
            featureUnlockFlags: updatedFlags,
            accountPromptShownAtChallenges: updatedPrompts,
          };
        }),
    }),
    {
      name: 'onboarding_slice',
      storage: createJSONStorage(() => createSliceMMKVStorage('onboarding_slice')),
    },
  ),
);

// ---------------------------------------------------------------------------
// Granular selectors — Requirement 17.8
// ---------------------------------------------------------------------------

export const selectTutorialComplete = (state: OnboardingStore): boolean =>
  state.tutorialComplete;

export const selectHighestChallengeShown = (state: OnboardingStore): number =>
  state.highestChallengeShown;

export const selectFeatureUnlockFlags = (
  state: OnboardingStore,
): Record<string, boolean> => state.featureUnlockFlags;

export const selectIsFeatureUnlocked =
  (featureKey: string) =>
  (state: OnboardingStore): boolean =>
    state.featureUnlockFlags[featureKey] === true;

export const selectAccountPromptShownAtChallenges = (
  state: OnboardingStore,
): number[] => state.accountPromptShownAtChallenges;

export const selectWasAccountPromptShownAt =
  (challengeNumber: number) =>
  (state: OnboardingStore): boolean =>
    state.accountPromptShownAtChallenges.includes(challengeNumber);
