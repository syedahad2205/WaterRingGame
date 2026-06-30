/**
 * ChallengeMetadata.test.ts — task 6.4.3a
 *
 * Tests the ChallengeScorer's scoreChallenge() function and QUALITY_THRESHOLD.
 * Verifies the weighted-sum formula and meetsThreshold logic.
 *
 * The actual exported function is `scoreChallenge`, not `computeQualityScore`.
 */

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

import {
  scoreChallenge,
  QUALITY_THRESHOLD,
} from '../../src/features/game/generation/ChallengeScorer';
import type { ChallengeQualityScore } from '../../src/features/game/generation/ChallengeScorer';
import type { SolvabilityResult } from '../../src/features/game/generation/ValidationSolver';
import type { ChallengeConfig } from '../../src/types/challenge';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Minimal ChallengeConfig fixture that satisfies all scorer code paths.
 * Uses intelligenceMetadata.estimatedSolveTimeSecs in the fun score calculation.
 */
const mockConfig: ChallengeConfig = {
  challengeNumber: 1,
  dailyDate: '',
  seed: 'test',
  generatorVersion: '1.0.0',
  templateId: 'standard',
  difficultyScore: 0,
  normalizedDifficulty: 0.0,
  arena: { width: 390, height: 844 },
  timer: { totalSeconds: 60 },
  rings: [
    {
      id: 'r1',
      outerRadius: 30,
      innerRadius: 15,
      mass: 1,
      buoyancy: 0.5,
      angularDamping: 0.1,
      linearDamping: 0.1,
      restitution: 0.3,
      frictionAir: 0.02,
      sizeCategory: 'medium',
      colorId: 'blue',
      skinId: 'default',
      isDecoy: false,
      initialPosition: { x: 100, y: 100 },
    },
  ],
  pegs: [
    {
      id: 'p1',
      position: { x: 100, y: 600 },
      height: 40,
      baseRadius: 20,
      tipRadius: 10,
      acceptedRingSizes: ['small', 'medium', 'large'],
      acceptedColorId: 'blue',
      isMoving: false,
      glowColor: '#0000ff',
    },
  ],
  obstacles: [],
  intelligenceMetadata: {
    // estimatedSolveTimeSecs: 36 gives utilRatio=0.6, in [0.5,0.8] → timerUtil=1.0
    estimatedSolveTimeSecs: 36,
    strategyHints: [],
    nearMissZones: [],
  },
  isBossChallenge: false,
  isDailyChallenge: false,
} as unknown as ChallengeConfig;

/** Perfect solvability: 3/3 strategies → score 1.0 */
const perfectSolvability: SolvabilityResult = {
  isSolvable: true,
  successCount: 3,
  solvabilityScore: 1.0,
  solverStrategies: [0, 1, 2],
};

/** Zero solvability: 0/3 strategies → score 0.0 */
const zeroSolvability: SolvabilityResult = {
  isSolvable: false,
  successCount: 0,
  solvabilityScore: 0.0,
  solverStrategies: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChallengeScorer — scoreChallenge', () => {
  it('QUALITY_THRESHOLD equals 0.65', () => {
    expect(QUALITY_THRESHOLD).toBe(0.65);
  });

  it('returns an object with all required quality score fields', () => {
    const result: ChallengeQualityScore = scoreChallenge(mockConfig, perfectSolvability);
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('solvability');
    expect(result).toHaveProperty('fun');
    expect(result).toHaveProperty('fairness');
    expect(result).toHaveProperty('variety');
    expect(result).toHaveProperty('pacing');
    expect(result).toHaveProperty('meetsThreshold');
  });

  it('each component score is between 0.0 and 1.0', () => {
    const result = scoreChallenge(mockConfig, perfectSolvability);
    const components: Array<keyof ChallengeQualityScore> = [
      'overall', 'solvability', 'fun', 'fairness', 'variety', 'pacing',
    ];
    for (const key of components) {
      const val = result[key] as number;
      expect(val).toBeGreaterThanOrEqual(0.0);
      expect(val).toBeLessThanOrEqual(1.0);
    }
  });

  it('meetsThreshold is true when overall >= QUALITY_THRESHOLD', () => {
    const result = scoreChallenge(mockConfig, perfectSolvability);
    if (result.overall >= QUALITY_THRESHOLD) {
      expect(result.meetsThreshold).toBe(true);
    }
  });

  it('meetsThreshold is false when solvability is 0.0', () => {
    const result = scoreChallenge(mockConfig, zeroSolvability);
    // With solvability=0, overall = 0*0.30 + fun*0.25 + fairness*0.20 + 0.8*0.15 + 0.8*0.10
    // Max possible without solvability: 0 + 0.25 + 0.20 + 0.12 + 0.08 = 0.65 (edge case)
    // Since fun < 1.0 for a 1-ring config, overall < 0.65
    expect(result.solvability).toBe(0.0);
    expect(result.overall).toBeLessThan(QUALITY_THRESHOLD);
    expect(result.meetsThreshold).toBe(false);
  });

  it('overall score follows weighted formula: 0.30×sol + 0.25×fun + 0.20×fair + 0.15×var + 0.10×pac', () => {
    const result = scoreChallenge(mockConfig, perfectSolvability);
    const expected =
      0.30 * result.solvability +
      0.25 * result.fun +
      0.20 * result.fairness +
      0.15 * result.variety +
      0.10 * result.pacing;
    expect(result.overall).toBeCloseTo(expected, 5);
  });

  it('variety score is 0.8 (placeholder constant)', () => {
    const result = scoreChallenge(mockConfig, perfectSolvability);
    expect(result.variety).toBe(0.8);
  });

  it('pacing score is 0.8 (placeholder constant)', () => {
    const result = scoreChallenge(mockConfig, perfectSolvability);
    expect(result.pacing).toBe(0.8);
  });

  it('solvability score matches solver result directly', () => {
    const result = scoreChallenge(mockConfig, perfectSolvability);
    expect(result.solvability).toBe(perfectSolvability.solvabilityScore);
  });

  it('higher solvability produces higher overall score (all else equal)', () => {
    const twoThirds: SolvabilityResult = {
      isSolvable: true,
      successCount: 2,
      solvabilityScore: 0.7,
      solverStrategies: [0, 1],
    };
    const perfect = scoreChallenge(mockConfig, perfectSolvability);
    const partial = scoreChallenge(mockConfig, twoThirds);
    expect(perfect.overall).toBeGreaterThan(partial.overall);
  });
});
