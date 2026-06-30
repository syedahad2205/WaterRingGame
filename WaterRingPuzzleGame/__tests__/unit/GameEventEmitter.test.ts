/**
 * Unit tests for GameEventEmitter — task 2.3.1a
 *
 * Covers: subscribe, dispatch, unsubscribe for all 9 event types.
 * Requirements: 3.1, 3.3
 */

import {
  GameEventEmitterClass,
  gameEventEmitter,
  type InputProcessedPayload,
  type PhysicsSteppedPayload,
  type WinConditionMetPayload,
  type TimerExpiredPayload,
  type RingSettledPayload,
  type RingNearPegPayload,
  type RingCollisionPayload,
  type ObstacleCollisionPayload,
  type AssistTriggeredPayload,
} from '@utils/GameEventEmitter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fresh emitter instance for each test so tests are isolated. */
function makeEmitter(): GameEventEmitterClass {
  return new GameEventEmitterClass();
}

// ---------------------------------------------------------------------------
// 1. Singleton export
// ---------------------------------------------------------------------------

describe('singleton instance', () => {
  it('exports a single shared gameEventEmitter instance', () => {
    expect(gameEventEmitter).toBeInstanceOf(GameEventEmitterClass);
  });

  it('is an instance of GameEventEmitterClass (singleton class contract)', () => {
    // The singleton is created once at module level; verify it is the correct
    // class and that repeated references point to the same object.
    const ref1 = gameEventEmitter;
    const ref2 = gameEventEmitter;
    expect(ref1).toBe(ref2);
    expect(ref1).toBeInstanceOf(GameEventEmitterClass);
  });
});

// ---------------------------------------------------------------------------
// 2. subscribe / dispatch / unsubscribe — core contract
// ---------------------------------------------------------------------------

describe('subscribe and dispatch', () => {
  it('delivers the dispatched payload to a registered listener', () => {
    const emitter = makeEmitter();
    const received: InputProcessedPayload[] = [];

    emitter.subscribe('input_processed', (p) => received.push(p));
    emitter.dispatch('input_processed', { type: 'tap_left', timestamp: 1000 });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: 'tap_left', timestamp: 1000 });
  });

  it('delivers to multiple listeners for the same event', () => {
    const emitter = makeEmitter();
    let callCount = 0;

    emitter.subscribe('physics_stepped', () => callCount++);
    emitter.subscribe('physics_stepped', () => callCount++);
    emitter.dispatch('physics_stepped', { dt: 16.67, tickNumber: 1 });

    expect(callCount).toBe(2);
  });

  it('does not deliver to listeners of a different event', () => {
    const emitter = makeEmitter();
    const received: WinConditionMetPayload[] = [];

    emitter.subscribe('win_condition_met', (p) => received.push(p));
    emitter.dispatch('timer_expired', { challengeNumber: 3 });

    expect(received).toHaveLength(0);
  });

  it('does nothing when dispatching to an event with no subscribers', () => {
    const emitter = makeEmitter();
    // Should not throw
    expect(() =>
      emitter.dispatch('ring_collision', { ringIdA: 'r1', ringIdB: 'r2', speed: 5 }),
    ).not.toThrow();
  });
});

describe('unsubscribe — via returned function', () => {
  it('stops delivering events after calling the returned unsubscribe fn', () => {
    const emitter = makeEmitter();
    const received: TimerExpiredPayload[] = [];

    const unsub = emitter.subscribe('timer_expired', (p) => received.push(p));
    emitter.dispatch('timer_expired', { challengeNumber: 1 });
    unsub();
    emitter.dispatch('timer_expired', { challengeNumber: 2 });

    expect(received).toHaveLength(1);
    expect(received[0].challengeNumber).toBe(1);
  });
});

describe('unsubscribe — via explicit unsubscribe method', () => {
  it('removes the specific listener without affecting others', () => {
    const emitter = makeEmitter();
    let aCount = 0;
    let bCount = 0;

    const listenerA = (): void => { aCount++; };
    const listenerB = (): void => { bCount++; };

    emitter.subscribe('ring_settled', listenerA);
    emitter.subscribe('ring_settled', listenerB);

    emitter.unsubscribe('ring_settled', listenerA);
    emitter.dispatch('ring_settled', {
      ringId: 'r1',
      pegId: 'p1',
      challengeNumber: 1,
    });

    expect(aCount).toBe(0);
    expect(bCount).toBe(1);
  });
});

describe('listenerCount', () => {
  it('tracks the current subscriber count correctly', () => {
    const emitter = makeEmitter();
    expect(emitter.listenerCount('ring_near_peg')).toBe(0);

    const unsub1 = emitter.subscribe('ring_near_peg', () => undefined);
    const unsub2 = emitter.subscribe('ring_near_peg', () => undefined);
    expect(emitter.listenerCount('ring_near_peg')).toBe(2);

    unsub1();
    expect(emitter.listenerCount('ring_near_peg')).toBe(1);

    unsub2();
    expect(emitter.listenerCount('ring_near_peg')).toBe(0);
  });
});

describe('removeAllListeners', () => {
  it('clears every listener across all event types', () => {
    const emitter = makeEmitter();
    emitter.subscribe('input_processed', () => undefined);
    emitter.subscribe('physics_stepped', () => undefined);
    emitter.subscribe('win_condition_met', () => undefined);

    emitter.removeAllListeners();

    expect(emitter.listenerCount('input_processed')).toBe(0);
    expect(emitter.listenerCount('physics_stepped')).toBe(0);
    expect(emitter.listenerCount('win_condition_met')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. All 9 event types — individual dispatch tests
// ---------------------------------------------------------------------------

describe('event type: input_processed', () => {
  it('dispatches with optional intensity field', () => {
    const emitter = makeEmitter();
    const received: InputProcessedPayload[] = [];

    emitter.subscribe('input_processed', (p) => received.push(p));
    emitter.dispatch('input_processed', {
      type: 'hold_right_peak',
      timestamp: 5000,
      intensity: 0.8,
    });

    expect(received[0]).toEqual({ type: 'hold_right_peak', timestamp: 5000, intensity: 0.8 });
  });

  it('dispatches without optional intensity field', () => {
    const emitter = makeEmitter();
    const received: InputProcessedPayload[] = [];

    emitter.subscribe('input_processed', (p) => received.push(p));
    emitter.dispatch('input_processed', { type: 'tap_right', timestamp: 2000 });

    expect(received[0].intensity).toBeUndefined();
  });
});

describe('event type: physics_stepped', () => {
  it('delivers dt and tickNumber', () => {
    const emitter = makeEmitter();
    let result: PhysicsSteppedPayload | null = null;

    emitter.subscribe('physics_stepped', (p) => { result = p; });
    emitter.dispatch('physics_stepped', { dt: 16.67, tickNumber: 42 });

    expect(result).toEqual({ dt: 16.67, tickNumber: 42 });
  });
});

describe('event type: win_condition_met', () => {
  it('delivers challengeNumber and timeRemaining', () => {
    const emitter = makeEmitter();
    let result: WinConditionMetPayload | null = null;

    emitter.subscribe('win_condition_met', (p) => { result = p; });
    emitter.dispatch('win_condition_met', { challengeNumber: 5, timeRemaining: 12.5 });

    expect(result).toEqual({ challengeNumber: 5, timeRemaining: 12.5 });
  });
});

describe('event type: timer_expired', () => {
  it('delivers challengeNumber', () => {
    const emitter = makeEmitter();
    let result: TimerExpiredPayload | null = null;

    emitter.subscribe('timer_expired', (p) => { result = p; });
    emitter.dispatch('timer_expired', { challengeNumber: 7 });

    expect(result).toEqual({ challengeNumber: 7 });
  });
});

describe('event type: ring_settled', () => {
  it('delivers ringId, pegId, and challengeNumber', () => {
    const emitter = makeEmitter();
    let result: RingSettledPayload | null = null;

    emitter.subscribe('ring_settled', (p) => { result = p; });
    emitter.dispatch('ring_settled', {
      ringId: 'ring-blue',
      pegId: 'peg-2',
      challengeNumber: 10,
    });

    expect(result).toEqual({ ringId: 'ring-blue', pegId: 'peg-2', challengeNumber: 10 });
  });
});

describe('event type: ring_near_peg', () => {
  it('delivers ringId, pegId, and distance', () => {
    const emitter = makeEmitter();
    let result: RingNearPegPayload | null = null;

    emitter.subscribe('ring_near_peg', (p) => { result = p; });
    emitter.dispatch('ring_near_peg', { ringId: 'ring-red', pegId: 'peg-1', distance: 24.5 });

    expect(result).toEqual({ ringId: 'ring-red', pegId: 'peg-1', distance: 24.5 });
  });
});

describe('event type: ring_collision', () => {
  it('delivers ringIdA, ringIdB, and speed', () => {
    const emitter = makeEmitter();
    let result: RingCollisionPayload | null = null;

    emitter.subscribe('ring_collision', (p) => { result = p; });
    emitter.dispatch('ring_collision', { ringIdA: 'r1', ringIdB: 'r2', speed: 3.2 });

    expect(result).toEqual({ ringIdA: 'r1', ringIdB: 'r2', speed: 3.2 });
  });
});

describe('event type: obstacle_collision', () => {
  it('delivers ringId, obstacleId, and speed', () => {
    const emitter = makeEmitter();
    let result: ObstacleCollisionPayload | null = null;

    emitter.subscribe('obstacle_collision', (p) => { result = p; });
    emitter.dispatch('obstacle_collision', { ringId: 'r3', obstacleId: 'wall-left', speed: 1.8 });

    expect(result).toEqual({ ringId: 'r3', obstacleId: 'wall-left', speed: 1.8 });
  });
});

describe('event type: assist_triggered', () => {
  it('delivers assistType and challengeNumber', () => {
    const emitter = makeEmitter();
    let result: AssistTriggeredPayload | null = null;

    emitter.subscribe('assist_triggered', (p) => { result = p; });
    emitter.dispatch('assist_triggered', { assistType: 'slow_current', challengeNumber: 15 });

    expect(result).toEqual({ assistType: 'slow_current', challengeNumber: 15 });
  });
});

// ---------------------------------------------------------------------------
// 4. Safety — dispatching inside a listener (re-entrant dispatch)
// ---------------------------------------------------------------------------

describe('re-entrant dispatch safety', () => {
  it('handles a listener that unsubscribes itself mid-dispatch without errors', () => {
    const emitter = makeEmitter();
    const received: number[] = [];
    let unsub: (() => void) | null = null;

    unsub = emitter.subscribe('timer_expired', (p) => {
      received.push(p.challengeNumber);
      unsub?.();
    });

    emitter.dispatch('timer_expired', { challengeNumber: 1 });
    emitter.dispatch('timer_expired', { challengeNumber: 2 });

    expect(received).toEqual([1]); // second dispatch must not reach the removed listener
  });
});
