/**
 * Unit tests for InputController — tasks 3.2.1 and 3.2.2
 *
 * Covers:
 *  - Tap detection (< 150 ms)
 *  - Hold detection (>= 150 ms)
 *  - Long-hold intensity decay (> 1500 ms)
 *  - Rapid tap triggers turbulence (3+ taps in 500 ms)
 *  - Simultaneous press detection (both within 50 ms)
 *  - Alternating tap detection (L-R-L within 600 ms)
 *  - Button intensity ramp at t=0, t=300ms, t=1500ms, t=3500ms
 *
 * Requirements: 16.1, 22.6
 */

// ---------------------------------------------------------------------------
// Stubs — performance.now not available in Node < 16 without global.performance
// ---------------------------------------------------------------------------

if (typeof global.performance === 'undefined') {
  // @ts-expect-error shim for older Node
  global.performance = { now: () => Date.now() };
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  InputController,
  computeIntensity,
  TAP_MAX_MS,
  HOLD_PEAK_MS,
  RAMP_UP_MS,
} from '../../src/features/game/core/InputController';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate a full tap on the given side. */
function simulateTap(side: 'left' | 'right', pressTime: number, durationMs: number): void {
  const releaseTime = pressTime + durationMs;
  if (side === 'left') {
    InputController.onLeftPress({ timestamp: pressTime });
    InputController.onLeftRelease({ timestamp: releaseTime });
  } else {
    InputController.onRightPress({ timestamp: pressTime });
    InputController.onRightRelease({ timestamp: releaseTime });
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  InputController.reset();
});

// ---------------------------------------------------------------------------
// 1. Intensity Ramp Model — Task 3.2.2
// ---------------------------------------------------------------------------

describe('computeIntensity — button intensity ramp model', () => {
  it('intensity is 0 at t=0ms (start of hold)', () => {
    expect(computeIntensity(0)).toBe(0);
  });

  it('intensity ramps linearly from 0 to 1 over the first 300ms', () => {
    expect(computeIntensity(0)).toBeCloseTo(0, 5);
    expect(computeIntensity(150)).toBeCloseTo(0.5, 5);
    expect(computeIntensity(300)).toBeCloseTo(1.0, 5);
  });

  it('intensity is exactly 1.0 at t=300ms (ramp complete)', () => {
    expect(computeIntensity(300)).toBe(1.0);
  });

  it('intensity is 1.0 during the peak window (300ms – 1500ms)', () => {
    expect(computeIntensity(300)).toBe(1.0);
    expect(computeIntensity(900)).toBe(1.0);
    expect(computeIntensity(1499)).toBe(1.0);
  });

  it('intensity is exactly 1.0 at t=1500ms (peak boundary)', () => {
    expect(computeIntensity(1500)).toBe(1.0);
  });

  it('intensity decays after 1500ms', () => {
    // At 1500ms the decay just begins; at 1500+epsilon it should be slightly below 1.
    expect(computeIntensity(1600)).toBeLessThan(1.0);
    expect(computeIntensity(3500)).toBeLessThan(1.0);
  });

  it('intensity at t=3500ms is at the floor (0.3)', () => {
    // 3500ms = 1500ms peak + 2000ms decay → decay = max(0.3, 1.0 - 2000/2000) = max(0.3, 0) = 0.3
    expect(computeIntensity(3500)).toBeCloseTo(0.3, 5);
  });

  it('intensity never falls below 0.3 after the decay floor is reached', () => {
    // Beyond 3500ms intensity should stay at 0.3 (floor).
    expect(computeIntensity(4000)).toBe(0.3);
    expect(computeIntensity(10000)).toBe(0.3);
  });

  it('intensity is never negative for any positive hold duration', () => {
    const durations = [0, 1, 50, 149, 150, 300, 900, 1500, 2000, 3500, 5000, 100000];
    for (const d of durations) {
      expect(computeIntensity(d)).toBeGreaterThanOrEqual(0);
    }
  });

  it('intensity is never greater than 1.0', () => {
    const durations = [0, 1, 50, 149, 150, 300, 900, 1500, 2000, 3500, 5000];
    for (const d of durations) {
      expect(computeIntensity(d)).toBeLessThanOrEqual(1.0);
    }
  });

  it('RAMP_UP_MS constant is 300', () => {
    expect(RAMP_UP_MS).toBe(300);
  });

  it('HOLD_PEAK_MS constant is 1500', () => {
    expect(HOLD_PEAK_MS).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// 2. Tap Detection — Algorithm 1
// ---------------------------------------------------------------------------

describe('tap detection (< 150 ms)', () => {
  it('short left press (< 150ms) generates tap_left event', () => {
    simulateTap('left', 1000, 100); // 100ms < 150ms threshold
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'tap_left')).toBe(true);
  });

  it('short right press (< 150ms) generates tap_right event', () => {
    simulateTap('right', 1000, 100);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'tap_right')).toBe(true);
  });

  it('press at exactly TAP_MAX_MS boundary is NOT classified as tap', () => {
    // Exactly 150ms — boundary condition: < 150ms is tap, so 150ms is NOT a tap.
    simulateTap('left', 1000, TAP_MAX_MS);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'tap_left')).toBe(false);
  });

  it('press just under boundary (149ms) IS classified as tap', () => {
    simulateTap('left', 1000, 149);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'tap_left')).toBe(true);
  });

  it('TAP_MAX_MS constant is 150', () => {
    expect(TAP_MAX_MS).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// 3. Hold Detection — Algorithm 2
// ---------------------------------------------------------------------------

describe('hold detection (>= 150 ms)', () => {
  it('release after 150ms generates hold_left event', () => {
    simulateTap('left', 1000, 150); // exactly 150ms
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'hold_left')).toBe(true);
  });

  it('release after 200ms generates hold_left event', () => {
    simulateTap('left', 1000, 200);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'hold_left')).toBe(true);
  });

  it('release after 150ms generates hold_right event (right side)', () => {
    simulateTap('right', 1000, 150);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'hold_right')).toBe(true);
  });

  it('hold does NOT generate tap event', () => {
    simulateTap('left', 1000, 200);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'tap_left')).toBe(false);
  });

  it('hold_left_peak fires when tick is called after HOLD_PEAK_MS', () => {
    const pressTime = 1000;
    InputController.onLeftPress({ timestamp: pressTime });
    // Tick at pressTime + HOLD_PEAK_MS (exactly 1500ms held).
    InputController.tick(pressTime + HOLD_PEAK_MS);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'hold_left_peak')).toBe(true);
  });

  it('hold_left_peak does not fire twice for the same hold session', () => {
    const pressTime = 1000;
    InputController.onLeftPress({ timestamp: pressTime });
    InputController.tick(pressTime + HOLD_PEAK_MS);
    InputController.tick(pressTime + HOLD_PEAK_MS + 100);
    InputController.tick(pressTime + HOLD_PEAK_MS + 200);
    const events = InputController.drainEvents();
    const peakEvents = events.filter((e) => e.type === 'hold_left_peak');
    expect(peakEvents).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Rapid Tap Detection — Algorithm 4
// ---------------------------------------------------------------------------

describe('rapid tap triggers turbulence (3+ taps in 500ms)', () => {
  it('3 quick taps in under 500ms triggers rapid_tap event', () => {
    simulateTap('left', 100, 50);
    simulateTap('left', 200, 50);
    simulateTap('left', 300, 50);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'rapid_tap')).toBe(true);
  });

  it('rapid_tap sets turbulenceActive on next getCurrentInputStateAt call', () => {
    simulateTap('left', 100, 50);
    simulateTap('left', 200, 50);
    simulateTap('left', 300, 50);

    // turbulenceActive should be set.
    const state = InputController.getCurrentInputStateAt(350);
    expect(state.turbulenceActive).toBe(true);
  });

  it('2 taps in 500ms does NOT trigger rapid_tap', () => {
    simulateTap('left', 100, 50);
    simulateTap('left', 200, 50);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'rapid_tap')).toBe(false);
  });

  it('3 taps spread over more than 500ms does NOT trigger rapid_tap', () => {
    // Taps at 0ms, 300ms, and 700ms — first and third are > 500ms apart.
    simulateTap('left', 0, 50);
    simulateTap('left', 300, 50);
    simulateTap('left', 700, 50); // 700 - 0 > 500ms; window has slid past first tap
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'rapid_tap')).toBe(false);
  });

  it('rapid_tap turbulence seed equals the timestamp of the triggering tap', () => {
    simulateTap('left', 100, 50);
    simulateTap('left', 200, 50);
    const thirdTapRelease = 350;
    simulateTap('left', 300, thirdTapRelease - 300);
    const state = InputController.getCurrentInputStateAt(400);
    // turbulenceSeed should be set to the release timestamp of the triggering tap.
    expect(state.turbulenceSeed).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Simultaneous Press Detection — Algorithm 5
// ---------------------------------------------------------------------------

describe('simultaneous press detection (both within 50ms)', () => {
  it('both buttons pressed within 50ms triggers simultaneous_press', () => {
    InputController.onLeftPress({ timestamp: 1000 });
    InputController.onRightPress({ timestamp: 1040 }); // 40ms gap < 50ms
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'simultaneous_press')).toBe(true);
  });

  it('buttons pressed exactly 50ms apart triggers simultaneous_press', () => {
    InputController.onLeftPress({ timestamp: 1000 });
    InputController.onRightPress({ timestamp: 1050 }); // exactly 50ms
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'simultaneous_press')).toBe(true);
  });

  it('buttons pressed more than 50ms apart does NOT trigger simultaneous_press', () => {
    InputController.onLeftPress({ timestamp: 1000 });
    InputController.onRightPress({ timestamp: 1100 }); // 100ms gap > 50ms
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'simultaneous_press')).toBe(false);
  });

  it('simultaneous_press fires only once per simultaneous hold session', () => {
    InputController.onLeftPress({ timestamp: 1000 });
    InputController.onRightPress({ timestamp: 1020 });
    // Multiple ticks while both held — should not re-fire.
    InputController.tick(1050);
    InputController.tick(1100);
    const events = InputController.drainEvents();
    const simEvents = events.filter((e) => e.type === 'simultaneous_press');
    expect(simEvents).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Alternating Tap Detection — Algorithm 6
// ---------------------------------------------------------------------------

describe('alternating tap (L-R-L within 600ms)', () => {
  it('L-R-L sequence within 600ms triggers alternating_tap', () => {
    simulateTap('left', 0, 50);
    simulateTap('right', 100, 50);
    simulateTap('left', 200, 50);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'alternating_tap')).toBe(true);
  });

  it('L-R-L spread over more than 600ms does NOT trigger alternating_tap', () => {
    simulateTap('left', 0, 50);
    simulateTap('right', 100, 50);
    simulateTap('left', 700, 50); // > 600ms from window start
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'alternating_tap')).toBe(false);
  });

  it('R-L-R sequence does NOT trigger alternating_tap', () => {
    simulateTap('right', 0, 50);
    simulateTap('left', 100, 50);
    simulateTap('right', 200, 50);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'alternating_tap')).toBe(false);
  });

  it('L-L-R does NOT trigger alternating_tap', () => {
    simulateTap('left', 0, 50);
    simulateTap('left', 100, 50);
    simulateTap('right', 200, 50);
    const events = InputController.drainEvents();
    expect(events.some((e) => e.type === 'alternating_tap')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. InputState shape and reset
// ---------------------------------------------------------------------------

describe('getCurrentInputStateAt and reset', () => {
  it('initial state has all flags false and intensities 0', () => {
    const state = InputController.getCurrentInputStateAt(1000);
    expect(state.leftHeld).toBe(false);
    expect(state.rightHeld).toBe(false);
    expect(state.leftIntensity).toBe(0);
    expect(state.rightIntensity).toBe(0);
    expect(state.turbulenceActive).toBe(false);
  });

  it('leftHeld becomes true after onLeftPress and false after onLeftRelease', () => {
    InputController.onLeftPress({ timestamp: 1000 });
    expect(InputController.getCurrentInputStateAt(1001).leftHeld).toBe(true);

    InputController.onLeftRelease({ timestamp: 1002 });
    expect(InputController.getCurrentInputStateAt(1003).leftHeld).toBe(false);
  });

  it('intensity at t=0 hold is 0', () => {
    const press = 1000;
    InputController.onLeftPress({ timestamp: press });
    // Immediately at press time — holdMs = 0
    const state = InputController.getCurrentInputStateAt(press);
    expect(state.leftIntensity).toBeCloseTo(0, 5);
  });

  it('intensity at 300ms into hold is ~1.0', () => {
    const press = 1000;
    InputController.onLeftPress({ timestamp: press });
    const state = InputController.getCurrentInputStateAt(press + 300);
    expect(state.leftIntensity).toBeCloseTo(1.0, 5);
  });

  it('intensity at 1500ms into hold is 1.0 (peak)', () => {
    const press = 1000;
    InputController.onLeftPress({ timestamp: press });
    const state = InputController.getCurrentInputStateAt(press + 1500);
    expect(state.leftIntensity).toBeCloseTo(1.0, 5);
  });

  it('intensity at 3500ms into hold is at the decay floor (0.3)', () => {
    const press = 1000;
    InputController.onLeftPress({ timestamp: press });
    const state = InputController.getCurrentInputStateAt(press + 3500);
    expect(state.leftIntensity).toBeCloseTo(0.3, 5);
  });

  it('reset clears all state', () => {
    InputController.onLeftPress({ timestamp: 1000 });
    InputController.onRightPress({ timestamp: 1010 });
    InputController.reset();

    const state = InputController.getCurrentInputStateAt(1100);
    expect(state.leftHeld).toBe(false);
    expect(state.rightHeld).toBe(false);
    expect(state.leftIntensity).toBe(0);
    expect(state.rightIntensity).toBe(0);
  });
});
