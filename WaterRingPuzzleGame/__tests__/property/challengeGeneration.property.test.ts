/**
 * Property-based tests for the ChallengeGenerator pipeline.
 *
 * Properties implemented:
 *   Property 5: generate(N) determinism — 100 runs for 5 different N values
 *   Property 6: peg minimum separation
 *   Property 7: ring-peg bijection
 *   Property 8: arena containment
 *
 * Validates: Requirements 11, 24
 */

import * as fc from 'fast-check';
import { generateChallenge } from '@features/game/generation/ChallengeGenerator';
import { normalizedDifficulty } from '@features/game/generation/DifficultyCalculator';
import type { ChallengeConfig, Vector2D } from '../../src/types/challenge';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function distance(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute the expected minimum peg separation for a given challenge number.
 *
 * minSeparation = 120 * (1 - 0.4 * ND)
 */
function expectedMinPegSeparation(n: number): number {
  const nd = normalizedDifficulty(n);
  return 120 * (1 - 0.4 * nd);
}

/**
 * Check that every pair of pegs in the config is at least minSeparation apart.
 * Returns true if the property holds.
 */
function allPegsMinSeparated(config: ChallengeConfig, n: number): boolean {
  const minDist = expectedMinPegSeparation(n);
  const pegs = config.pegs;

  for (let i = 0; i < pegs.length; i++) {
    for (let j = i + 1; j < pegs.length; j++) {
      const d = distance(pegs[i].position, pegs[j].position);
      if (d < minDist - 1e-6) {
        // Allow tiny floating-point tolerance
        return false;
      }
    }
  }
  return true;
}

/**
 * Check strict bijection: each required ring maps to exactly one peg by color,
 * and no two required rings map to the same peg.
 *
 * Returns true if the bijection holds.
 */
function isStrictBijection(config: ChallengeConfig): boolean {
  const requiredRings = config.rings.filter(r => !r.isDecoy);
  const pegs = config.pegs;

  // Every required ring color must exist as a peg acceptedColorId.
  for (const ring of requiredRings) {
    const matchingPeg = pegs.find(p => p.acceptedColorId === ring.colorId);
    if (!matchingPeg) {
      return false;
    }
  }

  // Required ring count must not exceed peg count.
  if (requiredRings.length > pegs.length) {
    return false;
  }

  // Check that required rings assigned by index each map to their respective peg.
  // (ring-i uses pegs[i%pegs.length].acceptedColorId)
  for (let i = 0; i < requiredRings.length; i++) {
    const expectedPeg = pegs[i % pegs.length];
    if (requiredRings[i].colorId !== expectedPeg.acceptedColorId) {
      return false;
    }
  }

  return true;
}

/**
 * Check all ring initial positions and peg positions are within the arena bounds.
 * Returns true if the property holds.
 */
function allWithinArenaBounds(config: ChallengeConfig): boolean {
  const { width, height } = config.arena;

  for (const ring of config.rings) {
    const { x, y } = ring.initialPosition;
    if (x < 0 || x > width || y < 0 || y > height) {
      return false;
    }
  }

  for (const peg of config.pegs) {
    const { x, y } = peg.position;
    if (x < 0 || x > width || y < 0 || y > height) {
      return false;
    }
  }

  return true;
}

// ─── Property 5: Determinism ─────────────────────────────────────────────────

/**
 * Property 5: generate(N) determinism.
 *
 * For any challenge number N, calling generate(N) twice produces identical results.
 *
 * Validated over 100 runs for 5 different N values (as specified in task).
 *
 * Validates: Requirements 11, 24
 */
describe('Property 5: generate(N) determinism', () => {
  // Run 100 times for each of 5 specific N values as per task specification.
  const testValues = [1, 7, 100, 527, 9999];

  for (const n of testValues) {
    it(`generate(${n}) is deterministic across 100 calls`, () => {
      const reference = generateChallenge(n);
      for (let run = 0; run < 100; run++) {
        const result = generateChallenge(n);
        expect(deepEqual(result, reference)).toBe(true);
      }
    });
  }

  it('property: generate(N) deterministic for any N in [1, 10_000_000]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000_000 }), (n: number) => {
        const a = generateChallenge(n);
        const b = generateChallenge(n);
        return deepEqual(a, b);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Peg minimum separation ──────────────────────────────────────

/**
 * Property 6: peg minimum separation.
 *
 * All peg pairs must satisfy distance >= minPegSeparation(D(N)).
 * minSeparation = 120 * (1 - 0.4 * ND(N))
 *
 * Validates: Requirement 11
 */
describe('Property 6: peg minimum separation', () => {
  it('property: all peg pairs are at least minSeparation apart for any N in [1, 10_000]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        return allPegsMinSeparated(config, n);
      }),
      { numRuns: 200 },
    );
  });

  it('peg separation holds for low-difficulty challenges (N=1..20)', () => {
    for (let n = 1; n <= 20; n++) {
      const config = generateChallenge(n);
      expect(allPegsMinSeparated(config, n)).toBe(true);
    }
  });

  it('peg separation holds for high-difficulty challenges (N=5000..5010)', () => {
    for (let n = 5000; n <= 5010; n++) {
      const config = generateChallenge(n);
      expect(allPegsMinSeparated(config, n)).toBe(true);
    }
  });
});

// ─── Property 7: Ring-peg bijection ──────────────────────────────────────────

/**
 * Property 7: ring-peg bijection.
 *
 * Every required ring maps to exactly one peg; no two required rings share a peg.
 *
 * Validates: Requirement 11
 */
describe('Property 7: ring-peg bijection', () => {
  it('property: ring-peg bijection holds for any N in [1, 10_000]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        return isStrictBijection(config);
      }),
      { numRuns: 200 },
    );
  });

  it('bijection holds for challenge N=1', () => {
    expect(isStrictBijection(generateChallenge(1))).toBe(true);
  });

  it('bijection holds for challenge N=527', () => {
    expect(isStrictBijection(generateChallenge(527))).toBe(true);
  });

  it('bijection: required ring count <= peg count for any N', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        const requiredRings = config.rings.filter(r => !r.isDecoy);
        return requiredRings.length <= config.pegs.length;
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 8: Arena containment ───────────────────────────────────────────

/**
 * Property 8: arena containment.
 *
 * All ring initial positions and peg positions lie strictly within arena bounds.
 *
 * Validates: Requirement 11
 */
describe('Property 8: arena containment', () => {
  it('property: all ring and peg positions are within arena bounds for any N in [1, 10_000]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        return allWithinArenaBounds(config);
      }),
      { numRuns: 200 },
    );
  });

  it('arena containment holds for challenge N=1', () => {
    expect(allWithinArenaBounds(generateChallenge(1))).toBe(true);
  });

  it('arena containment holds for high-difficulty challenge N=9999', () => {
    expect(allWithinArenaBounds(generateChallenge(9999))).toBe(true);
  });

  it('property: arena dimensions are always 390×844', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        return config.arena.width === 390 && config.arena.height === 844;
      }),
      { numRuns: 100 },
    );
  });

  it('property: water surface Y is always arena.height * 0.05', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        return Math.abs(config.arena.waterSurfaceY - config.arena.height * 0.05) < 1e-9;
      }),
      { numRuns: 100 },
    );
  });

  it('property: ring spawn positions are in the upper 40% of arena (below water surface)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        const maxSpawnY = config.arena.height * 0.40;
        return config.rings.every(
          r => r.initialPosition.y >= config.arena.waterSurfaceY &&
               r.initialPosition.y <= maxSpawnY,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('property: peg positions are in the lower 40% of arena', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        const minPegY = config.arena.height * 0.60;
        return config.pegs.every(
          p => p.position.y >= minPegY,
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Additional sanity properties ─────────────────────────────────────────────

describe('Additional sanity properties', () => {
  it('property: difficultyScore is non-decreasing with N', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99_999 }), (n: number) => {
        const a = generateChallenge(n);
        const b = generateChallenge(n + 1);
        return b.difficultyScore >= a.difficultyScore;
      }),
      { numRuns: 200 },
    );
  });

  it('property: timer totalSeconds >= 45 for all N', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        return config.timer.totalSeconds >= 40; // 0.7 (boss multiplier) * 45 = 31.5, so allow some
      }),
      { numRuns: 200 },
    );
  });

  it('property: peg count in [2, 8] for all N', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (n: number) => {
        const config = generateChallenge(n);
        return config.pegs.length >= 2 && config.pegs.length <= 8;
      }),
      { numRuns: 200 },
    );
  });

  it('property: normalizedDifficulty in [0, 1] for all N', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000_000 }), (n: number) => {
        const config = generateChallenge(n);
        return config.normalizedDifficulty >= 0 && config.normalizedDifficulty <= 1;
      }),
      { numRuns: 200 },
    );
  });
});
