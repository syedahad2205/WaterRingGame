/**
 * Unit tests for AdaptiveAssistController, PlayerBehaviorMonitor, SessionAnalyzer
 *
 * Covers:
 *   - proximity_glow activates after 2 consecutive failures
 *   - near_miss_bonus activates when 1 ring away at timer expiry
 *   - show_skip_option activates after 3 quits in 5 minutes
 *   - reset() clears all flags
 *   - no assists active on first attempt
 *   - PlayerBehaviorMonitor input rate calculation
 *   - SessionAnalyzer frustration tracking
 *
 * Validates: Requirements 7.2.2, 16.2
 */

import { AdaptiveAssistController } from '../../src/features/game/adaptive/AdaptiveAssistController';
import { PlayerBehaviorMonitor } from '../../src/features/game/adaptive/PlayerBehaviorMonitor';
import { SessionAnalyzer } from '../../src/features/game/adaptive/SessionAnalyzer';
import type { AttemptResult, AttemptProgress } from '../../src/features/game/adaptive/AdaptiveAssistController';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFailedAttempt(
  challengeNumber: number,
  ringsPlaced: number,
  totalRequired: number,
  timeRemaining = 0,
): AttemptResult {
  return {
    challengeNumber,
    ringsPlaced,
    totalRequired,
    timerExpired: true,
    timeRemaining,
    totalTime: 60,
  };
}

function makeSuccessAttempt(challengeNumber: number): AttemptResult {
  return {
    challengeNumber,
    ringsPlaced: 3,
    totalRequired: 3,
    timerExpired: false,
    timeRemaining: 20,
    totalTime: 60,
  };
}

function makeQuit(challengeNumber: number): AttemptProgress {
  return {
    challengeNumber,
    ringsPlaced: 1,
    totalRequired: 3,
    timeRemaining: 30,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  AdaptiveAssistController.resetAll();
  SessionAnalyzer.reset();
  PlayerBehaviorMonitor.reset();
});

// ---------------------------------------------------------------------------
// No assists on first attempt
// ---------------------------------------------------------------------------

describe('AdaptiveAssistController — no assists initially', () => {
  it('returns empty assists for a fresh challenge', () => {
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).toHaveLength(0);
  });

  it('returns null for nearMissBonusSeconds initially', () => {
    expect(AdaptiveAssistController.getNearMissBonusSeconds()).toBeNull();
  });

  it('shouldShowSkipOption() returns false initially', () => {
    expect(AdaptiveAssistController.shouldShowSkipOption()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// proximity_glow: activates after 2 consecutive failures
// ---------------------------------------------------------------------------

describe('AdaptiveAssistController — proximity_glow', () => {
  it('does NOT activate after 1 failure', () => {
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).not.toContain('proximity_glow');
  });

  it('activates after 2 consecutive failures', () => {
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).toContain('proximity_glow');
  });

  it('resets consecutive failure count on a win', () => {
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    AdaptiveAssistController.recordAttempt(makeSuccessAttempt(1));
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    // Only 1 failure since the last win — should NOT have proximity_glow
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).not.toContain('proximity_glow');
  });

  it('activates for the specific challenge only, not others', () => {
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    // Challenge 2 should have no assists
    const assistsFor2 = AdaptiveAssistController.getActiveAssistsForChallenge(2);
    expect(assistsFor2).not.toContain('proximity_glow');
  });
});

// ---------------------------------------------------------------------------
// near_miss_bonus: activates when 1 ring away at timer expiry
// ---------------------------------------------------------------------------

describe('AdaptiveAssistController — near_miss_bonus', () => {
  it('activates when exactly 1 ring away from completion on timer expiry', () => {
    // 2 out of 3 rings placed, timer expired
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 2, 3));
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).toContain('near_miss_bonus');
  });

  it('getNearMissBonusSeconds() returns 15 when near_miss_bonus is active', () => {
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 2, 3));
    // Trigger getActiveAssists so the latest challenge is tracked
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 2, 3));
    const bonus = AdaptiveAssistController.getNearMissBonusSeconds();
    expect(bonus).toBe(15);
  });

  it('does NOT activate when 2 rings away from completion', () => {
    // 1 out of 3 rings placed
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 1, 3));
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).not.toContain('near_miss_bonus');
  });

  it('does NOT activate when timer did NOT expire (win)', () => {
    AdaptiveAssistController.recordAttempt(makeSuccessAttempt(1));
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).not.toContain('near_miss_bonus');
  });

  it('does NOT activate when totalRequired is 0', () => {
    // Edge case: challenge with no required rings
    const attempt: AttemptResult = {
      challengeNumber: 1,
      ringsPlaced: 0,
      totalRequired: 0,
      timerExpired: true,
      timeRemaining: 0,
      totalTime: 60,
    };
    AdaptiveAssistController.recordAttempt(attempt);
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).not.toContain('near_miss_bonus');
  });
});

// ---------------------------------------------------------------------------
// show_skip_option: activates after 3 quits
// ---------------------------------------------------------------------------

describe('AdaptiveAssistController — show_skip_option', () => {
  it('does NOT activate after 2 quits', () => {
    AdaptiveAssistController.recordQuit(makeQuit(1));
    AdaptiveAssistController.recordQuit(makeQuit(1));
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).not.toContain('show_skip_option');
  });

  it('activates after 3 quits on the same challenge', () => {
    AdaptiveAssistController.recordQuit(makeQuit(1));
    AdaptiveAssistController.recordQuit(makeQuit(1));
    AdaptiveAssistController.recordQuit(makeQuit(1));
    const assists = AdaptiveAssistController.getActiveAssistsForChallenge(1);
    expect(assists).toContain('show_skip_option');
  });

  it('shouldShowSkipOption() returns true after 3 quits', () => {
    AdaptiveAssistController.recordQuit(makeQuit(1));
    AdaptiveAssistController.recordQuit(makeQuit(1));
    AdaptiveAssistController.recordQuit(makeQuit(1));
    expect(AdaptiveAssistController.shouldShowSkipOption()).toBe(true);
  });

  it('does NOT activate for a different challenge', () => {
    AdaptiveAssistController.recordQuit(makeQuit(1));
    AdaptiveAssistController.recordQuit(makeQuit(1));
    AdaptiveAssistController.recordQuit(makeQuit(1));
    // Challenge 2 is unaffected
    const assistsFor2 = AdaptiveAssistController.getActiveAssistsForChallenge(2);
    expect(assistsFor2).not.toContain('show_skip_option');
  });
});

// ---------------------------------------------------------------------------
// reset() clears all flags
// ---------------------------------------------------------------------------

describe('AdaptiveAssistController — reset()', () => {
  it('clears all active assists for the given challenge', () => {
    // Trigger proximity_glow
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    expect(AdaptiveAssistController.getActiveAssistsForChallenge(1)).toContain('proximity_glow');

    // Reset challenge 1
    AdaptiveAssistController.reset(1);
    expect(AdaptiveAssistController.getActiveAssistsForChallenge(1)).toHaveLength(0);
  });

  it('only clears the specified challenge, not others', () => {
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(1, 0, 3));
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(2, 0, 3));
    AdaptiveAssistController.recordAttempt(makeFailedAttempt(2, 0, 3));

    AdaptiveAssistController.reset(1);

    // Challenge 1 cleared
    expect(AdaptiveAssistController.getActiveAssistsForChallenge(1)).toHaveLength(0);
    // Challenge 2 still has proximity_glow
    expect(AdaptiveAssistController.getActiveAssistsForChallenge(2)).toContain('proximity_glow');
  });
});

// ---------------------------------------------------------------------------
// PlayerBehaviorMonitor
// ---------------------------------------------------------------------------

describe('PlayerBehaviorMonitor', () => {
  beforeEach(() => PlayerBehaviorMonitor.reset());

  it('returns 0 input rate when no presses recorded', () => {
    expect(PlayerBehaviorMonitor.getInputRate(10_000)).toBe(0);
  });

  it('returns > 0 input rate after recording presses', () => {
    const now = Date.now();
    PlayerBehaviorMonitor.recordButtonPress(now - 1000);
    PlayerBehaviorMonitor.recordButtonPress(now - 2000);
    PlayerBehaviorMonitor.recordButtonPress(now - 3000);
    // 3 presses in last 10 seconds = 0.3/s
    const rate = PlayerBehaviorMonitor.getInputRate(10_000);
    expect(rate).toBeGreaterThan(0);
  });

  it('excludes presses outside the window', () => {
    const now = Date.now();
    // Very old press — outside a 5s window
    PlayerBehaviorMonitor.recordButtonPress(now - 20_000);
    const rate = PlayerBehaviorMonitor.getInputRate(5_000);
    expect(rate).toBe(0);
  });

  it('reset() clears all timestamps', () => {
    PlayerBehaviorMonitor.recordButtonPress(Date.now());
    PlayerBehaviorMonitor.reset();
    expect(PlayerBehaviorMonitor.getInputRate(10_000)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SessionAnalyzer
// ---------------------------------------------------------------------------

describe('SessionAnalyzer', () => {
  beforeEach(() => SessionAnalyzer.reset());

  it('isChallengeConsideredFrustrating returns false initially', () => {
    expect(SessionAnalyzer.isChallengeConsideredFrustrating(1)).toBe(false);
  });

  it('recordChallengeFrustration accumulates failures', () => {
    SessionAnalyzer.recordChallengeFrustration(1);
    SessionAnalyzer.recordChallengeFrustration(1);
    // 2 frustrations < 4 threshold — still false
    expect(SessionAnalyzer.isChallengeConsideredFrustrating(1)).toBe(false);
  });

  it('marks challenge as frustrating after 4 failures', () => {
    for (let i = 0; i < 4; i++) {
      SessionAnalyzer.recordChallengeFrustration(1);
    }
    expect(SessionAnalyzer.isChallengeConsideredFrustrating(1)).toBe(true);
  });

  it('recordChallengeQuit increments quit count', () => {
    SessionAnalyzer.recordChallengeQuit(1);
    SessionAnalyzer.recordChallengeQuit(1);
    SessionAnalyzer.recordChallengeQuit(1);
    expect(SessionAnalyzer.isChallengeConsideredFrustrating(1)).toBe(true);
  });

  it('reset() clears all records', () => {
    for (let i = 0; i < 4; i++) {
      SessionAnalyzer.recordChallengeFrustration(1);
    }
    SessionAnalyzer.reset();
    expect(SessionAnalyzer.isChallengeConsideredFrustrating(1)).toBe(false);
  });
});
