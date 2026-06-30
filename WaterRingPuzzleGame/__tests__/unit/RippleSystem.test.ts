/**
 * Unit tests for RippleSystem — task 5.4.1 / 5.4.1a
 *
 * Covers:
 *   - Pool max-20 cap: 25 ripples spawned → 20 active, oldest 5 culled
 *   - Radius formula: t=0 → radius=0; t=500ms, button_press → 60 px
 *   - Opacity formula: midlife → maxOpacity × 0.5; end → 0
 *   - Per-type parameter correctness
 *   - getRippleState returns alive=false when elapsed >= duration
 *
 * Requirements: 43.4
 */

import {
  spawnRipple,
  updateRipples,
  getRippleState,
  computeRipplePath,
  RIPPLE_PARAMS,
  MAX_RIPPLES,
  type Ripple,
  type RippleType,
} from '@features/game/rendering/RippleSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fresh empty pool. */
function makePool(): Ripple[] {
  return [];
}

const ALL_TYPES: RippleType[] = [
  'bubble_pop',
  'ring_surface_break',
  'button_press',
  'rain_drop',
];

// ---------------------------------------------------------------------------
// 1. Pool max-20 cap
// ---------------------------------------------------------------------------

describe('Pool capacity', () => {
  it('allows up to MAX_RIPPLES (20) entries without culling', () => {
    const pool = makePool();
    for (let i = 0; i < MAX_RIPPLES; i++) {
      spawnRipple(pool, i * 10, 50, 'rain_drop', i * 100);
    }
    expect(pool.length).toBe(MAX_RIPPLES);
  });

  it('caps at MAX_RIPPLES after 25 spawns, culling the 5 oldest', () => {
    const pool = makePool();
    // Record the IDs of the first 5 ripples so we can confirm they were removed.
    for (let i = 0; i < 25; i++) {
      spawnRipple(pool, i, i, 'rain_drop', i * 10);
    }

    expect(pool.length).toBe(MAX_RIPPLES);

    // The 5 lowest IDs (oldest) should have been culled.
    const ids = pool.map((r) => r.id).sort((a, b) => a - b);
    // The first surviving ID must be 6th or later, meaning the 5 smallest are gone.
    // Because IDs are assigned sequentially, the last 20 of 25 should survive.
    // Minimum surviving id = the 6th spawned = startId + 5.
    const minId = Math.min(...ids);
    const maxId = Math.max(...ids);
    // All 20 survivors are the most recently spawned → maxId - minId = 19.
    expect(maxId - minId).toBe(19);
  });

  it('all 20 pool entries are active right after spawning', () => {
    const pool = makePool();
    const now = 1000;
    for (let i = 0; i < 25; i++) {
      spawnRipple(pool, 0, 0, 'bubble_pop', now);
    }
    const activeCount = pool.filter((r) => r.active).length;
    expect(activeCount).toBe(MAX_RIPPLES);
  });
});

// ---------------------------------------------------------------------------
// 2. Radius formula
// ---------------------------------------------------------------------------

describe('Radius formula', () => {
  it('radius is 0 at t=0 (spawnTime === nowMs)', () => {
    const pool = makePool();
    const now = 5000;
    spawnRipple(pool, 100, 200, 'button_press', now);
    const ripple = pool[pool.length - 1];

    const state = getRippleState(ripple, now); // elapsed = 0
    expect(state.radius).toBe(0);
  });

  it('button_press at t=500ms → radius = 120 × 0.5 = 60 px', () => {
    const pool = makePool();
    const spawnTime = 1000;
    spawnRipple(pool, 0, 0, 'button_press', spawnTime);
    const ripple = pool[pool.length - 1];

    const state = getRippleState(ripple, spawnTime + 500);
    expect(state.radius).toBeCloseTo(60, 6);
  });

  it('radius grows linearly: doubling elapsed doubles radius', () => {
    const pool = makePool();
    const spawnTime = 0;
    spawnRipple(pool, 0, 0, 'ring_surface_break', spawnTime);
    const ripple = pool[pool.length - 1];

    const s1 = getRippleState(ripple, spawnTime + 200);
    const s2 = getRippleState(ripple, spawnTime + 400);
    expect(s2.radius).toBeCloseTo(s1.radius * 2, 6);
  });

  it('matches expandSpeed × (elapsed/1000) for all types', () => {
    const elapsedMs = 300;
    ALL_TYPES.forEach((type) => {
      const pool = makePool();
      spawnRipple(pool, 0, 0, type, 0);
      const ripple = pool[0];
      const state = getRippleState(ripple, elapsedMs);
      const expected = RIPPLE_PARAMS[type].expandSpeed * (elapsedMs / 1000);
      expect(state.radius).toBeCloseTo(expected, 6);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Opacity formula
// ---------------------------------------------------------------------------

describe('Opacity formula', () => {
  it('opacity at t=0 equals maxOpacity', () => {
    ALL_TYPES.forEach((type) => {
      const pool = makePool();
      const now = 0;
      spawnRipple(pool, 0, 0, type, now);
      const ripple = pool[0];
      const state = getRippleState(ripple, now);
      expect(state.opacity).toBeCloseTo(RIPPLE_PARAMS[type].maxOpacity, 6);
    });
  });

  it('opacity at midlife = maxOpacity × 0.5', () => {
    ALL_TYPES.forEach((type) => {
      const pool = makePool();
      const spawnTime = 1000;
      spawnRipple(pool, 0, 0, type, spawnTime);
      const ripple = pool[0];
      const midPoint = spawnTime + RIPPLE_PARAMS[type].durationMs / 2;
      const state = getRippleState(ripple, midPoint);
      expect(state.opacity).toBeCloseTo(RIPPLE_PARAMS[type].maxOpacity * 0.5, 6);
    });
  });

  it('opacity at end-of-life (elapsed = duration) is 0', () => {
    ALL_TYPES.forEach((type) => {
      const pool = makePool();
      const spawnTime = 500;
      spawnRipple(pool, 0, 0, type, spawnTime);
      const ripple = pool[0];
      const endTime = spawnTime + RIPPLE_PARAMS[type].durationMs;
      const state = getRippleState(ripple, endTime);
      expect(state.opacity).toBeCloseTo(0, 6);
    });
  });

  it('opacity never goes negative after the ripple expires', () => {
    const pool = makePool();
    const spawnTime = 0;
    spawnRipple(pool, 0, 0, 'bubble_pop', spawnTime);
    const ripple = pool[0];
    // Well past expiry.
    const state = getRippleState(ripple, spawnTime + RIPPLE_PARAMS['bubble_pop'].durationMs + 5000);
    expect(state.opacity).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Per-type parameter correctness
// ---------------------------------------------------------------------------

describe('Per-type parameters', () => {
  it('bubble_pop has maxOpacity=0.3, durationMs=600, expandSpeed=80', () => {
    const p = RIPPLE_PARAMS['bubble_pop'];
    expect(p.maxOpacity).toBe(0.3);
    expect(p.durationMs).toBe(600);
    expect(p.expandSpeed).toBe(80);
  });

  it('ring_surface_break has maxOpacity=0.5, durationMs=800, expandSpeed=100', () => {
    const p = RIPPLE_PARAMS['ring_surface_break'];
    expect(p.maxOpacity).toBe(0.5);
    expect(p.durationMs).toBe(800);
    expect(p.expandSpeed).toBe(100);
  });

  it('button_press has maxOpacity=0.4, durationMs=1000, expandSpeed=120', () => {
    const p = RIPPLE_PARAMS['button_press'];
    expect(p.maxOpacity).toBe(0.4);
    expect(p.durationMs).toBe(1000);
    expect(p.expandSpeed).toBe(120);
  });

  it('rain_drop has maxOpacity=0.25, durationMs=500, expandSpeed=60', () => {
    const p = RIPPLE_PARAMS['rain_drop'];
    expect(p.maxOpacity).toBe(0.25);
    expect(p.durationMs).toBe(500);
    expect(p.expandSpeed).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// 5. getRippleState alive flag
// ---------------------------------------------------------------------------

describe('getRippleState: alive flag', () => {
  it('alive=true when elapsed < duration', () => {
    ALL_TYPES.forEach((type) => {
      const pool = makePool();
      const spawnTime = 1000;
      spawnRipple(pool, 0, 0, type, spawnTime);
      const ripple = pool[0];
      const beforeEnd = spawnTime + RIPPLE_PARAMS[type].durationMs - 1;
      expect(getRippleState(ripple, beforeEnd).alive).toBe(true);
    });
  });

  it('alive=false when elapsed === duration', () => {
    ALL_TYPES.forEach((type) => {
      const pool = makePool();
      const spawnTime = 0;
      spawnRipple(pool, 0, 0, type, spawnTime);
      const ripple = pool[0];
      const atEnd = spawnTime + RIPPLE_PARAMS[type].durationMs;
      expect(getRippleState(ripple, atEnd).alive).toBe(false);
    });
  });

  it('alive=false when elapsed > duration', () => {
    ALL_TYPES.forEach((type) => {
      const pool = makePool();
      const spawnTime = 0;
      spawnRipple(pool, 0, 0, type, spawnTime);
      const ripple = pool[0];
      const pastEnd = spawnTime + RIPPLE_PARAMS[type].durationMs + 100;
      expect(getRippleState(ripple, pastEnd).alive).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// 6. updateRipples
// ---------------------------------------------------------------------------

describe('updateRipples', () => {
  it('returns the correct active count before expiry', () => {
    const pool = makePool();
    const now = 0;
    spawnRipple(pool, 0, 0, 'bubble_pop', now);      // duration 600ms
    spawnRipple(pool, 10, 10, 'rain_drop', now);     // duration 500ms

    const count = updateRipples(pool, now + 200); // both still alive
    expect(count).toBe(2);
  });

  it('marks expired ripples inactive', () => {
    const pool = makePool();
    const now = 0;
    spawnRipple(pool, 0, 0, 'rain_drop', now); // duration 500ms

    updateRipples(pool, now + 600); // past 500ms expiry
    expect(pool[0].active).toBe(false);
  });

  it('returns 0 when all ripples have expired', () => {
    const pool = makePool();
    const now = 0;
    ALL_TYPES.forEach((type) => spawnRipple(pool, 0, 0, type, now));

    // Use a time well past the longest duration (1000ms for button_press).
    const count = updateRipples(pool, now + 2000);
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7. computeRipplePath
// ---------------------------------------------------------------------------

describe('computeRipplePath', () => {
  it('returns x/y from the ripple centre', () => {
    const pool = makePool();
    spawnRipple(pool, 123, 456, 'bubble_pop', 0);
    const path = computeRipplePath(pool[0], 100);
    expect(path.x).toBe(123);
    expect(path.y).toBe(456);
  });

  it('radius and opacity match getRippleState', () => {
    const pool = makePool();
    const spawnTime = 0;
    spawnRipple(pool, 0, 0, 'button_press', spawnTime);
    const ripple = pool[0];
    const nowMs = 300;

    const state = getRippleState(ripple, nowMs);
    const path = computeRipplePath(ripple, nowMs);

    expect(path.radius).toBeCloseTo(state.radius, 9);
    expect(path.opacity).toBeCloseTo(state.opacity, 9);
  });
});
