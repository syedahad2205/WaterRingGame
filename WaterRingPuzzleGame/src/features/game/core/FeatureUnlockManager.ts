/**
 * FeatureUnlockManager.ts
 *
 * Manages feature gate checks based on the player's highest challenge reached.
 * Features are locked until the player reaches the required challenge number.
 *
 * Feature gates (from onboarding spec):
 *   timer_visible:    3   — timer shown from challenge 3
 *   continue_visible: 6   — continue button shown from challenge 6
 *   daily_challenge:  15  — daily challenge unlocked at challenge 15
 *   leaderboard:      20  — leaderboard unlocked at challenge 20
 *   replay_viewer:    25  — replay viewer unlocked at challenge 25
 *
 * Requirements: 7.3.2, 17.7
 */

// ---------------------------------------------------------------------------
// Feature gates
// ---------------------------------------------------------------------------

/**
 * Maps feature key → minimum challenge number required to unlock.
 */
export const FEATURE_UNLOCK_GATES: Record<string, number> = {
  timer_visible: 3,
  continue_visible: 6,
  daily_challenge: 15,
  leaderboard: 20,
  replay_viewer: 25,
};

/** Challenge numbers at which the account creation prompt is shown. */
const ACCOUNT_PROMPT_CHALLENGES: ReadonlyArray<number> = [10, 25];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a feature should be visible/accessible for the given highest challenge.
 *
 * @param featureKey        The feature identifier (e.g. 'leaderboard').
 * @param highestChallenge  The player's highest reached challenge number.
 * @returns                 True if the feature is unlocked.
 */
function isFeatureUnlocked(featureKey: string, highestChallenge: number): boolean {
  const gate = FEATURE_UNLOCK_GATES[featureKey];
  if (gate === undefined) {
    // Unknown feature keys are considered unlocked (permissive default).
    return true;
  }
  return highestChallenge >= gate;
}

/**
 * Returns the list of feature keys newly unlocked at exactly this challenge number.
 * "Newly unlocked" means the gate value equals the current challenge number.
 *
 * @param challengeNumber  The challenge number just completed.
 * @returns                Array of newly unlocked feature keys (may be empty).
 */
function getNewlyUnlockedFeatures(challengeNumber: number): string[] {
  return Object.entries(FEATURE_UNLOCK_GATES)
    .filter(([, gate]) => gate === challengeNumber)
    .map(([key]) => key);
}

/**
 * Check if the account creation prompt should be shown at this challenge number.
 *
 * Rules:
 * - The prompt is shown only at challenge 10 and 25.
 * - The prompt is not shown if it was already shown at this specific challenge.
 *
 * @param challengeNumber       The current challenge number.
 * @param previouslyShownAt     Challenge numbers where the prompt was already shown.
 * @returns                     True if the prompt should be shown now.
 */
function shouldShowAccountPrompt(
  challengeNumber: number,
  previouslyShownAt: number[],
): boolean {
  if (!ACCOUNT_PROMPT_CHALLENGES.includes(challengeNumber)) return false;
  return !previouslyShownAt.includes(challengeNumber);
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const FeatureUnlockManager = {
  isFeatureUnlocked,
  getNewlyUnlockedFeatures,
  shouldShowAccountPrompt,
} as const;
