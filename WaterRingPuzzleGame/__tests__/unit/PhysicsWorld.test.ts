/**
 * Unit tests for PhysicsWorld — task 4.1.1
 *
 * Covers:
 *  - initialize creates engine without throwing
 *  - step advances simulation
 *  - destroy cleans up
 *
 * Requirements: 10.1, 10.2, 21.1
 */

import { PhysicsWorld, PhysicsConstants } from '@features/game/physics/PhysicsWorld';
import type { SerializedPhysicsState } from '@features/game/physics/PhysicsWorld';
import type { ChallengeConfig } from '../../src/types/challenge';

function makeConfig(overrides?: Partial<ChallengeConfig>): ChallengeConfig {
  return {
    challengeNumber: 1,
    dailyDate: '',
    seed: 'test-seed',
    generatorVersion: '1.0.0',
    templateId: 'Classic',
    difficultyScore: 50,
    normalizedDifficulty: 0.5,
    arena: {
      width: 400,
      height: 800,
      waterSurfaceY: 400,
      themeId: 'default',
      environmentId: 'day',
    },
    timer: {
      totalSeconds: 120,
      amberThresholdSecs: 30,
      criticalThresholdSecs: 10,
    },
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
    waterCurrentProfile: {
      ambientForce: 0.1,
      turbulenceIntensity: 0.2,
      variationPattern: 0,
    },
    physicsModifiers: {
      gravityScale: 1.0,
      waterViscosity: 1.0,
      buoyancyMultiplier: 1.0,
    },
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
// Ensure a clean world before/after each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  PhysicsWorld.destroy();
});

afterEach(() => {
  PhysicsWorld.destroy();
});

// ---------------------------------------------------------------------------
// 1. PhysicsConstants values (Requirement 10.2)
// ---------------------------------------------------------------------------

describe('PhysicsConstants', () => {
  it('has the correct gravity values', () => {
    expect(PhysicsConstants.GRAVITY_Y).toBe(1);
    expect(PhysicsConstants.GRAVITY_SCALE).toBe(0.001);
  });

  it('has the correct iteration counts', () => {
    expect(PhysicsConstants.POSITION_ITERATIONS).toBe(6);
    expect(PhysicsConstants.VELOCITY_ITERATIONS).toBe(4);
    expect(PhysicsConstants.CONSTRAINT_ITERATIONS).toBe(2);
  });

  it('specifies grid broadphase', () => {
    expect(PhysicsConstants.BROADPHASE).toBe('grid');
  });
});

// ---------------------------------------------------------------------------
// 2. Module exposes all 8 required methods (Requirement 10.1)
// ---------------------------------------------------------------------------

describe('PhysicsWorld interface', () => {
  it('exposes all 8 required methods', () => {
    expect(typeof PhysicsWorld.initialize).toBe('function');
    expect(typeof PhysicsWorld.step).toBe('function');
    expect(typeof PhysicsWorld.applyWaterForces).toBe('function');
    expect(typeof PhysicsWorld.getRingStates).toBe('function');
    expect(typeof PhysicsWorld.getPegStates).toBe('function');
    expect(typeof PhysicsWorld.serializeState).toBe('function');
    expect(typeof PhysicsWorld.restoreState).toBe('function');
    expect(typeof PhysicsWorld.destroy).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 3. initialize (Requirement 10.1, 10.2)
// ---------------------------------------------------------------------------

describe('initialize', () => {
  it('creates engine without throwing', () => {
    expect(() => PhysicsWorld.initialize(makeConfig())).not.toThrow();
  });

  it('can be called multiple times (re-initialise replaces world)', () => {
    PhysicsWorld.initialize(makeConfig());
    expect(() => PhysicsWorld.initialize(makeConfig())).not.toThrow();
  });

  it('initialises with a config that has no rings or pegs', () => {
    const cfg = makeConfig({ rings: [], pegs: [] });
    expect(() => PhysicsWorld.initialize(cfg)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. step — advances simulation (Requirement 10.1)
// ---------------------------------------------------------------------------

describe('step', () => {
  it('does not throw when called after initialize', () => {
    PhysicsWorld.initialize(makeConfig());
    expect(() => PhysicsWorld.step(16.67)).not.toThrow();
  });

  it('moves a ring under gravity after several steps', () => {
    PhysicsWorld.initialize(makeConfig());

    const before = PhysicsWorld.getRingStates()[0];
    const initialY = before.y;

    // Run 60 ticks (~1 second) so gravity has time to displace the ring
    for (let i = 0; i < 60; i++) {
      PhysicsWorld.step(16.67);
    }

    const after = PhysicsWorld.getRingStates()[0];
    // Ring should have moved downward (or hit the bottom wall)
    expect(after.y).toBeGreaterThan(initialY);
  });

  it('throws if called before initialize', () => {
    expect(() => PhysicsWorld.step(16.67)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. applyWaterForces placeholder (Requirement 10.1)
// ---------------------------------------------------------------------------

describe('applyWaterForces', () => {
  it('does not throw (placeholder implementation)', () => {
    PhysicsWorld.initialize(makeConfig());
    expect(() =>
      PhysicsWorld.applyWaterForces({
        leftHeld: false,
        rightHeld: false,
        leftIntensity: 0,
        rightIntensity: 0,
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. getRingStates (Requirement 10.1)
// ---------------------------------------------------------------------------

describe('getRingStates', () => {
  it('returns one state per ring', () => {
    PhysicsWorld.initialize(makeConfig());
    const states = PhysicsWorld.getRingStates();
    expect(states).toHaveLength(1);
  });

  it('state has all required fields', () => {
    PhysicsWorld.initialize(makeConfig());
    const [state] = PhysicsWorld.getRingStates();
    expect(state).toHaveProperty('id', 'ring-1');
    expect(typeof state.x).toBe('number');
    expect(typeof state.y).toBe('number');
    expect(typeof state.angle).toBe('number');
    expect(typeof state.vx).toBe('number');
    expect(typeof state.vy).toBe('number');
    expect(typeof state.angularV).toBe('number');
    expect(state.settledOnPegId).toBeNull();
  });

  it('throws if called before initialize', () => {
    expect(() => PhysicsWorld.getRingStates()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. getPegStates (Requirement 10.1)
// ---------------------------------------------------------------------------

describe('getPegStates', () => {
  it('returns one state per peg', () => {
    PhysicsWorld.initialize(makeConfig());
    const states = PhysicsWorld.getPegStates();
    expect(states).toHaveLength(1);
  });

  it('peg state has correct id and null settledRingId initially', () => {
    PhysicsWorld.initialize(makeConfig());
    const [peg] = PhysicsWorld.getPegStates();
    expect(peg.id).toBe('peg-1');
    expect(peg.settledRingId).toBeNull();
  });

  it('throws if called before initialize', () => {
    expect(() => PhysicsWorld.getPegStates()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 8. serializeState / restoreState round-trip (Requirement 10.1)
// ---------------------------------------------------------------------------

describe('serializeState', () => {
  it('returns a snapshot with rings, pegs, and timestamp', () => {
    PhysicsWorld.initialize(makeConfig());
    const snap = PhysicsWorld.serializeState();
    expect(snap.rings).toHaveLength(1);
    expect(snap.pegs).toHaveLength(1);
    expect(typeof snap.timestamp).toBe('number');
    expect(snap.timestamp).toBeGreaterThan(0);
  });

  it('throws if called before initialize', () => {
    expect(() => PhysicsWorld.serializeState()).toThrow();
  });
});

describe('restoreState', () => {
  it('restores ring position from a snapshot', () => {
    PhysicsWorld.initialize(makeConfig());

    // Capture the initial snapshot
    const snap = PhysicsWorld.serializeState();
    const snapY = snap.rings[0].y;

    // Let the simulation advance
    for (let i = 0; i < 10; i++) {
      PhysicsWorld.step(16.67);
    }

    // Ring should have moved
    const movedY = PhysicsWorld.getRingStates()[0].y;
    expect(movedY).not.toBe(snapY);

    // Restore and verify position is back
    PhysicsWorld.restoreState(snap);
    const restoredY = PhysicsWorld.getRingStates()[0].y;
    expect(restoredY).toBeCloseTo(snapY, 2);
  });

  it('is a no-op for ring ids that do not exist', () => {
    PhysicsWorld.initialize(makeConfig());
    const badSnap: SerializedPhysicsState = {
      rings: [
        {
          id: 'ring-does-not-exist',
          x: 100,
          y: 100,
          angle: 0,
          vx: 0,
          vy: 0,
          angularV: 0,
          settledOnPegId: null,
        },
      ],
      pegs: [],
      timestamp: Date.now(),
    };
    expect(() => PhysicsWorld.restoreState(badSnap)).not.toThrow();
  });

  it('throws if called before initialize', () => {
    const snap: SerializedPhysicsState = { rings: [], pegs: [], timestamp: 0 };
    expect(() => PhysicsWorld.restoreState(snap)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 9. destroy — cleans up (Requirement 10.1)
// ---------------------------------------------------------------------------

describe('destroy', () => {
  it('does not throw when called after initialize', () => {
    PhysicsWorld.initialize(makeConfig());
    expect(() => PhysicsWorld.destroy()).not.toThrow();
  });

  it('is a no-op if called before initialize', () => {
    // No world exists — must not throw
    expect(() => PhysicsWorld.destroy()).not.toThrow();
  });

  it('calling step after destroy throws', () => {
    PhysicsWorld.initialize(makeConfig());
    PhysicsWorld.destroy();
    expect(() => PhysicsWorld.step(16.67)).toThrow();
  });

  it('world can be re-initialised after destroy', () => {
    PhysicsWorld.initialize(makeConfig());
    PhysicsWorld.destroy();
    expect(() => PhysicsWorld.initialize(makeConfig())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ===== NEW TESTS FOR TASKS 4.3.1 / 4.3.2 / 4.3.3 =====
// ---------------------------------------------------------------------------

import Matter from 'matter-js';
import {
  handleCollisionStart,
  checkStuckRings,
  checkNaNPositions,
  SETTLE_VELOCITY_THRESHOLD,
  STUCK_VELOCITY_THRESHOLD,
  STUCK_DURATION_MS,
  MAX_NUDGES,
  NUDGE_FORCE,
  SETTLE_ANGLE_TOLERANCE_DEFAULT,
} from '@features/game/physics/PhysicsWorld';
// SerializedPhysicsState is already imported at the top of this file

// ---------------------------------------------------------------------------
// Helpers for constructing minimal Matter.js bodies with plugin metadata
// ---------------------------------------------------------------------------

interface RingPluginOpts {
  ringId?: string;
  colorId?: string;
  settledOnPegId?: string | null;
  lastBounceTime?: number;
  stuckSinceTime?: number | null;
  nudgeCount?: number;
  initialX?: number;
  initialY?: number;
}

interface PegPluginOpts {
  pegId?: string;
  tipRadius?: number;
  acceptedColorId?: string;
  settledRingId?: string | null;
  x?: number;
  y?: number;
}

function makeRingBody(
  x: number,
  y: number,
  opts: RingPluginOpts = {},
): Matter.Body {
  const body = Matter.Bodies.circle(x, y, 22, {
    label: 'ring',
    isStatic: false,
  });
  Matter.Body.setPosition(body, { x, y });
  body.plugin = {
    ringId: opts.ringId ?? 'ring-test',
    colorId: opts.colorId ?? 'red',
    settledOnPegId: opts.settledOnPegId ?? null,
    lastBounceTime: opts.lastBounceTime ?? 0,
    stuckSinceTime: opts.stuckSinceTime ?? null,
    nudgeCount: opts.nudgeCount ?? 0,
    initialX: opts.initialX ?? x,
    initialY: opts.initialY ?? y,
  };
  return body;
}

function makePegBody(
  x: number,
  y: number,
  opts: PegPluginOpts = {},
): Matter.Body {
  const tipRadius = opts.tipRadius ?? 10;
  const body = Matter.Bodies.circle(x, y, tipRadius, {
    label: 'peg',
    isStatic: true,
    isSensor: true,
  });
  Matter.Body.setPosition(body, { x, y });
  body.plugin = {
    pegId: opts.pegId ?? 'peg-test',
    tipRadius,
    acceptedColorId: opts.acceptedColorId ?? 'red',
    settledRingId: opts.settledRingId ?? null,
    x,
    y,
  };
  return body;
}

/**
 * Build a synthetic IEventCollision event from an array of body pairs.
 */
function makeCollisionEvent(
  pairs: Array<{ bodyA: Matter.Body; bodyB: Matter.Body }>,
): Matter.IEventCollision<Matter.Engine> {
  const fakePairs = pairs as unknown as Matter.Pair[];

  return {
    pairs: fakePairs,
    name: 'collisionStart',
    source: {} as Matter.Engine,
    timestamp: Date.now(),
  } as unknown as Matter.IEventCollision<Matter.Engine>;
}

// ---------------------------------------------------------------------------
// Task 4.3.1 — Ring Landing Detection (Requirement 10.6)
// ---------------------------------------------------------------------------

describe('handleCollisionStart — ring landing detection (Task 4.3.1)', () => {
  it('settles a ring when all 5 conditions are satisfied', () => {
    // Place ring directly on peg centre — condition 1 ✓
    const peg = makePegBody(200, 600, { tipRadius: 10, acceptedColorId: 'red' });
    const ring = makeRingBody(200, 600, {
      colorId: 'red',          // condition 5 ✓
      lastBounceTime: 0,       // condition 4: no recent bounce ✓
    });
    // Condition 2: zero velocity ✓ (new bodies have zero velocity)
    // Condition 3: angle = 0 ✓

    const event = makeCollisionEvent([{ bodyA: ring, bodyB: peg }]);
    handleCollisionStart(event, 'Classic');

    expect((ring.plugin as { settledOnPegId: string | null }).settledOnPegId).toBe('peg-test');
    expect((peg.plugin as { settledRingId: string | null }).settledRingId).toBe('ring-test');
  });

  it('does NOT settle when ring speed is too high (condition 2 fails)', () => {
    const peg = makePegBody(200, 600, { tipRadius: 10, acceptedColorId: 'red' });
    const ring = makeRingBody(200, 600, { colorId: 'red', lastBounceTime: 0 });
    // Apply high velocity — exceeds SETTLE_VELOCITY_THRESHOLD
    Matter.Body.setVelocity(ring, { x: SETTLE_VELOCITY_THRESHOLD + 1, y: 0 });

    const event = makeCollisionEvent([{ bodyA: ring, bodyB: peg }]);
    handleCollisionStart(event, 'Classic');

    expect((ring.plugin as { settledOnPegId: string | null }).settledOnPegId).toBeNull();
  });

  it('does NOT settle when ring centre is too far from peg (condition 1 fails)', () => {
    const peg = makePegBody(200, 600, { tipRadius: 10, acceptedColorId: 'red' });
    // Place ring 100px away — well outside 1.2 × tipRadius
    const ring = makeRingBody(300, 600, { colorId: 'red', lastBounceTime: 0 });

    const event = makeCollisionEvent([{ bodyA: ring, bodyB: peg }]);
    handleCollisionStart(event, 'Classic');

    expect((ring.plugin as { settledOnPegId: string | null }).settledOnPegId).toBeNull();
  });

  it('does NOT settle when ring angle exceeds tolerance (condition 3 fails)', () => {
    const peg = makePegBody(200, 600, { tipRadius: 10, acceptedColorId: 'red' });
    const ring = makeRingBody(200, 600, { colorId: 'red', lastBounceTime: 0 });
    // 45° tilt — well outside ±15°
    Matter.Body.setAngle(ring, Math.PI / 4);

    const event = makeCollisionEvent([{ bodyA: ring, bodyB: peg }]);
    handleCollisionStart(event, 'Classic');

    expect((ring.plugin as { settledOnPegId: string | null }).settledOnPegId).toBeNull();
  });

  it('does NOT settle when a bounce occurred within last 200ms (condition 4 fails)', () => {
    const peg = makePegBody(200, 600, { tipRadius: 10, acceptedColorId: 'red' });
    const ring = makeRingBody(200, 600, {
      colorId: 'red',
      lastBounceTime: Date.now() - 100, // only 100ms ago
    });

    const event = makeCollisionEvent([{ bodyA: ring, bodyB: peg }]);
    handleCollisionStart(event, 'Classic');

    expect((ring.plugin as { settledOnPegId: string | null }).settledOnPegId).toBeNull();
  });

  it('does NOT settle when colorId mismatches (condition 5 fails)', () => {
    const peg = makePegBody(200, 600, { tipRadius: 10, acceptedColorId: 'blue' });
    const ring = makeRingBody(200, 600, { colorId: 'red', lastBounceTime: 0 });

    const event = makeCollisionEvent([{ bodyA: ring, bodyB: peg }]);
    handleCollisionStart(event, 'Classic');

    expect((ring.plugin as { settledOnPegId: string | null }).settledOnPegId).toBeNull();
  });

  it('uses tighter ±8° tolerance for Precision template (condition 3)', () => {
    const peg = makePegBody(200, 600, { tipRadius: 10, acceptedColorId: 'red' });
    const ring = makeRingBody(200, 600, { colorId: 'red', lastBounceTime: 0 });
    // 10° tilt — within ±15° but outside ±8°
    Matter.Body.setAngle(ring, (10 * Math.PI) / 180);

    const event = makeCollisionEvent([{ bodyA: ring, bodyB: peg }]);
    // Classic: should settle (10° < 15°)
    handleCollisionStart(event, 'Classic');
    expect((ring.plugin as { settledOnPegId: string | null }).settledOnPegId).toBe('peg-test');
  });

  it('does NOT settle with 10° angle under Precision template', () => {
    const peg = makePegBody(200, 600, { tipRadius: 10, acceptedColorId: 'red' });
    const ring = makeRingBody(200, 600, { colorId: 'red', lastBounceTime: 0 });
    Matter.Body.setAngle(ring, (10 * Math.PI) / 180);

    const event = makeCollisionEvent([{ bodyA: ring, bodyB: peg }]);
    // Precision: should NOT settle (10° > 8°)
    handleCollisionStart(event, 'Precision');
    expect((ring.plugin as { settledOnPegId: string | null }).settledOnPegId).toBeNull();
  });

  it('skips pairs that are not ring-peg combinations', () => {
    // wall-wall pair — should not throw or settle anything
    const wallA = Matter.Bodies.rectangle(0, 0, 100, 10, { label: 'wall' });
    const wallB = Matter.Bodies.rectangle(0, 0, 100, 10, { label: 'wall' });
    const event = makeCollisionEvent([{ bodyA: wallA, bodyB: wallB }]);
    expect(() => handleCollisionStart(event, 'Classic')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Task 4.3.2 — Stuck Detection (Requirement 10.7)
// ---------------------------------------------------------------------------

describe('checkStuckRings — stuck detection (Task 4.3.2)', () => {
  it('does not nudge a ring that is settled', () => {
    const ring = makeRingBody(200, 200, { settledOnPegId: 'peg-1' });
    const bodies = new Map([['ring-test', ring]]);
    const setVelocitySpy = jest.spyOn(Matter.Body, 'setVelocity');

    checkStuckRings(bodies, Date.now());

    expect(setVelocitySpy).not.toHaveBeenCalled();
    setVelocitySpy.mockRestore();
  });

  it('does not nudge a ring that is actively moving', () => {
    const ring = makeRingBody(200, 200);
    Matter.Body.setVelocity(ring, { x: 5, y: 0 }); // fast ring
    const bodies = new Map([['ring-test', ring]]);

    // Set stuckSinceTime to something old
    (ring.plugin as { stuckSinceTime: number | null }).stuckSinceTime = Date.now() - STUCK_DURATION_MS - 1000;

    const applyForceSpy = jest.spyOn(Matter.Body, 'applyForce');
    checkStuckRings(bodies, Date.now());
    expect(applyForceSpy).not.toHaveBeenCalled();
    applyForceSpy.mockRestore();
  });

  it('applies a nudge after STUCK_DURATION_MS of low velocity', () => {
    const ring = makeRingBody(200, 200);
    // Ensure velocity is well below threshold
    Matter.Body.setVelocity(ring, { x: 0, y: 0 });
    const plugin = ring.plugin as {
      stuckSinceTime: number | null;
      nudgeCount: number;
    };
    // Simulate ring has been stuck for > 5 seconds
    plugin.stuckSinceTime = Date.now() - STUCK_DURATION_MS - 100;
    plugin.nudgeCount = 0;

    const bodies = new Map([['ring-test', ring]]);
    const applyForceSpy = jest.spyOn(Matter.Body, 'applyForce');

    checkStuckRings(bodies, Date.now());

    expect(applyForceSpy).toHaveBeenCalledTimes(1);
    expect(plugin.nudgeCount).toBe(1);
    applyForceSpy.mockRestore();
  });

  it('teleports ring after MAX_NUDGES nudges', () => {
    const ring = makeRingBody(200, 200);
    Matter.Body.setVelocity(ring, { x: 0, y: 0 });
    const plugin = ring.plugin as {
      stuckSinceTime: number | null;
      nudgeCount: number;
      initialX: number;
      initialY: number;
    };
    plugin.stuckSinceTime = Date.now() - STUCK_DURATION_MS - 100;
    plugin.nudgeCount = MAX_NUDGES; // already used all nudges

    const bodies = new Map([['ring-test', ring]]);
    const setPositionSpy = jest.spyOn(Matter.Body, 'setPosition');

    checkStuckRings(bodies, Date.now());

    // Should have called setPosition (teleport)
    expect(setPositionSpy).toHaveBeenCalledWith(ring, {
      x: plugin.initialX,
      y: plugin.initialY,
    });
    expect(plugin.nudgeCount).toBe(0);
    expect(plugin.stuckSinceTime).toBeNull();
    setPositionSpy.mockRestore();
  });

  it('starts tracking stuck time when ring first drops below threshold', () => {
    const ring = makeRingBody(200, 200);
    Matter.Body.setVelocity(ring, { x: 0, y: 0 });
    const plugin = ring.plugin as { stuckSinceTime: number | null };
    plugin.stuckSinceTime = null; // not yet tracking

    const bodies = new Map([['ring-test', ring]]);
    const now = Date.now();

    checkStuckRings(bodies, now);

    expect(plugin.stuckSinceTime).toBe(now);
  });
});

// ---------------------------------------------------------------------------
// Task 4.3.3 — NaN Guard (Requirement 10.8)
// ---------------------------------------------------------------------------

describe('checkNaNPositions — NaN guard (Task 4.3.3)', () => {
  it('returns false and leaves bodies unchanged when no NaN present', () => {
    const ring = makeRingBody(100, 200);
    const bodies = new Map([['ring-test', ring]]);

    const result = checkNaNPositions(bodies, null);

    expect(result).toBe(false);
    expect(ring.position.x).toBe(100);
  });

  it('returns true and restores from lastGoodState when NaN position detected', () => {
    const ring = makeRingBody(100, 200);
    const bodies = new Map([['ring-test', ring]]);

    // Force NaN into position
    (ring.position as { x: number; y: number }).x = NaN;

    const lastGoodState: SerializedPhysicsState = {
      rings: [
        {
          id: 'ring-test',
          x: 150,
          y: 250,
          angle: 0,
          vx: 0,
          vy: 0,
          angularV: 0,
          settledOnPegId: null,
        },
      ],
      pegs: [],
      timestamp: Date.now() - 1000,
    };

    const result = checkNaNPositions(bodies, lastGoodState);

    expect(result).toBe(true);
    expect(ring.position.x).toBeCloseTo(150, 2);
    expect(ring.position.y).toBeCloseTo(250, 2);
  });

  it('resets to initial spawn position when no backup state exists', () => {
    const ring = makeRingBody(100, 200);
    (ring.plugin as { initialX: number; initialY: number }).initialX = 100;
    (ring.plugin as { initialX: number; initialY: number }).initialY = 200;

    const bodies = new Map([['ring-test', ring]]);
    (ring.position as { x: number; y: number }).x = NaN;

    const result = checkNaNPositions(bodies, null);

    expect(result).toBe(true);
    expect(ring.position.x).toBeCloseTo(100, 2);
    expect(ring.position.y).toBeCloseTo(200, 2);
  });

  it('detects Infinity in velocity as well', () => {
    const ring = makeRingBody(100, 200);
    const bodies = new Map([['ring-test', ring]]);
    Matter.Body.setVelocity(ring, { x: Infinity, y: 0 });

    const result = checkNaNPositions(bodies, null);
    expect(result).toBe(true);
  });

  it('logs a console.error on detection', () => {
    const ring = makeRingBody(100, 200);
    const bodies = new Map([['ring-test', ring]]);
    (ring.position as { x: number }).x = NaN;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    checkNaNPositions(bodies, null);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Task 4.2.5 — Drag model verification (Requirement 22.7)
// ---------------------------------------------------------------------------

describe('applyDragModel verification (Task 4.2.5)', () => {
  // Import here so the test is close to the implementation
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { applyDragModel } = require('@features/game/physics/WaterSimulation');

  it('reduces linear velocity by linearDamping factor', () => {
    const body = Matter.Bodies.circle(200, 400, 20);
    Matter.Body.setVelocity(body, { x: 10, y: 0 });

    applyDragModel(body, {
      y: 400,
      arenaHeight: 800,
      linearDamping: 0.05,
      angularDamping: 0.1,
      dtSeconds: 16.67 / 1000,
    });

    // Velocity should be less than 10 after drag
    expect(Math.abs(body.velocity.x)).toBeLessThan(10);
    expect(Math.abs(body.velocity.x)).toBeGreaterThan(0);
  });

  it('reduces angular velocity by angularDamping factor', () => {
    const body = Matter.Bodies.circle(200, 400, 20);
    Matter.Body.setAngularVelocity(body, 5);

    applyDragModel(body, {
      y: 400,
      arenaHeight: 800,
      linearDamping: 0.05,
      angularDamping: 0.1,
      dtSeconds: 16.67 / 1000,
    });

    expect(Math.abs(body.angularVelocity)).toBeLessThan(5);
    expect(Math.abs(body.angularVelocity)).toBeGreaterThan(0);
  });

  it('applies greater drag at the bottom than at the top (depth scaling)', () => {
    const bodyTop = Matter.Bodies.circle(200, 50, 20);
    const bodyBottom = Matter.Bodies.circle(200, 750, 20);
    Matter.Body.setVelocity(bodyTop, { x: 10, y: 0 });
    Matter.Body.setVelocity(bodyBottom, { x: 10, y: 0 });

    const params = {
      arenaHeight: 800,
      linearDamping: 0.05,
      angularDamping: 0.1,
      dtSeconds: 16.67 / 1000,
    };

    applyDragModel(bodyTop, { ...params, y: 50 });
    applyDragModel(bodyBottom, { ...params, y: 750 });

    // Bottom ring should be slower due to higher depth drag
    expect(Math.abs(bodyBottom.velocity.x)).toBeLessThan(Math.abs(bodyTop.velocity.x));
  });
});

// ---------------------------------------------------------------------------
// Task 4.3.4 — Serialization round-trip verification (Requirement 10.1)
// These tests are redundant with the existing restoreState tests above but
// added explicitly as per task requirements.
// ---------------------------------------------------------------------------

describe('serializeState / restoreState round-trip (Task 4.3.4)', () => {
  it('serialize then restore preserves all ring fields', () => {
    PhysicsWorld.initialize(makeConfig());

    // Advance a few ticks so the ring has moved
    for (let i = 0; i < 5; i++) {
      PhysicsWorld.step(16.67);
    }

    const snap = PhysicsWorld.serializeState();
    const snapX = snap.rings[0].x;
    const snapY = snap.rings[0].y;
    const snapAngle = snap.rings[0].angle;

    // Advance more
    for (let i = 0; i < 10; i++) {
      PhysicsWorld.step(16.67);
    }

    PhysicsWorld.restoreState(snap);

    const states = PhysicsWorld.getRingStates();
    expect(states[0].x).toBeCloseTo(snapX, 2);
    expect(states[0].y).toBeCloseTo(snapY, 2);
    expect(states[0].angle).toBeCloseTo(snapAngle, 3);
  });

  it('snapshot has a valid timestamp greater than zero', () => {
    PhysicsWorld.initialize(makeConfig());
    const snap = PhysicsWorld.serializeState();
    expect(snap.timestamp).toBeGreaterThan(0);
    expect(Number.isFinite(snap.timestamp)).toBe(true);
  });
});
