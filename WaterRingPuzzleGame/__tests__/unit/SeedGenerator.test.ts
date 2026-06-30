/**
 * Unit tests for the xoshiro128** PRNG (SeedGenerator.ts).
 *
 * Requirements: 11.1, 24.6
 */

import { Xoshiro128StarStar, PRNGState } from '@features/game/generation/SeedGenerator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a PRNG with a fixed well-known seed for deterministic tests. */
function seeded(s0 = 1, s1 = 2, s2 = 3, s3 = 4): Xoshiro128StarStar {
  return new Xoshiro128StarStar(s0, s1, s2, s3);
}

// ---------------------------------------------------------------------------
// Deterministic output verification
// ---------------------------------------------------------------------------

describe('xoshiro128** determinism', () => {
  it('produces the same sequence for the same seed', () => {
    const a = seeded();
    const b = seeded();

    const seqA = Array.from({ length: 20 }, () => a.nextFloat());
    const seqB = Array.from({ length: 20 }, () => b.nextFloat());

    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = seeded(1, 2, 3, 4);
    const b = seeded(5, 6, 7, 8);

    const seqA = Array.from({ length: 10 }, () => a.nextFloat());
    const seqB = Array.from({ length: 10 }, () => b.nextFloat());

    expect(seqA).not.toEqual(seqB);
  });

  it('produces known output values for seed (1, 2, 3, 4)', () => {
    // Compute expected values independently using the spec algorithm so we can
    // pin a regression snapshot without hard-coding magic numbers.
    const prng = seeded(1, 2, 3, 4);

    // Capture the first 5 raw floats and verify they are in [0,1)
    const values = Array.from({ length: 5 }, () => prng.nextFloat());
    values.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });

    // Regression: verify exact first value so we catch algorithm regressions
    const prng2 = seeded(1, 2, 3, 4);
    const first = prng2.nextFloat();
    // Re-derive: rotl((s1*5)>>>0, 7)*9, then result/0x100000000
    // s0=1, s1=2, s2=3, s3=4
    // result = rotl((2*5)>>>0=10, 7)*9 = rotl(10,7)*9
    // rotl(10,7) = (10<<7 | 10>>>25) = 1280 | 0 = 1280
    // result = 1280*9 = 11520 → float = 11520/4294967296
    expect(first).toBeCloseTo(11520 / 4294967296, 10);
  });

  it('seed() resets state reproducibly', () => {
    const prng = seeded(1, 2, 3, 4);
    // Advance a bit
    for (let i = 0; i < 50; i++) {
      prng.nextFloat();
    }

    // Re-seed back to same values
    prng.seed(1, 2, 3, 4);

    const prng2 = seeded(1, 2, 3, 4);
    const seq1 = Array.from({ length: 10 }, () => prng.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => prng2.nextFloat());
    expect(seq1).toEqual(seq2);
  });

  it('throws on all-zero seed', () => {
    expect(() => new Xoshiro128StarStar(0, 0, 0, 0)).toThrow();
    const prng = seeded();
    expect(() => prng.seed(0, 0, 0, 0)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// nextFloat() range
// ---------------------------------------------------------------------------

describe('nextFloat()', () => {
  it('always returns a value in [0, 1)', () => {
    const prng = seeded(0xdeadbeef, 0xcafebabe, 0x1234abcd, 0xfeedface);
    for (let i = 0; i < 10_000; i++) {
      const v = prng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('never returns exactly 1.0', () => {
    const prng = seeded(0xffffffff, 0xffffffff, 0xffffffff, 0x00000001);
    for (let i = 0; i < 5_000; i++) {
      expect(prng.nextFloat()).toBeLessThan(1);
    }
  });
});

// ---------------------------------------------------------------------------
// nextInt() range (inclusive)
// ---------------------------------------------------------------------------

describe('nextInt()', () => {
  it('stays within inclusive [min, max]', () => {
    const prng = seeded(42, 1337, 7, 99);
    for (let i = 0; i < 5_000; i++) {
      const v = prng.nextInt(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('can produce both endpoints', () => {
    const prng = seeded(1, 2, 3, 4);
    const values = new Set<number>();
    for (let i = 0; i < 50_000; i++) {
      values.add(prng.nextInt(0, 3));
    }
    expect(values.has(0)).toBe(true);
    expect(values.has(3)).toBe(true);
  });

  it('works when min === max', () => {
    const prng = seeded(1, 2, 3, 4);
    for (let i = 0; i < 100; i++) {
      expect(prng.nextInt(5, 5)).toBe(5);
    }
  });

  it('throws when min > max', () => {
    const prng = seeded(1, 2, 3, 4);
    expect(() => prng.nextInt(10, 9)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// nextChoice()
// ---------------------------------------------------------------------------

describe('nextChoice()', () => {
  it('always returns an element from the array', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const prng = seeded(1, 2, 3, 4);
    for (let i = 0; i < 1_000; i++) {
      expect(arr).toContain(prng.nextChoice(arr));
    }
  });

  it('throws on empty array', () => {
    const prng = seeded(1, 2, 3, 4);
    expect(() => prng.nextChoice([])).toThrow(RangeError);
  });

  it('works with single-element array', () => {
    const prng = seeded(1, 2, 3, 4);
    for (let i = 0; i < 20; i++) {
      expect(prng.nextChoice(['only'])).toBe('only');
    }
  });
});

// ---------------------------------------------------------------------------
// shuffle() — Fisher-Yates
// ---------------------------------------------------------------------------

describe('shuffle()', () => {
  it('returns the same array reference', () => {
    const prng = seeded(1, 2, 3, 4);
    const arr = [1, 2, 3, 4, 5];
    const result = prng.shuffle(arr);
    expect(result).toBe(arr);
  });

  it('preserves all elements', () => {
    const prng = seeded(1, 2, 3, 4);
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const copy = [...original];
    prng.shuffle(copy);
    expect(copy.sort((a, b) => a - b)).toEqual(original);
  });

  it('is deterministic for the same seed', () => {
    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8];
    const arr2 = [...arr1];
    seeded(10, 20, 30, 40).shuffle(arr1);
    seeded(10, 20, 30, 40).shuffle(arr2);
    expect(arr1).toEqual(arr2);
  });

  it('produces different orderings for different seeds', () => {
    const base = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = [...base];
    const b = [...base];
    seeded(1, 2, 3, 4).shuffle(a);
    seeded(9, 8, 7, 6).shuffle(b);
    // Extremely unlikely to be equal for different seeds
    expect(a).not.toEqual(b);
  });

  it('does not alter a single-element array', () => {
    const prng = seeded(1, 2, 3, 4);
    const arr = [42];
    prng.shuffle(arr);
    expect(arr).toEqual([42]);
  });
});

// ---------------------------------------------------------------------------
// fork() — independent child PRNG
// ---------------------------------------------------------------------------

describe('fork()', () => {
  it('returns a new Xoshiro128StarStar instance', () => {
    const parent = seeded(1, 2, 3, 4);
    const child = parent.fork();
    expect(child).toBeInstanceOf(Xoshiro128StarStar);
    expect(child).not.toBe(parent);
  });

  it('child sequence is independent of parent sequence', () => {
    const parent = seeded(1, 2, 3, 4);
    const child = parent.fork();

    const parentSeq = Array.from({ length: 20 }, () => parent.nextFloat());
    const childSeq = Array.from({ length: 20 }, () => child.nextFloat());

    expect(parentSeq).not.toEqual(childSeq);
  });

  it('child sequence is deterministic — same parent seed produces same child', () => {
    const child1 = seeded(1, 2, 3, 4).fork();
    const child2 = seeded(1, 2, 3, 4).fork();

    const seq1 = Array.from({ length: 20 }, () => child1.nextFloat());
    const seq2 = Array.from({ length: 20 }, () => child2.nextFloat());

    expect(seq1).toEqual(seq2);
  });

  it('advancing parent before fork produces a different child', () => {
    const parent1 = seeded(1, 2, 3, 4);
    const child1 = parent1.fork();

    const parent2 = seeded(1, 2, 3, 4);
    parent2.nextFloat(); // advance once
    const child2 = parent2.fork();

    const seq1 = Array.from({ length: 10 }, () => child1.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => child2.nextFloat());

    expect(seq1).not.toEqual(seq2);
  });

  it('forking does not corrupt the parent sequence', () => {
    // Capture the parent sequence without forking
    const refParent = seeded(5, 6, 7, 8);
    const refSeq = Array.from({ length: 20 }, () => refParent.nextFloat());

    // Advance a parent by the same number of fork-internal steps, then compare
    // We just verify the parent continues to produce valid floats after fork
    const parent = seeded(5, 6, 7, 8);
    parent.fork(); // fork consumes 4 steps internally
    const afterFork = Array.from({ length: 16 }, () => parent.nextFloat());
    afterFork.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });

    // The sequences diverge at step 1 because fork consumed 4 steps
    expect(refSeq.slice(4)).toEqual(afterFork);
  });
});

// ---------------------------------------------------------------------------
// getState() / restoreState() round-trip
// ---------------------------------------------------------------------------

describe('getState() and restoreState()', () => {
  it('getState returns correct state shape', () => {
    const prng = seeded(0xaabb, 0xccdd, 0xeeff, 0x1122);
    const state: PRNGState = prng.getState();
    expect(typeof state.s0).toBe('number');
    expect(typeof state.s1).toBe('number');
    expect(typeof state.s2).toBe('number');
    expect(typeof state.s3).toBe('number');
  });

  it('restoreState replays the exact same sequence', () => {
    const prng = seeded(7, 13, 21, 99);

    // Advance several steps
    for (let i = 0; i < 30; i++) {
      prng.nextFloat();
    }

    // Snapshot
    const snapshot = prng.getState();

    // Capture 20 values from the snapshot point
    const seq1 = Array.from({ length: 20 }, () => prng.nextFloat());

    // Restore and re-capture
    prng.restoreState(snapshot);
    const seq2 = Array.from({ length: 20 }, () => prng.nextFloat());

    expect(seq1).toEqual(seq2);
  });

  it('restoreState on a different instance produces the same sequence', () => {
    const a = seeded(100, 200, 300, 400);
    for (let i = 0; i < 50; i++) {
      a.nextFloat();
    }
    const state = a.getState();

    const b = seeded(1, 2, 3, 4);
    b.restoreState(state);

    const seqA = Array.from({ length: 20 }, () => a.nextFloat());
    const seqB = Array.from({ length: 20 }, () => b.nextFloat());

    expect(seqA).toEqual(seqB);
  });

  it('getState returns a copy — mutating it does not affect the PRNG', () => {
    const prng = seeded(1, 2, 3, 4);
    const state = prng.getState();

    // Snapshot sequence before mutation
    const prngRef = seeded(1, 2, 3, 4);
    const expected = Array.from({ length: 10 }, () => prngRef.nextFloat());

    // Mutate the returned state object
    state.s0 = 0xdeadbeef;
    state.s1 = 0xcafebabe;

    // PRNG should still produce the original sequence
    const actual = Array.from({ length: 10 }, () => prng.nextFloat());
    expect(actual).toEqual(expected);
  });

  it('round-trip through JSON serialization preserves state', () => {
    const prng = seeded(0xff00ff, 0x00ff00, 0x0000ff, 0xff0000);
    for (let i = 0; i < 77; i++) {
      prng.nextFloat();
    }

    const stateJson = JSON.stringify(prng.getState());
    const restoredState: PRNGState = JSON.parse(stateJson) as PRNGState;

    const prng2 = seeded(1, 1, 1, 1);
    prng2.restoreState(restoredState);

    const seq1 = Array.from({ length: 10 }, () => prng.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => prng2.nextFloat());

    expect(seq1).toEqual(seq2);
  });
});

// ---------------------------------------------------------------------------
// 32-bit overflow correctness
// ---------------------------------------------------------------------------

describe('32-bit unsigned arithmetic', () => {
  it('handles near-max uint32 seeds without producing NaN or Infinity', () => {
    const prng = new Xoshiro128StarStar(0xffffffff, 0xfffffffe, 0xfffffffd, 0xfffffffc);
    for (let i = 0; i < 1_000; i++) {
      const v = prng.nextFloat();
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it('state words are always 32-bit unsigned after many steps', () => {
    const prng = seeded(0xffffffff, 0x80000000, 1, 2);
    for (let i = 0; i < 100; i++) {
      prng.nextFloat();
    }
    const { s0, s1, s2, s3 } = prng.getState();
    [s0, s1, s2, s3].forEach(word => {
      expect(word).toBeGreaterThanOrEqual(0);
      expect(word).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(word)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// MasterSeed derivation — Task 6.2.2
// ---------------------------------------------------------------------------

import {
  deriveMasterSeed,
  deriveDailySeed,
  encodeChallengeCode,
  decodeChallengeCode,
  PRIME_A,
  PRIME_B,
  DEFAULT_SALT_GLOBAL,
  DEFAULT_SALT_DAILY,
} from '@features/game/generation/SeedGenerator';

describe('deriveMasterSeed()', () => {
  it('returns a Xoshiro128StarStar instance', () => {
    const rng = deriveMasterSeed(1);
    expect(rng).toBeInstanceOf(Xoshiro128StarStar);
  });

  it('is deterministic — same N produces the same sequence', () => {
    const rng1 = deriveMasterSeed(42);
    const rng2 = deriveMasterSeed(42);

    const seq1 = Array.from({ length: 20 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 20 }, () => rng2.nextFloat());

    expect(seq1).toEqual(seq2);
  });

  it('produces distinct sequences for different challenge numbers', () => {
    const rng1 = deriveMasterSeed(1);
    const rng2 = deriveMasterSeed(2);

    const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());

    expect(seq1).not.toEqual(seq2);
  });

  it('respects the saltGlobal parameter — different salt yields different output', () => {
    const rng1 = deriveMasterSeed(100, DEFAULT_SALT_GLOBAL);
    const rng2 = deriveMasterSeed(100, DEFAULT_SALT_GLOBAL + 1);

    const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());

    expect(seq1).not.toEqual(seq2);
  });

  it('produces floats in [0, 1) range', () => {
    const rng = deriveMasterSeed(999);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('N=0 does not throw (edge case)', () => {
    expect(() => deriveMasterSeed(0)).not.toThrow();
  });

  it('large challenge numbers are handled without overflow', () => {
    expect(() => deriveMasterSeed(1_000_000)).not.toThrow();
    const rng = deriveMasterSeed(1_000_000);
    const v = rng.nextFloat();
    expect(Number.isFinite(v)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DailySeed derivation — Task 6.2.2
// ---------------------------------------------------------------------------

describe('deriveDailySeed()', () => {
  it('returns a Xoshiro128StarStar instance', () => {
    const rng = deriveDailySeed(new Date('2024-01-01'));
    expect(rng).toBeInstanceOf(Xoshiro128StarStar);
  });

  it('is deterministic — same date produces the same sequence', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    const rng1 = deriveDailySeed(date);
    const rng2 = deriveDailySeed(date);

    const seq1 = Array.from({ length: 20 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 20 }, () => rng2.nextFloat());

    expect(seq1).toEqual(seq2);
  });

  it('same calendar day regardless of time-of-day produces the same seed', () => {
    const morning = new Date('2024-06-15T00:00:00Z');
    const evening = new Date('2024-06-15T23:59:59Z');

    const rng1 = deriveDailySeed(morning);
    const rng2 = deriveDailySeed(evening);

    const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());

    expect(seq1).toEqual(seq2);
  });

  it('produces distinct sequences for different dates', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-02');

    const rng1 = deriveDailySeed(date1);
    const rng2 = deriveDailySeed(date2);

    const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());

    expect(seq1).not.toEqual(seq2);
  });

  it('respects the saltDaily parameter — different salt yields different output', () => {
    const date = new Date('2024-03-15');
    const rng1 = deriveDailySeed(date, DEFAULT_SALT_DAILY);
    const rng2 = deriveDailySeed(date, DEFAULT_SALT_DAILY + 1);

    const seq1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const seq2 = Array.from({ length: 10 }, () => rng2.nextFloat());

    expect(seq1).not.toEqual(seq2);
  });

  it('produces floats in [0, 1) range', () => {
    const rng = deriveDailySeed(new Date('2024-12-31'));
    for (let i = 0; i < 100; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('MasterSeed and DailySeed are distinct for equivalent numeric inputs', () => {
    // Even if the numeric day number happens to equal a challenge number,
    // using different primes/salts ensures the outputs differ.
    const day0 = new Date(0); // Unix day 0
    const master = deriveMasterSeed(0);
    const daily = deriveDailySeed(day0);

    const seqM = Array.from({ length: 10 }, () => master.nextFloat());
    const seqD = Array.from({ length: 10 }, () => daily.nextFloat());

    expect(seqM).not.toEqual(seqD);
  });
});

// ---------------------------------------------------------------------------
// Challenge code encode / decode — Task 6.2.2
// ---------------------------------------------------------------------------

describe('encodeChallengeCode()', () => {
  it('encodes N=527 as "EN-8"', () => {
    // 527 in base36 = "EN"; Luhn check digit of "EN" = 8
    expect(encodeChallengeCode(527)).toBe('EN-8');
  });

  it('output format is always <Base36>-<digit>', () => {
    for (const n of [0, 1, 35, 36, 100, 999, 10_000]) {
      const code = encodeChallengeCode(n);
      expect(code).toMatch(/^[0-9A-Z]+-[0-9]$/);
    }
  });

  it('N=0 encodes without error', () => {
    const code = encodeChallengeCode(0);
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(2);
  });

  it('N=1 encodes deterministically', () => {
    expect(encodeChallengeCode(1)).toBe(encodeChallengeCode(1));
  });

  it('different challenge numbers produce different codes', () => {
    const codes = new Set([1, 2, 3, 100, 200, 300].map(n => encodeChallengeCode(n)));
    expect(codes.size).toBe(6);
  });
});

describe('decodeChallengeCode()', () => {
  it('round-trips N=527: encode → decode returns 527', () => {
    const code = encodeChallengeCode(527);
    expect(decodeChallengeCode(code)).toBe(527);
  });

  it('round-trips a variety of challenge numbers', () => {
    for (const n of [0, 1, 35, 36, 99, 100, 527, 1000, 99999]) {
      const code = encodeChallengeCode(n);
      expect(decodeChallengeCode(code)).toBe(n);
    }
  });

  it('returns null for a code with a wrong check digit', () => {
    // "EN-8" is valid for 527; "EN-0" should be invalid
    expect(decodeChallengeCode('EN-0')).toBeNull();
    expect(decodeChallengeCode('EN-1')).toBeNull();
    expect(decodeChallengeCode('EN-9')).toBeNull();
  });

  it('returns null for malformed input with no dash', () => {
    expect(decodeChallengeCode('EN8')).toBeNull();
    expect(decodeChallengeCode('abc')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeChallengeCode('')).toBeNull();
  });

  it('returns null for input with invalid characters', () => {
    expect(decodeChallengeCode('!@#-5')).toBeNull();
    expect(decodeChallengeCode('EN--8')).toBeNull();
  });

  it('is case-insensitive', () => {
    const code = encodeChallengeCode(527); // "EN-8"
    expect(decodeChallengeCode(code.toLowerCase())).toBe(527);
    expect(decodeChallengeCode(code.toUpperCase())).toBe(527);
  });

  it('trims surrounding whitespace', () => {
    const code = encodeChallengeCode(100);
    expect(decodeChallengeCode(`  ${code}  `)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

describe('seed derivation constants', () => {
  it('PRIME_A is the Knuth multiplicative hash constant', () => {
    expect(PRIME_A).toBe(2654435761);
  });

  it('PRIME_B is defined and non-zero', () => {
    expect(PRIME_B).toBe(2246822519);
  });

  it('DEFAULT_SALT_GLOBAL is the FNV offset basis', () => {
    expect(DEFAULT_SALT_GLOBAL).toBe(2166136261);
  });

  it('DEFAULT_SALT_DAILY is the FNV prime', () => {
    expect(DEFAULT_SALT_DAILY).toBe(16777619);
  });
});
