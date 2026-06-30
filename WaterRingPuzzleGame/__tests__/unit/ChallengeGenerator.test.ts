/**
 * Unit tests for ChallengeGenerator.ts
 *
 * Covers:
 *   - generate(1) returns a valid ChallengeConfig
 *   - generate(N) is deterministic: same N → same config
 *   - ring-peg bijection: required rings count matches peg count up to available pegs
 *   - challenge code round-trip: generate(527) has challengeNumber 527
 *   - timer reasonable: totalSeconds >= 45
 *   - arena dimensions are fixed
 *   - all required fields in ChallengeConfig are populated
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import { generateChallenge, ChallengeGenerator } from '@features/game/generation/ChallengeGenerator';
import type { ChallengeConfig } from '../../src/types/challenge';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── Basic smoke test ─────────────────────────────────────────────────────────

describe('generateChallenge()', () => {
  it('generate(1) returns a valid ChallengeConfig', () => {
    const config = generateChallenge(1);

    // Top-level required fields
    expect(config.challengeNumber).toBe(1);
    expect(typeof config.seed).toBe('string');
    expect(config.seed.length).toBeGreaterThan(0);
    expect(typeof config.templateId).toBe('string');
    expect(config.templateId.length).toBeGreaterThan(0);
    expect(typeof config.generatorVersion).toBe('string');
    expect(config.difficultyScore).toBeGreaterThanOrEqual(0);
    expect(config.difficultyScore).toBeLessThanOrEqual(100);
    expect(config.normalizedDifficulty).toBeGreaterThanOrEqual(0);
    expect(config.normalizedDifficulty).toBeLessThanOrEqual(1);

    // Arena
    expect(config.arena.width).toBe(390);
    expect(config.arena.height).toBe(844);
    expect(config.arena.waterSurfaceY).toBe(844 * 0.05);
    expect(typeof config.arena.themeId).toBe('string');
    expect(typeof config.arena.environmentId).toBe('string');

    // Timer
    expect(config.timer.totalSeconds).toBeGreaterThanOrEqual(45);
    expect(config.timer.amberThresholdSecs).toBeLessThan(config.timer.totalSeconds);
    expect(config.timer.criticalThresholdSecs).toBeLessThan(config.timer.amberThresholdSecs);

    // Rings and pegs
    expect(config.rings.length).toBeGreaterThan(0);
    expect(config.pegs.length).toBeGreaterThan(0);

    // Obstacles array
    expect(Array.isArray(config.obstacles)).toBe(true);

    // Water current
    expect(typeof config.waterCurrentProfile.ambientForce).toBe('number');
    expect(typeof config.waterCurrentProfile.turbulenceIntensity).toBe('number');

    // Physics modifiers
    expect(config.physicsModifiers.gravityScale).toBeGreaterThan(0);
    expect(config.physicsModifiers.waterViscosity).toBeGreaterThan(0);
    expect(config.physicsModifiers.buoyancyMultiplier).toBeGreaterThan(0);

    // Intelligence metadata
    expect(config.intelligenceMetadata.estimatedSolveTimeSecs).toBeGreaterThan(0);
    expect(Array.isArray(config.intelligenceMetadata.successfulSolverStrategies)).toBe(true);
    expect(typeof config.intelligenceMetadata.qualityScore).toBe('number');
    expect(Array.isArray(config.intelligenceMetadata.difficultyDrivers)).toBe(true);
    expect(config.intelligenceMetadata.difficultyDrivers.length).toBeGreaterThan(0);

    // Flags
    expect(config.isBossChallenge).toBe(false);
    expect(config.isDailyChallenge).toBe(false);
  });

  it('generate(N) is deterministic: same N returns identical config', () => {
    const n = 42;
    const a = generateChallenge(n);
    const b = generateChallenge(n);
    expect(deepEqual(a, b)).toBe(true);
  });

  it('generate(N) is deterministic for N=1', () => {
    const a = generateChallenge(1);
    const b = generateChallenge(1);
    expect(deepEqual(a, b)).toBe(true);
  });

  it('generate(N) is deterministic for N=1000', () => {
    const a = generateChallenge(1000);
    const b = generateChallenge(1000);
    expect(deepEqual(a, b)).toBe(true);
  });

  it('different N values produce different configs', () => {
    const a = generateChallenge(1);
    const b = generateChallenge(2);
    // They should differ (same template is possible but positions should differ)
    expect(deepEqual(a.rings[0].initialPosition, b.rings[0].initialPosition)).toBe(false);
  });

  it('challenge code round-trip: generate(527) has challengeNumber 527', () => {
    const config = generateChallenge(527);
    expect(config.challengeNumber).toBe(527);
    // 527 in base36 = "EN"; seed is encoded as "EN-<luhn_check>"
    // The design.md note "EJ-8" appears to be a typo; 527.toString(36).toUpperCase() = "EN"
    expect(config.seed).toMatch(/^EN-\d$/);
  });

  it('timer is reasonable: totalSeconds >= 45 for all difficulties', () => {
    const ns = [1, 10, 100, 500, 1000, 5000, 10000];
    for (const n of ns) {
      const config = generateChallenge(n);
      expect(config.timer.totalSeconds).toBeGreaterThanOrEqual(45);
    }
  });

  it('ring-peg bijection: required rings count does not exceed peg count', () => {
    const config = generateChallenge(100);
    const requiredRings = config.rings.filter(r => !r.isDecoy);
    // Each required ring must be able to map to a peg by color
    expect(requiredRings.length).toBeLessThanOrEqual(config.pegs.length);
  });

  it('required rings all have matching pegs by color (bijection)', () => {
    for (const n of [1, 10, 50, 200]) {
      const config = generateChallenge(n);
      const requiredRings = config.rings.filter(r => !r.isDecoy);
      const pegColors = new Set(config.pegs.map(p => p.acceptedColorId));

      for (const ring of requiredRings) {
        expect(pegColors.has(ring.colorId)).toBe(true);
      }
    }
  });

  it('decoy rings are marked isDecoy=true', () => {
    // At higher difficulty, decoy rings appear
    const config = generateChallenge(500);
    const decoys = config.rings.filter(r => r.isDecoy);
    if (decoys.length > 0) {
      decoys.forEach(d => expect(d.isDecoy).toBe(true));
    }
  });

  it('challenge 50 is a boss challenge', () => {
    const config = generateChallenge(50);
    expect(config.isBossChallenge).toBe(true);
  });

  it('challenge 100 is a boss challenge', () => {
    const config = generateChallenge(100);
    expect(config.isBossChallenge).toBe(true);
  });

  it('challenge 1 is not a boss challenge', () => {
    const config = generateChallenge(1);
    expect(config.isBossChallenge).toBe(false);
  });

  it('arena dimensions are always 390×844', () => {
    for (const n of [1, 50, 500, 9999]) {
      const config = generateChallenge(n);
      expect(config.arena.width).toBe(390);
      expect(config.arena.height).toBe(844);
    }
  });

  it('peg count is within expected range [2, 8]', () => {
    for (const n of [1, 50, 500, 1000, 5000]) {
      const config = generateChallenge(n);
      expect(config.pegs.length).toBeGreaterThanOrEqual(2);
      expect(config.pegs.length).toBeLessThanOrEqual(8);
    }
  });

  it('all ring initial positions are within arena bounds', () => {
    const config = generateChallenge(200);
    for (const ring of config.rings) {
      expect(ring.initialPosition.x).toBeGreaterThanOrEqual(0);
      expect(ring.initialPosition.x).toBeLessThanOrEqual(config.arena.width);
      expect(ring.initialPosition.y).toBeGreaterThanOrEqual(0);
      expect(ring.initialPosition.y).toBeLessThanOrEqual(config.arena.height);
    }
  });

  it('all peg positions are within arena bounds', () => {
    const config = generateChallenge(200);
    for (const peg of config.pegs) {
      expect(peg.position.x).toBeGreaterThanOrEqual(0);
      expect(peg.position.x).toBeLessThanOrEqual(config.arena.width);
      expect(peg.position.y).toBeGreaterThanOrEqual(0);
      expect(peg.position.y).toBeLessThanOrEqual(config.arena.height);
    }
  });

  it('normalizedDifficulty = difficultyScore / 100', () => {
    for (const n of [1, 100, 1000]) {
      const config = generateChallenge(n);
      expect(config.normalizedDifficulty).toBeCloseTo(config.difficultyScore / 100, 8);
    }
  });

  it('intelligence metadata estimatedSolveTime is 60% of totalSeconds', () => {
    const config = generateChallenge(100);
    expect(config.intelligenceMetadata.estimatedSolveTimeSecs).toBeCloseTo(
      config.timer.totalSeconds * 0.6,
      5,
    );
  });

  it('intelligence metadata qualityScore is 0.75 (placeholder)', () => {
    const config = generateChallenge(1);
    expect(config.intelligenceMetadata.qualityScore).toBe(0.75);
  });

  it('intelligence metadata difficultyDrivers is non-empty array of strings', () => {
    const config = generateChallenge(500);
    expect(Array.isArray(config.intelligenceMetadata.difficultyDrivers)).toBe(true);
    expect(config.intelligenceMetadata.difficultyDrivers.length).toBeGreaterThan(0);
    config.intelligenceMetadata.difficultyDrivers.forEach(d => {
      expect(typeof d).toBe('string');
    });
  });
});

// ─── ChallengeGenerator class ─────────────────────────────────────────────────

describe('ChallengeGenerator class', () => {
  const gen = new ChallengeGenerator();

  it('generate(N) returns valid ChallengeConfig', () => {
    const config = gen.generate(10);
    expect(config.challengeNumber).toBe(10);
    expect(config.rings.length).toBeGreaterThan(0);
  });

  it('generate(N) is deterministic', () => {
    const a = gen.generate(77);
    const b = gen.generate(77);
    expect(deepEqual(a, b)).toBe(true);
  });

  it('generateDaily(date) returns valid ChallengeConfig', () => {
    const date = new Date('2024-01-15T00:00:00.000Z');
    const config = gen.generateDaily(date);
    expect(config.isDailyChallenge).toBe(true);
    expect(config.dailyDate).toBe('2024-01-15');
    expect(config.rings.length).toBeGreaterThan(0);
  });

  it('generateDaily(date) is deterministic: same date → same config', () => {
    const date = new Date('2024-06-21T00:00:00.000Z');
    const a = gen.generateDaily(date);
    const b = gen.generateDaily(date);
    expect(deepEqual(a, b)).toBe(true);
  });

  it('generateDaily different dates produce different configs', () => {
    const d1 = gen.generateDaily(new Date('2024-01-01T00:00:00.000Z'));
    const d2 = gen.generateDaily(new Date('2024-01-02T00:00:00.000Z'));
    expect(deepEqual(d1, d2)).toBe(false);
  });

  it('generate and generateChallenge produce same result for same N', () => {
    const a = gen.generate(300);
    const b = generateChallenge(300);
    expect(deepEqual(a, b)).toBe(true);
  });
});

// ─── Timer formula tests (task 6.3.3a) ───────────────────────────────────────

describe('timer formula at key difficulty levels', () => {
  it('timer at D≈0 (N=1) should be close to 180s (template multiplier may adjust)', () => {
    const config = generateChallenge(1);
    // timerBase(D=0) = 180; template multiplier is ≥0.7
    expect(config.timer.totalSeconds).toBeGreaterThanOrEqual(45);
    // Upper bound: classic template at D~0 → 180 * 1.0 = 180
    expect(config.timer.totalSeconds).toBeLessThanOrEqual(220);
  });

  it('timer at D=50 (N=1000) should be around 120s', () => {
    const config = generateChallenge(1000);
    // timerBase(50) = 120; template multiplier varies
    // Allow range: 120 * 0.7 = 84 to 120 * 1.2 = 144
    expect(config.timer.totalSeconds).toBeGreaterThanOrEqual(80);
    expect(config.timer.totalSeconds).toBeLessThanOrEqual(150);
  });

  it('timer at D=100 (high N) should be around 60s', () => {
    const config = generateChallenge(100000);
    // timerBase(100) = 60; template multiplier varies
    // Allow range: 60 * 0.7 = 42 → floored to 45 * 0.7 = 31.5
    // but min is 45 before multiplier. Actually timerBase(100) = 180 - 120*1 = 60
    expect(config.timer.totalSeconds).toBeGreaterThanOrEqual(40);
    expect(config.timer.totalSeconds).toBeLessThanOrEqual(80);
  });

  it('amberThresholdSecs is 30% of totalSeconds', () => {
    for (const n of [1, 100, 1000]) {
      const config = generateChallenge(n);
      expect(config.timer.amberThresholdSecs).toBeCloseTo(
        config.timer.totalSeconds * 0.3,
        5,
      );
    }
  });

  it('criticalThresholdSecs is 10% of totalSeconds', () => {
    for (const n of [1, 100, 1000]) {
      const config = generateChallenge(n);
      expect(config.timer.criticalThresholdSecs).toBeCloseTo(
        config.timer.totalSeconds * 0.1,
        5,
      );
    }
  });
});

// ─── Theme cycling tests ──────────────────────────────────────────────────────

describe('theme cycling', () => {
  it('N=1 gets theme from index floor(1/20)%7 = 0 → ocean', () => {
    const config = generateChallenge(1);
    expect(config.arena.themeId).toBe('ocean');
  });

  it('N=20 gets theme from index floor(20/20)%7 = 1 → beach', () => {
    const config = generateChallenge(20);
    expect(config.arena.themeId).toBe('beach');
  });

  it('N=140 gets theme from index floor(140/20)%7 = 0 → ocean', () => {
    const config = generateChallenge(140);
    expect(config.arena.themeId).toBe('ocean');
  });
});

// ─── Obstacle tests ───────────────────────────────────────────────────────────

describe('obstacles', () => {
  it('Classic template produces no obstacles', () => {
    // Find a challenge number that generates Classic template
    // Iterate through a few and verify: all Classic challenges have 0 obstacles
    let foundClassicWithObstacles = false;
    for (let n = 1; n <= 20; n++) {
      const config = generateChallenge(n);
      if (config.templateId === 'Classic' && config.obstacles.length > 0) {
        foundClassicWithObstacles = true;
      }
    }
    expect(foundClassicWithObstacles).toBe(false);
  });

  it('obstacles array is always an array', () => {
    for (const n of [1, 50, 200, 500]) {
      const config = generateChallenge(n);
      expect(Array.isArray(config.obstacles)).toBe(true);
    }
  });
});
