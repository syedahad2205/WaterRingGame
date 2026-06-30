/**
 * PureFunctions.test.ts
 * Unit tests for all required pure functions — task 19.1.1
 *
 * Functions under test:
 *   - SeedGenerator: deriveMasterSeed, encodeChallengeCode, decodeChallengeCode
 *   - DifficultyCalculator: difficultyScore, normalizedDifficulty, timerBase
 *   - ContinueService: computeContinueCost, computeContinueBonusTime, computeMaxContinues
 *   - XPSystem: xpForChallenge
 *   - ConflictResolver: ConflictResolver.resolve (all 5 strategies)
 */

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({ getString: jest.fn(() => null), set: jest.fn() })),
}));
jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn() })),
}));
jest.mock('../../src/store/slices/economySlice', () => ({
  useEconomyStore: { getState: jest.fn(() => ({ debitCoins: jest.fn(() => true) }) ) },
}));

import {
  deriveMasterSeed,
  encodeChallengeCode,
  decodeChallengeCode,
  Xoshiro128StarStar,
} from '../../src/features/game/generation/SeedGenerator';

import {
  difficultyScore,
  normalizedDifficulty,
  timerBase,
  requiredRings,
  decoyRings,
} from '../../src/features/game/generation/DifficultyCalculator';

import {
  computeContinueCost,
  computeContinueBonusTime,
  computeMaxContinues,
} from '../../src/features/economy/ContinueService';

import {
  xpForChallenge,
  XP_BASE,
  STAR_MULTIPLIERS,
} from '../../src/features/progression/XPSystem';

import {
  ConflictResolver,
  type FieldConflictRule,
} from '../../src/services/sync/ConflictResolver';

// ─────────────────────────────────────────────────────────────────────────────
// SeedGenerator
// ─────────────────────────────────────────────────────────────────────────────

describe('SeedGenerator — deriveMasterSeed', () => {
  it('returns an Xoshiro128StarStar instance', () => {
    const prng = deriveMasterSeed(1);
    expect(prng).toBeInstanceOf(Xoshiro128StarStar);
  });

  it('is deterministic: same challenge number yields same sequence', () => {
    const a = deriveMasterSeed(42);
    const b = deriveMasterSeed(42);
    const results = Array.from({ length: 10 }, () => [a.nextFloat(), b.nextFloat()]);
    results.forEach(([av, bv]) => expect(av).toBe(bv));
  });

  it('different challenge numbers produce different seeds', () => {
    const a = deriveMasterSeed(1);
    const b = deriveMasterSeed(2);
    // At least one float in the first 5 should differ
    const diffs = Array.from({ length: 5 }, () => a.nextFloat() !== b.nextFloat());
    expect(diffs.some(Boolean)).toBe(true);
  });

  it('works for challenge number 0 (edge case)', () => {
    expect(() => deriveMasterSeed(0)).not.toThrow();
    const prng = deriveMasterSeed(0);
    expect(prng).toBeInstanceOf(Xoshiro128StarStar);
  });

  it('works for large challenge numbers (N=10000)', () => {
    const prng = deriveMasterSeed(10000);
    expect(prng).toBeInstanceOf(Xoshiro128StarStar);
    expect(prng.nextFloat()).toBeGreaterThanOrEqual(0);
    expect(prng.nextFloat()).toBeLessThan(1);
  });

  it('produces floats in [0, 1)', () => {
    const prng = deriveMasterSeed(7);
    for (let i = 0; i < 20; i++) {
      const f = prng.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('custom salt changes output', () => {
    const a = deriveMasterSeed(100, 2166136261);
    const b = deriveMasterSeed(100, 9999999);
    const af = a.nextFloat();
    const bf = b.nextFloat();
    expect(af).not.toBe(bf);
  });
});

describe('SeedGenerator — encodeChallengeCode / decodeChallengeCode', () => {
  it('round-trips challenge number 1', () => {
    expect(decodeChallengeCode(encodeChallengeCode(1))).toBe(1);
  });

  it('round-trips challenge number 527', () => {
    expect(decodeChallengeCode(encodeChallengeCode(527))).toBe(527);
  });

  it('round-trips challenge number 99999', () => {
    expect(decodeChallengeCode(encodeChallengeCode(99999))).toBe(99999);
  });

  it('encoded code is non-empty string containing a dash', () => {
    const code = encodeChallengeCode(10);
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
    expect(code).toContain('-');
  });

  it('decoding a tampered code returns null', () => {
    const code = encodeChallengeCode(100);
    const tampered = code.slice(0, -1) + (code.endsWith('9') ? '0' : '9');
    expect(decodeChallengeCode(tampered)).toBeNull();
  });

  it('decoding garbage string returns null', () => {
    expect(decodeChallengeCode('NOT-VALID-99')).toBeNull();
  });

  it('decode is case-insensitive', () => {
    const code = encodeChallengeCode(42);
    expect(decodeChallengeCode(code.toLowerCase())).toBe(42);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DifficultyCalculator — difficultyScore (D(N))
// ─────────────────────────────────────────────────────────────────────────────

describe('DifficultyCalculator — difficultyScore', () => {
  it('D(1) is in [0, 100]', () => {
    const d = difficultyScore(1);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(100);
  });

  it('D(N) is monotonically non-decreasing for N in [1, 5000]', () => {
    let prev = difficultyScore(1);
    for (let n = 2; n <= 5000; n += 50) {
      const curr = difficultyScore(n);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it('D(10000) is strictly less than 100 (approaches but never reaches ceiling)', () => {
    expect(difficultyScore(10000)).toBeLessThan(100);
  });

  it('D(N) never exceeds 100 for any N in [1, 10000]', () => {
    for (let n = 1; n <= 10000; n += 100) {
      expect(difficultyScore(n)).toBeLessThanOrEqual(100);
    }
  });

  it('D(1) > 0', () => {
    expect(difficultyScore(1)).toBeGreaterThan(0);
  });

  it('phase transition at N=1000 is smooth (no discontinuity)', () => {
    const d999 = difficultyScore(999);
    const d1000 = difficultyScore(1000);
    const d1001 = difficultyScore(1001);
    expect(d1000).toBeGreaterThanOrEqual(d999);
    expect(d1001).toBeGreaterThanOrEqual(d1000);
    // No sudden jump — delta should be < 5
    expect(Math.abs(d1001 - d999)).toBeLessThan(5);
  });
});

describe('DifficultyCalculator — normalizedDifficulty', () => {
  it('ND(N) is in [0, 1] for all N in [1, 10000]', () => {
    for (let n = 1; n <= 10000; n += 200) {
      const nd = normalizedDifficulty(n);
      expect(nd).toBeGreaterThanOrEqual(0);
      expect(nd).toBeLessThanOrEqual(1);
    }
  });

  it('ND(N) is monotonically non-decreasing', () => {
    let prev = normalizedDifficulty(1);
    for (let n = 2; n <= 2000; n += 50) {
      const curr = normalizedDifficulty(n);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it('ND(1) > 0', () => {
    expect(normalizedDifficulty(1)).toBeGreaterThan(0);
  });

  it('ND(10000) < 1 (never fully saturates)', () => {
    expect(normalizedDifficulty(10000)).toBeLessThan(1);
  });

  it('ND = difficultyScore / 100', () => {
    for (const n of [1, 100, 500, 1000, 5000]) {
      expect(normalizedDifficulty(n)).toBeCloseTo(difficultyScore(n) / 100, 10);
    }
  });
});

describe('DifficultyCalculator — timerBase', () => {
  it('timerBase(0) is 180s (max time at zero difficulty)', () => {
    expect(timerBase(0)).toBe(180);
  });

  it('timerBase(100) is at least 45s (minimum floor)', () => {
    expect(timerBase(100)).toBeGreaterThanOrEqual(45);
  });

  it('timerBase is non-increasing as difficulty rises', () => {
    let prev = timerBase(0);
    for (let d = 5; d <= 100; d += 5) {
      const curr = timerBase(d);
      expect(curr).toBeLessThanOrEqual(prev);
      prev = curr;
    }
  });

  it('timerBase always returns a positive integer-like value', () => {
    for (const d of [0, 25, 50, 75, 100]) {
      expect(timerBase(d)).toBeGreaterThan(0);
    }
  });

  it('timerBase floor at 45s is respected even past D=100', () => {
    expect(timerBase(200)).toBeGreaterThanOrEqual(45);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ContinueService
// ─────────────────────────────────────────────────────────────────────────────

describe('ContinueService — computeContinueCost', () => {
  it('cost is positive for all valid inputs', () => {
    expect(computeContinueCost(0, 1)).toBeGreaterThan(0);
    expect(computeContinueCost(50, 1)).toBeGreaterThan(0);
    expect(computeContinueCost(100, 3)).toBeGreaterThan(0);
  });

  it('cost is monotonically increasing with continue number (same difficulty)', () => {
    const d = 50;
    const c1 = computeContinueCost(d, 1);
    const c2 = computeContinueCost(d, 2);
    const c3 = computeContinueCost(d, 3);
    expect(c2).toBeGreaterThan(c1);
    expect(c3).toBeGreaterThan(c2);
  });

  it('cost increases with difficulty for same continue number', () => {
    const low = computeContinueCost(0, 1);
    const high = computeContinueCost(100, 1);
    expect(high).toBeGreaterThan(low);
  });

  it('exponential growth: cost(n+1) / cost(n) ≈ 1.5', () => {
    const d = 0;
    const c1 = computeContinueCost(d, 1);
    const c2 = computeContinueCost(d, 2);
    expect(c2 / c1).toBeCloseTo(1.5, 0);
  });

  it('returns a rounded integer', () => {
    const cost = computeContinueCost(75, 2);
    expect(cost).toBe(Math.round(cost));
  });

  it('clamps difficulty to [0, 1] (D>100 treated as D=100)', () => {
    const atMax = computeContinueCost(100, 1);
    const overMax = computeContinueCost(200, 1);
    expect(overMax).toBe(atMax);
  });
});

describe('ContinueService — computeContinueBonusTime', () => {
  it('bonus time is always <= 60 seconds (upper bound)', () => {
    for (const d of [0, 10, 25, 50, 75, 100]) {
      expect(computeContinueBonusTime(d)).toBeLessThanOrEqual(60);
    }
  });

  it('bonus time is always >= 30 seconds (lower bound / floor)', () => {
    for (const d of [0, 50, 100, 150]) {
      expect(computeContinueBonusTime(d)).toBeGreaterThanOrEqual(30);
    }
  });

  it('bonus time decreases as difficulty increases', () => {
    const low = computeContinueBonusTime(0);
    const high = computeContinueBonusTime(100);
    expect(high).toBeLessThanOrEqual(low);
  });

  it('at D=0, bonus time is 60 seconds', () => {
    expect(computeContinueBonusTime(0)).toBe(60);
  });

  it('at D=100, bonus time is 30 seconds', () => {
    expect(computeContinueBonusTime(100)).toBe(30);
  });

  it('bonus time is never unbounded regardless of continue count (bounded property)', () => {
    // BonusTime does not depend on continueNumber — it is always bounded by [30, 60]
    expect(computeContinueBonusTime(0)).toBeLessThanOrEqual(60);
    expect(computeContinueBonusTime(100)).toBeLessThanOrEqual(60);
  });
});

describe('ContinueService — computeMaxContinues', () => {
  it('returns a value in [1, 3] for all difficulty scores', () => {
    for (const d of [0, 25, 50, 75, 100]) {
      const m = computeMaxContinues(d);
      expect(m).toBeGreaterThanOrEqual(1);
      expect(m).toBeLessThanOrEqual(3);
    }
  });

  it('at D=0, max continues is 3', () => {
    expect(computeMaxContinues(0)).toBe(3);
  });

  it('at D=100, max continues is 1', () => {
    expect(computeMaxContinues(100)).toBe(1);
  });

  it('is non-increasing with difficulty', () => {
    let prev = computeMaxContinues(0);
    for (let d = 10; d <= 100; d += 10) {
      const curr = computeMaxContinues(d);
      expect(curr).toBeLessThanOrEqual(prev);
      prev = curr;
    }
  });

  it('returns an integer', () => {
    const m = computeMaxContinues(50);
    expect(m).toBe(Math.floor(m));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// XPSystem — xpForChallenge
// ─────────────────────────────────────────────────────────────────────────────

describe('XPSystem — xpForChallenge', () => {
  it('returns a positive integer', () => {
    const xp = xpForChallenge(1, 3, 0);
    expect(xp).toBeGreaterThan(0);
    expect(xp).toBe(Math.round(xp));
  });

  it('3-star earns more XP than 1-star for same challenge', () => {
    const xp1 = xpForChallenge(10, 1, 0);
    const xp3 = xpForChallenge(10, 3, 0);
    expect(xp3).toBeGreaterThan(xp1);
  });

  it('no continues earns more than 1 continue (same stars)', () => {
    const xpClean = xpForChallenge(10, 3, 0);
    const xpContinued = xpForChallenge(10, 3, 1);
    expect(xpClean).toBeGreaterThan(xpContinued);
  });

  it('1 continue earns more than 2+ continues', () => {
    const xp1 = xpForChallenge(10, 3, 1);
    const xp2 = xpForChallenge(10, 3, 2);
    expect(xp1).toBeGreaterThan(xp2);
  });

  it('higher challenge number yields higher XP (difficulty scaling)', () => {
    const xpEarly = xpForChallenge(1, 3, 0);
    const xpLate = xpForChallenge(200, 3, 0);
    expect(xpLate).toBeGreaterThan(xpEarly);
  });

  it('at challengeNumber=100 difficultyMultiplier caps at 2.0', () => {
    // D = min(100/100, 1.0) = 1.0 → multiplier = 2.0
    const xp = xpForChallenge(100, 3, 0);
    const expected = Math.round(XP_BASE * STAR_MULTIPLIERS[3] * 2.0 * 1.0);
    expect(xp).toBe(expected);
  });

  it('continues penalty 2+ is 0.6', () => {
    const xp = xpForChallenge(1, 3, 2);
    const D = Math.min(1 / 100, 1.0);
    const expected = Math.round(XP_BASE * STAR_MULTIPLIERS[3] * (1 + D) * 0.6);
    expect(xp).toBe(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ConflictResolver — all 5 strategies
// ─────────────────────────────────────────────────────────────────────────────

describe('ConflictResolver — server_wins strategy', () => {
  const resolver = new ConflictResolver();
  const rules: FieldConflictRule[] = [{ field: 'score', strategy: 'server_wins' }];

  it('returns server value when both differ', () => {
    const { resolved } = resolver.resolve({ score: 10 }, { score: 20 }, rules);
    expect(resolved.score).toBe(20);
  });

  it('returns server value when local is undefined', () => {
    const { resolved } = resolver.resolve({}, { score: 99 }, rules);
    expect(resolved.score).toBe(99);
  });

  it('returns server value 0 when server is 0', () => {
    const { resolved } = resolver.resolve({ score: 5 }, { score: 0 }, rules);
    expect(resolved.score).toBe(0);
  });

  it('does not touch unrelated fields', () => {
    const { resolved } = resolver.resolve({ name: 'Alice', score: 1 }, { name: 'Alice', score: 2 }, rules);
    expect(resolved.name).toBe('Alice');
  });

  it('records conflicted field in result', () => {
    const { conflictedFields } = resolver.resolve({ score: 1 }, { score: 2 }, rules);
    expect(conflictedFields).toContain('score');
  });
});

describe('ConflictResolver — client_wins strategy', () => {
  const resolver = new ConflictResolver();
  const rules: FieldConflictRule[] = [{ field: 'username', strategy: 'client_wins' }];

  it('returns local value when both differ', () => {
    const { resolved } = resolver.resolve({ username: 'Alice' }, { username: 'Bob' }, rules);
    expect(resolved.username).toBe('Alice');
  });

  it('returns local value when server is null-ish and local is set', () => {
    const { resolved } = resolver.resolve({ username: 'Alice' }, { username: undefined }, rules);
    expect(resolved.username).toBe('Alice');
  });

  it('returns server value when local is undefined', () => {
    const { resolved } = resolver.resolve({}, { username: 'Server' }, rules);
    expect(resolved.username).toBe('Server');
  });

  it('equal values produce no conflict entry', () => {
    const { conflictedFields } = resolver.resolve({ username: 'Same' }, { username: 'Same' }, rules);
    expect(conflictedFields).not.toContain('username');
  });

  it('records applied rule strategy', () => {
    const { appliedRules } = resolver.resolve({ username: 'A' }, { username: 'B' }, rules);
    expect(appliedRules.username).toBe('client_wins');
  });
});

describe('ConflictResolver — max_value strategy', () => {
  const resolver = new ConflictResolver();
  const rules: FieldConflictRule[] = [{ field: 'level', strategy: 'max_value' }];

  it('returns the larger numeric value (local > server)', () => {
    const { resolved } = resolver.resolve({ level: 50 }, { level: 30 }, rules);
    expect(resolved.level).toBe(50);
  });

  it('returns the larger numeric value (server > local)', () => {
    const { resolved } = resolver.resolve({ level: 30 }, { level: 50 }, rules);
    expect(resolved.level).toBe(50);
  });

  it('equal values produce no conflict', () => {
    const { conflictedFields } = resolver.resolve({ level: 10 }, { level: 10 }, rules);
    expect(conflictedFields).not.toContain('level');
  });

  it('handles string-encoded numbers', () => {
    const { resolved } = resolver.resolve({ level: '5' }, { level: '10' }, rules);
    expect(Number(resolved.level)).toBe(10);
  });

  it('prefers numeric side when other is NaN', () => {
    const { resolved } = resolver.resolve({ level: 7 }, { level: NaN }, rules);
    expect(resolved.level).toBe(7);
  });
});

describe('ConflictResolver — latest_timestamp strategy', () => {
  const resolver = new ConflictResolver();
  const rules: FieldConflictRule[] = [{ field: 'updatedAt', strategy: 'latest_timestamp' }];

  it('returns the value with the later timestamp (local wins)', () => {
    const { resolved } = resolver.resolve({ updatedAt: 2000 }, { updatedAt: 1000 }, rules);
    expect(resolved.updatedAt).toBe(2000);
  });

  it('returns the value with the later timestamp (server wins)', () => {
    const { resolved } = resolver.resolve({ updatedAt: 1000 }, { updatedAt: 2000 }, rules);
    expect(resolved.updatedAt).toBe(2000);
  });

  it('returns server value when timestamps are equal', () => {
    const { resolved } = resolver.resolve({ updatedAt: 1000 }, { updatedAt: 1000 }, rules);
    // Equal → no conflict, server value is in resolved (default spread)
    expect(resolved.updatedAt).toBe(1000);
  });

  it('handles very large epoch timestamps', () => {
    const now = Date.now();
    const { resolved } = resolver.resolve({ updatedAt: now - 1000 }, { updatedAt: now }, rules);
    expect(resolved.updatedAt).toBe(now);
  });

  it('records strategy in appliedRules', () => {
    const { appliedRules } = resolver.resolve({ updatedAt: 1 }, { updatedAt: 2 }, rules);
    expect(appliedRules.updatedAt).toBe('latest_timestamp');
  });
});

describe('ConflictResolver — merge_array strategy', () => {
  const resolver = new ConflictResolver();
  const rules: FieldConflictRule[] = [{ field: 'achievements', strategy: 'merge_array' }];

  it('returns union of two disjoint arrays', () => {
    const { resolved } = resolver.resolve(
      { achievements: ['a', 'b'] },
      { achievements: ['c', 'd'] },
      rules,
    );
    const arr = resolved.achievements as string[];
    expect(arr).toContain('a');
    expect(arr).toContain('b');
    expect(arr).toContain('c');
    expect(arr).toContain('d');
    expect(arr.length).toBe(4);
  });

  it('deduplicates overlapping items', () => {
    const { resolved } = resolver.resolve(
      { achievements: ['a', 'b'] },
      { achievements: ['b', 'c'] },
      rules,
    );
    const arr = resolved.achievements as string[];
    expect(arr.filter(x => x === 'b').length).toBe(1);
  });

  it('handles empty local array', () => {
    const { resolved } = resolver.resolve(
      { achievements: [] },
      { achievements: ['x'] },
      rules,
    );
    expect(resolved.achievements).toEqual(['x']);
  });

  it('handles empty server array', () => {
    const { resolved } = resolver.resolve(
      { achievements: ['y'] },
      { achievements: [] },
      rules,
    );
    expect(resolved.achievements).toEqual(['y']);
  });

  it('treats non-array values as empty arrays', () => {
    const { resolved } = resolver.resolve(
      { achievements: null },
      { achievements: ['z'] },
      rules,
    );
    expect(resolved.achievements).toContain('z');
  });
});
