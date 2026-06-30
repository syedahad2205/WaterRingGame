/**
 * Unit tests for TutorialOverlayManager
 *
 * Covers:
 *   - getStepForChallenge(1) returns the challenge 1 step
 *   - getStepForChallenge(99) returns null
 *   - markStepDismissed removes the step from "should show" list
 *   - isTutorialComplete() returns true after all 5 steps dismissed
 *   - shouldShowStep() respects trigger type and dismissed state
 *
 * Validates: Requirements 7.3.1
 */

import {
  TutorialOverlayManager,
  TUTORIAL_STEPS,
} from '../../src/features/game/core/TutorialOverlayManager';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  TutorialOverlayManager.resetDismissedState();
});

// ---------------------------------------------------------------------------
// getStepForChallenge
// ---------------------------------------------------------------------------

describe('TutorialOverlayManager.getStepForChallenge', () => {
  it('returns the tutorial step for challenge 1', () => {
    const step = TutorialOverlayManager.getStepForChallenge(1);
    expect(step).not.toBeNull();
    expect(step?.challengeNumber).toBe(1);
    expect(step?.trigger).toBe('on_mount');
    expect(step?.highlightElement).toBe('both_buttons');
  });

  it('returns the tutorial step for challenge 2', () => {
    const step = TutorialOverlayManager.getStepForChallenge(2);
    expect(step).not.toBeNull();
    expect(step?.challengeNumber).toBe(2);
    expect(step?.trigger).toBe('on_no_input_3s');
  });

  it('returns the tutorial step for challenge 3', () => {
    const step = TutorialOverlayManager.getStepForChallenge(3);
    expect(step).not.toBeNull();
    expect(step?.message).toContain('both buttons');
  });

  it('returns the tutorial step for challenge 4', () => {
    const step = TutorialOverlayManager.getStepForChallenge(4);
    expect(step).not.toBeNull();
    expect(step?.dismissOn).toBe('auto_5s');
  });

  it('returns the tutorial step for challenge 5', () => {
    const step = TutorialOverlayManager.getStepForChallenge(5);
    expect(step).not.toBeNull();
    expect(step?.dismissOn).toBe('ring_landed');
  });

  it('returns null for challenge 6 (no tutorial)', () => {
    expect(TutorialOverlayManager.getStepForChallenge(6)).toBeNull();
  });

  it('returns null for challenge 99 (no tutorial)', () => {
    expect(TutorialOverlayManager.getStepForChallenge(99)).toBeNull();
  });

  it('returns null for challenge 0', () => {
    expect(TutorialOverlayManager.getStepForChallenge(0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TUTORIAL_STEPS constant
// ---------------------------------------------------------------------------

describe('TUTORIAL_STEPS constant', () => {
  it('has exactly 5 steps', () => {
    expect(TUTORIAL_STEPS).toHaveLength(5);
  });

  it('covers challenges 1 through 5', () => {
    const challengeNumbers = TUTORIAL_STEPS.map((s) => s.challengeNumber);
    expect(challengeNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it('each step has a non-empty message', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.message.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// markStepDismissed
// ---------------------------------------------------------------------------

describe('TutorialOverlayManager.markStepDismissed', () => {
  it('shouldShowStep returns false after markStepDismissed', () => {
    // Before dismissal
    expect(TutorialOverlayManager.shouldShowStep(1, 'on_mount')).toBe(true);

    TutorialOverlayManager.markStepDismissed(1);
    expect(TutorialOverlayManager.shouldShowStep(1, 'on_mount')).toBe(false);
  });

  it('dismissing challenge 1 does not affect challenge 2', () => {
    TutorialOverlayManager.markStepDismissed(1);
    expect(TutorialOverlayManager.shouldShowStep(2, 'on_no_input_3s')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isTutorialComplete
// ---------------------------------------------------------------------------

describe('TutorialOverlayManager.isTutorialComplete', () => {
  it('returns false when no steps are dismissed', () => {
    expect(TutorialOverlayManager.isTutorialComplete()).toBe(false);
  });

  it('returns false when only some steps are dismissed', () => {
    TutorialOverlayManager.markStepDismissed(1);
    TutorialOverlayManager.markStepDismissed(2);
    expect(TutorialOverlayManager.isTutorialComplete()).toBe(false);
  });

  it('returns true after all 5 steps are dismissed', () => {
    for (let i = 1; i <= 5; i++) {
      TutorialOverlayManager.markStepDismissed(i);
    }
    expect(TutorialOverlayManager.isTutorialComplete()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shouldShowStep
// ---------------------------------------------------------------------------

describe('TutorialOverlayManager.shouldShowStep', () => {
  it('returns true for challenge 1 with matching trigger on_mount', () => {
    expect(TutorialOverlayManager.shouldShowStep(1, 'on_mount')).toBe(true);
  });

  it('returns false for challenge 1 with non-matching trigger on_first_input', () => {
    expect(TutorialOverlayManager.shouldShowStep(1, 'on_first_input')).toBe(false);
  });

  it('returns false for challenge 99 (no step defined)', () => {
    expect(TutorialOverlayManager.shouldShowStep(99, 'on_mount')).toBe(false);
  });

  it('returns false after dismissal', () => {
    TutorialOverlayManager.markStepDismissed(3);
    expect(TutorialOverlayManager.shouldShowStep(3, 'on_no_input_3s')).toBe(false);
  });

  it('returns true for challenge 2 with on_no_input_3s trigger', () => {
    expect(TutorialOverlayManager.shouldShowStep(2, 'on_no_input_3s')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resetDismissedState
// ---------------------------------------------------------------------------

describe('TutorialOverlayManager.resetDismissedState', () => {
  it('re-enables dismissed steps after reset', () => {
    TutorialOverlayManager.markStepDismissed(1);
    TutorialOverlayManager.markStepDismissed(2);
    TutorialOverlayManager.resetDismissedState();

    expect(TutorialOverlayManager.shouldShowStep(1, 'on_mount')).toBe(true);
    expect(TutorialOverlayManager.shouldShowStep(2, 'on_no_input_3s')).toBe(true);
  });
});
