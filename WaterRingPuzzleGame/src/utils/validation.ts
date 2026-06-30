// Validation utilities for Water Ring Puzzle Game

/**
 * Returns true if n is a positive integer (> 0, no fractional part).
 */
export function isPositiveInteger(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && Math.floor(n) === n;
}

/**
 * Returns true if n is a non-negative finite number.
 */
export function isNonNegativeNumber(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

/**
 * Returns true if n is a number in the range [0, 1] (a percentage/ratio).
 */
export function isPercentage(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
}

/**
 * Returns true if s is a non-empty string.
 */
export function isNonEmptyString(s: unknown): boolean {
  return typeof s === 'string' && s.length > 0;
}

/**
 * Returns true if n is a positive integer in the range [1, 10000].
 */
export function isChallengeNumber(n: unknown): boolean {
  return isPositiveInteger(n) && (n as number) >= 1 && (n as number) <= 10000;
}

/**
 * Asserts that value is neither null nor undefined.
 * Throws a descriptive TypeError if the assertion fails.
 */
export function assertNonNull<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new TypeError(
      `assertNonNull: "${name}" must not be null or undefined, but received ${value}.`,
    );
  }
  return value;
}

/**
 * Asserts that value is a positive finite number.
 * Throws a descriptive RangeError if the assertion fails.
 */
export function assertPositiveNumber(value: unknown, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `assertPositiveNumber: "${name}" must be a positive finite number, but received ${value}.`,
    );
  }
}

/**
 * Asserts that value is within the inclusive range [min, max].
 * Throws a descriptive RangeError if the assertion fails.
 */
export function assertRange(value: number, min: number, max: number, name: string): void {
  if (value < min || value > max) {
    throw new RangeError(
      `assertRange: "${name}" must be between ${min} and ${max}, but received ${value}.`,
    );
  }
}

/**
 * Type guard: returns true and narrows the type if v is a valid 2D vector
 * with numeric x and y properties.
 */
export function validateVector2D(v: unknown): v is { x: number; y: number } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).x === 'number' &&
    typeof (v as Record<string, unknown>).y === 'number' &&
    Number.isFinite((v as { x: number; y: number }).x) &&
    Number.isFinite((v as { x: number; y: number }).y)
  );
}

/**
 * Sanitizes an unknown value to a valid challenge number in [1, 10000].
 * Returns the clamped integer if raw is a finite number, otherwise fallback (default 1).
 */
export function sanitizeChallengeNumber(raw: unknown, fallback = 1): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.min(Math.max(Math.round(raw), 1), 10000);
  }
  return Math.min(Math.max(Math.round(fallback), 1), 10000);
}
