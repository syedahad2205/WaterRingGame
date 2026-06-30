// Math utilities for Water Ring Puzzle Game

/**
 * Clamps a value between a minimum and maximum.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between a and b by factor t.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse lerp: returns the t factor such that lerp(a, b, t) === value.
 * Returns 0 if a === b to avoid division by zero.
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return (value - a) / (b - a);
}

/**
 * Remaps value from [inMin, inMax] to [outMin, outMax].
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

/**
 * Euclidean distance between two 2D points.
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Angle in radians from point (x1, y1) to point (x2, y2).
 */
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Rounds a number to the specified number of decimal places.
 */
export function roundToDecimal(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Returns true if n is a power of two (n > 0).
 */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Returns the smallest power of two greater than or equal to n.
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) {
    p <<= 1;
  }
  return p;
}

/**
 * GLSL-style smoothstep: smooth Hermite interpolation between edge0 and edge1.
 * Result is clamped to [0, 1].
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Normalizes an angle in radians to the range [0, 2π).
 */
export function normalizeAngle(radians: number): number {
  const TWO_PI = Math.PI * 2;
  return ((radians % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * Interpolates between two angles (in radians) taking the shortest path.
 */
export function lerpAngle(a: number, b: number, t: number): number {
  const TWO_PI = Math.PI * 2;
  let diff = ((b - a) % TWO_PI + TWO_PI) % TWO_PI;
  if (diff > Math.PI) {
    diff -= TWO_PI;
  }
  return normalizeAngle(a + diff * t);
}
