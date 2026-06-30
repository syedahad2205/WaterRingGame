/**
 * Unit tests for FeatureUnlockManager and onboardingSlice.progressTutorial
 *
 * Covers:
 *   - timer_visible gate (challenge 3)
 *   - leaderboard gate (challenge 20)
 *   - account prompt at challenge 10 (first time)
 *   - account prompt NOT shown at challenge 10 if already shown
 *   - account prompt NOT shown before challenge 10
 *   - progressTutorial unlocks features and records prompts
 *
 * Validates: Requirements 7.3.2, 17.7
 */

// Mock react-native-mmkv so tests run in Node.js.
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

import {
  FeatureUnlockManager,
  FEATURE_UNLOCK_GATES,
} from '../../src/features/game/core/FeatureUnlockManager';
import { useOnboardingStore } from '../../src/store/slices/onboardingSlice';

// ---------------------------------------------------------------------------
// Reset store helper
// ---------------------------------------------------------------------------

function resetOnboarding(): void {
  useOnboardingStore.setState({
    tutorialComplete: false,
    highestChallengeShown: 0,
    featureUnlockFlags: {},
    accountPromptShownAtChallenges: [],
  });
}

// ---------------------------------------------------------------------------
// FEATURE_UNLOCK_GATES values
// ---------------------------------------------------------------------------

describe('FEATURE_UNLOCK_GATES — gate values', () => {
  it('timer_visible unlocks at challenge 3', () => {
    expect(FEATURE_UNLOCK_GATES.timer_visible).toBe(3);
  });

  it('continue_visible unlocks at challenge 6', () => {
    expect(FEATURE_UNLOCK_GATES.continue_visible).toBe(6);
  });

  it('daily_challenge unlocks at challenge 15', () => {
    expect(FEATURE_UNLOCK_GATES.daily_challenge).toBe(15);
  });

  it('leaderboard unlocks at challenge 20', () => {
    expect(FEATURE_UNLOCK_GATES.leaderboard).toBe(20);
  });

  it('replay_viewer unlocks at challenge 25', () => {
    expect(FEATURE_UNLOCK_GATES.replay_viewer).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// isFeatureUnlocked
// ---------------------------------------------------------------------------

describe('FeatureUnlockManager.isFeatureUnlocked', () => {
  it('timer_visible is NOT unlocked before challenge 3', () => {
    expect(FeatureUnlockManager.isFeatureUnlocked('timer_visible', 2)).toBe(false);
    expect(FeatureUnlockManager.isFeatureUnlocked('timer_visible', 1)).toBe(false);
  });

  it('timer_visible IS unlocked at challenge 3', () => {
    expect(FeatureUnlockManager.isFeatureUnlocked('timer_visible', 3)).toBe(true);
  });

  it('timer_visible IS unlocked after challenge 3', () => {
    expect(FeatureUnlockManager.isFeatureUnlocked('timer_visible', 10)).toBe(true);
  });

  it('leaderboard is NOT unlocked before challenge 20', () => {
    expect(FeatureUnlockManager.isFeatureUnlocked('leaderboard', 19)).toBe(false);
    expect(FeatureUnlockManager.isFeatureUnlocked('leaderboard', 1)).toBe(false);
  });

  it('leaderboard IS unlocked at challenge 20', () => {
    expect(FeatureUnlockManager.isFeatureUnlocked('leaderboard', 20)).toBe(true);
  });

  it('leaderboard IS unlocked after challenge 20', () => {
    expect(FeatureUnlockManager.isFeatureUnlocked('leaderboard', 50)).toBe(true);
  });

  it('unknown feature key returns true (permissive default)', () => {
    expect(FeatureUnlockManager.isFeatureUnlocked('unknown_feature', 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getNewlyUnlockedFeatures
// ---------------------------------------------------------------------------

describe('FeatureUnlockManager.getNewlyUnlockedFeatures', () => {
  it('returns timer_visible at challenge 3', () => {
    expect(FeatureUnlockManager.getNewlyUnlockedFeatures(3)).toContain('timer_visible');
  });

  it('returns leaderboard at challenge 20', () => {
    expect(FeatureUnlockManager.getNewlyUnlockedFeatures(20)).toContain('leaderboard');
  });

  it('returns empty array for challenges with no new unlocks', () => {
    expect(FeatureUnlockManager.getNewlyUnlockedFeatures(1)).toHaveLength(0);
    expect(FeatureUnlockManager.getNewlyUnlockedFeatures(50)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// shouldShowAccountPrompt
// ---------------------------------------------------------------------------

describe('FeatureUnlockManager.shouldShowAccountPrompt', () => {
  it('returns false before challenge 10', () => {
    expect(FeatureUnlockManager.shouldShowAccountPrompt(5, [])).toBe(false);
    expect(FeatureUnlockManager.shouldShowAccountPrompt(9, [])).toBe(false);
  });

  it('returns true at challenge 10 when not previously shown', () => {
    expect(FeatureUnlockManager.shouldShowAccountPrompt(10, [])).toBe(true);
  });

  it('returns false at challenge 10 if already shown there', () => {
    expect(FeatureUnlockManager.shouldShowAccountPrompt(10, [10])).toBe(false);
  });

  it('returns false between challenge 10 and 25', () => {
    expect(FeatureUnlockManager.shouldShowAccountPrompt(15, [10])).toBe(false);
    expect(FeatureUnlockManager.shouldShowAccountPrompt(24, [10])).toBe(false);
  });

  it('returns true at challenge 25 when not previously shown there', () => {
    expect(FeatureUnlockManager.shouldShowAccountPrompt(25, [10])).toBe(true);
  });

  it('returns false at challenge 25 if already shown there', () => {
    expect(FeatureUnlockManager.shouldShowAccountPrompt(25, [10, 25])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onboardingSlice.progressTutorial
// ---------------------------------------------------------------------------

describe('onboardingSlice.progressTutorial', () => {
  beforeEach(resetOnboarding);

  it('updates highestChallengeShown', () => {
    useOnboardingStore.getState().progressTutorial(5);
    expect(useOnboardingStore.getState().highestChallengeShown).toBe(5);
  });

  it('never decreases highestChallengeShown', () => {
    useOnboardingStore.getState().progressTutorial(10);
    useOnboardingStore.getState().progressTutorial(5);
    expect(useOnboardingStore.getState().highestChallengeShown).toBe(10);
  });

  it('unlocks features at their gate challenge', () => {
    useOnboardingStore.getState().progressTutorial(3);
    expect(useOnboardingStore.getState().featureUnlockFlags.timer_visible).toBe(true);
  });

  it('does not unlock features before their gate', () => {
    useOnboardingStore.getState().progressTutorial(2);
    expect(useOnboardingStore.getState().featureUnlockFlags.timer_visible).toBeUndefined();
  });

  it('records account prompt at challenge 10', () => {
    useOnboardingStore.getState().progressTutorial(10);
    expect(useOnboardingStore.getState().accountPromptShownAtChallenges).toContain(10);
  });

  it('does NOT record account prompt again if already recorded at challenge 10', () => {
    useOnboardingStore.getState().progressTutorial(10);
    useOnboardingStore.getState().progressTutorial(10);
    const prompts = useOnboardingStore.getState().accountPromptShownAtChallenges;
    expect(prompts.filter((n) => n === 10)).toHaveLength(1);
  });

  it('does NOT record account prompt at challenge 5', () => {
    useOnboardingStore.getState().progressTutorial(5);
    expect(useOnboardingStore.getState().accountPromptShownAtChallenges).not.toContain(5);
  });
});
