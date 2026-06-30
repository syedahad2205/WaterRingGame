/**
 * xoshiro128** PRNG implementation, MasterSeed/DailySeed derivation,
 * and challenge code encoding/decoding.
 *
 * State: four 32-bit unsigned integers (s0, s1, s2, s3).
 * Scrambler output: result = rotl(s1 * 5, 7) * 9
 * All arithmetic uses `>>> 0` masking to enforce 32-bit unsigned semantics in JS.
 *
 * Requirements: 11.1, 24.6
 */

export interface PRNGState {
  s0: number;
  s1: number;
  s2: number;
  s3: number;
}

/** Rotate left a 32-bit unsigned integer by k bits. */
function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

export class Xoshiro128StarStar {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(s0 = 1, s1 = 0, s2 = 0, s3 = 0) {
    // Validate that at least one state word is non-zero (all-zero state is invalid for xoshiro)
    if ((s0 | s1 | s2 | s3) === 0) {
      throw new Error('xoshiro128**: initial state must not be all zeros');
    }
    this.s0 = s0 >>> 0;
    this.s1 = s1 >>> 0;
    this.s2 = s2 >>> 0;
    this.s3 = s3 >>> 0;
  }

  /**
   * Re-seed the PRNG with four 32-bit words.
   * All-zero state is forbidden and will throw.
   */
  public seed(s0: number, s1: number, s2: number, s3: number): void {
    if (((s0 | s1 | s2 | s3) >>> 0) === 0) {
      throw new Error('xoshiro128**: seed state must not be all zeros');
    }
    this.s0 = s0 >>> 0;
    this.s1 = s1 >>> 0;
    this.s2 = s2 >>> 0;
    this.s3 = s3 >>> 0;
  }

  /**
   * Advance the PRNG by one step and return the raw 32-bit result.
   * This is the core xoshiro128** step function.
   */
  private next(): number {
    // result = rotl(s1 * 5, 7) * 9
    const result = (rotl((this.s1 * 5) >>> 0, 7) * 9) >>> 0;

    // xoshiro128** update
    const t = (this.s1 << 9) >>> 0;

    this.s2 = (this.s2 ^ this.s0) >>> 0;
    this.s3 = (this.s3 ^ this.s1) >>> 0;
    this.s1 = (this.s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;
    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotl(this.s3, 11);

    return result;
  }

  /**
   * Returns a float in [0, 1).
   */
  public nextFloat(): number {
    return (this.next() >>> 0) / 0x100000000;
  }

  /**
   * Returns an integer in the inclusive range [min, max].
   */
  public nextInt(min: number, max: number): number {
    if (min > max) {
      throw new RangeError(`nextInt: min (${min}) must be <= max (${max})`);
    }
    const range = (max - min + 1) >>> 0;
    return (min + Math.floor(this.nextFloat() * range)) | 0;
  }

  /**
   * Returns a random element from the array.
   * Throws if the array is empty.
   */
  public nextChoice<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new RangeError('nextChoice: array must not be empty');
    }
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Fisher-Yates in-place shuffle.
   * Returns the same array reference (mutated).
   */
  public shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  /**
   * Creates an independent child PRNG.
   *
   * The parent advances once to produce an output word, which is then used to
   * derive a new 4-word seed for the child via a simple mixing step (the
   * splitmix64-style finalizer applied to successive counter values drawn from
   * the parent's output). This ensures the child's seed is fully determined by
   * the parent's current state without exposing raw state words.
   */
  public fork(): Xoshiro128StarStar {
    // Advance parent once to produce entropy
    const a = this.next();
    const b = this.next();
    const c = this.next();
    const d = this.next();

    // Mix the four words so the child seed is well-distributed
    const mix = (x: number): number => {
      let v = x >>> 0;
      v = (v ^ (v >>> 16)) >>> 0;
      v = (Math.imul(v, 0x45d9f3b)) >>> 0;
      v = (v ^ (v >>> 16)) >>> 0;
      return v;
    };

    const cs0 = mix(a) || 1; // guard against all-zero
    const cs1 = mix(b);
    const cs2 = mix(c);
    const cs3 = mix(d);

    return new Xoshiro128StarStar(cs0, cs1, cs2, cs3);
  }

  /**
   * Returns a snapshot of the current PRNG state for later replay.
   */
  public getState(): PRNGState {
    return { s0: this.s0, s1: this.s1, s2: this.s2, s3: this.s3 };
  }

  /**
   * Restores the PRNG to a previously captured state.
   */
  public restoreState(state: PRNGState): void {
    this.seed(state.s0, state.s1, state.s2, state.s3);
  }
}

// ---------------------------------------------------------------------------
// Seed derivation constants
// ---------------------------------------------------------------------------

/** Knuth multiplicative hash constant used for MasterSeed derivation. */
export const PRIME_A = 2654435761;

/** Second hash constant used for DailySeed derivation. */
export const PRIME_B = 2246822519;

/**
 * Default value for saltGlobal (FNV offset basis).
 * The live value is served by Firebase Remote Config key `salt_global`.
 */
export const DEFAULT_SALT_GLOBAL = 2166136261;

/**
 * Default value for saltDaily (FNV prime).
 * The live value is served by Firebase Remote Config key `salt_daily`.
 */
export const DEFAULT_SALT_DAILY = 16777619;

// ---------------------------------------------------------------------------
// splitmix32 expansion helper
// ---------------------------------------------------------------------------

/**
 * A single splitmix32 mixing step.
 * Takes a 32-bit unsigned integer and returns a well-distributed 32-bit result.
 */
function splitmix32(x: number): number {
  let v = (x + 0x9e3779b9) >>> 0;
  v = (Math.imul(v ^ (v >>> 16), 0x85ebca6b)) >>> 0;
  v = (Math.imul(v ^ (v >>> 13), 0xc2b2ae35)) >>> 0;
  return (v ^ (v >>> 16)) >>> 0;
}

/**
 * Expand a single 32-bit raw seed word into four independent state words
 * by applying 4 successive rounds of splitmix32.
 */
function expandSeed(raw: number): [number, number, number, number] {
  const s0 = splitmix32(raw);
  const s1 = splitmix32(s0);
  const s2 = splitmix32(s1);
  const s3 = splitmix32(s2);
  return [s0 || 1, s1, s2, s3]; // guard against all-zero state
}

// ---------------------------------------------------------------------------
// MasterSeed derivation
// ---------------------------------------------------------------------------

/**
 * Derive a seeded Xoshiro128StarStar instance for a given challenge number.
 *
 * MasterSeed(N) = xoshiro128_init(splitmix32_expand((N * PRIME_A + saltGlobal) >>> 0))
 *
 * The saltGlobal defaults to DEFAULT_SALT_GLOBAL; in production it is fetched
 * from Firebase Remote Config key `salt_global`.
 *
 * Requirements: 11.1
 */
export function deriveMasterSeed(
  challengeNumber: number,
  saltGlobal: number = DEFAULT_SALT_GLOBAL,
): Xoshiro128StarStar {
  const raw = (Math.imul(challengeNumber >>> 0, PRIME_A >>> 0) + (saltGlobal >>> 0)) >>> 0;
  const [s0, s1, s2, s3] = expandSeed(raw);
  return new Xoshiro128StarStar(s0, s1, s2, s3);
}

// ---------------------------------------------------------------------------
// DailySeed derivation
// ---------------------------------------------------------------------------

/**
 * Derive a seeded Xoshiro128StarStar instance for a calendar date.
 *
 * DailySeed(date) = xoshiro128_init(splitmix32_expand((UnixDayNumber * PRIME_B + saltDaily) >>> 0))
 * where UnixDayNumber = Math.floor(date.getTime() / 86_400_000).
 *
 * The saltDaily defaults to DEFAULT_SALT_DAILY; in production it is fetched
 * from Firebase Remote Config key `salt_daily`.
 *
 * Requirements: 11.1
 */
export function deriveDailySeed(
  date: Date,
  saltDaily: number = DEFAULT_SALT_DAILY,
): Xoshiro128StarStar {
  const unixDay = Math.floor(date.getTime() / 86_400_000);
  const raw = (Math.imul(unixDay >>> 0, PRIME_B >>> 0) + (saltDaily >>> 0)) >>> 0;
  const [s0, s1, s2, s3] = expandSeed(raw);
  return new Xoshiro128StarStar(s0, s1, s2, s3);
}

// ---------------------------------------------------------------------------
// Challenge code encoding / decoding
// ---------------------------------------------------------------------------

/**
 * Compute the Luhn check digit for a string of Base36 characters.
 *
 * Each character is treated as a digit in base 36 (0–9 → 0–9, A–Z → 10–35).
 * The standard Luhn algorithm doubles every second digit from the right
 * (starting with the rightmost as position 1, which is NOT doubled).
 * Digits > 9 after doubling have 9 subtracted (equivalent to summing their
 * two decimal digits).  The check digit is (10 - (sum % 10)) % 10, and is
 * returned as a single decimal character '0'–'9'.
 */
function luhnCheckDigit(payload: string): string {
  const chars = payload.toUpperCase();
  let sum = 0;
  // Process from right to left; position 1 (rightmost) is not doubled.
  for (let i = 0; i < chars.length; i++) {
    const pos = chars.length - i; // rightmost is position 1
    let digit = parseInt(chars[i], 36);
    if (pos % 2 === 0) {
      // Double every second position from the right
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Validate a payload + check digit by recomputing the expected check digit
 * and comparing it against the provided one.
 */
function luhnValidate(payload: string, checkDigit: string): boolean {
  const expected = luhnCheckDigit(payload.toUpperCase());
  return expected === checkDigit;
}

/**
 * Encode a challenge number as a human-readable challenge code.
 *
 * Format: `<Base36(N)>-<LuhnCheckDigit>` (uppercase Base36 + dash + one decimal digit).
 * Example: N = 527 → "EJ-8"
 *
 * Requirements: 11.1
 */
export function encodeChallengeCode(challengeNumber: number): string {
  const base36 = (challengeNumber >>> 0).toString(36).toUpperCase();
  const check = luhnCheckDigit(base36);
  return `${base36}-${check}`;
}

/**
 * Decode and validate a challenge code.
 *
 * Returns the challenge number if the code is well-formed and the Luhn check
 * digit is valid; returns `null` for any invalid input.
 *
 * Requirements: 11.1
 */
export function decodeChallengeCode(code: string): number | null {
  // Expected format: one or more alphanumeric Base36 chars, a dash, one decimal digit
  const match = /^([0-9A-Z]+)-([0-9])$/i.exec(code.trim());
  if (!match) {
    return null;
  }
  const [, payload, checkDigit] = match;
  if (!luhnValidate(payload, checkDigit)) {
    return null;
  }
  const n = parseInt(payload, 36);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}
