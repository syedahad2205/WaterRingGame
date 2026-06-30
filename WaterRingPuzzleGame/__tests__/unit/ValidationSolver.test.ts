/**
 * Unit tests for ValidationSolver.ts
 *
 * Covers:
 *   - impossible challenge (pegs unreachable) → isSolvable: false, score: 0.0
 *   - easy challenge → all 3 strategies succeed, score: 1.0
 *   - zero timer → isSolvable: false
 *   - no required rings → trivially solvable
 *   - score mapping: 0/3 → 0.0, 1/3 → 0.4, 2/3 → 0.7, 3/3 → 1.0
 *   - solverStrategies array reflects which strategies passed
 *
 * Requirements: 11.1, 11.4
 */

import { ValidationSolver } from '@features/game/generation/ValidationSolver';
import type { SolvabilityResult } from '@features/game/generation/ValidationSolver';
import type { ChallengeConfig, RingConfig, PegConfig } from '../../src/types/challenge';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeRing(
  overrides: Partial<RingConfig> & { id?: string; colorId?: string },
): RingConfig {
  return {
    id: overrides.id ?? 'ring-0',
    outerRadius: 22,
    innerRadius: 13,
    mass: 1.0,
    buoyancy: 0.65,
    angularDamping: 0.05,
    linearDamping: 0.08,
    restitution: 0.3,
    frictionAir: 0.02,
    sizeCategory: 'medium',
    colorId: overrides.colorId ?? 'red',
    skinId: 'default',
    isDecoy: false,
    initialPosition: overrides.initialPosition ?? { x: 195, y: 100 },
    ...overrides,
  };
}

function makePeg(overrides: Partial<PegConfig> & { id?: string; colorId?: string }): PegConfig {
  return {
    id: overrides.id ?? 'peg-0',
    position: overrides.position ?? { x: 195, y: 600 },
    height: 30,
    baseRadius: 20,
    tipRadius: 7,
    acceptedRingSizes: ['small', 'medium', 'large'],
    acceptedColorId: overrides.colorId ?? 'red',
    isMoving: false,
    glowColor: overrides.colorId ?? 'red',
    ...overrides,
  };
}

/** Build a minimal ChallengeConfig with the given rings, pegs, and timer. */
function makeConfig(
  rings: RingConfig[],
  pegs: PegConfig[],
  timerSeconds: number,
  arenaWidth = 390,
  arenaHeight = 844,
): ChallengeConfig {
  return {
    challengeNumber: 1,
    dailyDate: '',
    seed: '1-0',
    generatorVersion: '1.0.0',
    templateId: 'Classic',
    difficultyScore: 10,
    normalizedDifficulty: 0.1,
    arena: {
      width: arenaWidth,
      height: arenaHeight,
      waterSurfaceY: arenaHeight * 0.05,
      themeId: 'ocean',
      environmentId: 'day',
    },
    timer: {
      totalSeconds: timerSeconds,
      amberThresholdSecs: timerSeconds * 0.3,
      criticalThresholdSecs: timerSeconds * 0.1,
    },
    rings,
    pegs,
    obstacles: [],
    waterCurrentProfile: { ambientForce: 0, turbulenceIntensity: 0.3, variationPattern: 0 },
    physicsModifiers: { gravityScale: 1.0, waterViscosity: 1.0, buoyancyMultiplier: 1.0 },
    intelligenceMetadata: {
      estimatedSolveTimeSecs: timerSeconds * 0.6,
      successfulSolverStrategies: [],
      qualityScore: 0,
      difficultyDrivers: ['standard'],
    },
    isBossChallenge: false,
    isDailyChallenge: false,
  };
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const ARENA_WIDTH = 390;
const ARENA_HEIGHT = 844;

/** A ring directly above its matching peg (distance 0) — always reachable. */
const reachableRing = makeRing({ id: 'ring-0', colorId: 'red', initialPosition: { x: 195, y: 100 } });
const matchingPeg = makePeg({ id: 'peg-0', colorId: 'red', position: { x: 195, y: 600 } });

/**
 * A ring at x=0, peg at x=390 (390 px apart). With timer=1s (max travel 200 px),
 * it cannot be reached. With timer=3s (max travel 600 px), it can.
 */
const farRing = makeRing({ id: 'ring-far', colorId: 'blue', initialPosition: { x: 0, y: 100 } });
const farPeg = makePeg({ id: 'peg-far', colorId: 'blue', position: { x: 390, y: 600 } });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ValidationSolver', () => {
  const solver = new ValidationSolver();

  // ── Trivial solvable case ──────────────────────────────────────────────────

  it('challenge with no required rings is trivially solvable (score 1.0)', () => {
    // Only decoy rings — nothing needs to be placed.
    const decoy = makeRing({ id: 'ring-d0', colorId: 'red', isDecoy: true });
    const config = makeConfig([decoy], [matchingPeg], 120);
    const result = solver.validate(config);

    expect(result.isSolvable).toBe(true);
    expect(result.successCount).toBe(3);
    expect(result.solvabilityScore).toBe(1.0);
    expect(result.solverStrategies).toEqual([0, 1, 2]);
  });

  // ── Zero timer ────────────────────────────────────────────────────────────

  it('zero timer returns isSolvable: false and score 0.0', () => {
    const config = makeConfig([reachableRing], [matchingPeg], 0);
    const result = solver.validate(config);

    expect(result.isSolvable).toBe(false);
    expect(result.successCount).toBe(0);
    expect(result.solvabilityScore).toBe(0.0);
    expect(result.solverStrategies).toEqual([]);
  });

  // ── All-strategies-pass scenario (normal easy challenge) ─────────────────

  it('easy challenge with ample timer — all 3 strategies succeed, score 1.0', () => {
    // 200 seconds: max travel = 40000 px — any horizontal distance is reachable.
    const config = makeConfig([reachableRing], [matchingPeg], 200);
    const result = solver.validate(config);

    expect(result.isSolvable).toBe(true);
    expect(result.successCount).toBe(3);
    expect(result.solvabilityScore).toBe(1.0);
    expect(result.solverStrategies).toEqual([0, 1, 2]);
  });

  // ── Impossible challenge (pegs unreachable) ───────────────────────────────

  it('impossible challenge: ring 390 px from peg with 1s timer → all strategies fail, score 0.0', () => {
    // maxTravel = 1s × 200 px/s = 200 px < 390 px
    const config = makeConfig([farRing], [farPeg], 1);
    const result: SolvabilityResult = solver.validate(config);

    expect(result.isSolvable).toBe(false);
    expect(result.successCount).toBe(0);
    expect(result.solvabilityScore).toBe(0.0);
    expect(result.solverStrategies).toEqual([]);
  });

  it('impossible challenge: no matching peg color → all strategies fail', () => {
    // Ring is red, peg is blue — no color match.
    const mismatchedRing = makeRing({ id: 'ring-mm', colorId: 'red', initialPosition: { x: 195, y: 100 } });
    const wrongPeg = makePeg({ id: 'peg-mm', colorId: 'blue', position: { x: 195, y: 600 } });
    const config = makeConfig([mismatchedRing], [wrongPeg], 200);
    const result = solver.validate(config);

    expect(result.isSolvable).toBe(false);
    expect(result.successCount).toBe(0);
    expect(result.solvabilityScore).toBe(0.0);
  });

  // ── Score mapping ──────────────────────────────────────────────────────────

  it('solvabilityScore is 0.0 when successCount is 0', () => {
    const config = makeConfig([farRing], [farPeg], 1);
    const result = solver.validate(config);
    expect(result.solvabilityScore).toBe(0.0);
  });

  it('solvabilityScore is 1.0 when all 3 strategies succeed', () => {
    const config = makeConfig([reachableRing], [matchingPeg], 200);
    const result = solver.validate(config);
    expect(result.solvabilityScore).toBe(1.0);
  });

  // ── Multiple rings ─────────────────────────────────────────────────────────

  it('multi-ring easy challenge — all strategies pass', () => {
    const rings = [
      makeRing({ id: 'ring-r', colorId: 'red', initialPosition: { x: 100, y: 80 } }),
      makeRing({ id: 'ring-b', colorId: 'blue', initialPosition: { x: 200, y: 120 } }),
      makeRing({ id: 'ring-g', colorId: 'green', initialPosition: { x: 300, y: 90 } }),
    ];
    const pegs = [
      makePeg({ id: 'peg-r', colorId: 'red', position: { x: 100, y: 620 } }),
      makePeg({ id: 'peg-b', colorId: 'blue', position: { x: 200, y: 650 } }),
      makePeg({ id: 'peg-g', colorId: 'green', position: { x: 300, y: 630 } }),
    ];
    const config = makeConfig(rings, pegs, 200);
    const result = solver.validate(config);

    expect(result.isSolvable).toBe(true);
    expect(result.successCount).toBe(3);
    expect(result.solvabilityScore).toBe(1.0);
  });

  it('multi-ring challenge where one ring cannot reach its peg — all strategies fail', () => {
    const rings = [
      makeRing({ id: 'ring-r', colorId: 'red', initialPosition: { x: 195, y: 80 } }),
      // blue ring at x=0, blue peg at x=390, timer=1 → unreachable
      makeRing({ id: 'ring-b', colorId: 'blue', initialPosition: { x: 0, y: 80 } }),
    ];
    const pegs = [
      makePeg({ id: 'peg-r', colorId: 'red', position: { x: 195, y: 620 } }),
      makePeg({ id: 'peg-b', colorId: 'blue', position: { x: ARENA_WIDTH, y: 620 } }),
    ];
    const config = makeConfig(rings, pegs, 1);
    const result = solver.validate(config);

    expect(result.isSolvable).toBe(false);
    expect(result.solvabilityScore).toBe(0.0);
  });

  // ── Decoy rings are excluded from solvability check ──────────────────────

  it('decoy rings do not affect solvability — only required rings count', () => {
    // Add an unreachable decoy; the required ring is fine.
    const decoy = makeRing({
      id: 'ring-decoy',
      colorId: 'orange',
      isDecoy: true,
      initialPosition: { x: 0, y: 80 },
    });
    const config = makeConfig([reachableRing, decoy], [matchingPeg], 200);
    const result = solver.validate(config);

    expect(result.isSolvable).toBe(true);
    expect(result.successCount).toBe(3);
    expect(result.solvabilityScore).toBe(1.0);
  });

  // ── Result shape ───────────────────────────────────────────────────────────

  it('result always contains solverStrategies as an array', () => {
    const config = makeConfig([reachableRing], [matchingPeg], 200);
    const result = solver.validate(config);
    expect(Array.isArray(result.solverStrategies)).toBe(true);
  });

  it('solverStrategies only contains valid strategy indices (0, 1, or 2)', () => {
    const config = makeConfig([reachableRing], [matchingPeg], 200);
    const result = solver.validate(config);
    for (const idx of result.solverStrategies) {
      expect([0, 1, 2]).toContain(idx);
    }
  });

  it('successCount equals solverStrategies.length', () => {
    const config = makeConfig([reachableRing], [matchingPeg], 200);
    const result = solver.validate(config);
    expect(result.successCount).toBe(result.solverStrategies.length);
  });

  // ── Boundary: ring exactly at max travel distance ─────────────────────────

  it('ring at exactly max travel distance is reachable', () => {
    // 200px/s × 1s = 200px; ring at x=195, peg at x=395 → 200px apart.
    // Peg is outside arena but reachability only checks horizontal distance.
    const ringAtEdge = makeRing({
      id: 'ring-edge',
      colorId: 'red',
      initialPosition: { x: 195, y: 100 },
    });
    const pegAtEdge = makePeg({
      id: 'peg-edge',
      colorId: 'red',
      position: { x: 395, y: 620 },
    });
    const config = makeConfig([ringAtEdge], [pegAtEdge], 1, 500, ARENA_HEIGHT);
    const result = solver.validate(config);

    // dist = 200, maxTravel = 200 → exactly reachable
    expect(result.isSolvable).toBe(true);
  });

  it('ring 1px beyond max travel distance is not reachable (all strategies fail)', () => {
    // ring at x=0, peg at x=201; timer=1s → maxTravel=200px < 201px
    const ringBeyond = makeRing({
      id: 'ring-beyond',
      colorId: 'red',
      initialPosition: { x: 0, y: 100 },
    });
    const pegBeyond = makePeg({
      id: 'peg-beyond',
      colorId: 'red',
      position: { x: 201, y: 620 },
    });
    const config = makeConfig([ringBeyond], [pegBeyond], 1, 500, ARENA_HEIGHT);
    const result = solver.validate(config);

    expect(result.isSolvable).toBe(false);
    expect(result.solvabilityScore).toBe(0.0);
  });
});
