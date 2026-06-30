// Seeded pseudo-random number generator utilities for Water Ring Puzzle Game

/**
 * Mulberry32: a fast, high-quality 32-bit seeded PRNG.
 * Returns a function that produces floats in [0, 1) on each call.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    z = (z ^ (z >>> 14)) >>> 0;
    return z / 0x100000000;
  };
}

/**
 * Fisher-Yates shuffle using mulberry32 as the PRNG.
 * Returns a new array; does not mutate the original.
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = array.slice();
  const rand = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/**
 * Picks a single item from the array using a seeded random choice.
 * Throws if the array is empty.
 */
export function seededChoice<T>(array: T[], seed: number): T {
  if (array.length === 0) {
    throw new RangeError('seededChoice: array must not be empty');
  }
  const rand = mulberry32(seed);
  const index = Math.floor(rand() * array.length);
  return array[index];
}

/**
 * Returns a seeded random integer in the inclusive range [min, max].
 */
export function seededInt(min: number, max: number, seed: number): number {
  const rand = mulberry32(seed);
  return Math.floor(rand() * (max - min + 1)) + min;
}

/**
 * Returns a seeded random float in the range [min, max).
 */
export function seededFloat(min: number, max: number, seed: number): number {
  const rand = mulberry32(seed);
  return rand() * (max - min) + min;
}

/**
 * djb2 hash: maps a string to a positive 32-bit integer.
 */
export function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) >>> 0;
  }
  // Ensure positive by masking sign bit
  return hash >>> 1;
}
