/**
 * Unit tests for ObstacleBody.ts — arena wall factory and obstacle factory.
 *
 * Requirements: 21.4, 21.5
 */

import Matter from 'matter-js';
import {
  CATEGORY_WALL,
  createArenaWalls,
  createHorizontalBar,
  createObstacleFromConfig,
} from '@features/game/physics/ObstacleBody';
import type { ArenaLayout, ObstacleConfig } from '../../src/types/challenge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArena(width = 390, height = 844): ArenaLayout {
  return {
    width,
    height,
    waterSurfaceY: height * 0.3,
    themeId: 'ocean',
    environmentId: 'day',
  };
}

function makeObstacleConfig(overrides: Partial<ObstacleConfig> = {}): ObstacleConfig {
  return {
    id: 'obs-1',
    shape: 'rectangle',
    position: { x: 100, y: 200 },
    angle: 0,
    width: 120,
    height: 20,
    isMoving: false,
    restitution: 0.3,
    friction: 0.1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createArenaWalls — count and static properties
// ---------------------------------------------------------------------------

describe('createArenaWalls', () => {
  const arena = makeArena();
  let walls: Matter.Body[];

  beforeEach(() => {
    walls = createArenaWalls(arena);
  });

  it('returns exactly four walls', () => {
    expect(walls).toHaveLength(4);
  });

  it('all walls are static bodies', () => {
    walls.forEach(wall => {
      expect(wall.isStatic).toBe(true);
    });
  });

  it('all walls have restitution = 0.3', () => {
    walls.forEach(wall => {
      expect(wall.restitution).toBeCloseTo(0.3, 5);
    });
  });

  it('all walls have friction = 0.1', () => {
    walls.forEach(wall => {
      expect(wall.friction).toBeCloseTo(0.1, 5);
    });
  });

  it('all walls have collision category CATEGORY_WALL', () => {
    walls.forEach(wall => {
      expect(wall.collisionFilter.category).toBe(CATEGORY_WALL);
    });
  });

  it('wall labels include the word "wall"', () => {
    walls.forEach(wall => {
      expect(wall.label).toMatch(/wall/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Positional correctness
  // ---------------------------------------------------------------------------

  it('left wall center is outside the left edge', () => {
    const left = walls.find(w => w.label === 'wall-left');
    expect(left).toBeDefined();
    expect(left!.position.x).toBeLessThan(0);
  });

  it('right wall center is outside the right edge', () => {
    const right = walls.find(w => w.label === 'wall-right');
    expect(right).toBeDefined();
    expect(right!.position.x).toBeGreaterThan(arena.width);
  });

  it('top wall center is above the top edge', () => {
    const top = walls.find(w => w.label === 'wall-top');
    expect(top).toBeDefined();
    expect(top!.position.y).toBeLessThan(0);
  });

  it('bottom wall center is below the bottom edge', () => {
    const bottom = walls.find(w => w.label === 'wall-bottom');
    expect(bottom).toBeDefined();
    expect(bottom!.position.y).toBeGreaterThan(arena.height);
  });

  it('walls scale with arena dimensions', () => {
    const small = createArenaWalls(makeArena(200, 400));
    const large = createArenaWalls(makeArena(800, 1600));

    const bottomSmall = small.find(w => w.label === 'wall-bottom')!;
    const bottomLarge = large.find(w => w.label === 'wall-bottom')!;

    // Larger arena → bottom wall sits further down
    expect(bottomLarge.position.y).toBeGreaterThan(bottomSmall.position.y);
  });
});

// ---------------------------------------------------------------------------
// createHorizontalBar
// ---------------------------------------------------------------------------

describe('createHorizontalBar', () => {
  it('creates a static body', () => {
    const bar = createHorizontalBar(100, 200, 120, 20);
    expect(bar.isStatic).toBe(true);
  });

  it('positions the body at the given center coordinates', () => {
    const bar = createHorizontalBar(150, 300, 100, 25);
    expect(bar.position.x).toBeCloseTo(150, 1);
    expect(bar.position.y).toBeCloseTo(300, 1);
  });

  it('labels the body as obstacle-bar', () => {
    const bar = createHorizontalBar(0, 0, 80, 15);
    expect(bar.label).toBe('obstacle-bar');
  });
});

// ---------------------------------------------------------------------------
// createObstacleFromConfig — rectangle shape
// ---------------------------------------------------------------------------

describe('createObstacleFromConfig — rectangle', () => {
  it('creates a static body when isMoving is false', () => {
    const body = createObstacleFromConfig(makeObstacleConfig({ isMoving: false }));
    expect(body.isStatic).toBe(true);
  });

  it('creates a non-static body when isMoving is true', () => {
    const body = createObstacleFromConfig(makeObstacleConfig({ isMoving: true }));
    expect(body.isStatic).toBe(false);
  });

  it('applies position from config', () => {
    const body = createObstacleFromConfig(makeObstacleConfig({ position: { x: 250, y: 400 } }));
    expect(body.position.x).toBeCloseTo(250, 1);
    expect(body.position.y).toBeCloseTo(400, 1);
  });

  it('applies restitution from config', () => {
    const body = createObstacleFromConfig(makeObstacleConfig({ restitution: 0.5 }));
    expect(body.restitution).toBeCloseTo(0.5, 5);
  });

  it('applies friction from config', () => {
    const body = createObstacleFromConfig(makeObstacleConfig({ friction: 0.2 }));
    expect(body.friction).toBeCloseTo(0.2, 5);
  });

  it('encodes the obstacle id in the label', () => {
    const body = createObstacleFromConfig(makeObstacleConfig({ id: 'obs-42' }));
    expect(body.label).toContain('obs-42');
  });

  it('applies angle from config', () => {
    const body = createObstacleFromConfig(makeObstacleConfig({ angle: Math.PI / 4 }));
    expect(body.angle).toBeCloseTo(Math.PI / 4, 5);
  });
});

// ---------------------------------------------------------------------------
// createObstacleFromConfig — circle shape
// ---------------------------------------------------------------------------

describe('createObstacleFromConfig — circle', () => {
  it('creates a circle body for shape=circle', () => {
    const body = createObstacleFromConfig(
      makeObstacleConfig({ shape: 'circle', width: 40, height: 40 }),
    );
    // Matter.js circle bodies have circleRadius set
    expect((body as Matter.Body & { circleRadius?: number }).circleRadius).toBeCloseTo(40, 1);
  });
});

// ---------------------------------------------------------------------------
// createObstacleFromConfig — polygon shape
// ---------------------------------------------------------------------------

describe('createObstacleFromConfig — polygon', () => {
  it('creates a body for shape=polygon with valid vertices', () => {
    const vertices = [
      { x: 0, y: -30 },
      { x: 30, y: 30 },
      { x: -30, y: 30 },
    ];
    const body = createObstacleFromConfig(
      makeObstacleConfig({ shape: 'polygon', vertices }),
    );
    expect(body).toBeDefined();
    expect(body.isStatic).toBe(true);
  });

  it('falls back to rectangle when polygon has no vertices', () => {
    const body = createObstacleFromConfig(
      makeObstacleConfig({ shape: 'polygon', vertices: undefined }),
    );
    // Should still create a valid body (rectangle fallback)
    expect(body).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// CATEGORY_WALL constant
// ---------------------------------------------------------------------------

describe('CATEGORY_WALL', () => {
  it('is a non-zero power-of-two (valid collision category bit)', () => {
    expect(CATEGORY_WALL).toBeGreaterThan(0);
    expect(CATEGORY_WALL & (CATEGORY_WALL - 1)).toBe(0); // power of two
  });
});
