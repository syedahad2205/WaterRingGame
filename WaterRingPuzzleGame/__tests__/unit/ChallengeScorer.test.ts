/**
 * Unit tests for ChallengeScorer.ts and QualityEvaluator.ts
 *
 * Covers:
 *   - scoreChallenge returns overall >= 0.65 for normal/easy challenges
 *   - unsolvable challenge has low overall score (fails threshold)
 *   - all component scores are in [0.0, 1.0]
 *   - meetsThreshold = (overall >= 0.65)
 *   - variety and pacing scores are computed from challenge configuration
 *   - QualityEvaluator.evaluate produces consistent results
 *   - quality formula weights sum to 1.0 and are applied correctly
 *
 * Requirements: 11.1, 11.5
 */

import { scoreChallenge, QUALITY_THRESHOLD } from '@features/game/generation/ChallengeScorer';
import type { ChallengeQualityScore } from '@features/game/generation/ChallengeScorer';
import { ValidationSolver } from '@features/game/generation/ValidationSolver';
import { QualityEvaluator, evaluateChallenge } from '@features/game/generation/QualityEvaluator';
import { generateChallenge } from '@features/game/generation/ChallengeGenerator';
import type { ChallengeConfig, RingConfig, PegConfig } from '../../src/types/challenge';
import type { SolvabilityResult } from '@features/game/generation/ValidationSolver';

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

function makePeg(overrides: Partial<PegConfig> & { colorId?: string }): PegConfig {
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

function makeConfig(
  rings: RingConfig[],
  pegs: PegConfig[],
  timerSeconds: number,
  nd = 0.2,
  estimatedSolveSecs?: number,
  arenaWidth = 390,
  arenaHeight = 844,
): ChallengeConfig {
  const solveSecs = estimatedSolveSecs ?? timerSeconds * 0.65;
  return {
    challengeNumber: 1,
    dailyDate: '',
    seed: '1-0',
    generatorVersion: '1.0.0',
    templateId: 'Classic',
    difficultyScore: nd * 100,
    normalizedDifficulty: nd,
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
      estimatedSolveTimeSecs: solveSecs,
      successfulSolverStrategies: [],
      qualityScore: 0,
      difficultyDrivers: ['standard'],
    },
    isBossChallenge: false,
    isDailyChallenge: false,
  };
}

/** Pre-baked solvability result for a fully solvable challenge. */
const FULLY_SOLVABLE: SolvabilityResult = {
  isSolvable: true,
  successCount: 3,
  solvabilityScore: 1.0,
  solverStrategies: [0, 1, 2],
};

/** Pre-baked solvability result for an unsolvable challenge. */
const UNSOLVABLE: SolvabilityResult = {
  isSolvable: false,
  successCount: 0,
  solvabilityScore: 0.0,
  solverStrategies: [],
};

/** Pre-baked solvability result for a barely solvable challenge (1/3). */
const BARELY_SOLVABLE: SolvabilityResult = {
  isSolvable: true,
  successCount: 1,
  solvabilityScore: 0.4,
  solverStrategies: [2],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('QUALITY_THRESHOLD', () => {
  it('is 0.65', () => {
    expect(QUALITY_THRESHOLD).toBe(0.65);
  });
});

describe('scoreChallenge()', () => {
  // ── Easy normal challenge passes threshold ──────────────────────────────────

  it('easy solvable challenge (3/3 strategies) meets quality threshold', () => {
    const ring = makeRing({ colorId: 'red', initialPosition: { x: 195, y: 100 } });
    const peg = makePeg({ colorId: 'red', position: { x: 195, y: 600 } });
    // estimatedSolveTime = 65% of 120s = 78s → utilRatio 0.65 (in ideal 0.5-0.8 range)
    const config = makeConfig([ring], [peg], 120, 0.2, 78);
    const result: ChallengeQualityScore = scoreChallenge(config, FULLY_SOLVABLE);

    expect(result.overall).toBeGreaterThanOrEqual(QUALITY_THRESHOLD);
    expect(result.meetsThreshold).toBe(true);
  });

  it('overall score for easy challenge is between 0.0 and 1.0', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const config = makeConfig([ring], [peg], 120);
    const result = scoreChallenge(config, FULLY_SOLVABLE);

    expect(result.overall).toBeGreaterThanOrEqual(0.0);
    expect(result.overall).toBeLessThanOrEqual(1.0);
  });

  // ── Unsolvable challenge fails threshold ────────────────────────────────────

  it('unsolvable challenge (0/3 strategies) does NOT meet quality threshold', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const config = makeConfig([ring], [peg], 120);
    const result = scoreChallenge(config, UNSOLVABLE);

    // solvability = 0.0; best case other components contribute:
    // 0.25 * fun(≤1) + 0.20 * fairness(≤1) + 0.15 * 0.8 + 0.10 * 0.8 = max 0.70
    // But solvability = 0, so overall <= 0.25 + 0.20 + 0.12 + 0.08 = 0.65
    // In practice fun < 1 so overall < 0.65 → fails
    expect(result.solvability).toBe(0.0);
    expect(result.meetsThreshold).toBe(false);
  });

  // ── Component scores are in [0, 1] ──────────────────────────────────────────

  it('all component scores are in [0.0, 1.0]', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const config = makeConfig([ring], [peg], 120);
    const result = scoreChallenge(config, FULLY_SOLVABLE);

    expect(result.solvability).toBeGreaterThanOrEqual(0);
    expect(result.solvability).toBeLessThanOrEqual(1);
    expect(result.fun).toBeGreaterThanOrEqual(0);
    expect(result.fun).toBeLessThanOrEqual(1);
    expect(result.fairness).toBeGreaterThanOrEqual(0);
    expect(result.fairness).toBeLessThanOrEqual(1);
    expect(result.variety).toBeGreaterThanOrEqual(0);
    expect(result.variety).toBeLessThanOrEqual(1);
    expect(result.pacing).toBeGreaterThanOrEqual(0);
    expect(result.pacing).toBeLessThanOrEqual(1);
  });

  // ── Placeholders ─────────────────────────────────────────────────────────────

  it('variety score reflects intrinsic challenge diversity', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const config = makeConfig([ring], [peg], 120);
    const result = scoreChallenge(config, FULLY_SOLVABLE);

    // A simple Classic config with 1 ring and no obstacles scores lower on variety.
    expect(result.variety).toBeGreaterThanOrEqual(0.0);
    expect(result.variety).toBeLessThanOrEqual(1.0);
    expect(result.variety).toBeLessThan(0.8); // no longer inflated placeholder
  });

  it('pacing score reflects timer headroom and ring count balance', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const config = makeConfig([ring], [peg], 120);
    const result = scoreChallenge(config, FULLY_SOLVABLE);

    expect(result.pacing).toBeGreaterThanOrEqual(0.0);
    expect(result.pacing).toBeLessThanOrEqual(1.0);
  });

  // ── meetsThreshold reflects overall vs QUALITY_THRESHOLD ─────────────────

  it('meetsThreshold is true exactly when overall >= 0.65', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const config = makeConfig([ring], [peg], 120);
    const result = scoreChallenge(config, FULLY_SOLVABLE);

    expect(result.meetsThreshold).toBe(result.overall >= QUALITY_THRESHOLD);
  });

  // ── Solvability component directly maps SolvabilityResult ────────────────

  it('solvability component equals solverResult.solvabilityScore', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const config = makeConfig([ring], [peg], 120);

    for (const sr of [FULLY_SOLVABLE, BARELY_SOLVABLE, UNSOLVABLE]) {
      const result = scoreChallenge(config, sr);
      expect(result.solvability).toBe(sr.solvabilityScore);
    }
  });

  // ── Quality formula weights ──────────────────────────────────────────────

  it('overall equals weighted sum of components', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const config = makeConfig([ring], [peg], 120);
    const result = scoreChallenge(config, FULLY_SOLVABLE);

    const expected =
      0.30 * result.solvability +
      0.25 * result.fun +
      0.20 * result.fairness +
      0.15 * result.variety +
      0.10 * result.pacing;

    expect(result.overall).toBeCloseTo(expected, 8);
  });

  // ── Timer utilization ─────────────────────────────────────────────────────

  it('fun score is higher when estimatedSolveTime is in ideal range (50-80% of timer)', () => {
    const ring = makeRing({ colorId: 'red' });
    const peg = makePeg({ colorId: 'red' });
    const timer = 120;

    // Ideal: 65% = 78s
    const configIdeal = makeConfig([ring], [peg], timer, 0.2, 78);
    // Poor: 10% = 12s (way below ideal)
    const configPoor = makeConfig([ring], [peg], timer, 0.2, 12);

    const ideal = scoreChallenge(configIdeal, FULLY_SOLVABLE);
    const poor = scoreChallenge(configPoor, FULLY_SOLVABLE);

    expect(ideal.fun).toBeGreaterThan(poor.fun);
  });

  // ── Ring count influence on fun ──────────────────────────────────────────

  it('more required rings increases fun score (up to 4)', () => {
    const makeMultiRingConfig = (ringCount: number): ChallengeConfig => {
      const rings = Array.from({ length: ringCount }, (_, i) =>
        makeRing({ id: `ring-${i}`, colorId: `color-${i}`, initialPosition: { x: 60 + i * 60, y: 100 } }),
      );
      const pegs = Array.from({ length: ringCount }, (_, i) =>
        makePeg({ id: `peg-${i}`, colorId: `color-${i}`, position: { x: 60 + i * 60, y: 620 } }),
      );
      return makeConfig(rings, pegs, 180, 0.3, 110);
    };

    const one = scoreChallenge(makeMultiRingConfig(1), FULLY_SOLVABLE);
    const four = scoreChallenge(makeMultiRingConfig(4), FULLY_SOLVABLE);

    expect(four.fun).toBeGreaterThan(one.fun);
  });

  // ── Size variety influence on fun ────────────────────────────────────────

  it('more size tiers among required rings increases fun score', () => {
    const peg1 = makePeg({ id: 'peg-s', colorId: 'red', position: { x: 100, y: 620 } });
    const peg2 = makePeg({ id: 'peg-m', colorId: 'blue', position: { x: 200, y: 620 } });
    const peg3 = makePeg({ id: 'peg-l', colorId: 'green', position: { x: 300, y: 620 } });

    // Single size tier
    const ringsOneTier = [
      makeRing({ id: 'r0', colorId: 'red', sizeCategory: 'medium', initialPosition: { x: 100, y: 100 } }),
      makeRing({ id: 'r1', colorId: 'blue', sizeCategory: 'medium', initialPosition: { x: 200, y: 100 } }),
      makeRing({ id: 'r2', colorId: 'green', sizeCategory: 'medium', initialPosition: { x: 300, y: 100 } }),
    ];

    // Three size tiers
    const ringsThreeTiers = [
      makeRing({ id: 'r0', colorId: 'red', sizeCategory: 'small', initialPosition: { x: 100, y: 100 } }),
      makeRing({ id: 'r1', colorId: 'blue', sizeCategory: 'medium', initialPosition: { x: 200, y: 100 } }),
      makeRing({ id: 'r2', colorId: 'green', sizeCategory: 'large', initialPosition: { x: 300, y: 100 } }),
    ];

    const configOneTier = makeConfig(ringsOneTier, [peg1, peg2, peg3], 180, 0.3, 110);
    const configThreeTiers = makeConfig(ringsThreeTiers, [peg1, peg2, peg3], 180, 0.3, 110);

    const scoreOneTier = scoreChallenge(configOneTier, FULLY_SOLVABLE);
    const scoreThreeTiers = scoreChallenge(configThreeTiers, FULLY_SOLVABLE);

    expect(scoreThreeTiers.fun).toBeGreaterThan(scoreOneTier.fun);
  });

  // ── Fairness ──────────────────────────────────────────────────────────────

  it('fairness score is higher when all pegs are within arena bounds', () => {
    const ring = makeRing({ colorId: 'red', initialPosition: { x: 195, y: 100 } });

    // Peg within arena
    const pegIn = makePeg({ colorId: 'red', position: { x: 195, y: 620 } });
    const configIn = makeConfig([ring], [pegIn], 120);

    // Peg outside arena (x > arenaWidth)
    const pegOut = makePeg({ colorId: 'red', position: { x: 500, y: 620 } });
    const configOut = makeConfig([ring], [pegOut], 120);

    const scoreIn = scoreChallenge(configIn, FULLY_SOLVABLE);
    const scoreOut = scoreChallenge(configOut, FULLY_SOLVABLE);

    expect(scoreIn.fairness).toBeGreaterThan(scoreOut.fairness);
  });

  // ── Integration with generated challenges ───────────────────────────────

  it('generated challenges at low difficulty have overall >= 0.65', () => {
    const solver = new ValidationSolver();
    for (const n of [1, 5, 10, 20, 50]) {
      const config = generateChallenge(n);
      const solverResult = solver.validate(config);

      if (solverResult.isSolvable) {
        const score = scoreChallenge(config, solverResult);
        expect(score.overall).toBeGreaterThanOrEqual(QUALITY_THRESHOLD);
      }
    }
  });
});

// ─── QualityEvaluator ────────────────────────────────────────────────────────

describe('evaluateChallenge()', () => {
  it('returns solvability and quality for an easy config', () => {
    const ring = makeRing({ colorId: 'red', initialPosition: { x: 195, y: 100 } });
    const peg = makePeg({ colorId: 'red', position: { x: 195, y: 600 } });
    const config = makeConfig([ring], [peg], 200);
    const result = evaluateChallenge(config);

    expect(result.solvability).toBeDefined();
    expect(result.quality).toBeDefined();
    expect(typeof result.isAccepted).toBe('boolean');
  });

  it('isAccepted is true when solvable AND quality meets threshold', () => {
    const ring = makeRing({ colorId: 'red', initialPosition: { x: 195, y: 100 } });
    const peg = makePeg({ colorId: 'red', position: { x: 195, y: 600 } });
    const config = makeConfig([ring], [peg], 200, 0.1, 120);
    const result = evaluateChallenge(config);

    expect(result.isAccepted).toBe(result.solvability.isSolvable && result.quality.meetsThreshold);
  });

  it('isAccepted is false for an impossible challenge', () => {
    // ring at x=0, peg at x=390, timer=1s → impossible
    const ring = makeRing({ colorId: 'red', initialPosition: { x: 0, y: 100 } });
    const peg = makePeg({ colorId: 'red', position: { x: 390, y: 600 } });
    const config = makeConfig([ring], [peg], 1);
    const result = evaluateChallenge(config);

    expect(result.isAccepted).toBe(false);
    expect(result.solvability.isSolvable).toBe(false);
  });
});

describe('QualityEvaluator class', () => {
  const evaluator = new QualityEvaluator();

  it('evaluate() returns the same result as evaluateChallenge()', () => {
    const ring = makeRing({ colorId: 'red', initialPosition: { x: 195, y: 100 } });
    const peg = makePeg({ colorId: 'red', position: { x: 195, y: 600 } });
    const config = makeConfig([ring], [peg], 200);

    const fromFn = evaluateChallenge(config);
    const fromClass = evaluator.evaluate(config);

    expect(fromClass.solvability).toEqual(fromFn.solvability);
    expect(fromClass.quality).toEqual(fromFn.quality);
    expect(fromClass.isAccepted).toBe(fromFn.isAccepted);
  });

  it('validate() returns a SolvabilityResult', () => {
    const ring = makeRing({ colorId: 'red', initialPosition: { x: 195, y: 100 } });
    const peg = makePeg({ colorId: 'red', position: { x: 195, y: 600 } });
    const config = makeConfig([ring], [peg], 200);

    const result = evaluator.validate(config);
    expect(typeof result.isSolvable).toBe('boolean');
    expect(Array.isArray(result.solverStrategies)).toBe(true);
  });

  it('score() returns a ChallengeQualityScore', () => {
    const ring = makeRing({ colorId: 'red', initialPosition: { x: 195, y: 100 } });
    const peg = makePeg({ colorId: 'red', position: { x: 195, y: 600 } });
    const config = makeConfig([ring], [peg], 200);

    const solvabilityResult = evaluator.validate(config);
    const score = evaluator.score(config, solvabilityResult);

    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(1);
    expect(typeof score.meetsThreshold).toBe('boolean');
  });
});
