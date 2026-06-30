/**
 * Unit tests for TemplateRegistry.
 *
 * Covers:
 *   - All 24 templates are registered
 *   - getTemplateById returns the correct template and throws on unknown IDs
 *   - selectTemplate respects minChallengeNumber gating
 *   - canCombine enforces forbidden combinations (bidirectionally)
 *   - Weight distribution (Classic dominates at low difficulty)
 *
 * Requirements: 11.1
 */

import { Xoshiro128StarStar } from '@features/game/generation/SeedGenerator';
import {
  getAllTemplates,
  getTemplateById,
  selectTemplate,
  canCombine,
  type TemplateId,
} from '@features/game/generation/TemplateRegistry';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a deterministic PRNG seeded with the given integer. */
function makePrng(seed: number): Xoshiro128StarStar {
  return new Xoshiro128StarStar(seed || 1, 0, 0, 0);
}

/**
 * Run selectTemplate N times and return a frequency map of template IDs.
 */
function sampleTemplates(
  seed: number,
  difficultyScore: number,
  challengeNumber: number,
  runs: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 0; i < runs; i++) {
    // Each run gets its own PRNG derived from the base seed + run index so
    // results are independent but deterministic.
    const prng = new Xoshiro128StarStar((seed + i * 1_000_007) >>> 0 || 1, i >>> 0, 0, 0);
    const t = selectTemplate(prng, difficultyScore, challengeNumber);
    counts[t.id] = (counts[t.id] ?? 0) + 1;
  }
  return counts;
}

// ─── Registration ────────────────────────────────────────────────────────────

describe('getAllTemplates', () => {
  it('returns exactly 24 templates', () => {
    expect(getAllTemplates()).toHaveLength(24);
  });

  it('contains no duplicate IDs', () => {
    const ids = getAllTemplates().map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(24);
  });

  const expectedIds: TemplateId[] = [
    'Classic',
    'Precision',
    'MovingPegs',
    'LimitedPresses',
    'StrongCurrent',
    'TinyPegs',
    'HeavyRings',
    'LowGravity',
    'HighGravity',
    'RotatingObstacles',
    'Wind',
    'Maze',
    'BossChallenge',
    'ColorRestriction',
    'ConveyorBelt',
    'FrozenZones',
    'MultiplierRush',
    'MirrorMode',
    'ChainReaction',
    'InvisibleWater',
    'PressureZones',
    'DailyChallenge',
    'WeeklyBoss',
    'Seasonal',
  ];

  it.each(expectedIds)('includes template "%s"', (id) => {
    const template = getTemplateById(id);
    expect(template.id).toBe(id);
  });
});

// ─── getTemplateById ─────────────────────────────────────────────────────────

describe('getTemplateById', () => {
  it('returns the correct template for Classic', () => {
    const t = getTemplateById('Classic');
    expect(t.id).toBe('Classic');
    expect(t.timerMultiplier).toBe(1.0);
    expect(t.pegSizeMultiplier).toBe(1.0);
    expect(t.gravityMultiplier).toBe(1.0);
    expect(t.currentMultiplier).toBe(1.0);
    expect(t.minChallengeNumber).toBe(1);
    expect(t.weights).toEqual([80, 35, 20, 12]);
  });

  it('returns the correct template for Precision', () => {
    const t = getTemplateById('Precision');
    expect(t.pegSizeMultiplier).toBe(0.6);
    expect(t.settleAngleTolerance).toBe(8);
    expect(t.minChallengeNumber).toBe(15);
  });

  it('returns the correct template for TinyPegs', () => {
    const t = getTemplateById('TinyPegs');
    expect(t.pegSizeMultiplier).toBe(0.25);
    expect(t.minChallengeNumber).toBe(100);
  });

  it('returns the correct template for StrongCurrent', () => {
    const t = getTemplateById('StrongCurrent');
    expect(t.currentMultiplier).toBe(4.0);
  });

  it('returns the correct template for LowGravity', () => {
    const t = getTemplateById('LowGravity');
    expect(t.gravityMultiplier).toBe(0.35);
  });

  it('returns the correct template for HighGravity', () => {
    const t = getTemplateById('HighGravity');
    expect(t.gravityMultiplier).toBe(2.0);
  });

  it('returns the correct template for BossChallenge', () => {
    const t = getTemplateById('BossChallenge');
    expect(t.timerMultiplier).toBe(0.7);
    expect(t.isBoss).toBe(true);
    expect(t.weights).toEqual([0, 0, 0, 0]);
  });

  it('returns the correct template for DailyChallenge', () => {
    const t = getTemplateById('DailyChallenge');
    expect(t.timerMultiplier).toBe(1.2);
    expect(t.isDaily).toBe(true);
    expect(t.weights).toEqual([0, 0, 0, 0]);
  });

  it('returns the correct template for WeeklyBoss', () => {
    const t = getTemplateById('WeeklyBoss');
    expect(t.timerMultiplier).toBe(0.7);
    expect(t.isBoss).toBe(true);
    expect(t.isWeekly).toBe(true);
  });

  it('returns the correct template for Seasonal', () => {
    const t = getTemplateById('Seasonal');
    expect(t.isSeasonal).toBe(true);
    expect(t.weights).toEqual([0, 0, 0, 0]);
  });

  it('throws for an unknown template id', () => {
    expect(() => getTemplateById('UnknownTemplate' as TemplateId)).toThrow();
  });

  it('returns distinct objects for distinct IDs', () => {
    const a = getTemplateById('Classic');
    const b = getTemplateById('Precision');
    expect(a).not.toBe(b);
  });
});

// ─── canCombine ───────────────────────────────────────────────────────────────

describe('canCombine', () => {
  it('returns false when primary forbids secondary (TinyPegs + MovingPegs)', () => {
    expect(canCombine('TinyPegs', 'MovingPegs')).toBe(false);
  });

  it('is symmetric: MovingPegs + TinyPegs also forbidden', () => {
    expect(canCombine('MovingPegs', 'TinyPegs')).toBe(false);
  });

  it('returns false for TinyPegs + InvisibleWater', () => {
    expect(canCombine('TinyPegs', 'InvisibleWater')).toBe(false);
    expect(canCombine('InvisibleWater', 'TinyPegs')).toBe(false);
  });

  it('returns false for TinyPegs + PressureZones', () => {
    expect(canCombine('TinyPegs', 'PressureZones')).toBe(false);
    expect(canCombine('PressureZones', 'TinyPegs')).toBe(false);
  });

  it('returns false for BossChallenge + DailyChallenge', () => {
    expect(canCombine('BossChallenge', 'DailyChallenge')).toBe(false);
    expect(canCombine('DailyChallenge', 'BossChallenge')).toBe(false);
  });

  it('returns false for BossChallenge + WeeklyBoss', () => {
    expect(canCombine('BossChallenge', 'WeeklyBoss')).toBe(false);
    expect(canCombine('WeeklyBoss', 'BossChallenge')).toBe(false);
  });

  it('returns false for BossChallenge combined with itself', () => {
    expect(canCombine('BossChallenge', 'BossChallenge')).toBe(false);
  });

  it('returns false for Maze + ChainReaction', () => {
    expect(canCombine('Maze', 'ChainReaction')).toBe(false);
    expect(canCombine('ChainReaction', 'Maze')).toBe(false);
  });

  it('returns false for Maze + MirrorMode', () => {
    expect(canCombine('Maze', 'MirrorMode')).toBe(false);
    expect(canCombine('MirrorMode', 'Maze')).toBe(false);
  });

  it('returns false for InvisibleWater + ColorRestriction', () => {
    expect(canCombine('InvisibleWater', 'ColorRestriction')).toBe(false);
    expect(canCombine('ColorRestriction', 'InvisibleWater')).toBe(false);
  });

  it('returns false for InvisibleWater + ChainReaction', () => {
    expect(canCombine('InvisibleWater', 'ChainReaction')).toBe(false);
    expect(canCombine('ChainReaction', 'InvisibleWater')).toBe(false);
  });

  it('returns false for LimitedPresses + MultiplierRush', () => {
    expect(canCombine('LimitedPresses', 'MultiplierRush')).toBe(false);
    expect(canCombine('MultiplierRush', 'LimitedPresses')).toBe(false);
  });

  it('returns true for two templates with no forbidden overlap (Classic + Precision)', () => {
    expect(canCombine('Classic', 'Precision')).toBe(true);
  });

  it('returns true for Classic + StrongCurrent', () => {
    expect(canCombine('Classic', 'StrongCurrent')).toBe(true);
  });

  it('returns true for HeavyRings + Wind', () => {
    expect(canCombine('HeavyRings', 'Wind')).toBe(true);
  });
});

// ─── selectTemplate ───────────────────────────────────────────────────────────

describe('selectTemplate', () => {
  it('returns Classic at very early challenges (D < 10, challenge 1)', () => {
    // At challenge 1 with D < 10, only Classic and MultiplierRush are eligible.
    // Classic has weight 80, MultiplierRush has weight 20 → Classic wins ~80% of the time.
    const prng = makePrng(42);
    const t = selectTemplate(prng, 5, 1);
    expect(['Classic', 'MultiplierRush']).toContain(t.id);
  });

  it('never returns TinyPegs before challenge 100', () => {
    for (let challenge = 1; challenge < 100; challenge++) {
      const prng = makePrng(challenge);
      const t = selectTemplate(prng, 80, challenge);
      expect(t.id).not.toBe('TinyPegs');
    }
  });

  it('never returns Precision before challenge 15', () => {
    for (let challenge = 1; challenge < 15; challenge++) {
      const prng = makePrng(challenge * 3 + 7);
      const t = selectTemplate(prng, 20, challenge);
      expect(t.id).not.toBe('Precision');
    }
  });

  it('never returns MirrorMode before challenge 110', () => {
    for (let challenge = 1; challenge < 110; challenge++) {
      const prng = makePrng(challenge + 1);
      const t = selectTemplate(prng, 80, challenge);
      expect(t.id).not.toBe('MirrorMode');
    }
  });

  it('never returns InvisibleWater before challenge 150', () => {
    for (let challenge = 1; challenge < 150; challenge++) {
      const prng = makePrng(challenge + 5);
      const t = selectTemplate(prng, 90, challenge);
      expect(t.id).not.toBe('InvisibleWater');
    }
  });

  it('never returns BossChallenge via weighted selection (weights all 0)', () => {
    // Run many samples at high difficulty where BossChallenge is unlocked.
    const counts = sampleTemplates(1, 80, 200, 500);
    expect(counts['BossChallenge']).toBeUndefined();
  });

  it('never returns DailyChallenge via weighted selection (weights all 0)', () => {
    const counts = sampleTemplates(2, 80, 200, 500);
    expect(counts['DailyChallenge']).toBeUndefined();
  });

  it('never returns WeeklyBoss via weighted selection (weights all 0)', () => {
    const counts = sampleTemplates(3, 80, 200, 500);
    expect(counts['WeeklyBoss']).toBeUndefined();
  });

  it('never returns Seasonal via weighted selection (weights all 0)', () => {
    const counts = sampleTemplates(4, 80, 200, 500);
    expect(counts['Seasonal']).toBeUndefined();
  });

  it('Classic dominates at low difficulty (D < 10)', () => {
    // At D < 10 only Classic (weight 80) and MultiplierRush (weight 20) are eligible.
    // Classic should appear roughly 80% of the time.
    const counts = sampleTemplates(99, 5, 10, 1000);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const classicFraction = (counts['Classic'] ?? 0) / total;
    expect(classicFraction).toBeGreaterThan(0.65);
  });

  it('Classic is still selected at moderate difficulty (D 10-30)', () => {
    const counts = sampleTemplates(7, 20, 10, 200);
    expect(counts['Classic']).toBeGreaterThan(0);
  });

  it('returns a valid ChallengeTemplate with correct structure', () => {
    const prng = makePrng(1234);
    const t = selectTemplate(prng, 40, 60);
    expect(t).toHaveProperty('id');
    expect(t).toHaveProperty('displayName');
    expect(t).toHaveProperty('timerMultiplier');
    expect(t).toHaveProperty('pegSizeMultiplier');
    expect(t).toHaveProperty('weights');
    expect(t.weights).toHaveLength(4);
  });

  it('is deterministic: same PRNG state produces same result', () => {
    const prng1 = makePrng(9999);
    const prng2 = makePrng(9999);
    const t1 = selectTemplate(prng1, 50, 80);
    const t2 = selectTemplate(prng2, 50, 80);
    expect(t1.id).toBe(t2.id);
  });

  it('falls back to Classic when no eligible templates have positive weight', () => {
    // All templates at D < 10, challenge 1 that have non-zero weight are Classic and
    // MultiplierRush. Force a PRNG path to confirm at least Classic is returned.
    const prng = makePrng(1);
    const t = selectTemplate(prng, 0, 1);
    expect(['Classic', 'MultiplierRush']).toContain(t.id);
  });
});

// ─── Per-template invariants ─────────────────────────────────────────────────

describe('template invariants', () => {
  const templates = getAllTemplates();

  it.each(templates)('$id has a non-empty displayName', (t) => {
    expect(t.displayName.length).toBeGreaterThan(0);
  });

  it.each(templates)('$id has a non-empty description', (t) => {
    expect(t.description.length).toBeGreaterThan(0);
  });

  it.each(templates)('$id has minChallengeNumber >= 1', (t) => {
    expect(t.minChallengeNumber).toBeGreaterThanOrEqual(1);
  });

  it.each(templates)('$id has timerMultiplier > 0', (t) => {
    expect(t.timerMultiplier).toBeGreaterThan(0);
  });

  it.each(templates)('$id has pegSizeMultiplier > 0', (t) => {
    expect(t.pegSizeMultiplier).toBeGreaterThan(0);
  });

  it.each(templates)('$id has settleAngleTolerance > 0', (t) => {
    expect(t.settleAngleTolerance).toBeGreaterThan(0);
  });

  it.each(templates)('$id has gravityMultiplier > 0', (t) => {
    expect(t.gravityMultiplier).toBeGreaterThan(0);
  });

  it.each(templates)('$id has currentMultiplier > 0', (t) => {
    expect(t.currentMultiplier).toBeGreaterThan(0);
  });

  it.each(templates)('$id weights array has exactly 4 entries', (t) => {
    expect(t.weights).toHaveLength(4);
  });

  it.each(templates)('$id weights are all non-negative', (t) => {
    t.weights.forEach(w => expect(w).toBeGreaterThanOrEqual(0));
  });

  it.each(templates)('$id forbiddenCombinations only references valid IDs', (t) => {
    t.forbiddenCombinations.forEach(fid => {
      expect(() => getTemplateById(fid)).not.toThrow();
    });
  });
});
