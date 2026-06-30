/**
 * Unit tests for DifficultyCalculator.ts
 *
 * Covers:
 *  - D(N) two-phase formula reference values (from the formula pseudocode in design.md)
 *  - D(N) monotonicity for 10 sequential values
 *  - D(N) ceiling (never exceeds 100)
 *  - All component formulas at key difficulty levels
 *
 * NOTE on reference values: The design.md reference table contains values that were
 * computed with a different parameterisation than the formula pseudocode (Algorithm 2).
 * This file tests the FORMULA as specified in the pseudocode, which is the authoritative
 * source. The computed reference values below are derived directly from the formula.
 *
 * Requirements: 11.2
 */

import {
  difficultyScore,
  normalizedDifficulty,
  timerBase,
  requiredRings,
  decoyRings,
  totalRings,
  obstacleCount,
  modifierChance,
  currentStrengthMultiplier,
  rewardMultiplier,
  pegBaseRadius,
  minPegSpacing,
} from '@features/game/generation/DifficultyCalculator';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Assert |received - expected| ≤ tolerance */
function expectClose(received: number, expected: number, tolerance: number = 0.01): void {
  expect(Math.abs(received - expected)).toBeLessThanOrEqual(tolerance);
}

// ─── D(N) formula correctness ────────────────────────────────────────────────
//
// These values are computed from the formula pseudocode:
//   Phase 1: D(N) = 50 * ln(1+N) / ln(1001)
//   Phase 2: D(N) = 50 + 50 * (1 - exp(-(N-1000)/5000))

describe('difficultyScore() — formula correctness', () => {
  it('D(1) = 50 * ln(2) / ln(1001) ≈ 5.016', () => {
    const expected = 50 * Math.log(2) / Math.log(1001);
    expectClose(difficultyScore(1), expected);
  });

  it('D(10) ≈ 17.35', () => {
    const expected = 50 * Math.log(11) / Math.log(1001);
    expectClose(difficultyScore(10), expected);
  });

  it('D(50) ≈ 28.46', () => {
    const expected = 50 * Math.log(51) / Math.log(1001);
    expectClose(difficultyScore(50), expected);
  });

  it('D(100) ≈ 33.40', () => {
    const expected = 50 * Math.log(101) / Math.log(1001);
    expectClose(difficultyScore(100), expected);
  });

  it('D(500) ≈ 44.99', () => {
    const expected = 50 * Math.log(501) / Math.log(1001);
    expectClose(difficultyScore(500), expected);
  });

  it('D(1000) = exactly 50.0 (Phase 1 / Phase 2 boundary)', () => {
    expectClose(difficultyScore(1000), 50.0);
  });

  it('D(2000) ≈ 59.06 (Phase 2)', () => {
    const expected = 50 + 50 * (1 - Math.exp(-1000 / 5000));
    expectClose(difficultyScore(2000), expected);
  });

  it('D(5000) ≈ 77.53 (Phase 2)', () => {
    const expected = 50 + 50 * (1 - Math.exp(-4000 / 5000));
    expectClose(difficultyScore(5000), expected);
  });

  it('D(10000) ≈ 91.74 (Phase 2)', () => {
    const expected = 50 + 50 * (1 - Math.exp(-9000 / 5000));
    expectClose(difficultyScore(10000), expected);
  });

  it('Phase 1 and Phase 2 are continuous at N=1000 (no jump)', () => {
    const d1000 = difficultyScore(1000);
    const d1001 = difficultyScore(1001);
    expect(d1001 - d1000).toBeGreaterThanOrEqual(0); // monotone
    expect(d1001 - d1000).toBeLessThan(1);           // smooth, no spike
  });
});

// ─── D(N) Monotonicity ───────────────────────────────────────────────────────

describe('difficultyScore() — monotonicity', () => {
  it('is non-decreasing for 10 sequential Phase 1 values (N=1..10)', () => {
    for (let n = 1; n < 10; n++) {
      expect(difficultyScore(n + 1)).toBeGreaterThanOrEqual(difficultyScore(n));
    }
  });

  it('is non-decreasing across 10 Phase 2 sequential values (N=1001..1010)', () => {
    for (let n = 1001; n < 1010; n++) {
      expect(difficultyScore(n + 1)).toBeGreaterThanOrEqual(difficultyScore(n));
    }
  });

  it('is non-decreasing across the Phase 1/2 boundary (N=998..1002)', () => {
    for (let n = 998; n < 1002; n++) {
      expect(difficultyScore(n + 1)).toBeGreaterThanOrEqual(difficultyScore(n));
    }
  });

  it('is non-decreasing for 10 high-N values (N=9990..9999)', () => {
    for (let n = 9990; n < 9999; n++) {
      expect(difficultyScore(n + 1)).toBeGreaterThanOrEqual(difficultyScore(n));
    }
  });
});

// ─── D(N) Ceiling ────────────────────────────────────────────────────────────

describe('difficultyScore() — ceiling', () => {
  const largeValues = [10_000, 50_000, 100_000, 1_000_000, 10_000_000];

  it.each(largeValues)('D(%i) ≤ 100', (n) => {
    expect(difficultyScore(n)).toBeLessThanOrEqual(100);
  });

  it('D(N) is always ≥ 0', () => {
    expect(difficultyScore(1)).toBeGreaterThanOrEqual(0);
  });

  it('Phase 2 asymptotically approaches 100 — below 100 for moderate large N', () => {
    // Mathematically the exponential never reaches 0, but IEEE 754 float64 underflows
    // at very large N. Verify the curve is still below 100 at a large but not extreme N.
    // At N=100,000: exp(-(100000-1000)/5000) = exp(-19.8) ≈ 2.5e-9, well above 0
    expect(difficultyScore(100_000)).toBeLessThan(100);
    expect(difficultyScore(50_000)).toBeLessThan(100);
  });
});

// ─── Normalized Difficulty ───────────────────────────────────────────────────

describe('normalizedDifficulty()', () => {
  it('ND(1000) = 0.5 exactly', () => {
    expectClose(normalizedDifficulty(1000), 0.5);
  });

  it('ND(N) is always in [0.0, 1.0]', () => {
    const testValues = [1, 10, 100, 500, 1000, 5000, 10_000, 10_000_000];
    for (const n of testValues) {
      const nd = normalizedDifficulty(n);
      expect(nd).toBeGreaterThanOrEqual(0);
      expect(nd).toBeLessThanOrEqual(1);
    }
  });

  it('ND = D / 100 by definition', () => {
    for (const n of [1, 500, 1000, 5000]) {
      expectClose(normalizedDifficulty(n), difficultyScore(n) / 100, 1e-9);
    }
  });
});

// ─── timerBase() ─────────────────────────────────────────────────────────────

describe('timerBase()', () => {
  it('timerBase(D=0) = 180 seconds (ND=0)', () => {
    expect(timerBase(0)).toBe(180);
  });

  it('timerBase(D=50) = 120 seconds (ND=0.5)', () => {
    expect(timerBase(50)).toBe(120);
  });

  it('timerBase(D=100) = 60 seconds (ND=1.0)', () => {
    expect(timerBase(100)).toBe(60);
  });

  it('is clamped to minimum 45 seconds', () => {
    // At D=100: 180 - 120*1.0 = 60 > 45, so min doesn't kick in here
    // The min applies if formula would drop below 45; verify it never goes below 45
    const allDs = [0, 10, 25, 50, 75, 100];
    for (const d of allDs) {
      expect(timerBase(d)).toBeGreaterThanOrEqual(45);
    }
  });

  it('decreases as difficulty increases', () => {
    expect(timerBase(50)).toBeLessThan(timerBase(0));
    expect(timerBase(100)).toBeLessThan(timerBase(50));
  });

  it('matches formula: 180 - 120*ND', () => {
    const dValues = [0, 25, 50, 75, 100];
    for (const d of dValues) {
      const nd = d / 100;
      const expected = Math.max(45, 180 - 120 * nd);
      expectClose(timerBase(d), expected);
    }
  });

  it('at N=1000 (D=50) timer = 120s', () => {
    const d = difficultyScore(1000);
    expectClose(timerBase(d), 120, 1);
  });
});

// ─── requiredRings() ─────────────────────────────────────────────────────────

describe('requiredRings()', () => {
  it('D=0 (ND=0) → 1 required ring', () => {
    expect(requiredRings(0)).toBe(1);
  });

  it('D=50 (ND=0.5) → 1 + floor(0.5 × 5) = 3 rings', () => {
    expect(requiredRings(50)).toBe(3);
  });

  it('D=100 (ND=1.0) → 1 + floor(1.0 × 5) = 6 rings (capped)', () => {
    expect(requiredRings(100)).toBe(6);
  });

  it('D=20 (ND=0.2) → 1 + floor(0.2 × 5) = 2 rings', () => {
    expect(requiredRings(20)).toBe(2);
  });

  it('is always in [1, 6]', () => {
    const dValues = [0, 10, 25, 50, 75, 100];
    for (const d of dValues) {
      const r = requiredRings(d);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });
});

// ─── decoyRings() ─────────────────────────────────────────────────────────────

describe('decoyRings()', () => {
  it('D=0 → 0 decoy rings', () => {
    expect(decoyRings(0)).toBe(0);
  });

  it('D=50 (ND=0.5) → floor(0.5 × 4) = 2 decoy rings', () => {
    expect(decoyRings(50)).toBe(2);
  });

  it('D=100 (ND=1.0) → floor(1.0 × 4) = 4 decoy rings (capped)', () => {
    expect(decoyRings(100)).toBe(4);
  });

  it('D=25 (ND=0.25) → floor(0.25 × 4) = 1 decoy ring', () => {
    expect(decoyRings(25)).toBe(1);
  });

  it('is always in [0, 4]', () => {
    const dValues = [0, 10, 25, 50, 75, 100];
    for (const d of dValues) {
      const r = decoyRings(d);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(4);
    }
  });
});

// ─── totalRings() ─────────────────────────────────────────────────────────────

describe('totalRings()', () => {
  it('equals requiredRings + decoyRings at every difficulty', () => {
    const dValues = [0, 10, 25, 50, 75, 100];
    for (const d of dValues) {
      expect(totalRings(d)).toBe(requiredRings(d) + decoyRings(d));
    }
  });

  it('D=0 → 1 total ring', () => {
    expect(totalRings(0)).toBe(1);
  });

  it('D=100 → 10 total rings (6 required + 4 decoy)', () => {
    expect(totalRings(100)).toBe(10);
  });

  it('D=50 → 5 total rings (3 required + 2 decoy)', () => {
    expect(totalRings(50)).toBe(5);
  });
});

// ─── obstacleCount() ──────────────────────────────────────────────────────────

describe('obstacleCount()', () => {
  it('returns 0 when D ≤ 10', () => {
    expect(obstacleCount(0)).toBe(0);
    expect(obstacleCount(5)).toBe(0);
    expect(obstacleCount(10)).toBe(0);
  });

  it('returns 0 for D just above 10 (floor(ND*6) is still 0 until D≥16.67)', () => {
    // D=11: ND=0.11, floor(0.11*6) = floor(0.66) = 0
    expect(obstacleCount(11)).toBe(0);
    // D=16: ND=0.16, floor(0.16*6) = floor(0.96) = 0
    expect(obstacleCount(16)).toBe(0);
  });

  it('first non-zero count appears at D ≥ 100/6 ≈ 16.67', () => {
    // D=17: ND=0.17, floor(0.17*6) = floor(1.02) = 1
    expect(obstacleCount(17)).toBe(1);
  });

  it('D=50 (ND=0.5) → floor(0.5 × 6) = 3 obstacles', () => {
    expect(obstacleCount(50)).toBe(3);
  });

  it('D=100 (ND=1.0) → floor(1.0 × 6) = 6 obstacles (max)', () => {
    expect(obstacleCount(100)).toBe(6);
  });

  it('is always in [0, 6]', () => {
    const dValues = [0, 5, 10, 17, 25, 50, 75, 100];
    for (const d of dValues) {
      const count = obstacleCount(d);
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(6);
    }
  });
});

// ─── modifierChance() ─────────────────────────────────────────────────────────

describe('modifierChance()', () => {
  it('D=0 → 0.0 modifier chance', () => {
    expect(modifierChance(0)).toBe(0);
  });

  it('D=50 (ND=0.5) → min(0.6, 0.5×0.8) = 0.4', () => {
    expect(modifierChance(50)).toBeCloseTo(0.4, 5);
  });

  it('caps at 0.6 once ND × 0.8 ≥ 0.6 (i.e. D ≥ 75)', () => {
    expect(modifierChance(75)).toBeCloseTo(0.6, 5);
    expect(modifierChance(100)).toBeCloseTo(0.6, 5);
  });

  it('D=37.5 (ND=0.375) → min(0.6, 0.375×0.8) = 0.3', () => {
    expect(modifierChance(37.5)).toBeCloseTo(0.3, 5);
  });

  it('is always in [0.0, 0.6]', () => {
    const dValues = [0, 10, 25, 50, 75, 100];
    for (const d of dValues) {
      const mc = modifierChance(d);
      expect(mc).toBeGreaterThanOrEqual(0);
      expect(mc).toBeLessThanOrEqual(0.6);
    }
  });
});

// ─── currentStrengthMultiplier() ──────────────────────────────────────────────

describe('currentStrengthMultiplier()', () => {
  it('D=0 → multiplier of 1.0', () => {
    expect(currentStrengthMultiplier(0)).toBe(1.0);
  });

  it('D=50 (ND=0.5) → 1 + 2×0.5 = 2.0', () => {
    expect(currentStrengthMultiplier(50)).toBeCloseTo(2.0, 5);
  });

  it('D=100 (ND=1.0) → 1 + 2×1.0 = 3.0', () => {
    expect(currentStrengthMultiplier(100)).toBeCloseTo(3.0, 5);
  });

  it('D=25 (ND=0.25) → 1 + 2×0.25 = 1.5', () => {
    expect(currentStrengthMultiplier(25)).toBeCloseTo(1.5, 5);
  });

  it('is always ≥ 1.0', () => {
    const dValues = [0, 10, 25, 50, 75, 100];
    for (const d of dValues) {
      expect(currentStrengthMultiplier(d)).toBeGreaterThanOrEqual(1.0);
    }
  });
});

// ─── rewardMultiplier() ───────────────────────────────────────────────────────

describe('rewardMultiplier()', () => {
  it('D=0 → 1.0', () => {
    expect(rewardMultiplier(0)).toBeCloseTo(1.0, 5);
  });

  it('D=50 (ND=0.5) → 1.0 + 3.0×0.5 = 2.5', () => {
    expect(rewardMultiplier(50)).toBeCloseTo(2.5, 5);
  });

  it('D=100 (ND=1.0) → 4.0', () => {
    expect(rewardMultiplier(100)).toBeCloseTo(4.0, 5);
  });

  it('D=33.33 (ND≈0.333) → 1.0 + 3.0×0.333 ≈ 2.0', () => {
    expectClose(rewardMultiplier(100 / 3), 2.0, 0.01);
  });

  it('is always ≥ 1.0', () => {
    const dValues = [0, 10, 50, 100];
    for (const d of dValues) {
      expect(rewardMultiplier(d)).toBeGreaterThanOrEqual(1.0);
    }
  });
});

// ─── pegBaseRadius() ──────────────────────────────────────────────────────────

describe('pegBaseRadius()', () => {
  const MAX_RADIUS = 100;

  it('D=0 → full maxRadius', () => {
    expect(pegBaseRadius(0, MAX_RADIUS)).toBe(MAX_RADIUS);
  });

  it('D=100 (ND=1.0) → maxRadius × (1 - 0.5×1.0) = maxRadius × 0.5', () => {
    expect(pegBaseRadius(100, MAX_RADIUS)).toBeCloseTo(MAX_RADIUS * 0.5, 5);
  });

  it('D=50 (ND=0.5) → maxRadius × (1 - 0.5×0.5) = maxRadius × 0.75', () => {
    expect(pegBaseRadius(50, MAX_RADIUS)).toBeCloseTo(MAX_RADIUS * 0.75, 5);
  });

  it('scales proportionally with maxRadius', () => {
    const r1 = pegBaseRadius(50, 100);
    const r2 = pegBaseRadius(50, 200);
    expect(r2).toBeCloseTo(r1 * 2, 5);
  });

  it('result is always ≤ maxRadius', () => {
    const dValues = [0, 25, 50, 75, 100];
    for (const d of dValues) {
      expect(pegBaseRadius(d, MAX_RADIUS)).toBeLessThanOrEqual(MAX_RADIUS);
    }
  });
});

// ─── minPegSpacing() ──────────────────────────────────────────────────────────

describe('minPegSpacing()', () => {
  const MAX_SPACING = 200;

  it('D=0 → full maxSpacing', () => {
    expect(minPegSpacing(0, MAX_SPACING)).toBe(MAX_SPACING);
  });

  it('D=100 (ND=1.0) → maxSpacing × (1 - 0.4×1.0) = maxSpacing × 0.6', () => {
    expect(minPegSpacing(100, MAX_SPACING)).toBeCloseTo(MAX_SPACING * 0.6, 5);
  });

  it('D=50 (ND=0.5) → maxSpacing × (1 - 0.4×0.5) = maxSpacing × 0.8', () => {
    expect(minPegSpacing(50, MAX_SPACING)).toBeCloseTo(MAX_SPACING * 0.8, 5);
  });

  it('scales proportionally with maxSpacing', () => {
    const s1 = minPegSpacing(50, 100);
    const s2 = minPegSpacing(50, 200);
    expect(s2).toBeCloseTo(s1 * 2, 5);
  });

  it('result is always ≤ maxSpacing', () => {
    const dValues = [0, 25, 50, 75, 100];
    for (const d of dValues) {
      expect(minPegSpacing(d, MAX_SPACING)).toBeLessThanOrEqual(MAX_SPACING);
    }
  });
});

// ─── Integration: formula self-consistency at key challenges ─────────────────

describe('formula self-consistency', () => {
  it('all component outputs are finite and non-negative at N=1', () => {
    const d = difficultyScore(1);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(timerBase(d)).toBeGreaterThan(0);
    expect(requiredRings(d)).toBeGreaterThanOrEqual(1);
    expect(decoyRings(d)).toBeGreaterThanOrEqual(0);
    expect(currentStrengthMultiplier(d)).toBeGreaterThanOrEqual(1);
    expect(rewardMultiplier(d)).toBeGreaterThanOrEqual(1);
  });

  it('all component outputs are finite and non-negative at N=1000', () => {
    const d = difficultyScore(1000);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeCloseTo(50, 2);
    expect(timerBase(d)).toBe(120);
    expect(requiredRings(d)).toBe(3);
    expect(decoyRings(d)).toBe(2);
    expect(totalRings(d)).toBe(5);
  });

  it('all component outputs are finite at N=10,000,000', () => {
    const d = difficultyScore(10_000_000);
    expect(Number.isFinite(d)).toBe(true);
    expect(Number.isFinite(timerBase(d))).toBe(true);
    expect(Number.isFinite(currentStrengthMultiplier(d))).toBe(true);
    expect(Number.isFinite(rewardMultiplier(d))).toBe(true);
    expect(Number.isFinite(modifierChance(d))).toBe(true);
  });

  it('difficulty is strictly greater at N=1001 than at N=1000', () => {
    expect(difficultyScore(1001)).toBeGreaterThan(difficultyScore(1000));
  });
});
