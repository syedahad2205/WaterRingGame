/**
 * Unit tests for RingBody factory and RingBodyPool.
 *
 * Tests verify:
 *   - 24-vertex polygon body creation per size tier
 *   - Correct mass per size tier (small=0.5, medium=1.0, large=2.2)
 *   - Correct buoyancy stored in body.plugin per size tier
 *   - Correct frictionAir and restitution per size tier
 *   - Collision filter category assignment
 *   - Ring plugin metadata population
 *   - RingBodyPool pre-allocation and lookup
 *
 * Requirements: 23.1, 23.2, 23.3, 24.4
 */

import Matter from 'matter-js';
import {
  createRingBody,
  getRingPlugin,
  RingBodyPool,
  RING_VERTEX_COUNT,
} from '../../src/features/game/physics/RingBody';
import { CATEGORY_RING, CATEGORY_WALL } from '../../src/features/game/physics/PegBody';
import type { RingConfig } from '../../src/types/challenge';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_POSITION = { x: 100, y: 200 };

function makeRingConfig(
  overrides: Partial<RingConfig> & { id?: string },
): RingConfig {
  return {
    id: 'ring-1',
    outerRadius: 22,
    innerRadius: 12,
    mass: 0.5,
    buoyancy: 0.85,
    angularDamping: 0.01,
    linearDamping: 0.01,
    restitution: 0.3,
    frictionAir: 0.015,
    sizeCategory: 'small',
    colorId: 'red',
    skinId: 'default',
    isDecoy: false,
    initialPosition: BASE_POSITION,
    ...overrides,
  };
}

const SMALL_RING_CONFIG: RingConfig = makeRingConfig({
  id: 'ring-small',
  outerRadius: 22,
  mass: 0.5,
  buoyancy: 0.85,
  sizeCategory: 'small',
});

const MEDIUM_RING_CONFIG: RingConfig = makeRingConfig({
  id: 'ring-medium',
  outerRadius: 32,
  mass: 1.0,
  buoyancy: 0.65,
  sizeCategory: 'medium',
});

const LARGE_RING_CONFIG: RingConfig = makeRingConfig({
  id: 'ring-large',
  outerRadius: 44,
  mass: 2.2,
  buoyancy: 0.45,
  sizeCategory: 'large',
});

// ---------------------------------------------------------------------------
// Helper — extract vertices from a Matter.Body
// ---------------------------------------------------------------------------

function getVertexCount(body: Matter.Body): number {
  // Matter.Bodies.fromVertices can decompose the polygon into multiple parts.
  // The total vertex count is the sum across all parts.
  if (body.parts && body.parts.length > 1) {
    // parts[0] is the parent body; parts[1..] are sub-bodies from decomposition.
    return body.parts.slice(1).reduce((acc, part) => acc + part.vertices.length, 0);
  }
  return body.vertices.length;
}

// ---------------------------------------------------------------------------
// createRingBody — polygon construction
// ---------------------------------------------------------------------------

describe('createRingBody — polygon construction', () => {
  it('creates a body with RING_VERTEX_COUNT (24) vertices for a small ring', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    const count = getVertexCount(body);
    expect(count).toBe(RING_VERTEX_COUNT);
  });

  it('creates a body with RING_VERTEX_COUNT (24) vertices for a medium ring', () => {
    const body = createRingBody(MEDIUM_RING_CONFIG, BASE_POSITION);
    const count = getVertexCount(body);
    expect(count).toBe(RING_VERTEX_COUNT);
  });

  it('creates a body with RING_VERTEX_COUNT (24) vertices for a large ring', () => {
    const body = createRingBody(LARGE_RING_CONFIG, BASE_POSITION);
    const count = getVertexCount(body);
    expect(count).toBe(RING_VERTEX_COUNT);
  });

  it('positions the body near the requested spawn position', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    // fromVertices may shift the centroid slightly; allow ±5px tolerance.
    expect(body.position.x).toBeCloseTo(BASE_POSITION.x, -1);
    expect(body.position.y).toBeCloseTo(BASE_POSITION.y, -1);
  });
});

// ---------------------------------------------------------------------------
// createRingBody — mass per size tier (Requirements 23.1, 23.2, 23.3)
// ---------------------------------------------------------------------------

describe('createRingBody — mass per size tier', () => {
  it('sets mass = 0.5 for a small ring', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    expect(body.mass).toBeCloseTo(0.5, 5);
  });

  it('sets mass = 1.0 for a medium ring', () => {
    const body = createRingBody(MEDIUM_RING_CONFIG, BASE_POSITION);
    expect(body.mass).toBeCloseTo(1.0, 5);
  });

  it('sets mass = 2.2 for a large ring', () => {
    const body = createRingBody(LARGE_RING_CONFIG, BASE_POSITION);
    expect(body.mass).toBeCloseTo(2.2, 5);
  });
});

// ---------------------------------------------------------------------------
// createRingBody — buoyancy in plugin (Requirements 23.1, 23.2, 23.3)
// ---------------------------------------------------------------------------

describe('createRingBody — buoyancy in plugin', () => {
  it('stores buoyancy = 0.85 for a small ring', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin).not.toBeNull();
    expect(plugin!.buoyancy).toBeCloseTo(0.85);
  });

  it('stores buoyancy = 0.65 for a medium ring', () => {
    const body = createRingBody(MEDIUM_RING_CONFIG, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin).not.toBeNull();
    expect(plugin!.buoyancy).toBeCloseTo(0.65);
  });

  it('stores buoyancy = 0.45 for a large ring', () => {
    const body = createRingBody(LARGE_RING_CONFIG, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin).not.toBeNull();
    expect(plugin!.buoyancy).toBeCloseTo(0.45);
  });
});

// ---------------------------------------------------------------------------
// createRingBody — physics properties per tier
// ---------------------------------------------------------------------------

describe('createRingBody — physics properties', () => {
  it('sets frictionAir = 0.015 on small ring body', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    expect(body.frictionAir).toBeCloseTo(0.015);
  });

  it('sets restitution = 0.3 on small ring body', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    expect(body.restitution).toBeCloseTo(0.3);
  });

  it('sets frictionAir = 0.015 on large ring body', () => {
    const body = createRingBody(LARGE_RING_CONFIG, BASE_POSITION);
    expect(body.frictionAir).toBeCloseTo(0.015);
  });

  it('sets restitution = 0.3 on large ring body', () => {
    const body = createRingBody(LARGE_RING_CONFIG, BASE_POSITION);
    expect(body.restitution).toBeCloseTo(0.3);
  });
});

// ---------------------------------------------------------------------------
// createRingBody — collision filter
// ---------------------------------------------------------------------------

describe('createRingBody — collision filter', () => {
  it('assigns CATEGORY_RING as the collision category', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    expect(body.collisionFilter.category).toBe(CATEGORY_RING);
  });

  it('masks against CATEGORY_RING and CATEGORY_WALL', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    expect(body.collisionFilter.mask).toBe(CATEGORY_RING | CATEGORY_WALL);
  });
});

// ---------------------------------------------------------------------------
// createRingBody — plugin metadata
// ---------------------------------------------------------------------------

describe('createRingBody — plugin metadata', () => {
  it('stores ringId in plugin', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin?.ringId).toBe('ring-small');
  });

  it('stores colorId in plugin', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin?.colorId).toBe('red');
  });

  it('stores sizeCategory in plugin', () => {
    const body = createRingBody(MEDIUM_RING_CONFIG, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin?.sizeCategory).toBe('medium');
  });

  it('initialises settledOnPegId to null', () => {
    const body = createRingBody(LARGE_RING_CONFIG, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin?.settledOnPegId).toBeNull();
  });

  it('stores isDecoy flag in plugin', () => {
    const decoyConfig = makeRingConfig({ id: 'decoy-1', isDecoy: true });
    const body = createRingBody(decoyConfig, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin?.isDecoy).toBe(true);
  });

  it('labels the body as ring_<id>', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    expect(body.label).toBe('ring_ring-small');
  });
});

// ---------------------------------------------------------------------------
// getRingPlugin — type guard
// ---------------------------------------------------------------------------

describe('getRingPlugin', () => {
  it('returns a RingBodyPlugin for a ring body', () => {
    const body = createRingBody(SMALL_RING_CONFIG, BASE_POSITION);
    const plugin = getRingPlugin(body);
    expect(plugin).not.toBeNull();
    expect(typeof plugin!.ringId).toBe('string');
  });

  it('returns null for a non-ring body (e.g. a plain circle)', () => {
    const plainBody = Matter.Bodies.circle(50, 50, 10, { label: 'wall' });
    const plugin = getRingPlugin(plainBody);
    expect(plugin).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RingBodyPool — pre-allocation and lookup (Requirement 24.4)
// ---------------------------------------------------------------------------

describe('RingBodyPool', () => {
  afterEach(() => {
    RingBodyPool.clear();
  });

  it('pre-allocates a body for each ring config', () => {
    const rings = [SMALL_RING_CONFIG, MEDIUM_RING_CONFIG, LARGE_RING_CONFIG];
    RingBodyPool.preAllocate(rings);

    expect(RingBodyPool.getBody('ring-small')).not.toBeNull();
    expect(RingBodyPool.getBody('ring-medium')).not.toBeNull();
    expect(RingBodyPool.getBody('ring-large')).not.toBeNull();
  });

  it('returns null for an unknown ringId', () => {
    RingBodyPool.preAllocate([SMALL_RING_CONFIG]);
    expect(RingBodyPool.getBody('ring-does-not-exist')).toBeNull();
  });

  it('returns the same body instance on repeated getBody calls', () => {
    RingBodyPool.preAllocate([SMALL_RING_CONFIG]);
    const bodyA = RingBodyPool.getBody('ring-small');
    const bodyB = RingBodyPool.getBody('ring-small');
    expect(bodyA).toBe(bodyB);
  });

  it('returns an array of all pre-allocated bodies via getAllBodies', () => {
    const rings = [SMALL_RING_CONFIG, MEDIUM_RING_CONFIG];
    RingBodyPool.preAllocate(rings);
    const all = RingBodyPool.getAllBodies();
    expect(all).toHaveLength(2);
  });

  it('clears all pooled bodies on clear()', () => {
    RingBodyPool.preAllocate([SMALL_RING_CONFIG]);
    RingBodyPool.clear();
    expect(RingBodyPool.getBody('ring-small')).toBeNull();
    expect(RingBodyPool.getAllBodies()).toHaveLength(0);
  });

  it('replaces previously pooled bodies on subsequent preAllocate calls', () => {
    RingBodyPool.preAllocate([SMALL_RING_CONFIG]);
    const firstBody = RingBodyPool.getBody('ring-small');

    RingBodyPool.preAllocate([SMALL_RING_CONFIG]);
    const secondBody = RingBodyPool.getBody('ring-small');

    // After re-allocation, a new body instance is created.
    expect(firstBody).not.toBe(secondBody);
  });

  it('pre-allocated bodies have correct mass per ring config', () => {
    RingBodyPool.preAllocate([SMALL_RING_CONFIG, MEDIUM_RING_CONFIG, LARGE_RING_CONFIG]);

    const small = RingBodyPool.getBody('ring-small')!;
    const medium = RingBodyPool.getBody('ring-medium')!;
    const large = RingBodyPool.getBody('ring-large')!;

    expect(small.mass).toBeCloseTo(0.5, 5);
    expect(medium.mass).toBeCloseTo(1.0, 5);
    expect(large.mass).toBeCloseTo(2.2, 5);
  });

  it('pre-allocated bodies have correct buoyancy in plugin', () => {
    RingBodyPool.preAllocate([SMALL_RING_CONFIG, MEDIUM_RING_CONFIG, LARGE_RING_CONFIG]);

    expect(getRingPlugin(RingBodyPool.getBody('ring-small')!)!.buoyancy).toBeCloseTo(0.85);
    expect(getRingPlugin(RingBodyPool.getBody('ring-medium')!)!.buoyancy).toBeCloseTo(0.65);
    expect(getRingPlugin(RingBodyPool.getBody('ring-large')!)!.buoyancy).toBeCloseTo(0.45);
  });

  it('handles an empty rings array without error', () => {
    expect(() => RingBodyPool.preAllocate([])).not.toThrow();
    expect(RingBodyPool.getAllBodies()).toHaveLength(0);
  });
});
