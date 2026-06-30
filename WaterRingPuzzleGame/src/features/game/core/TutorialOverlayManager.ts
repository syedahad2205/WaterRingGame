/**
 * TutorialOverlayManager.ts
 *
 * Manages onboarding tutorial overlays for challenges 1–5.
 * Tracks which steps have been dismissed and whether the tutorial is complete.
 *
 * Session-aware — dismissed steps are stored in module state.
 * The caller is responsible for persisting completion to onboardingSlice.
 *
 * Requirements: 7.3.1
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TutorialStep {
  /** Challenge number this step belongs to (1–5). */
  challengeNumber: number;
  /** When to trigger the overlay. */
  trigger: 'on_mount' | 'on_first_input' | 'on_no_input_3s';
  /** Text shown to the player. */
  message: string;
  /** Which UI element to highlight. */
  highlightElement?: 'left_button' | 'right_button' | 'both_buttons' | 'ring' | 'peg';
  /** When to auto-dismiss the overlay. */
  dismissOn: 'first_input' | 'ring_moved' | 'ring_landed' | 'auto_5s';
}

// ---------------------------------------------------------------------------
// Tutorial steps data (challenges 1–5)
// ---------------------------------------------------------------------------

/**
 * Onboarding tutorial overlays for challenges 1–5.
 * One step per challenge number.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  // Challenge 1: introduce left/right buttons
  {
    challengeNumber: 1,
    trigger: 'on_mount',
    message: 'Press and hold the buttons to move the ring',
    highlightElement: 'both_buttons',
    dismissOn: 'first_input',
  },
  // Challenge 2: introduce hold mechanic
  {
    challengeNumber: 2,
    trigger: 'on_no_input_3s',
    message: 'Hold longer for a stronger current',
    highlightElement: 'left_button',
    dismissOn: 'ring_moved',
  },
  // Challenge 3: simultaneous press
  {
    challengeNumber: 3,
    trigger: 'on_no_input_3s',
    message: 'Press both buttons to push rings upward',
    highlightElement: 'both_buttons',
    dismissOn: 'first_input',
  },
  // Challenge 4: multi-ring intro
  {
    challengeNumber: 4,
    trigger: 'on_mount',
    message: 'Match each ring to its colored peg',
    dismissOn: 'auto_5s',
  },
  // Challenge 5: color matching
  {
    challengeNumber: 5,
    trigger: 'on_mount',
    message: 'Colors must match — look closely',
    dismissOn: 'ring_landed',
  },
];

/** The set of challenge numbers that have an associated tutorial step. */
const TUTORIAL_CHALLENGE_NUMBERS = new Set(TUTORIAL_STEPS.map((s) => s.challengeNumber));

// ---------------------------------------------------------------------------
// Module-level dismissed state
// ---------------------------------------------------------------------------

const _dismissedChallenges: Set<number> = new Set();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the tutorial step for a given challenge number.
 * Returns null if no step exists for that challenge (e.g. challenge 6+).
 *
 * @param challengeNumber  The challenge being played.
 */
function getStepForChallenge(challengeNumber: number): TutorialStep | null {
  return TUTORIAL_STEPS.find((s) => s.challengeNumber === challengeNumber) ?? null;
}

/**
 * Returns true when all 5 tutorial steps have been dismissed.
 */
function isTutorialComplete(): boolean {
  return TUTORIAL_CHALLENGE_NUMBERS.size > 0 &&
    Array.from(TUTORIAL_CHALLENGE_NUMBERS).every((n) => _dismissedChallenges.has(n));
}

/**
 * Mark the tutorial step for a given challenge as dismissed.
 *
 * @param challengeNumber  The challenge whose step was dismissed.
 */
function markStepDismissed(challengeNumber: number): void {
  _dismissedChallenges.add(challengeNumber);
}

/**
 * Returns true if the tutorial step for this challenge should be shown.
 * Conditions: the step exists AND it has NOT been dismissed yet AND
 * the trigger matches the given trigger type.
 *
 * @param challengeNumber  The challenge being played.
 * @param trigger          The current trigger event.
 */
function shouldShowStep(
  challengeNumber: number,
  trigger: TutorialStep['trigger'],
): boolean {
  if (_dismissedChallenges.has(challengeNumber)) return false;
  const step = getStepForChallenge(challengeNumber);
  if (!step) return false;
  return step.trigger === trigger;
}

/**
 * Reset all dismissed state — use for testing or onboarding reset.
 */
function resetDismissedState(): void {
  _dismissedChallenges.clear();
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const TutorialOverlayManager = {
  getStepForChallenge,
  isTutorialComplete,
  markStepDismissed,
  shouldShowStep,
  resetDismissedState,
} as const;
