/**
 * Property-based tests for InputController timing behaviour — Task 3.2.1 / 3.2.2
 *
 * Property 1: Tap/hold distinction never misclassifies at timing boundaries.
 *   For any hold duration d:
 *     d < 150ms  → release generates a tap event (not a hold)
 *     d >= 150ms → release generates a hold event (not a tap)
 *
 * Property 2: Intensity is always in [0, 1] for any hold duration.
 *   For any non-negative hold duration d, computeIntensity(d) ∈ [0.0, 1.0].
 *
 * Validates: Requirements 16.1, 22.6
 */

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

if (typeof global.performance === 'undefined') {
  // @ts-expect-error shim
  global.performance = { now: () => Date.now() };
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import * as fc from 'fast-check';
import {
  InputController,
  computeIntensity,
  TAP_MAX_MS,
} from '../../src/features/game/core/InputController';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simulatePress(
  side: 'left' | 'right',
  pressTime: number,
  durationMs: number,
): void {
  if (side === 'left') {
    InputController.onLeftPress({ timestamp: pressTime });
    InputController.onLeftRelease({ timestamp: pressTime + durationMs });
  } else {
    InputController.onRightPress({ timestamp: pressTime });
    InputController.onRightRelease({ timestamp: pressTime + durationMs });
  }
}

// ---------------------------------------------------------------------------
// Property 1: Tap/hold distinction never misclassifies at timing boundaries
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 16.1**
 *
 * For any hold duration strictly less than TAP_MAX_MS (150ms):
 *   The generated event must be tap_left/tap_right — never hold_left/hold_right.
 */
describe('Property 1: tap/hold classification', () => {
  it('hold duration < 150ms always produces a tap event, never a hold event', () => {
    fc.assert(
      fc.property(
        // Duration in [0, TAP_MAX_MS - 1] (strictly less than threshold)
        fc.integer({ min: 0, max: TAP_MAX_MS - 1 }),
        // Which button side to test
        fc.constantFrom('left' as const, 'right' as const),
        (duration, side) => {
          InputController.reset();
          const pressTime = 10000; // Fixed base time — avoids any crossover with previous state
          simulatePress(side, pressTime, duration);
          const events = InputController.drainEvents();

          const tapType = side === 'left' ? 'tap_left' : 'tap_right';
          const holdType = side === 'left' ? 'hold_left' : 'hold_right';

          const hasTap = events.some((e) => e.type === tapType);
          const hasHold = events.some((e) => e.type === holdType);

          // Must have tap event.
          if (!hasTap) return false;
          // Must NOT have hold event.
          if (hasHold) return false;
          return true;
        },
      ),
    );
  });

  it('hold duration >= 150ms always produces a hold event, never a tap event', () => {
    fc.assert(
      fc.property(
        // Duration from TAP_MAX_MS up to 2000ms
        fc.integer({ min: TAP_MAX_MS, max: 2000 }),
        fc.constantFrom('left' as const, 'right' as const),
        (duration, side) => {
          InputController.reset();
          const pressTime = 10000;
          simulatePress(side, pressTime, duration);
          const events = InputController.drainEvents();

          const tapType = side === 'left' ? 'tap_left' : 'tap_right';
          const holdType = side === 'left' ? 'hold_left' : 'hold_right';

          const hasTap = events.some((e) => e.type === tapType);
          const hasHold = events.some((e) => e.type === holdType);

          // Must have hold event (either from release OR from tick-based firing).
          if (!hasHold) return false;
          // Must NOT have tap event.
          if (hasTap) return false;
          return true;
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Intensity always in [0, 1] for any hold duration
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 22.6**
 *
 * For any non-negative hold duration d, computeIntensity(d) must be in [0, 1].
 * This covers the full ramp model including ramp-up, peak, and decay phases.
 */
describe('Property 2: intensity always in [0, 1]', () => {
  it('computeIntensity returns a value in [0, 1] for any non-negative hold duration', () => {
    fc.assert(
      fc.property(
        // Hold duration 0ms to 60_000ms (1 minute)
        fc.float({ min: 0, max: 60000, noNaN: true }),
        (holdMs) => {
          const intensity = computeIntensity(holdMs);
          return intensity >= 0.0 && intensity <= 1.0;
        },
      ),
    );
  });

  it('intensity ramps monotonically upward during the first RAMP_UP_MS (300ms)', () => {
    // For any two durations a < b both within [0, RAMP_UP_MS]:
    // computeIntensity(a) <= computeIntensity(b)
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 300, noNaN: true }),
        fc.float({ min: 0, max: 300, noNaN: true }),
        (a, b) => {
          const smaller = Math.min(a, b);
          const larger = Math.max(a, b);
          return computeIntensity(smaller) <= computeIntensity(larger) + 1e-10;
        },
      ),
    );
  });

  it('intensity never rises above 1.0 for any hold duration', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 60000, noNaN: true }),
        (holdMs) => computeIntensity(holdMs) <= 1.0,
      ),
    );
  });

  it('intensity never drops below 0.3 for hold durations >= HOLD_PEAK_MS (1500ms)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1500, max: 60000, noNaN: true }),
        (holdMs) => computeIntensity(holdMs) >= 0.3,
      ),
    );
  });
});
