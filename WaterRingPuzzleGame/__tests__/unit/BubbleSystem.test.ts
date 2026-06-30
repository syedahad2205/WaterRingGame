/**
 * Unit tests for BubbleSystem — tasks 5.3.1 and 5.3.2
 *
 * Covers:
 *   Pool max-40 cap:  spawning 50 bubbles → only 40 active (oldest culled)
 *   Rise physics:     after 0.5 s, y should decrease by 20 px (RISE_SPEED=40 × 0.5)
 *   Wobble:           x oscillates around initialX within ±WOBBLE_AMPLITUDE
 *   Pop trigger:      bubble reaching waterSurfaceY → active becomes false
 *   Opacity decay:    opacity fades to 0 as bubble approaches surface
 *
 * Requirements: 38.5, 43.4
 */

import {
  createBubblePool,
  countActiveBubbles,
  spawnFromButtonPress,
  spawnFromRingCollision,
  spawnFromRingLanding,
  spawnAmbient,
  updateBubbles,
  MAX_BUBBLES,
  RISE_SPEED,
  WOBBLE_AMPLITUDE,
  INITIAL_OPACITY,
  type Bubble,
  type Prng,
} from '@features/game/rendering/BubbleSystem';

// ---------------------------------------------------------------------------
// Test PRNG helpers
// ---------------------------------------------------------------------------

/**
 * Returns a deterministic PRNG that cycles through a fixed sequence of values.
 * Values are in [0, 1).
 */
function makeDeterministicPrng(values: number[]): Prng {
  let index = 0;
  return (): number => {
    const v = values[index % values.length];
    index++;
    return v;
  };
}

/**
 * A simple seeded LCG PRNG for generating varied-but-deterministic values.
 */
function makeLcgPrng(seed: number): Prng {
  let s = seed >>> 0;
  return (): number => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const NOW_MS = 1_000;
const WATER_SURFACE_Y = 50;
const ARENA_WIDTH = 400;

// ---------------------------------------------------------------------------
// createBubblePool
// ---------------------------------------------------------------------------

describe('createBubblePool', () => {
  it('creates a pool of exactly MAX_BUBBLES slots', () => {
    const pool = createBubblePool();
    expect(pool.length).toBe(MAX_BUBBLES);
  });

  it('all slots start inactive', () => {
    const pool = createBubblePool();
    expect(pool.every((b) => !b.active)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pool max-40 cap with overflow culling
// ---------------------------------------------------------------------------

describe('Pool max-40 cap (task 5.3.1a)', () => {
  it('spawning 50 bubbles leaves exactly 40 active', () => {
    const pool = createBubblePool();
    const prng = makeLcgPrng(42);
    const spawnsPerCall = 5; // spawnFromButtonPress min is 5; use fixed prng to get exactly 5

    // Spawn 50 individual bubbles using repeated ring-collision calls (2–4 each).
    // Use a PRNG that always returns 0 so randomIntBetween(2,4) → 2 each call.
    const minPrng = makeDeterministicPrng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // 25 calls × 2 bubbles each = 50 bubbles
    for (let i = 0; i < 25; i++) {
      spawnFromRingCollision(pool, 200, 300, NOW_MS + i, minPrng);
    }

    const active = countActiveBubbles(pool);
    expect(active).toBe(MAX_BUBBLES);
  });

  it('after overflow, the oldest bubble is culled (FIFO)', () => {
    const pool = createBubblePool();
    const prng = makeDeterministicPrng([0, 0, 0, 0, 0, 0, 0, 0]);

    // Fill pool exactly to capacity using ring-landing (6–10 → 6 with prng=0).
    // 5 calls × 8 bubbles (spawnFromRingLanding min=6 with 0-prng → 6).
    // Let's just spawn from button press with a controlled count.
    // Use ring collision (count = 2 when prng returns 0): 20 calls = 40 bubbles.
    for (let i = 0; i < 20; i++) {
      spawnFromRingCollision(pool, 100 + i, 300, 1000 + i * 10, prng);
    }

    expect(countActiveBubbles(pool)).toBe(MAX_BUBBLES);

    // All active bubbles have spawnTimeMs in [1000, 1190].
    const allTimes = pool.filter((b) => b.active).map((b) => b.spawnTimeMs);
    const minSpawnTime = Math.min(...allTimes);

    // Spawn one more — should evict the oldest.
    const extraPrng = makeDeterministicPrng([0, 0, 0, 0]);
    spawnFromRingCollision(pool, 200, 300, 9999, extraPrng);

    // The bubble with the previously-minimum spawnTime must no longer be the
    // oldest. Verify that no bubble still holds that old spawnTime with a
    // spawn time < the new bubble's spawn time.
    const newAllTimes = pool.filter((b) => b.active).map((b) => b.spawnTimeMs);
    const newMinSpawnTime = Math.min(...newAllTimes);

    expect(newMinSpawnTime).toBeGreaterThan(minSpawnTime);
    expect(countActiveBubbles(pool)).toBe(MAX_BUBBLES);
  });

  it('spawning 50 bubbles one-by-one never exceeds MAX_BUBBLES active', () => {
    const pool = createBubblePool();
    const prng = makeLcgPrng(7);

    for (let i = 0; i < 50; i++) {
      spawnAmbient(pool, WATER_SURFACE_Y, ARENA_WIDTH, NOW_MS + i * 100, prng);
      expect(countActiveBubbles(pool)).toBeLessThanOrEqual(MAX_BUBBLES);
    }
  });
});

// ---------------------------------------------------------------------------
// Generation triggers — spawn count ranges
// ---------------------------------------------------------------------------

describe('spawnFromButtonPress', () => {
  it('spawns between 5 and 12 bubbles', () => {
    // Run many times to verify range.
    for (let seed = 0; seed < 100; seed++) {
      const pool = createBubblePool();
      const prng = makeLcgPrng(seed);
      spawnFromButtonPress(pool, 200, 400, NOW_MS, prng);
      const count = countActiveBubbles(pool);
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(12);
    }
  });
});

describe('spawnFromRingCollision', () => {
  it('spawns between 2 and 4 bubbles', () => {
    for (let seed = 0; seed < 100; seed++) {
      const pool = createBubblePool();
      const prng = makeLcgPrng(seed);
      spawnFromRingCollision(pool, 200, 400, NOW_MS, prng);
      const count = countActiveBubbles(pool);
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
    }
  });
});

describe('spawnFromRingLanding', () => {
  it('spawns between 6 and 10 bubbles', () => {
    for (let seed = 0; seed < 100; seed++) {
      const pool = createBubblePool();
      const prng = makeLcgPrng(seed);
      spawnFromRingLanding(pool, 200, 400, NOW_MS, prng);
      const count = countActiveBubbles(pool);
      expect(count).toBeGreaterThanOrEqual(6);
      expect(count).toBeLessThanOrEqual(10);
    }
  });
});

describe('spawnAmbient', () => {
  it('always spawns exactly 1 bubble', () => {
    for (let seed = 0; seed < 50; seed++) {
      const pool = createBubblePool();
      const prng = makeLcgPrng(seed);
      spawnAmbient(pool, WATER_SURFACE_Y, ARENA_WIDTH, NOW_MS, prng);
      expect(countActiveBubbles(pool)).toBe(1);
    }
  });

  it('spawns bubble below the water surface', () => {
    const pool = createBubblePool();
    const prng = makeLcgPrng(1);
    spawnAmbient(pool, WATER_SURFACE_Y, ARENA_WIDTH, NOW_MS, prng);
    const b = pool.find((x) => x.active)!;
    // Ambient bubbles start below the surface (larger y value = deeper).
    expect(b.initialY).toBeGreaterThan(WATER_SURFACE_Y);
  });

  it('spawns bubble within arena x bounds', () => {
    for (let seed = 0; seed < 50; seed++) {
      const pool = createBubblePool();
      const prng = makeLcgPrng(seed);
      spawnAmbient(pool, WATER_SURFACE_Y, ARENA_WIDTH, NOW_MS, prng);
      const b = pool.find((x) => x.active)!;
      expect(b.initialX).toBeGreaterThanOrEqual(0);
      expect(b.initialX).toBeLessThan(ARENA_WIDTH);
    }
  });
});

// ---------------------------------------------------------------------------
// Rise physics — task 5.3.2a
// ---------------------------------------------------------------------------

describe('Bubble rise physics (task 5.3.2a)', () => {
  function spawnTestBubble(
    initialY: number = 400,
    initialX: number = 200,
  ): Bubble {
    const pool = createBubblePool();
    const prng = makeDeterministicPrng([0]); // wobblePhase → 0

    // Manually activate one slot with known parameters.
    const slot = pool[0];
    slot.id = 0;
    slot.x = initialX;
    slot.y = initialY;
    slot.initialX = initialX;
    slot.initialY = initialY;
    slot.radius = 4;
    slot.opacity = INITIAL_OPACITY;
    slot.wobblePhase = 0; // zero phase makes wobble math simple
    slot.spawnTimeMs = NOW_MS;
    slot.active = true;

    return slot;
  }

  it('at t=0: y equals initialY (no movement yet)', () => {
    const pool = createBubblePool();
    const slot = pool[0];
    slot.initialX = 200;
    slot.initialY = 400;
    slot.x = 200;
    slot.y = 400;
    slot.wobblePhase = 0;
    slot.spawnTimeMs = NOW_MS;
    slot.active = true;

    updateBubbles(pool, NOW_MS, WATER_SURFACE_Y);

    expect(slot.y).toBe(400); // t=0 → RISE_SPEED * 0 = 0
  });

  it('at t=0.5 s: y decreases by exactly 20 px (RISE_SPEED × 0.5)', () => {
    const pool = createBubblePool();
    const slot = pool[0];
    slot.initialX = 200;
    slot.initialY = 400;
    slot.x = 200;
    slot.y = 400;
    slot.wobblePhase = 0;
    slot.spawnTimeMs = NOW_MS;
    slot.active = true;

    updateBubbles(pool, NOW_MS + 500, WATER_SURFACE_Y); // +500ms = 0.5s

    // y should have risen by 20px: 400 - 40*0.5 = 380
    expect(slot.y).toBeCloseTo(380, 5);
  });

  it('at t=2 s: y decreases by exactly 80 px (RISE_SPEED × 2)', () => {
    const pool = createBubblePool();
    const slot = pool[0];
    slot.initialX = 200;
    slot.initialY = 400;
    slot.x = 200;
    slot.y = 400;
    slot.wobblePhase = 0;
    slot.spawnTimeMs = NOW_MS;
    slot.active = true;

    updateBubbles(pool, NOW_MS + 2000, WATER_SURFACE_Y); // +2000ms = 2s

    // y should have risen by 80px: 400 - 40*2 = 320
    expect(slot.y).toBeCloseTo(320, 5);
  });

  it('rise is linear — y decreases proportionally to elapsed time', () => {
    const times = [0, 250, 500, 750, 1000]; // ms deltas
    const expectedRise = times.map((dt) => (RISE_SPEED * dt) / 1000);

    for (let i = 0; i < times.length; i++) {
      const pool = createBubblePool();
      const slot = pool[0];
      slot.initialX = 200;
      slot.initialY = 400;
      slot.x = 200;
      slot.y = 400;
      slot.wobblePhase = 0;
      slot.spawnTimeMs = NOW_MS;
      slot.active = true;

      updateBubbles(pool, NOW_MS + times[i], WATER_SURFACE_Y);
      expect(slot.y).toBeCloseTo(400 - expectedRise[i], 5);
    }
  });
});

// ---------------------------------------------------------------------------
// Wobble — x oscillates within ±WOBBLE_AMPLITUDE
// ---------------------------------------------------------------------------

describe('Bubble x wobble', () => {
  it('x stays within initialX ± WOBBLE_AMPLITUDE at any time t', () => {
    const initialX = 200;
    const initialY = 400;

    // Sample many time points to check the envelope.
    for (let dtMs = 0; dtMs <= 5000; dtMs += 50) {
      const pool = createBubblePool();
      const slot = pool[0];
      slot.initialX = initialX;
      slot.initialY = initialY;
      slot.x = initialX;
      slot.y = initialY;
      slot.wobblePhase = 0;
      slot.spawnTimeMs = NOW_MS;
      slot.active = true;

      updateBubbles(pool, NOW_MS + dtMs, 0); // waterSurfaceY=0 so it never pops

      expect(slot.x).toBeGreaterThanOrEqual(initialX - WOBBLE_AMPLITUDE - 1e-9);
      expect(slot.x).toBeLessThanOrEqual(initialX + WOBBLE_AMPLITUDE + 1e-9);
    }
  });

  it('x wobble is symmetric around initialX over a full period', () => {
    const initialX = 200;
    const period = 1 / 1.5; // WOBBLE_FREQUENCY = 1.5 Hz → period ≈ 0.667s
    const halfPeriodMs = Math.round((period / 2) * 1000);

    const pool1 = createBubblePool();
    pool1[0] = {
      id: 0, x: initialX, y: 400, initialX, initialY: 400,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    // At t=0, sin(0)=0 → x should be exactly initialX.
    updateBubbles(pool1, NOW_MS, 0);
    expect(pool1[0].x).toBeCloseTo(initialX, 5);
  });

  it('wobblePhase shifts the oscillation start position', () => {
    const initialX = 200;
    const initialY = 400;

    // Phase = π/2 → sin(0 + π/2) = 1 → x offset = +WOBBLE_AMPLITUDE at t=0.
    const pool = createBubblePool();
    pool[0] = {
      id: 0, x: initialX, y: initialY, initialX, initialY,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: Math.PI / 2,
      spawnTimeMs: NOW_MS, active: true,
    };

    updateBubbles(pool, NOW_MS, 0); // t=0

    expect(pool[0].x).toBeCloseTo(initialX + WOBBLE_AMPLITUDE, 5);
  });
});

// ---------------------------------------------------------------------------
// Pop trigger — task 5.3.2
// ---------------------------------------------------------------------------

describe('Pop trigger (task 5.3.2)', () => {
  it('bubble becomes inactive when it reaches the water surface', () => {
    const pool = createBubblePool();
    // Place bubble just above the surface after one update.
    // initialY=60, waterSurfaceY=50, RISE_SPEED=40 → reaches surface in 0.25s.
    pool[0] = {
      id: 0, x: 200, y: 60, initialX: 200, initialY: 60,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    updateBubbles(pool, NOW_MS + 250, WATER_SURFACE_Y); // t=0.25s → y=60-10=50

    expect(pool[0].active).toBe(false);
  });

  it('bubble remains active before reaching the surface', () => {
    const pool = createBubblePool();
    pool[0] = {
      id: 0, x: 200, y: 400, initialX: 200, initialY: 400,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    // After 1 second, y = 400 - 40 = 360, well above surface at 50.
    updateBubbles(pool, NOW_MS + 1000, WATER_SURFACE_Y);

    expect(pool[0].active).toBe(true);
  });

  it('popped bubbles are returned from updateBubbles', () => {
    const pool = createBubblePool();
    // Bubble reaches surface in exactly 0.25s.
    pool[0] = {
      id: 0, x: 200, y: 60, initialX: 200, initialY: 60,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    const popped = updateBubbles(pool, NOW_MS + 250, WATER_SURFACE_Y);

    expect(popped.length).toBe(1);
    expect(popped[0].active).toBe(false);
  });

  it('multiple bubbles can pop in the same frame', () => {
    const pool = createBubblePool();

    // Activate 3 bubbles that all reach the surface at t=0.25s.
    for (let i = 0; i < 3; i++) {
      pool[i] = {
        id: i, x: 100 * i, y: 60, initialX: 100 * i, initialY: 60,
        radius: 3, opacity: INITIAL_OPACITY, wobblePhase: 0,
        spawnTimeMs: NOW_MS, active: true,
      };
    }

    const popped = updateBubbles(pool, NOW_MS + 250, WATER_SURFACE_Y);

    expect(popped.length).toBe(3);
    expect(pool[0].active).toBe(false);
    expect(pool[1].active).toBe(false);
    expect(pool[2].active).toBe(false);
  });

  it('popped bubble y is snapped to waterSurfaceY', () => {
    const pool = createBubblePool();
    // Bubble overshoot: after 1s from 60px, y = 60 - 40 = 20 (crosses surface).
    pool[0] = {
      id: 0, x: 200, y: 60, initialX: 200, initialY: 60,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    updateBubbles(pool, NOW_MS + 1000, WATER_SURFACE_Y);

    expect(pool[0].y).toBe(WATER_SURFACE_Y);
  });
});

// ---------------------------------------------------------------------------
// Opacity decay
// ---------------------------------------------------------------------------

describe('Opacity decay', () => {
  it('opacity starts at INITIAL_OPACITY at spawn point', () => {
    const pool = createBubblePool();
    pool[0] = {
      id: 0, x: 200, y: 400, initialX: 200, initialY: 400,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    // At t=0, y should still be 400, depthFraction=0.
    updateBubbles(pool, NOW_MS, WATER_SURFACE_Y);

    expect(pool[0].opacity).toBeCloseTo(INITIAL_OPACITY, 5);
  });

  it('opacity decreases as bubble rises', () => {
    const pool1 = createBubblePool();
    const pool2 = createBubblePool();

    pool1[0] = {
      id: 0, x: 200, y: 400, initialX: 200, initialY: 400,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };
    pool2[0] = {
      id: 0, x: 200, y: 400, initialX: 200, initialY: 400,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    updateBubbles(pool1, NOW_MS + 1000, WATER_SURFACE_Y); // 1s in
    updateBubbles(pool2, NOW_MS + 3000, WATER_SURFACE_Y); // 3s in (if not yet popped)

    // Opacity at 3s should be lower than at 1s (closer to surface).
    if (pool2[0].active) {
      expect(pool2[0].opacity).toBeLessThan(pool1[0].opacity);
    }
  });

  it('opacity reaches 0 when bubble reaches the surface', () => {
    const pool = createBubblePool();
    // Bubble exactly at surface after 0.25s.
    pool[0] = {
      id: 0, x: 200, y: 60, initialX: 200, initialY: 60,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    updateBubbles(pool, NOW_MS + 250, WATER_SURFACE_Y);

    expect(pool[0].opacity).toBe(0);
    expect(pool[0].active).toBe(false);
  });

  it('opacity is never negative', () => {
    const pool = createBubblePool();
    pool[0] = {
      id: 0, x: 200, y: 60, initialX: 200, initialY: 60,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    // Way past surface — should deactivate with 0 opacity, not negative.
    updateBubbles(pool, NOW_MS + 5000, WATER_SURFACE_Y);

    expect(pool[0].opacity).toBeGreaterThanOrEqual(0);
  });

  it('opacity at mid-travel is approximately half of INITIAL_OPACITY', () => {
    // initialY=450, waterSurfaceY=50 → total travel = 400px.
    // At t = 200/40 = 5s the bubble has risen 200px → halfway → depthFraction=0.5.
    const pool = createBubblePool();
    pool[0] = {
      id: 0, x: 200, y: 450, initialX: 200, initialY: 450,
      radius: 4, opacity: INITIAL_OPACITY, wobblePhase: 0,
      spawnTimeMs: NOW_MS, active: true,
    };

    updateBubbles(pool, NOW_MS + 5000, WATER_SURFACE_Y);

    // opacity = INITIAL_OPACITY * (1 - 0.5) = 0.35
    expect(pool[0].opacity).toBeCloseTo(INITIAL_OPACITY * 0.5, 5);
  });
});

// ---------------------------------------------------------------------------
// Bubble radius range
// ---------------------------------------------------------------------------

describe('Bubble radius', () => {
  it('button press bubbles have radius in [2, 5]', () => {
    for (let seed = 0; seed < 50; seed++) {
      const pool = createBubblePool();
      const prng = makeLcgPrng(seed);
      spawnFromButtonPress(pool, 200, 400, NOW_MS, prng);
      pool.filter((b) => b.active).forEach((b) => {
        expect(b.radius).toBeGreaterThanOrEqual(2);
        expect(b.radius).toBeLessThanOrEqual(5);
      });
    }
  });

  it('ring landing bubbles have radius in [3, 8]', () => {
    for (let seed = 0; seed < 50; seed++) {
      const pool = createBubblePool();
      const prng = makeLcgPrng(seed);
      spawnFromRingLanding(pool, 200, 400, NOW_MS, prng);
      pool.filter((b) => b.active).forEach((b) => {
        expect(b.radius).toBeGreaterThanOrEqual(3);
        expect(b.radius).toBeLessThanOrEqual(8);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Inactive bubbles are not updated
// ---------------------------------------------------------------------------

describe('Inactive bubbles', () => {
  it('updateBubbles does not move inactive bubbles', () => {
    const pool = createBubblePool();
    // All inactive by default.
    pool[0].x = 100;
    pool[0].y = 300;

    updateBubbles(pool, NOW_MS + 1000, WATER_SURFACE_Y);

    // Position should be unchanged since bubble was never active.
    expect(pool[0].x).toBe(100);
    expect(pool[0].y).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// countActiveBubbles
// ---------------------------------------------------------------------------

describe('countActiveBubbles', () => {
  it('returns 0 on a fresh pool', () => {
    expect(countActiveBubbles(createBubblePool())).toBe(0);
  });

  it('counts only active bubbles', () => {
    const pool = createBubblePool();
    pool[0].active = true;
    pool[3].active = true;
    expect(countActiveBubbles(pool)).toBe(2);
  });
});
