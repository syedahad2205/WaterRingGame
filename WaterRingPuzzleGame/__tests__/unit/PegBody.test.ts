/**
 * Unit tests for PegBody — task 4.1.3
 *
 * Covers:
 *  - createPegBody: sensor flag, collision filter category, plugin metadata
 *  - Acceptance zone radius = 1.2 × tipRadius
 *  - updateMovingPeg: linear interpolation along path, loop behaviour, static peg no-op
 *  - getPegPlugin: type-safe accessor
 *
 * Requirements: 10.4
 */

import Matter from 'matter-js';
import {
  createPegBody,
  updateMovingPeg,
  getPegPlugin,
  CATEGORY_RING,
  CATEGORY_WALL,
  CATEGORY_PEG_SENSOR,
  ACCEPTANCE_ZONE_MULTIPLIER,
  type PegBodyPlugin,
} from '@features/game/physics/PegBody';
import type { PegConfig, PathDefinition } from '../../src/types/challenge';

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

function makePegConfig(overrides: Partial<PegConfig> = {}): PegConfig {
  return {
    id: 'peg-1',
    position: { x: 200, y: 400 },
    height: 60,
    baseRadius: 20,
    tipRadius: 8,
    acceptedRingSizes: ['small', 'medium'],
    acceptedColorId: 'blue',
    isMoving: false,
    glowColor: '#0000ff',
    ...overrides,
  };
}

function makeMovingPath(): PathDefinition {
  return {
    points: [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
      { x: 300, y: 400 },
    ],
    durationMs: 2000,
    loop: true,
  };
}

// ---------------------------------------------------------------------------
// 1. createPegBody — sensor flag
// ---------------------------------------------------------------------------

describe('createPegBody — isSensor', () => {
  it('creates a body with isSensor: true', () => {
    const body = createPegBody(makePegConfig());
    expect(body.isSensor).toBe(true);
  });

  it('creates a static body', () => {
    const body = createPegBody(makePegConfig());
    expect(body.isStatic).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. createPegBody — collision filter
// ---------------------------------------------------------------------------

describe('createPegBody — collision filter', () => {
  it('sets category to CATEGORY_PEG_SENSOR', () => {
    const body = createPegBody(makePegConfig());
    expect(body.collisionFilter.category).toBe(CATEGORY_PEG_SENSOR);
  });

  it('sets mask to CATEGORY_RING so pegs detect rings', () => {
    const body = createPegBody(makePegConfig());
    expect(body.collisionFilter.mask).toBe(CATEGORY_RING);
  });

  it('CATEGORY_PEG_SENSOR is distinct from CATEGORY_RING', () => {
    expect(CATEGORY_PEG_SENSOR).not.toBe(CATEGORY_RING);
  });

  it('CATEGORY_PEG_SENSOR is distinct from CATEGORY_WALL', () => {
    expect(CATEGORY_PEG_SENSOR).not.toBe(CATEGORY_WALL);
  });

  it('CATEGORY_RING, CATEGORY_WALL, CATEGORY_PEG_SENSOR are each a single bit', () => {
    const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;
    expect(isPowerOfTwo(CATEGORY_RING)).toBe(true);
    expect(isPowerOfTwo(CATEGORY_WALL)).toBe(true);
    expect(isPowerOfTwo(CATEGORY_PEG_SENSOR)).toBe(true);
  });

  it('all three categories are unique bit flags (no overlapping bits)', () => {
    expect(CATEGORY_RING & CATEGORY_WALL).toBe(0);
    expect(CATEGORY_RING & CATEGORY_PEG_SENSOR).toBe(0);
    expect(CATEGORY_WALL & CATEGORY_PEG_SENSOR).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. createPegBody — plugin metadata
// ---------------------------------------------------------------------------

describe('createPegBody — plugin metadata', () => {
  it('stores pegId in plugin', () => {
    const config = makePegConfig({ id: 'peg-42' });
    const plugin = getPegPlugin(createPegBody(config));
    expect(plugin?.pegId).toBe('peg-42');
  });

  it('stores acceptedColorId in plugin', () => {
    const config = makePegConfig({ acceptedColorId: 'red' });
    const plugin = getPegPlugin(createPegBody(config));
    expect(plugin?.acceptedColorId).toBe('red');
  });

  it('stores acceptedRingSizes in plugin', () => {
    const config = makePegConfig({ acceptedRingSizes: ['large'] });
    const plugin = getPegPlugin(createPegBody(config));
    expect(plugin?.acceptedRingSizes).toEqual(['large']);
  });

  it('stores tipRadius in plugin', () => {
    const config = makePegConfig({ tipRadius: 12 });
    const plugin = getPegPlugin(createPegBody(config));
    expect(plugin?.tipRadius).toBe(12);
  });

  it('stores acceptanceRadius = 1.2 × tipRadius', () => {
    const config = makePegConfig({ tipRadius: 10 });
    const plugin = getPegPlugin(createPegBody(config));
    expect(plugin?.acceptanceRadius).toBeCloseTo(10 * ACCEPTANCE_ZONE_MULTIPLIER);
  });

  it('ACCEPTANCE_ZONE_MULTIPLIER equals 1.2', () => {
    expect(ACCEPTANCE_ZONE_MULTIPLIER).toBe(1.2);
  });

  it('acceptanceRadius is exactly 1.2 × tipRadius for various tip radii', () => {
    [5, 8, 10, 15, 22].forEach(tipRadius => {
      const plugin = getPegPlugin(createPegBody(makePegConfig({ tipRadius })));
      expect(plugin?.acceptanceRadius).toBeCloseTo(1.2 * tipRadius, 10);
    });
  });

  it('stores isMoving: false for a static peg', () => {
    const plugin = getPegPlugin(createPegBody(makePegConfig({ isMoving: false })));
    expect(plugin?.isMoving).toBe(false);
  });

  it('stores isMoving: true and movementPath for a moving peg', () => {
    const path = makeMovingPath();
    const config = makePegConfig({ isMoving: true, movementPath: path });
    const plugin = getPegPlugin(createPegBody(config));
    expect(plugin?.isMoving).toBe(true);
    expect(plugin?.movementPath).toEqual(path);
  });

  it('initialises settledRingId to null', () => {
    const plugin = getPegPlugin(createPegBody(makePegConfig()));
    expect(plugin?.settledRingId).toBeNull();
  });

  it('settledRingId can be mutated to reflect a landed ring', () => {
    const body = createPegBody(makePegConfig());
    const plugin = getPegPlugin(body) as PegBodyPlugin;
    plugin.settledRingId = 'ring-blue-1';
    // Re-read via accessor to confirm it is the same reference
    expect(getPegPlugin(body)?.settledRingId).toBe('ring-blue-1');
  });
});

// ---------------------------------------------------------------------------
// 4. createPegBody — body label
// ---------------------------------------------------------------------------

describe('createPegBody — label', () => {
  it('labels the body as peg_{id}', () => {
    const body = createPegBody(makePegConfig({ id: 'peg-7' }));
    expect(body.label).toBe('peg_peg-7');
  });
});

// ---------------------------------------------------------------------------
// 5. updateMovingPeg — static peg no-op
// ---------------------------------------------------------------------------

describe('updateMovingPeg — static peg', () => {
  it('does not reposition a non-moving peg', () => {
    const config = makePegConfig({ isMoving: false, position: { x: 200, y: 400 } });
    const body = createPegBody(config);
    const originalX = body.position.x;
    const originalY = body.position.y;

    updateMovingPeg(body, 1000);

    expect(body.position.x).toBe(originalX);
    expect(body.position.y).toBe(originalY);
  });

  it('does nothing when called on a body without a peg plugin', () => {
    const rawBody = Matter.Bodies.circle(50, 50, 10, { isStatic: true });
    expect(() => updateMovingPeg(rawBody, 500)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. updateMovingPeg — position interpolation
// ---------------------------------------------------------------------------

describe('updateMovingPeg — linear interpolation', () => {
  it('positions peg at the start point at elapsedTime = 0', () => {
    const path: PathDefinition = {
      points: [{ x: 100, y: 200 }, { x: 300, y: 200 }],
      durationMs: 1000,
      loop: false,
    };
    const body = createPegBody(makePegConfig({ isMoving: true, movementPath: path }));

    updateMovingPeg(body, 0);

    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(200);
  });

  it('positions peg at the midpoint at elapsedTime = durationMs / 2', () => {
    const path: PathDefinition = {
      points: [{ x: 0, y: 0 }, { x: 200, y: 0 }],
      durationMs: 1000,
      loop: false,
    };
    const body = createPegBody(makePegConfig({ isMoving: true, movementPath: path }));

    updateMovingPeg(body, 500);

    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(0);
  });

  it('clamps position to end point when elapsedTime >= durationMs (non-looping)', () => {
    const path: PathDefinition = {
      points: [{ x: 0, y: 0 }, { x: 100, y: 50 }],
      durationMs: 1000,
      loop: false,
    };
    const body = createPegBody(makePegConfig({ isMoving: true, movementPath: path }));

    updateMovingPeg(body, 2000); // well past end

    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(50);
  });

  it('interpolates correctly at the three-quarter mark with two points', () => {
    const path: PathDefinition = {
      points: [{ x: 0, y: 0 }, { x: 400, y: 0 }],
      durationMs: 1000,
      loop: false,
    };
    const body = createPegBody(makePegConfig({ isMoving: true, movementPath: path }));

    updateMovingPeg(body, 750);

    expect(body.position.x).toBeCloseTo(300);
  });
});

// ---------------------------------------------------------------------------
// 7. updateMovingPeg — multi-segment path
// ---------------------------------------------------------------------------

describe('updateMovingPeg — multi-segment path', () => {
  it('transitions between segments correctly', () => {
    // Three points → two equal-duration segments.
    // Each segment duration = durationMs / 2 = 500ms.
    const path: PathDefinition = {
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      durationMs: 1000,
      loop: false,
    };
    const body = createPegBody(makePegConfig({ isMoving: true, movementPath: path }));

    // Exactly at the segment boundary (t=500ms → start of segment 2)
    updateMovingPeg(body, 500);
    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(0);

    // Midpoint of second segment (t=750ms → halfway through [100,0]→[100,100])
    updateMovingPeg(body, 750);
    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(50);
  });
});

// ---------------------------------------------------------------------------
// 8. updateMovingPeg — looping path
// ---------------------------------------------------------------------------

describe('updateMovingPeg — looping path', () => {
  it('wraps position back to the start after one full loop duration', () => {
    const path: PathDefinition = {
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      durationMs: 1000,
      loop: true,
    };
    const body = createPegBody(makePegConfig({ isMoving: true, movementPath: path }));

    updateMovingPeg(body, 0);
    const startX = body.position.x;

    updateMovingPeg(body, 1000); // exactly one full loop
    expect(body.position.x).toBeCloseTo(startX);
  });

  it('looping position at 1.5× durationMs matches 0.5× durationMs', () => {
    const path: PathDefinition = {
      points: [{ x: 0, y: 0 }, { x: 200, y: 0 }],
      durationMs: 1000,
      loop: true,
    };
    const body = createPegBody(makePegConfig({ isMoving: true, movementPath: path }));

    updateMovingPeg(body, 500);
    const xAt500 = body.position.x;

    updateMovingPeg(body, 1500);
    expect(body.position.x).toBeCloseTo(xAt500);
  });
});

// ---------------------------------------------------------------------------
// 9. updateMovingPeg — single-point path
// ---------------------------------------------------------------------------

describe('updateMovingPeg — single-point path', () => {
  it('always positions the peg at the single waypoint', () => {
    const path: PathDefinition = {
      points: [{ x: 77, y: 88 }],
      durationMs: 1000,
      loop: false,
    };
    const body = createPegBody(makePegConfig({ isMoving: true, movementPath: path }));

    updateMovingPeg(body, 0);
    expect(body.position.x).toBeCloseTo(77);
    expect(body.position.y).toBeCloseTo(88);

    updateMovingPeg(body, 999);
    expect(body.position.x).toBeCloseTo(77);
    expect(body.position.y).toBeCloseTo(88);
  });
});

// ---------------------------------------------------------------------------
// 10. getPegPlugin — type-safe accessor
// ---------------------------------------------------------------------------

describe('getPegPlugin', () => {
  it('returns the plugin for a valid peg body', () => {
    const body = createPegBody(makePegConfig());
    const plugin = getPegPlugin(body);
    expect(plugin).not.toBeNull();
    expect(plugin?.pegId).toBe('peg-1');
  });

  it('returns null for a non-peg body (no plugin)', () => {
    const rawBody = Matter.Bodies.circle(50, 50, 10);
    expect(getPegPlugin(rawBody)).toBeNull();
  });

  it('returns null for a body whose plugin lacks the pegId key', () => {
    const rawBody = Matter.Bodies.circle(50, 50, 10);
    (rawBody as Matter.Body & { plugin: Record<string, unknown> }).plugin = { someOtherKey: true };
    expect(getPegPlugin(rawBody)).toBeNull();
  });
});
