/**
 * PhysicsBenchmarkRunner.ts
 *
 * Thin Matter.js runner used exclusively for the 1-second device performance
 * benchmark. Lives inside the physics folder so Matter.js can be imported
 * directly without violating the `import/no-restricted-paths` ESLint rule
 * (Requirement 2.3: only src/features/game/physics/ may import matter-js).
 *
 * Algorithm:
 *   1. Create a minimal Matter.js world (no gravity, 5 circles of radius 22px)
 *   2. Record start time with performance.now()
 *   3. Run 60 iterations of Matter.Engine.update(engine, 16.67)
 *   4. Record end time
 *   5. Destroy the world
 *   6. Return elapsed milliseconds
 *
 * Requirements: 24.3, 44.4
 */

import Matter from 'matter-js';

/** Number of physics ticks to run in the benchmark. */
const BENCHMARK_TICK_COUNT = 60;

/** Fixed timestep in milliseconds (60 Hz). */
const FIXED_TIMESTEP_MS = 16.67;

/** Radius of the benchmark test rings (small ring size from design spec). */
const BENCHMARK_RING_RADIUS = 22;

/** Number of test rings to simulate. */
const BENCHMARK_RING_COUNT = 5;

/** Arena width used for ring placement (arbitrary, representative). */
const ARENA_WIDTH = 400;

/** Arena height used for ring placement. */
const ARENA_HEIGHT = 700;

/**
 * Run 60 physics ticks with 5 rings and return the wall-clock duration in ms.
 *
 * This function is synchronous — it blocks the calling thread for the
 * duration of the benchmark (typically < 100ms even on low-end devices).
 * Call it once at app start before the UI is interactive.
 */
export function runPhysicsBenchmarkTicks(): number {
  const engine = createBenchmarkEngine();

  const start = performance.now();

  for (let i = 0; i < BENCHMARK_TICK_COUNT; i++) {
    Matter.Engine.update(engine, FIXED_TIMESTEP_MS);
  }

  const end = performance.now();

  Matter.World.clear(engine.world, false);
  Matter.Engine.clear(engine);

  return end - start;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createBenchmarkEngine(): Matter.Engine {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 0, scale: 0.001 },
    positionIterations: 6,
    velocityIterations: 4,
    constraintIterations: 2,
  });

  const rings = createBenchmarkRings();
  Matter.World.add(engine.world, rings);

  return engine;
}

function createBenchmarkRings(): Matter.Body[] {
  const rings: Matter.Body[] = [];
  const spacing = ARENA_WIDTH / (BENCHMARK_RING_COUNT + 1);

  for (let i = 0; i < BENCHMARK_RING_COUNT; i++) {
    const x = spacing * (i + 1);
    const y = ARENA_HEIGHT / 2;
    const ring = Matter.Bodies.circle(x, y, BENCHMARK_RING_RADIUS, {
      mass: 0.5,
      restitution: 0.3,
      frictionAir: 0.02,
    });
    rings.push(ring);
  }

  return rings;
}
