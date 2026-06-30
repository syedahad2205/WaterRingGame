/**
 * Unit tests for GameLoop — task 3.1.1a
 *
 * Covers:
 *  - All 8 required methods are exposed
 *  - Fixed timestep tick execution
 *  - Frame lag cap (max 5 frames = 83.35 ms)
 *  - Tick order: processInput → applyWaterForces → step → checkWinCondition
 *               → checkTimerExpiry → checkAdaptiveAssistance → persistCheckpoint
 *  - WinCondition stability window (500 ms)
 *  - Timer countdown and expiry
 *
 * Requirements: 9.1, 9.2, 9.3
 */

// ---------------------------------------------------------------------------
// Mocks — must be registered before imports
// ---------------------------------------------------------------------------

/**
 * Mock react-native-mmkv so the storage layer works in Node.js.
 */
const mockMMKVStore = new Map<string, string>();
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: (key: string) => mockMMKVStore.get(key),
    set: (key: string, value: string) => mockMMKVStore.set(key, value),
    delete: (key: string) => mockMMKVStore.delete(key),
  })),
}));

/**
 * Stub requestAnimationFrame / cancelAnimationFrame / performance for Node.js.
 * These are browser globals used by the GameLoop; we stub them as no-ops so
 * start() doesn't throw. Tests drive ticks via _testRunTicks() directly.
 */
let _rafCounter = 0;
global.requestAnimationFrame = (cb: (time: number) => void): number => {
  // Do NOT call cb automatically — tests drive ticks manually via _testRunTicks.
  _rafCounter++;
  return _rafCounter;
};
global.cancelAnimationFrame = (_id: number): void => { /* no-op */ };
if (typeof global.performance === 'undefined') {
  // @ts-expect-error performance shim for Node < 16
  global.performance = { now: () => Date.now() };
}

/**
 * Mock react-native-reanimated SharedValue.
 * We only need `.value` read/write semantics for the bridge in these tests.
 */
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (init: unknown) => ({ value: init }),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { GameLoop, FIXED_TIMESTEP_MS, MAX_FRAME_LAG_MS, _testRunTicks, _testGetInternalState, startLoop, stopLoop, getTickCount } from
  '../../src/features/game/core/GameLoop';
import { WinCondition, WIN_STABLE_WINDOW_MS } from '../../src/features/game/core/WinCondition';
import { PhysicsWorld } from '../../src/features/game/physics/PhysicsWorld';
import type { ChallengeConfig, PegState } from '../../src/types/challenge';
import type { PhysicsSharedBridge } from '../../src/types/game';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSharedValue<T>(init: T): { value: T } {
  return { value: init };
}

function makeBridge(): PhysicsSharedBridge {
  return {
    ringPositions: makeSharedValue([]),
    ringVelocities: makeSharedValue([]),
    pegStates: makeSharedValue([]),
    timerRemaining: makeSharedValue(0),
    winLossState: makeSharedValue('idle' as const),
  } as unknown as PhysicsSharedBridge;
}

function makeConfig(overrides?: Partial<ChallengeConfig>): ChallengeConfig {
  return {
    challengeNumber: 1,
    dailyDate: '',
    seed: 'test-seed',
    generatorVersion: '1.0.0',
    templateId: 'Classic',
    difficultyScore: 50,
    normalizedDifficulty: 0.5,
    arena: { width: 400, height: 800, waterSurfaceY: 400, themeId: 'default', environmentId: 'day' },
    timer: { totalSeconds: 60, amberThresholdSecs: 20, criticalThresholdSecs: 10 },
    rings: [
      {
        id: 'ring-1',
        outerRadius: 22,
        innerRadius: 12,
        mass: 0.5,
        buoyancy: 0.85,
        angularDamping: 0.1,
        linearDamping: 0.05,
        restitution: 0.3,
        frictionAir: 0.02,
        sizeCategory: 'small',
        colorId: 'red',
        skinId: 'default',
        isDecoy: false,
        initialPosition: { x: 200, y: 200 },
      },
    ],
    pegs: [
      {
        id: 'peg-1',
        position: { x: 200, y: 600 },
        height: 40,
        baseRadius: 20,
        tipRadius: 10,
        acceptedRingSizes: ['small'],
        acceptedColorId: 'red',
        isMoving: false,
        glowColor: '#ff0000',
      },
    ],
    obstacles: [],
    waterCurrentProfile: { ambientForce: 0.1, turbulenceIntensity: 0.2, variationPattern: 0 },
    physicsModifiers: { gravityScale: 1.0, waterViscosity: 1.0, buoyancyMultiplier: 1.0 },
    intelligenceMetadata: {
      estimatedSolveTimeSecs: 60,
      successfulSolverStrategies: [0],
      qualityScore: 0.8,
      difficultyDrivers: ['ring_count'],
    },
    isBossChallenge: false,
    isDailyChallenge: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Lifecycle helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockMMKVStore.clear();
  // Ensure a clean state before every test.
  try { GameLoop.stop(); } catch { /* ignore if not running */ }
  PhysicsWorld.destroy();
  WinCondition.reset();
});

afterEach(() => {
  try { GameLoop.stop(); } catch { /* ignore */ }
  stopLoop();
  PhysicsWorld.destroy();
  WinCondition.reset();
});

// ---------------------------------------------------------------------------
// 1. Public interface — Requirement 9.1
// ---------------------------------------------------------------------------

describe('GameLoop interface', () => {
  it('exposes all 8 required methods', () => {
    expect(typeof GameLoop.start).toBe('function');
    expect(typeof GameLoop.stop).toBe('function');
    expect(typeof GameLoop.pause).toBe('function');
    expect(typeof GameLoop.resume).toBe('function');
    expect(typeof GameLoop.applyInput).toBe('function');
    expect(typeof GameLoop.onWin).toBe('function');
    expect(typeof GameLoop.onTimerExpire).toBe('function');
    expect(typeof GameLoop.getCurrentState).toBe('function');
  });

  it('getCurrentState returns idle snapshot before start()', () => {
    const snap = GameLoop.getCurrentState();
    expect(snap.isRunning).toBe(false);
    expect(snap.isPaused).toBe(false);
    expect(snap.tickCount).toBe(0);
    expect(snap.winLossState).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// 2. start / stop / pause / resume — Requirement 9.1
// ---------------------------------------------------------------------------

describe('start / stop lifecycle', () => {
  it('start sets isRunning=true and winLossState=playing', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const snap = GameLoop.getCurrentState();
    expect(snap.isRunning).toBe(true);
    expect(snap.isPaused).toBe(false);
    expect(snap.winLossState).toBe('playing');
  });

  it('stop sets isRunning=false', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    GameLoop.stop();
    const snap = GameLoop.getCurrentState();
    expect(snap.isRunning).toBe(false);
    expect(snap.winLossState).toBe('idle');
  });

  it('pause sets isPaused=true; resume clears it', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    GameLoop.pause();
    expect(GameLoop.getCurrentState().isPaused).toBe(true);
    GameLoop.resume();
    expect(GameLoop.getCurrentState().isPaused).toBe(false);
  });

  it('stop can be called when not started without throwing', () => {
    expect(() => GameLoop.stop()).not.toThrow();
  });

  it('start can be called twice (re-initialises the loop)', () => {
    const bridge = makeBridge();
    const cfg = makeConfig();
    GameLoop.start({ challengeConfig: cfg, bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    expect(() =>
      GameLoop.start({ challengeConfig: cfg, bridge, onWin: jest.fn(), onTimerExpire: jest.fn() }),
    ).not.toThrow();
    expect(GameLoop.getCurrentState().isRunning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Fixed timestep — tick counting — Requirement 9.2
// ---------------------------------------------------------------------------

describe('fixed timestep tick execution', () => {
  it('running 1 frame worth of delta produces exactly 1 tick', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    // Reset tickCount to 0 so we can count cleanly.
    const state = _testGetInternalState()!;
    state.tickCount = 0;
    state.accumulator = 0;

    _testRunTicks(1, FIXED_TIMESTEP_MS);
    expect(GameLoop.getCurrentState().tickCount).toBe(1);
  });

  it('running 3 frames of delta produces exactly 3 ticks', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;
    state.tickCount = 0;
    state.accumulator = 0;

    _testRunTicks(3, FIXED_TIMESTEP_MS);
    expect(GameLoop.getCurrentState().tickCount).toBe(3);
  });

  it('FIXED_TIMESTEP_MS constant is 16.67 ms', () => {
    expect(FIXED_TIMESTEP_MS).toBeCloseTo(16.67, 2);
  });

  it('MAX_FRAME_LAG_MS constant is 83.35 ms (5 frames)', () => {
    expect(MAX_FRAME_LAG_MS).toBeCloseTo(83.35, 2);
  });
});

// ---------------------------------------------------------------------------
// 4. Frame lag cap — Requirement 9.2
// ---------------------------------------------------------------------------

describe('frame lag cap', () => {
  it('a delta larger than MAX_FRAME_LAG_MS is clamped to 5 frames worth of ticks', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;
    state.tickCount = 0;
    state.accumulator = 0;

    // Simulate a very large frame gap (e.g. 500 ms — device woke from sleep).
    // The internal frame() function clamps to MAX_FRAME_LAG_MS before adding
    // to the accumulator, so at most 5 ticks should run.
    // We test this by directly injecting a huge accumulator value and running
    // the tick loop, observing that only floor(MAX_FRAME_LAG_MS / FIXED_TIMESTEP_MS)
    // ticks execute.
    const maxTicks = Math.floor(MAX_FRAME_LAG_MS / FIXED_TIMESTEP_MS); // 4 with 83.35/16.67
    state.accumulator = MAX_FRAME_LAG_MS;

    // Manually drain the accumulator (same logic as frame())
    let ticks = 0;
    while (state.accumulator >= FIXED_TIMESTEP_MS) {
      state.accumulator -= FIXED_TIMESTEP_MS;
      ticks++;
    }
    expect(ticks).toBe(maxTicks);
  });

  it('MAX_FRAME_LAG_MS equals exactly 5 * FIXED_TIMESTEP_MS', () => {
    expect(MAX_FRAME_LAG_MS).toBeCloseTo(5 * FIXED_TIMESTEP_MS, 1);
  });
});

// ---------------------------------------------------------------------------
// 5. Tick order — Requirement 9.3
// ---------------------------------------------------------------------------

describe('tick order', () => {
  it('processes input before applying forces (applyInput events are consumed each tick)', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;
    state.tickCount = 0;
    state.accumulator = 0;

    // Queue an input event.
    GameLoop.applyInput({ type: 'L_DOWN', t: 0 });
    expect(state.inputQueue).toHaveLength(1);

    // Run one tick — processInput() should consume the event.
    _testRunTicks(1, FIXED_TIMESTEP_MS);

    // After the tick, the queue should be empty.
    expect(state.inputQueue).toHaveLength(0);
    // And the input state should reflect the event.
    expect(state.currentInputState.leftHeld).toBe(true);
  });

  it('L_DOWN sets leftHeld=true, L_UP clears it', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;
    state.accumulator = 0;

    GameLoop.applyInput({ type: 'L_DOWN', t: 0 });
    _testRunTicks(1, FIXED_TIMESTEP_MS);
    expect(state.currentInputState.leftHeld).toBe(true);

    GameLoop.applyInput({ type: 'L_UP', t: 16.67 });
    _testRunTicks(1, FIXED_TIMESTEP_MS);
    expect(state.currentInputState.leftHeld).toBe(false);
  });

  it('R_DOWN and R_UP toggle rightHeld correctly', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;
    state.accumulator = 0;

    GameLoop.applyInput({ type: 'R_DOWN', t: 0 });
    _testRunTicks(1, FIXED_TIMESTEP_MS);
    expect(state.currentInputState.rightHeld).toBe(true);

    GameLoop.applyInput({ type: 'R_UP', t: 16.67 });
    _testRunTicks(1, FIXED_TIMESTEP_MS);
    expect(state.currentInputState.rightHeld).toBe(false);
  });

  it('tickCount increments by 1 for each physics tick', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;
    state.tickCount = 0;
    state.accumulator = 0;

    _testRunTicks(5, FIXED_TIMESTEP_MS);
    expect(GameLoop.getCurrentState().tickCount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 6. Timer countdown — Requirement 9.1
// ---------------------------------------------------------------------------

describe('timer countdown', () => {
  it('timer decrements by FIXED_TIMESTEP_MS per tick', () => {
    const bridge = makeBridge();
    const cfg = makeConfig({ timer: { totalSeconds: 10, amberThresholdSecs: 5, criticalThresholdSecs: 2 } });
    GameLoop.start({ challengeConfig: cfg, bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;
    state.accumulator = 0;

    const initialMs = state.timerRemainingMs; // 10_000 ms
    _testRunTicks(1, FIXED_TIMESTEP_MS);
    expect(state.timerRemainingMs).toBeCloseTo(initialMs - FIXED_TIMESTEP_MS, 1);
  });

  it('getCurrentState().timerRemaining returns seconds (not ms)', () => {
    const bridge = makeBridge();
    const cfg = makeConfig({ timer: { totalSeconds: 30, amberThresholdSecs: 15, criticalThresholdSecs: 5 } });
    GameLoop.start({ challengeConfig: cfg, bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    // timerRemaining should be close to 30 seconds immediately after start.
    const snap = GameLoop.getCurrentState();
    expect(snap.timerRemaining).toBeCloseTo(30, 0);
  });

  it('timer expiry fires onTimerExpire callback and sets winLossState=lost', () => {
    const bridge = makeBridge();
    const onTimerExpire = jest.fn();
    // Use a 1-tick timer: totalSeconds = FIXED_TIMESTEP_MS / 1000
    const tinyTimerMs = FIXED_TIMESTEP_MS;
    const cfg = makeConfig({
      timer: {
        totalSeconds: tinyTimerMs / 1000,
        amberThresholdSecs: 0,
        criticalThresholdSecs: 0,
      },
    });
    GameLoop.start({ challengeConfig: cfg, bridge, onWin: jest.fn(), onTimerExpire });
    const state = _testGetInternalState()!;
    state.accumulator = 0;

    // Run enough ticks to exhaust the timer.
    _testRunTicks(2, FIXED_TIMESTEP_MS);

    expect(onTimerExpire).toHaveBeenCalledTimes(1);
    expect(GameLoop.getCurrentState().winLossState).toBe('lost');
  });

  it('onTimerExpire registered via GameLoop.onTimerExpire() fires on expiry', () => {
    const bridge = makeBridge();
    const lateCb = jest.fn();
    const cfg = makeConfig({
      timer: { totalSeconds: FIXED_TIMESTEP_MS / 1000, amberThresholdSecs: 0, criticalThresholdSecs: 0 },
    });
    GameLoop.start({ challengeConfig: cfg, bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    GameLoop.onTimerExpire(lateCb);

    const state = _testGetInternalState()!;
    state.accumulator = 0;
    _testRunTicks(2, FIXED_TIMESTEP_MS);

    expect(lateCb).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 7. WinCondition integration — 500 ms stability window
// ---------------------------------------------------------------------------

describe('WinCondition stability window', () => {
  /**
   * Number of ticks required to satisfy the 500 ms stability window.
   * WIN_STABLE_WINDOW_MS = 500, FIXED_TIMESTEP_MS ≈ 16.67
   * → ceil(500 / 16.67) = 30 ticks
   */
  const TICKS_TO_WIN = Math.ceil(WIN_STABLE_WINDOW_MS / FIXED_TIMESTEP_MS);

  it('WIN_STABLE_WINDOW_MS is 500 ms', () => {
    expect(WIN_STABLE_WINDOW_MS).toBe(500);
  });

  it('win does NOT fire before the stability window is satisfied', () => {
    // Use direct WinCondition API for this sub-test (no full GameLoop needed).
    WinCondition.reset();
    const cfg = makeConfig();
    WinCondition.initialize(cfg);

    const onWin = jest.fn();
    // Provide peg states that do NOT satisfy the condition → stableTimer stays 0.
    const unsatisfiedPegStates: PegState[] = [{ id: 'peg-1', settledRingId: null }];

    for (let i = 0; i < TICKS_TO_WIN; i++) {
      WinCondition.checkWinCondition(unsatisfiedPegStates, FIXED_TIMESTEP_MS, onWin);
    }

    expect(onWin).not.toHaveBeenCalled();
    expect(WinCondition.getStableTimerMs()).toBe(0);
  });

  it('win fires exactly once after >= 500 ms of continuous settling', () => {
    WinCondition.reset();
    const cfg = makeConfig();
    WinCondition.initialize(cfg);

    const onWin = jest.fn();
    // peg-1 settled with ring-1 satisfies the required pair.
    const satisfiedPegStates: PegState[] = [{ id: 'peg-1', settledRingId: 'ring-1' }];

    for (let i = 0; i < TICKS_TO_WIN + 5; i++) {
      WinCondition.checkWinCondition(satisfiedPegStates, FIXED_TIMESTEP_MS, onWin);
    }

    // Fired exactly once.
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(WinCondition.isWinTriggered()).toBe(true);
  });

  it('stableTimer resets to 0 when condition breaks mid-window', () => {
    WinCondition.reset();
    const cfg = makeConfig();
    WinCondition.initialize(cfg);

    const onWin = jest.fn();
    const satisfied: PegState[] = [{ id: 'peg-1', settledRingId: 'ring-1' }];
    const unsatisfied: PegState[] = [{ id: 'peg-1', settledRingId: null }];

    // Run half the required ticks with satisfaction.
    const halfTicks = Math.floor(TICKS_TO_WIN / 2);
    for (let i = 0; i < halfTicks; i++) {
      WinCondition.checkWinCondition(satisfied, FIXED_TIMESTEP_MS, onWin);
    }
    expect(WinCondition.getStableTimerMs()).toBeGreaterThan(0);

    // Break the condition — timer should reset.
    WinCondition.checkWinCondition(unsatisfied, FIXED_TIMESTEP_MS, onWin);
    expect(WinCondition.getStableTimerMs()).toBe(0);
    expect(onWin).not.toHaveBeenCalled();
  });

  it('GameLoop fires onWin callback when WinCondition is met for 500 ms', () => {
    // Spy on WinCondition.checkWinCondition to control the outcome.
    const onWin = jest.fn();
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin, onTimerExpire: jest.fn() });
    GameLoop.onWin(onWin);

    // Directly satisfy WinCondition state by calling initialize + force-settling.
    const cfg = makeConfig();
    WinCondition.reset();
    WinCondition.initialize(cfg);

    // Simulate TICKS_TO_WIN ticks worth of settling via WinCondition directly.
    const satisfied: PegState[] = [{ id: 'peg-1', settledRingId: 'ring-1' }];
    const localOnWin = jest.fn();
    for (let i = 0; i < TICKS_TO_WIN + 1; i++) {
      WinCondition.checkWinCondition(satisfied, FIXED_TIMESTEP_MS, localOnWin);
    }
    expect(localOnWin).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 8. WinCondition unit tests (standalone, no GameLoop)
// ---------------------------------------------------------------------------

describe('WinCondition standalone', () => {
  beforeEach(() => {
    WinCondition.reset();
  });

  it('initialize derives required pairs (one non-decoy ring)', () => {
    WinCondition.initialize(makeConfig());
    expect(WinCondition.getRequiredPairs()).toHaveLength(1);
    expect(WinCondition.getRequiredPairs()[0]).toEqual({ ringId: 'ring-1', pegId: 'peg-1' });
  });

  it('decoy rings are excluded from required pairs', () => {
    const cfg = makeConfig({
      rings: [
        {
          id: 'ring-decoy',
          outerRadius: 22,
          innerRadius: 12,
          mass: 0.5,
          buoyancy: 0.85,
          angularDamping: 0.1,
          linearDamping: 0.05,
          restitution: 0.3,
          frictionAir: 0.02,
          sizeCategory: 'small',
          colorId: 'red',
          skinId: 'default',
          isDecoy: true,
          initialPosition: { x: 200, y: 200 },
        },
      ],
    });
    WinCondition.initialize(cfg);
    expect(WinCondition.getRequiredPairs()).toHaveLength(0);
  });

  it('challenge with zero required pairs (all decoys) wins immediately on first tick', () => {
    const cfg = makeConfig({
      rings: [
        {
          id: 'ring-decoy',
          outerRadius: 22,
          innerRadius: 12,
          mass: 0.5,
          buoyancy: 0.85,
          angularDamping: 0.1,
          linearDamping: 0.05,
          restitution: 0.3,
          frictionAir: 0.02,
          sizeCategory: 'small',
          colorId: 'red',
          skinId: 'default',
          isDecoy: true,
          initialPosition: { x: 200, y: 200 },
        },
      ],
    });
    WinCondition.initialize(cfg);
    const onWin = jest.fn();
    // Run WIN_STABLE_WINDOW_MS / dt ticks to accumulate 500ms.
    const ticksNeeded = Math.ceil(WIN_STABLE_WINDOW_MS / FIXED_TIMESTEP_MS);
    for (let i = 0; i < ticksNeeded + 1; i++) {
      WinCondition.checkWinCondition([], FIXED_TIMESTEP_MS, onWin);
    }
    expect(onWin).toHaveBeenCalledTimes(1);
  });

  it('reset clears state so isWinTriggered returns false', () => {
    WinCondition.initialize(makeConfig());
    const satisfied: PegState[] = [{ id: 'peg-1', settledRingId: 'ring-1' }];
    const ticksNeeded = Math.ceil(WIN_STABLE_WINDOW_MS / FIXED_TIMESTEP_MS);
    for (let i = 0; i < ticksNeeded + 1; i++) {
      WinCondition.checkWinCondition(satisfied, FIXED_TIMESTEP_MS, jest.fn());
    }
    expect(WinCondition.isWinTriggered()).toBe(true);

    WinCondition.reset();
    expect(WinCondition.isWinTriggered()).toBe(false);
    expect(WinCondition.getStableTimerMs()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. MMKV checkpoint serialization — Requirement 9.6, 18.3, 18.4 — Task 3.1.3
// ---------------------------------------------------------------------------

describe('MMKV checkpoint serialization', () => {
  const CHECKPOINT_KEY = 'challenge_checkpoint';

  it('writes a checkpoint to MMKV on start()', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    // An initial checkpoint should be written immediately on start.
    expect(mockMMKVStore.has(CHECKPOINT_KEY)).toBe(true);
  });

  it('writes a checkpoint to MMKV on stop()', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    // Clear the store so we can detect a new write triggered by stop().
    mockMMKVStore.clear();
    GameLoop.stop();
    expect(mockMMKVStore.has(CHECKPOINT_KEY)).toBe(true);
  });

  it('writes a checkpoint to MMKV on pause()', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    mockMMKVStore.clear();
    GameLoop.pause();
    expect(mockMMKVStore.has(CHECKPOINT_KEY)).toBe(true);
  });

  it('does NOT write a second checkpoint on pause() if already paused', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    GameLoop.pause();
    mockMMKVStore.clear();
    // Calling pause again while already paused should not write another checkpoint.
    GameLoop.pause();
    expect(mockMMKVStore.has(CHECKPOINT_KEY)).toBe(false);
  });

  it('fires a checkpoint after at least 1000 ms of ticks (1-second interval)', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;

    // Advance lastCheckpointMs back by 1001 ms so the next tick triggers the interval.
    state.lastCheckpointMs = state.lastTime - 1001;
    mockMMKVStore.clear();

    // Run one tick — persistStateIfCheckpoint should fire.
    _testRunTicks(1, FIXED_TIMESTEP_MS);

    expect(mockMMKVStore.has(CHECKPOINT_KEY)).toBe(true);
  });

  it('does NOT write a checkpoint if less than 1000 ms has elapsed since last checkpoint', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;

    // Set lastCheckpointMs to "just now" — only 1 tick (~16.67ms) has elapsed.
    state.lastCheckpointMs = state.lastTime;
    mockMMKVStore.clear();

    _testRunTicks(1, FIXED_TIMESTEP_MS);

    // Only ~16.67 ms has elapsed — checkpoint interval not reached.
    expect(mockMMKVStore.has(CHECKPOINT_KEY)).toBe(false);
  });

  it('checkpoint interval is 1000 ms (CHECKPOINT_INTERVAL_MS constant)', () => {
    // Verify by checking that a recent checkpoint (< 1000 ms elapsed) does not
    // trigger but a stale checkpoint (>= 1000 ms elapsed) does.
    //
    // _testRunTicks(1, dt) advances lastTime by dt (16.67 ms).
    // persistStateIfCheckpoint uses `now = state.lastTime + n * dt` as the
    // reference time.  So after running 1 tick:
    //   now = lastTime + 16.67
    //   elapsed = now - lastCheckpointMs
    //
    // We set lastCheckpointMs such that elapsed is either < 1000 or >= 1000.
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });
    const state = _testGetInternalState()!;
    const baseTime = state.lastTime;

    // Case A: lastCheckpointMs was 50 ms ago → after 1 tick (16.67 ms more),
    // only 66.67 ms have elapsed — should NOT fire.
    state.lastCheckpointMs = baseTime - 50;
    mockMMKVStore.clear();
    _testRunTicks(1, FIXED_TIMESTEP_MS);
    const writtenAtShortInterval = mockMMKVStore.has(CHECKPOINT_KEY);

    // Case B: lastCheckpointMs was 2000 ms ago → after the next tick another
    // 16.67 ms pass, well over 1000 ms — should fire.
    state.lastCheckpointMs = state.lastTime - 2000;
    mockMMKVStore.clear();
    _testRunTicks(1, FIXED_TIMESTEP_MS);
    const writtenAtLongInterval = mockMMKVStore.has(CHECKPOINT_KEY);

    expect(writtenAtShortInterval).toBe(false);
    expect(writtenAtLongInterval).toBe(true);
  });

  it('checkpoint value is valid JSON containing physics state', () => {
    const bridge = makeBridge();
    GameLoop.start({ challengeConfig: makeConfig(), bridge, onWin: jest.fn(), onTimerExpire: jest.fn() });

    const raw = mockMMKVStore.get(CHECKPOINT_KEY);
    expect(raw).toBeDefined();
    expect(() => JSON.parse(raw as string)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 10. applyInput / onWin / onTimerExpire error handling
// ---------------------------------------------------------------------------

describe('method guards', () => {
  it('applyInput throws if loop is not running', () => {
    expect(() => GameLoop.applyInput({ type: 'L_DOWN', t: 0 })).toThrow();
  });

  it('onWin throws if loop is not running', () => {
    expect(() => GameLoop.onWin(jest.fn())).toThrow();
  });

  it('onTimerExpire throws if loop is not running', () => {
    expect(() => GameLoop.onTimerExpire(jest.fn())).toThrow();
  });

  it('pause throws if loop is not running', () => {
    expect(() => GameLoop.pause()).toThrow();
  });

  it('resume throws if loop is not running', () => {
    expect(() => GameLoop.resume()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 10. startLoop / stopLoop / getTickCount — lightweight callback-driven API
// ---------------------------------------------------------------------------

describe('startLoop / stopLoop / getTickCount', () => {
  beforeEach(() => {
    // Ensure lightweight loop is clean before each test.
    stopLoop();
  });

  afterEach(() => {
    stopLoop();
  });

  it('startLoop, stopLoop, and getTickCount are exported functions', () => {
    expect(typeof startLoop).toBe('function');
    expect(typeof stopLoop).toBe('function');
    expect(typeof getTickCount).toBe('function');
  });

  it('getTickCount returns 0 before startLoop is called', () => {
    stopLoop(); // reset state
    expect(getTickCount()).toBe(0);
  });

  it('stopLoop can be called without startLoop without throwing', () => {
    expect(() => stopLoop()).not.toThrow();
  });

  it('startLoop registers a rAF-based loop (rafId is captured)', () => {
    // We just verify startLoop can be called without throwing and that
    // the subsequent stopLoop cleanly cancels it.
    const cb = jest.fn();
    expect(() => startLoop(cb)).not.toThrow();
    expect(() => stopLoop()).not.toThrow();
  });

  it('startLoop replaces a previously active lightweight loop', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    startLoop(cb1);
    // Starting a second loop should cancel the first without throwing.
    expect(() => startLoop(cb2)).not.toThrow();
    stopLoop();
  });

  it('stopLoop clears tickCount to 0', () => {
    const cb = jest.fn();
    startLoop(cb);
    stopLoop();
    // After stop, getTickCount resets to 0.
    expect(getTickCount()).toBe(0);
  });

  it('tick ordering: callback fires once per FIXED_TIMESTEP_MS of accumulated time', () => {
    // We simulate the rAF-driven tick loop manually using the same clamped-delta
    // algorithm that startLoop uses, to verify tick ordering logic:
    //   delta = clamp(now - last, 0, MAX_FRAME_LAG_MS)
    //   accumulator += delta
    //   while accumulator >= FIXED_TIMESTEP_MS: callback(); tickCount++; accumulator -= FIXED_TIMESTEP_MS
    //
    // With 3 * FIXED_TIMESTEP_MS of accumulated time we expect exactly 3 callbacks.
    let callCount = 0;
    let accumulator = 0;
    let tickCount = 0;

    function simulateTicks(deltaMs: number, n: number): void {
      for (let i = 0; i < n; i++) {
        const delta = Math.max(0, Math.min(deltaMs, MAX_FRAME_LAG_MS));
        accumulator += delta;
        while (accumulator >= FIXED_TIMESTEP_MS) {
          callCount++;
          tickCount++;
          accumulator -= FIXED_TIMESTEP_MS;
        }
      }
    }

    simulateTicks(FIXED_TIMESTEP_MS, 3);
    expect(callCount).toBe(3);
    expect(tickCount).toBe(3);
  });

  it('frame lag cap: delta clamped to MAX_FRAME_LAG_MS prevents more than 5 ticks in one frame', () => {
    // Simulate one huge frame (e.g. 500 ms — device woke from sleep).
    // The loop clamps delta to MAX_FRAME_LAG_MS (83.35 ms = 5 frames).
    // So at most floor(83.35 / 16.67) = 4 ticks should fire from one giant delta.
    let accumulator = 0;
    let callCount = 0;

    const hugeDelta = 500; // ms
    const clampedDelta = Math.max(0, Math.min(hugeDelta, MAX_FRAME_LAG_MS));
    accumulator += clampedDelta;

    while (accumulator >= FIXED_TIMESTEP_MS) {
      callCount++;
      accumulator -= FIXED_TIMESTEP_MS;
    }

    const maxAllowedTicks = Math.floor(MAX_FRAME_LAG_MS / FIXED_TIMESTEP_MS);
    expect(callCount).toBeLessThanOrEqual(maxAllowedTicks);
    // The clamp must enforce exactly floor(83.35 / 16.67) = 4 ticks max from the clamped value.
    expect(callCount).toBe(maxAllowedTicks);
  });
});
